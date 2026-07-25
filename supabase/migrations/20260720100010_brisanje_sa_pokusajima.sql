-- Omogući brisanje kvizova i pojedinačnih pitanja iz kviza čak i kad kviz već ima
-- pokušaje. Snapshot i dalje ostaje ZAMRZNUT za INSERT/UPDATE (sastav se ne može
-- menjati ni dodavati dok ima pokušaja) — samo se DELETE oslobađa.

-- ---------------------------------------------------------------------------
-- 1) fn_guard_quiz_snapshot — čuva samo INSERT/UPDATE, DELETE više ne blokira
-- ---------------------------------------------------------------------------
create or replace function public.fn_guard_quiz_snapshot()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' and new.source_question_id is null then
    return new;
  end if;

  if exists (select 1 from public.attempts where quiz_id = new.quiz_id) then
    raise exception 'Kviz već ima pokušaje — pitanja se više ne mogu menjati ni dodavati. Pojedinačna pitanja i dalje mogu da se obrišu.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quiz_questions_guard on public.quiz_questions;
create trigger trg_quiz_questions_guard
  before insert or update on public.quiz_questions
  for each row execute function public.fn_guard_quiz_snapshot();

-- ---------------------------------------------------------------------------
-- 2) Posle brisanja pitanja iz kviza, preračunaj već PREDATE pokušaje tog kviza
--    (bodovi/procenat/prolaznost zavise od preostalih quiz_questions).
--    Statement-level + transition table: jedan prolaz i za grupno brisanje.
--    Join na quizzes preskače slučaj kad je ovo posledica brisanja CELOG kviza
--    (tada quiz_id više ne postoji pa nema šta da se preračuna).
-- ---------------------------------------------------------------------------
create or replace function public.fn_after_quiz_questions_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
begin
  for v_attempt_id in
    select distinct a.id
    from removed r
    join public.quizzes q on q.id = r.quiz_id
    join public.attempts a on a.quiz_id = r.quiz_id and a.status = 'submitted'
  loop
    perform public.fn_recompute_attempt(v_attempt_id);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_quiz_questions_after_delete on public.quiz_questions;
create trigger trg_quiz_questions_after_delete
  after delete on public.quiz_questions
  referencing old table as removed
  for each statement execute function public.fn_after_quiz_questions_delete();

-- ---------------------------------------------------------------------------
-- 3) save_answers — preskoči odgovore za pitanja koja su u međuvremenu obrisana
--    iz kviza (postoje u layout-u pokušaja, ali više ne postoje u quiz_questions).
--    Bez ovoga bi INSERT pao na FK-u i CEO batch bi vratio save_failed, trajno
--    blokirajući dete usred pokušaja da sačuva bilo koji odgovor.
-- ---------------------------------------------------------------------------
create or replace function public.save_answers(p_attempt_token text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_item record;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;
  if v_attempt.deadline_at is not null and v_attempt.deadline_at + interval '30 seconds' < now() then
    return jsonb_build_object('ok', false, 'error', 'deadline_passed');
  end if;

  for v_item in select * from jsonb_each(coalesce(p_answers, '{}'::jsonb))
  loop
    -- Samo pitanja koja pripadaju OVOM pokušaju (layout) mogu da se sačuvaju
    if not exists (
      select 1 from jsonb_array_elements(v_attempt.layout) l where (l->>'qq') = v_item.key
    ) then
      continue;
    end if;
    -- Pitanje je u međuvremenu obrisano iz kviza — tiho preskoči (ništa za sačuvati)
    if not exists (
      select 1 from public.quiz_questions qq where qq.id = v_item.key::uuid
    ) then
      continue;
    end if;
    insert into public.attempt_answers (attempt_id, quiz_question_id, answer, answered_at)
    values (v_attempt.id, v_item.key::uuid, v_item.value, now())
    on conflict (attempt_id, quiz_question_id)
    do update set answer = excluded.answer, answered_at = excluded.answered_at;
  end loop;

  -- p_answers je jsonb OBJEKAT (mapa questionId → odgovor), ne niz —
  -- jsonb_array_length bi ovde bacio izuzetak i lažno prijavio neuspeh
  return jsonb_build_object(
    'ok', true,
    'saved', (select count(*) from jsonb_object_keys(coalesce(p_answers, '{}'::jsonb))),
    'serverNow', now()
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'save_failed');
end;
$$;

revoke all on function public.save_answers(text, jsonb) from public;
grant execute on function public.save_answers(text, jsonb) to anon, authenticated;
