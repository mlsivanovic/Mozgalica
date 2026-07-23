-- Automatska arhiva kvizova, bezbedno brisanje i korekcija Andrejevog profila.

-- ---------------------------------------------------------------------------
-- Soft-delete: rezultat, pitanja i osvojene zvezdice ostaju sačuvani.
-- ---------------------------------------------------------------------------
alter table public.quizzes
  add column deleted_at timestamptz;

create index idx_quizzes_owner_deleted_created
  on public.quizzes (owner_id, deleted_at, created_at desc);

revoke delete on public.quizzes from authenticated;

create or replace function public.soft_delete_quiz(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.quizzes
  set deleted_at = coalesce(deleted_at, now())
  where id = p_quiz_id
    and owner_id = auth.uid();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.quiz_links
  set is_active = false
  where quiz_id = p_quiz_id;

  update public.attempts
  set status = 'expired'
  where quiz_id = p_quiz_id
    and status = 'in_progress';

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.soft_delete_quiz(uuid) from public;
grant execute on function public.soft_delete_quiz(uuid) to authenticated;

create or replace function public.fn_guard_deleted_quiz_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_active and exists (
    select 1
    from public.quizzes q
    where q.id = new.quiz_id and q.deleted_at is not null
  ) then
    raise exception 'Obrisani kviz ne može ponovo da dobije aktivan link.';
  end if;
  return new;
end;
$$;

create trigger trg_quiz_links_deleted_quiz_guard
  before insert or update of quiz_id, is_active on public.quiz_links
  for each row execute function public.fn_guard_deleted_quiz_link();

-- Kviz ide u arhivu tek kada nema otvorenih dodela/linkova ni pokušaja u toku.
create or replace view public.v_quiz_archive_status
  with (security_invoker = true) as
select
  q.id as quiz_id,
  (
    select count(*)
    from public.attempts a
    where a.quiz_id = q.id and a.status = 'in_progress'
  ) as in_progress_count,
  (
    select count(*)
    from public.attempts a
    where a.quiz_id = q.id and a.status = 'submitted'
  ) as submitted_count,
  (
    select max(a.submitted_at)
    from public.attempts a
    where a.quiz_id = q.id and a.status = 'submitted'
  ) as last_submitted_at,
  (
    select count(*)
    from public.quiz_links l
    where l.quiz_id = q.id
      and l.is_active
      and (l.expires_at is null or l.expires_at >= now())
      and (
        (
          l.child_profile_id is null
          and (
            select count(*)
            from public.attempts a
            where a.quiz_link_id = l.id and a.status = 'submitted'
          ) < l.max_attempts
        )
        or (
          l.child_profile_id is not null
          and not exists (
            select 1
            from public.attempts a
            where a.quiz_id = l.quiz_id
              and a.child_profile_id = l.child_profile_id
              and a.status = 'submitted'
          )
        )
      )
  ) as open_link_count
from public.quizzes q;

grant select on public.v_quiz_archive_status to authenticated;

-- ---------------------------------------------------------------------------
-- Automatski naziv prema predmetu i dodeljenim profilima.
-- ---------------------------------------------------------------------------
create or replace function public.fn_refresh_quiz_auto_title(p_quiz_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject_count int;
  v_subject text;
  v_subject_name text;
  v_child_names text;
begin
  select count(distinct t.subject), min(t.subject)
  into v_subject_count, v_subject
  from public.quiz_questions qq
  join public.topics t on t.id = qq.topic_id
  where qq.quiz_id = p_quiz_id;

  v_subject_name := case
    when v_subject_count = 0 then 'Kviz'
    when v_subject_count > 1 then 'Mešoviti kviz'
    when v_subject = 'matematika' then 'Matematika'
    when v_subject = 'srpski' then 'Srpski'
    else initcap(v_subject)
  end;

  select string_agg(d.name, ' i ' order by d.created_at, d.name)
  into v_child_names
  from (
    select distinct cp.id, cp.name, cp.created_at
    from public.quiz_links l
    join public.child_profiles cp on cp.id = l.child_profile_id
    where l.quiz_id = p_quiz_id
      and l.child_profile_id is not null
  ) d;

  if v_child_names is not null then
    update public.quizzes
    set title = v_subject_name || ' — ' || v_child_names
    where id = p_quiz_id;
  end if;
end;
$$;

revoke all on function public.fn_refresh_quiz_auto_title(uuid) from public;

create or replace function public.fn_refresh_quiz_title_from_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.child_profile_id is not null then
      perform public.fn_refresh_quiz_auto_title(old.quiz_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and old.child_profile_id is not null
    and old.quiz_id is distinct from new.quiz_id
  then
    perform public.fn_refresh_quiz_auto_title(old.quiz_id);
  end if;

  if new.child_profile_id is not null then
    perform public.fn_refresh_quiz_auto_title(new.quiz_id);
  end if;
  return new;
end;
$$;

create trigger trg_quiz_links_refresh_title
  after insert or update of quiz_id, child_profile_id or delete on public.quiz_links
  for each row execute function public.fn_refresh_quiz_title_from_link();

create or replace function public.fn_refresh_quiz_title_from_question()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.fn_refresh_quiz_auto_title(old.quiz_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.quiz_id is distinct from new.quiz_id then
    perform public.fn_refresh_quiz_auto_title(old.quiz_id);
  end if;
  perform public.fn_refresh_quiz_auto_title(new.quiz_id);
  return new;
end;
$$;

create trigger trg_quiz_questions_refresh_title
  after insert or update of quiz_id, topic_id or delete on public.quiz_questions
  for each row execute function public.fn_refresh_quiz_title_from_question();

-- ---------------------------------------------------------------------------
-- „Andreja” je bio početni typo. Preimenuj profil i poveži stare Andrejeve
-- završene pokušaje (po jedan, najnoviji pokušaj po kvizu).
-- ---------------------------------------------------------------------------
update public.child_profiles cp
set name = 'Andrej'
where lower(trim(cp.name)) = 'andreja'
  and not exists (
    select 1
    from public.child_profiles drugi
    where drugi.owner_id = cp.owner_id
      and drugi.id <> cp.id
      and lower(trim(drugi.name)) = 'andrej'
  );

insert into public.child_profiles (owner_id, name, avatar)
select s.user_id, 'Andrej', '🚀'
from public.admin_settings s
where not exists (
  select 1
  from public.child_profiles cp
  where cp.owner_id = s.user_id
    and lower(trim(cp.name)) in ('andrej', 'andreja')
)
on conflict do nothing;

with kandidati as (
  select
    a.id,
    cp.id as child_profile_id,
    row_number() over (
      partition by cp.id, a.quiz_id
      order by a.submitted_at desc nulls last, a.started_at desc, a.id
    ) as redni_broj
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  join public.child_profiles cp
    on cp.owner_id = q.owner_id
   and lower(trim(cp.name)) = 'andrej'
  where a.status = 'submitted'
    and a.child_profile_id is null
    and (
      q.fixed_child_name = 'Andrej'
      or lower(trim(a.child_name)) in ('andrej', 'andreja')
    )
    and not exists (
      select 1
      from public.attempts povezani
      where povezani.child_profile_id = cp.id
        and povezani.quiz_id = a.quiz_id
    )
)
update public.attempts a
set
  child_profile_id = k.child_profile_id,
  child_name = 'Andrej',
  stars_awarded = case
    when a.review_pending then null
    else public.fn_stars_for_score(a.score_pct)
  end
from kandidati k
where a.id = k.id and k.redni_broj = 1;

update public.attempts a
set child_name = 'Andrej'
from public.child_profiles cp
where a.child_profile_id = cp.id
  and lower(trim(cp.name)) = 'andrej'
  and a.child_name <> 'Andrej';

-- Novi administratorski nalozi od sada dobijaju ispravno ime profila.
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.admin_allowlist where lower(email) = lower(new.email)) then
    insert into public.admin_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;

    insert into public.child_profiles (owner_id, name, avatar) values
      (new.id, 'Andrej', '🚀'),
      (new.id, 'Filip', '🤖')
    on conflict do nothing;

    insert into public.title_levels (owner_id, name, min_stars) values
      (new.id, 'Početnik', 0),
      (new.id, 'Istraživač', 5),
      (new.id, 'Znalac', 12),
      (new.id, 'Majstor', 24),
      (new.id, 'Šampion', 40)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

do $$
declare
  v_quiz_id uuid;
begin
  for v_quiz_id in
    select distinct l.quiz_id
    from public.quiz_links l
    where l.child_profile_id is not null
  loop
    perform public.fn_refresh_quiz_auto_title(v_quiz_id);
  end loop;
end;
$$;
