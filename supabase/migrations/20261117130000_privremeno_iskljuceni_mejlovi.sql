-- Privremeno isključeni mejlovi. Obaveštenja ostaju push + in-app inbox.
--
-- Dva serverska prekidača u app_config (izvor istine; vrednost 'true' uključuje,
-- sve ostalo je isključeno, a red koji ne postoji tretira se kao isključeno):
--   mejl_detetu_novi_kviz        — mejl detetu kad mu se dodeli novi kviz
--   mejl_roditelju_posle_kviza   — mejl roditelju kad dete završi kviz
--
-- Mejl o šahovskoj partiji, nedeljni izveštaj i ostali mejlovi se NE diraju
-- ovom migracijom i nastavljaju da rade kako su radili.
--
-- Ponovno uključivanje: u SQL-u `update public.app_config set value = 'true' where key = '...';`
-- i vratiti konstante u src/lib/funkcije.ts na true.

insert into public.app_config (key, value) values
  ('mejl_detetu_novi_kviz', 'false'),
  ('mejl_roditelju_posle_kviza', 'false')
on conflict (key) do nothing;

create or replace function public.fn_mejl_ukljucen(p_kljuc text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value = 'true' from public.app_config where key = p_kljuc), false)
$$;

revoke all on function public.fn_mejl_ukljucen(text) from public, anon, authenticated;

-- BEFORE trigger nad quiz_links: ako je mejl detetu isključen, notify_child_email se
-- uvek upisuje kao false. Zato nijedan put (RPC, pametni raspored, direktan INSERT)
-- ne može da napravi mejl isporuku. Push i inbox nastaju u
-- fn_create_new_quiz_notification i dalje.
create or replace function public.fn_guard_assignment_notification()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_email text;
begin
  if new.child_profile_id is null then
    new.notify_child_email := false;
    return new;
  end if;

  if new.notify_child_email and not public.fn_mejl_ukljucen('mejl_detetu_novi_kviz') then
    new.notify_child_email := false;
    return new;
  end if;

  if new.notify_child_email then
    select email into v_email
    from public.child_profiles
    where id = new.child_profile_id;

    if v_email is null then
      raise exception 'Profil deteta nema email adresu.';
    end if;
  end if;

  return new;
end;
$$;

-- Dodela kviza: pri isključenom mejlu se vraća false (bez greške), pa idempotentni
-- ponovni poziv ostaje konzistentan sa upisanim redom.
create or replace function public.assign_quiz_to_profile(
  p_quiz_id uuid,
  p_child_profile_id uuid,
  p_send_email boolean default null,
  p_idempotency_key uuid default null
)
returns public.quiz_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.quizzes;
  v_profile public.child_profiles;
  v_send_email boolean;
  v_link public.quiz_links;
  v_idempotency_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  select * into v_quiz
  from public.quizzes
  where id = p_quiz_id and owner_id = auth.uid();

  select * into v_profile
  from public.child_profiles
  where id = p_child_profile_id and owner_id = auth.uid();

  if v_quiz.id is null or v_profile.id is null then
    raise exception 'Kviz i profil moraju pripadati prijavljenom administratoru.';
  end if;

  v_send_email := coalesce(
    p_send_email,
    v_profile.notify_new_quiz_email and v_profile.email is not null
  ) and public.fn_mejl_ukljucen('mejl_detetu_novi_kviz');

  if v_send_email and v_profile.email is null then
    raise exception 'Profil deteta nema email adresu.';
  end if;

  insert into public.quiz_links (
    quiz_id, child_profile_id, max_attempts, label, expires_at,
    notify_child_email, assignment_request_id
  ) values (
    v_quiz.id, v_profile.id, 1, null, null, v_send_email, v_idempotency_key
  )
  on conflict (assignment_request_id) where assignment_request_id is not null
  do nothing
  returning * into v_link;

  if v_link.id is null then
    select ql.* into v_link
    from public.quiz_links ql
    join public.quizzes q on q.id = ql.quiz_id
    where ql.assignment_request_id = v_idempotency_key
      and q.owner_id = auth.uid();

    if v_link.id is null
      or v_link.quiz_id <> v_quiz.id
      or v_link.child_profile_id <> v_profile.id
      or v_link.notify_child_email <> v_send_email
    then
      raise exception 'Idempotency ključ je već iskorišćen za drugu dodelu.';
    end if;
  end if;

  return v_link;
end;
$$;

revoke all on function public.assign_quiz_to_profile(uuid, uuid, boolean, uuid) from public;
grant execute on function public.assign_quiz_to_profile(uuid, uuid, boolean, uuid) to authenticated;

-- Mejl roditelju o završenom kvizu. Inbox i push ostaju; samo se outbox isporuka
-- email ne pravi dok je prekidač isključen.
create or replace function public.fn_notify_result(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_pending boolean;
  v_notification_id uuid;
begin
  select q.owner_id, a.review_pending
  into v_owner, v_pending
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  where a.id = p_attempt_id;

  if v_owner is null or coalesce(v_pending, false) then
    return;
  end if;

  v_notification_id := public.fn_ensure_completion_notification(p_attempt_id, false);
  if v_notification_id is null then
    return;
  end if;

  if not public.fn_mejl_ukljucen('mejl_roditelju_posle_kviza') then
    return;
  end if;

  insert into public.notification_deliveries (notification_id, channel)
  values (v_notification_id, 'email')
  on conflict do nothing;
exception when others then
  -- Obaveštenje nikad ne sme da obori predaju ili ručno ocenjivanje.
  null;
end;
$$;

revoke all on function public.fn_notify_result(uuid) from public;

-- Već zakazane, a još neposlate mejl isporuke za ove događaje se odmah označavaju
-- kao preskočene (status failed sa objašnjenjem), da se ne pošalju kasnije.
-- Trenutno takvih redova nema; upit je ostavljen kao zaštita.
update public.notification_deliveries d
set
  status = 'failed',
  error = 'Preskočeno: mejl obaveštenja su privremeno isključena.',
  next_attempt_at = now()
from public.notifications n
where n.id = d.notification_id
  and d.channel = 'email'
  and d.status in ('pending', 'processing')
  and n.event_type in ('new_quiz', 'quiz_completed');
