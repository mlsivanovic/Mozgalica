-- Dnevni rasporedi prave zaseban snapshot kviza za svako dete i svaki lokalni dan.
-- Obradu obavlja Edge funkcija preko service_role naloga, dok administrator vidi
-- i uređuje rasporede isključivo kroz SECURITY DEFINER RPC funkcije.

create table public.daily_quiz_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles (id) on delete restrict,
  subject text not null check (subject in ('matematika', 'srpski')),
  grade smallint not null check (grade in (3, 4)),
  source text not null check (source in ('generator', 'bank')),
  difficulty smallint check (difficulty between 1 and 5),
  question_type text check (question_type in ('single', 'multi', 'numeric', 'text', 'truefalse', 'matching')),
  question_count int not null check (question_count between 1 and 50),
  time_limit_seconds int check (time_limit_seconds is null or time_limit_seconds between 30 and 14400),
  shuffle_questions boolean not null default true,
  shuffle_answers boolean not null default true,
  pass_threshold_pct int not null default 90 check (pass_threshold_pct between 0 and 100),
  daily_time time not null,
  timezone text not null default 'Europe/Belgrade' check (timezone = 'Europe/Belgrade'),
  is_active boolean not null default true,
  next_run_on date not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source <> 'generator' or subject = 'matematika')
);

create index idx_daily_quiz_schedules_due
  on public.daily_quiz_schedules (is_active, next_run_on, daily_time)
  where deleted_at is null;

create trigger trg_daily_quiz_schedules_touch
  before update on public.daily_quiz_schedules
  for each row execute function public.fn_touch_updated_at();

create table public.daily_quiz_schedule_topics (
  schedule_id uuid not null references public.daily_quiz_schedules (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete restrict,
  primary key (schedule_id, topic_id)
);

create table public.daily_quiz_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.daily_quiz_schedules (id) on delete restrict,
  local_date date not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 3),
  locked_at timestamptz,
  quiz_id uuid references public.quizzes (id) on delete set null,
  error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, local_date)
);

create index idx_daily_quiz_runs_schedule_status
  on public.daily_quiz_runs (schedule_id, status, local_date desc);

create trigger trg_daily_quiz_runs_touch
  before update on public.daily_quiz_runs
  for each row execute function public.fn_touch_updated_at();

create table public.daily_quiz_run_question_keys (
  run_id uuid not null references public.daily_quiz_runs (id) on delete cascade,
  question_key text not null check (length(question_key) between 1 and 500),
  primary key (run_id, question_key)
);

alter table public.quizzes
  add column daily_schedule_id uuid references public.daily_quiz_schedules (id) on delete set null,
  add column daily_local_date date;

create unique index uq_quizzes_daily_schedule_date
  on public.quizzes (daily_schedule_id, daily_local_date)
  where daily_schedule_id is not null;

alter table public.daily_quiz_schedules enable row level security;
alter table public.daily_quiz_schedule_topics enable row level security;
alter table public.daily_quiz_runs enable row level security;
alter table public.daily_quiz_run_question_keys enable row level security;

revoke all on public.daily_quiz_schedules, public.daily_quiz_schedule_topics,
  public.daily_quiz_runs, public.daily_quiz_run_question_keys from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Administratorsko upravljanje rasporedima
-- ---------------------------------------------------------------------------

create or replace function public.save_daily_quiz_schedule(
  p_schedule_id uuid,
  p_child_profile_id uuid,
  p_subject text,
  p_grade smallint,
  p_source text,
  p_topic_ids uuid[],
  p_difficulty smallint,
  p_question_type text,
  p_question_count int,
  p_time_limit_seconds int,
  p_shuffle_questions boolean,
  p_shuffle_answers boolean,
  p_pass_threshold_pct int,
  p_daily_time time
)
returns public.daily_quiz_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.daily_quiz_schedules;
  v_next_run_on date;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  if p_source not in ('generator', 'bank')
    or p_subject not in ('matematika', 'srpski')
    or p_grade not in (3, 4)
    or (p_source = 'generator' and p_subject <> 'matematika')
  then
    raise exception 'Neispravna podešavanja izvora pitanja.';
  end if;

  if coalesce(cardinality(p_topic_ids), 0) = 0 then
    raise exception 'Izaberi najmanje jednu oblast.';
  end if;

  if exists (
    select 1
    from unnest(p_topic_ids) id
    left join public.topics t on t.id = id
    where t.id is null or t.subject <> p_subject or t.grade <> p_grade
  ) then
    raise exception 'Sve oblasti moraju pripadati izabranom predmetu i razredu.';
  end if;

  if not exists (
    select 1 from public.child_profiles
    where id = p_child_profile_id and owner_id = auth.uid()
  ) then
    raise exception 'Profil deteta nije pronađen.';
  end if;

  if p_schedule_id is null then
    v_next_run_on := v_local_now::date
      + case when p_daily_time <= v_local_now::time then 1 else 0 end;

    insert into public.daily_quiz_schedules (
      owner_id, child_profile_id, subject, grade, source, difficulty, question_type,
      question_count, time_limit_seconds, shuffle_questions, shuffle_answers,
      pass_threshold_pct, daily_time, next_run_on
    ) values (
      auth.uid(), p_child_profile_id, p_subject, p_grade, p_source, p_difficulty,
      nullif(p_question_type, 'auto'), p_question_count, p_time_limit_seconds,
      p_shuffle_questions, p_shuffle_answers, p_pass_threshold_pct, p_daily_time,
      v_next_run_on
    ) returning * into v_schedule;
  else
    select * into v_schedule
    from public.daily_quiz_schedules
    where id = p_schedule_id and owner_id = auth.uid() and deleted_at is null
    for update;

    if v_schedule.id is null then
      raise exception 'Raspored nije pronađen.';
    end if;

    update public.daily_quiz_schedules
    set child_profile_id = p_child_profile_id,
        subject = p_subject,
        grade = p_grade,
        source = p_source,
        difficulty = p_difficulty,
        question_type = nullif(p_question_type, 'auto'),
        question_count = p_question_count,
        time_limit_seconds = p_time_limit_seconds,
        shuffle_questions = p_shuffle_questions,
        shuffle_answers = p_shuffle_answers,
        pass_threshold_pct = p_pass_threshold_pct,
        daily_time = p_daily_time
    where id = v_schedule.id
    returning * into v_schedule;

    delete from public.daily_quiz_schedule_topics where schedule_id = v_schedule.id;
  end if;

  insert into public.daily_quiz_schedule_topics (schedule_id, topic_id)
  select v_schedule.id, id from unnest(p_topic_ids) id;

  return v_schedule;
end;
$$;

create or replace function public.set_daily_quiz_schedule_active(
  p_schedule_id uuid,
  p_is_active boolean
)
returns public.daily_quiz_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.daily_quiz_schedules;
  v_now_local timestamp := now() at time zone 'Europe/Belgrade';
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  update public.daily_quiz_schedules
  set is_active = p_is_active,
      next_run_on = case when p_is_active then
        v_now_local::date + case when daily_time <= v_now_local::time then 1 else 0 end
      else next_run_on end
  where id = p_schedule_id and owner_id = auth.uid() and deleted_at is null
  returning * into v_schedule;

  if v_schedule.id is null then
    raise exception 'Raspored nije pronađen.';
  end if;
  return v_schedule;
end;
$$;

create or replace function public.delete_daily_quiz_schedule(p_schedule_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  update public.daily_quiz_schedules
  set is_active = false, deleted_at = coalesce(deleted_at, now())
  where id = p_schedule_id and owner_id = auth.uid() and deleted_at is null;

  if not found then
    raise exception 'Raspored nije pronađen.';
  end if;
end;
$$;

create or replace function public.list_daily_quiz_schedules()
returns table (
  id uuid,
  child_profile_id uuid,
  child_name text,
  child_avatar text,
  subject text,
  grade smallint,
  source text,
  topic_ids uuid[],
  topic_slugs text[],
  difficulty smallint,
  question_type text,
  question_count int,
  time_limit_seconds int,
  shuffle_questions boolean,
  shuffle_answers boolean,
  pass_threshold_pct int,
  daily_time time,
  timezone text,
  is_active boolean,
  next_run_on date,
  last_sent_at timestamptz,
  last_quiz_id uuid,
  last_error text
)
language sql
security definer
set search_path = public
as $$
  select
    s.id, s.child_profile_id, cp.name, cp.avatar, s.subject, s.grade, s.source,
    coalesce(array_agg(st.topic_id order by t.sort_order) filter (where st.topic_id is not null), '{}'::uuid[]),
    coalesce(array_agg(t.slug order by t.sort_order) filter (where t.slug is not null), '{}'::text[]),
    s.difficulty, s.question_type, s.question_count, s.time_limit_seconds,
    s.shuffle_questions, s.shuffle_answers, s.pass_threshold_pct, s.daily_time,
    s.timezone, s.is_active, s.next_run_on,
    poslednji.completed_at, poslednji.quiz_id, greska.error
  from public.daily_quiz_schedules s
  join public.child_profiles cp on cp.id = s.child_profile_id
  left join public.daily_quiz_schedule_topics st on st.schedule_id = s.id
  left join public.topics t on t.id = st.topic_id
  left join lateral (
    select r.completed_at, r.quiz_id
    from public.daily_quiz_runs r
    where r.schedule_id = s.id and r.status = 'succeeded'
    order by r.local_date desc
    limit 1
  ) poslednji on true
  left join lateral (
    select r.error
    from public.daily_quiz_runs r
    where r.schedule_id = s.id and r.status = 'failed'
    order by r.updated_at desc
    limit 1
  ) greska on true
  where s.owner_id = auth.uid() and s.deleted_at is null and public.fn_is_admin()
  group by s.id, cp.id, poslednji.completed_at, poslednji.quiz_id, greska.error
  order by s.is_active desc, s.daily_time, cp.name;
$$;

revoke all on function public.save_daily_quiz_schedule(uuid, uuid, text, smallint, text, uuid[], smallint, text, int, int, boolean, boolean, int, time) from public, anon;
revoke all on function public.set_daily_quiz_schedule_active(uuid, boolean) from public, anon;
revoke all on function public.delete_daily_quiz_schedule(uuid) from public, anon;
revoke all on function public.list_daily_quiz_schedules() from public, anon;
grant execute on function public.save_daily_quiz_schedule(uuid, uuid, text, smallint, text, uuid[], smallint, text, int, int, boolean, boolean, int, time) to authenticated;
grant execute on function public.set_daily_quiz_schedule_active(uuid, boolean) to authenticated;
grant execute on function public.delete_daily_quiz_schedule(uuid) to authenticated;
grant execute on function public.list_daily_quiz_schedules() to authenticated;

-- ---------------------------------------------------------------------------
-- Service-role obrada: preuzimanje, dovršavanje i neuspeh jednog dnevnog rada
-- ---------------------------------------------------------------------------

create or replace function public.claim_due_daily_quiz_runs(p_limit int default 20)
returns table (
  run_id uuid,
  schedule_id uuid,
  owner_id uuid,
  child_profile_id uuid,
  child_name text,
  subject text,
  grade smallint,
  source text,
  topic_ids uuid[],
  topic_slugs text[],
  difficulty smallint,
  question_type text,
  question_count int,
  time_limit_seconds int,
  shuffle_questions boolean,
  shuffle_answers boolean,
  pass_threshold_pct int,
  local_date date,
  used_question_keys text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule record;
  v_run public.daily_quiz_runs;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
  v_local_date date := (now() at time zone 'Europe/Belgrade')::date;
  v_count int := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Nedozvoljena operacija.';
  end if;

  for v_schedule in
    select s.*, cp.name as child_name
    from public.daily_quiz_schedules s
    join public.child_profiles cp on cp.id = s.child_profile_id
    where s.is_active
      and s.deleted_at is null
      and s.next_run_on <= v_local_date
      and s.daily_time <= v_local_now::time
    order by s.next_run_on, s.daily_time, s.created_at
    for update of s skip locked
  loop
    exit when v_count >= greatest(1, least(coalesce(p_limit, 20), 100));

    insert into public.daily_quiz_runs (schedule_id, local_date)
    values (v_schedule.id, v_local_date)
    on conflict (schedule_id, local_date) do nothing;

    select * into v_run
    from public.daily_quiz_runs
    where schedule_id = v_schedule.id and local_date = v_local_date
    for update;

    if v_run.status = 'succeeded'
      or (v_run.status = 'processing' and v_run.locked_at > now() - interval '10 minutes')
    then
      continue;
    end if;

    if v_run.attempts >= 3 then
      update public.daily_quiz_schedules
      set next_run_on = v_local_date + 1
      where id = v_schedule.id;
      continue;
    end if;

    update public.daily_quiz_runs
    set status = 'processing', attempts = attempts + 1, locked_at = now(), error = null
    where id = v_run.id
    returning * into v_run;

    return query
    select
      v_run.id, v_schedule.id, v_schedule.owner_id, v_schedule.child_profile_id,
      v_schedule.child_name, v_schedule.subject, v_schedule.grade, v_schedule.source,
      coalesce((select array_agg(st.topic_id order by t.sort_order)
        from public.daily_quiz_schedule_topics st join public.topics t on t.id = st.topic_id
        where st.schedule_id = v_schedule.id), '{}'::uuid[]),
      coalesce((select array_agg(t.slug order by t.sort_order)
        from public.daily_quiz_schedule_topics st join public.topics t on t.id = st.topic_id
        where st.schedule_id = v_schedule.id), '{}'::text[]),
      v_schedule.difficulty, v_schedule.question_type, v_schedule.question_count,
      v_schedule.time_limit_seconds, v_schedule.shuffle_questions, v_schedule.shuffle_answers,
      v_schedule.pass_threshold_pct, v_local_date,
      coalesce((select array_agg(distinct k.question_key)
        from public.daily_quiz_runs prethodni
        join public.daily_quiz_run_question_keys k on k.run_id = prethodni.id
        where prethodni.schedule_id = v_schedule.id and prethodni.status = 'succeeded'), '{}'::text[]);
    v_count := v_count + 1;
  end loop;
end;
$$;

create or replace function public.complete_daily_quiz_run(
  p_run_id uuid,
  p_questions jsonb,
  p_question_keys text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.daily_quiz_runs;
  v_schedule public.daily_quiz_schedules;
  v_profile public.child_profiles;
  v_quiz_id uuid;
  v_subject_name text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Nedozvoljena operacija.';
  end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) = 0 then
    raise exception 'Dnevni kviz nema pitanja.';
  end if;

  select * into v_run from public.daily_quiz_runs where id = p_run_id for update;
  if v_run.id is null or v_run.status <> 'processing' then
    raise exception 'Dnevno izvršenje nije spremno za dovršavanje.';
  end if;

  select * into v_schedule from public.daily_quiz_schedules where id = v_run.schedule_id for update;
  select * into v_profile from public.child_profiles where id = v_schedule.child_profile_id;
  if v_schedule.id is null or v_profile.id is null then
    raise exception 'Raspored ili profil nisu pronađeni.';
  end if;

  v_subject_name := case v_schedule.subject
    when 'matematika' then 'Matematika'
    when 'srpski' then 'Srpski'
    else initcap(v_schedule.subject)
  end;

  insert into public.quizzes (
    owner_id, title, description, time_limit_seconds, default_max_attempts,
    shuffle_questions, shuffle_answers, show_result, show_correct,
    pass_threshold_pct, require_name, fixed_child_name, require_label, label_name,
    grade, daily_schedule_id, daily_local_date
  ) values (
    v_schedule.owner_id,
    v_subject_name || ' — ' || v_profile.name || ' — ' || to_char(v_run.local_date, 'DD. MM. YYYY.'),
    'Dnevni kviz (' || v_subject_name || ' — ' || v_schedule.grade || '. razred)',
    v_schedule.time_limit_seconds, 1, v_schedule.shuffle_questions, v_schedule.shuffle_answers,
    true, true, v_schedule.pass_threshold_pct, true, null, false, 'Odeljenje',
    v_schedule.grade, v_schedule.id, v_run.local_date
  ) returning id into v_quiz_id;

  insert into public.quiz_questions (
    quiz_id, source_question_id, position, topic_id, topic_name, type, text,
    options, correct, explanation, hint, points, manual_review
  )
  select
    v_quiz_id, q.source_question_id, q.position, q.topic_id, q.topic_name,
    q.type, q.text, q.options, q.correct, q.explanation, q.hint, q.points,
    coalesce(q.manual_review, false)
  from jsonb_to_recordset(p_questions) as q(
    source_question_id uuid, position int, topic_id uuid, topic_name text, type text,
    text text, options jsonb, correct jsonb, explanation text, hint text,
    points int, manual_review boolean
  );

  insert into public.quiz_links (
    quiz_id, child_profile_id, max_attempts, label, expires_at,
    notify_child_email, assignment_request_id
  ) values (
    v_quiz_id, v_profile.id, 1, null, null, false, gen_random_uuid()
  );

  insert into public.daily_quiz_run_question_keys (run_id, question_key)
  select v_run.id, key
  from unnest(coalesce(p_question_keys, '{}'::text[])) key
  on conflict do nothing;

  update public.daily_quiz_runs
  set status = 'succeeded', quiz_id = v_quiz_id, completed_at = now(), locked_at = null, error = null
  where id = v_run.id;

  update public.daily_quiz_schedules
  set next_run_on = v_run.local_date + 1
  where id = v_schedule.id;

  return v_quiz_id;
end;
$$;

create or replace function public.fail_daily_quiz_run(p_run_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.daily_quiz_runs;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Nedozvoljena operacija.';
  end if;

  select * into v_run from public.daily_quiz_runs where id = p_run_id for update;
  if v_run.id is null or v_run.status <> 'processing' then
    return;
  end if;

  update public.daily_quiz_runs
  set status = 'failed', locked_at = null, error = left(coalesce(nullif(p_error, ''), 'Nepoznata greška.'), 2000)
  where id = v_run.id;

  if v_run.attempts >= 3 then
    update public.daily_quiz_schedules
    set next_run_on = v_run.local_date + 1
    where id = v_run.schedule_id;
  end if;
end;
$$;

revoke all on function public.claim_due_daily_quiz_runs(int) from public, anon, authenticated;
revoke all on function public.complete_daily_quiz_run(uuid, jsonb, text[]) from public, anon, authenticated;
revoke all on function public.fail_daily_quiz_run(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_due_daily_quiz_runs(int) to service_role;
grant execute on function public.complete_daily_quiz_run(uuid, jsonb, text[]) to service_role;
grant execute on function public.fail_daily_quiz_run(uuid, text) to service_role;

-- Dnevni kvizovi moraju zadržati datum i posle trigera koji inače automatski
-- imenuje kviz prema predmetu i dodeljenom profilu.
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
  v_daily_date date;
begin
  select daily_local_date into v_daily_date from public.quizzes where id = p_quiz_id;

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
    where l.quiz_id = p_quiz_id and l.child_profile_id is not null
  ) d;

  if v_child_names is not null then
    update public.quizzes
    set title = v_subject_name || ' — ' || v_child_names
      || case when v_daily_date is null then '' else ' — ' || to_char(v_daily_date, 'DD. MM. YYYY.') end
    where id = p_quiz_id;
  end if;
end;
$$;

-- Isti vault podaci već napajaju dispatcher obaveštenja; novi job samo poziva
-- drugu internu funkciju pod istim service_role autorizacionim zaglavljem.
select cron.schedule(
  'process_daily_quizzes',
  '* * * * *',
  $cron$
    select net.http_post(
      url := (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'notification_dispatch_project_url'
      ) || '/functions/v1/process-daily-quizzes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'notification_dispatch_service_role_key'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);
