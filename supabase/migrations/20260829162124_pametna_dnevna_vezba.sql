-- Pametna vežba koristi postojeći dnevni raspored, ali raspodelu pitanja menja
-- prema rezultatima deteta u poslednjih 90 dana. Nedeljni izveštaj obuhvata
-- prethodnu lokalnu sedmicu i šalje se administratoru kroz postojeći outbox.

alter table public.daily_quiz_schedules
  add column smart_mode boolean not null default false,
  add column weekly_report_enabled boolean not null default false,
  add column weekly_report_enabled_at timestamptz,
  add constraint daily_quiz_schedules_weekly_report_check
    check (not weekly_report_enabled or smart_mode);

create table public.smart_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.daily_quiz_schedules (id) on delete restrict,
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  unique (schedule_id, week_start),
  check (week_end = week_start + 6),
  check (jsonb_typeof(summary) = 'object')
);

alter table public.smart_weekly_reports enable row level security;
revoke all on public.smart_weekly_reports from anon, authenticated;

alter table public.notifications
  add column weekly_report_id uuid references public.smart_weekly_reports (id) on delete cascade,
  drop constraint notifications_event_type_check,
  add constraint notifications_event_type_check
    check (event_type in (
      'new_quiz', 'quiz_completed', 'new_chess_game', 'chess_game_completed', 'weekly_report'
    ));

create unique index uq_notifications_weekly_report
  on public.notifications (weekly_report_id, recipient_type)
  where event_type = 'weekly_report';

drop function if exists public.save_daily_quiz_schedule(
  uuid, uuid, text, smallint, text, uuid[], smallint, text, int, int,
  boolean, boolean, int, time
);

create function public.save_daily_quiz_schedule(
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
  p_daily_time time,
  p_smart_mode boolean default false,
  p_weekly_report_enabled boolean default false
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
  v_weekly_enabled boolean := coalesce(p_smart_mode, false) and coalesce(p_weekly_report_enabled, false);
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  if p_source not in ('generator', 'bank', 'combined')
    or p_subject not in ('matematika', 'srpski')
    or p_grade not in (3, 4)
  then
    raise exception 'Neispravna podešavanja izvora pitanja.';
  end if;

  if coalesce(cardinality(p_topic_ids), 0) = 0 then
    raise exception 'Izaberi najmanje jednu oblast.';
  end if;

  if exists (
    select 1
    from unnest(p_topic_ids) as izabrana(topic_id)
    left join public.topics t on t.id = izabrana.topic_id
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
      pass_threshold_pct, daily_time, next_run_on, smart_mode,
      weekly_report_enabled, weekly_report_enabled_at
    ) values (
      auth.uid(), p_child_profile_id, p_subject, p_grade, p_source, p_difficulty,
      nullif(p_question_type, 'auto'), p_question_count, p_time_limit_seconds,
      p_shuffle_questions, p_shuffle_answers, p_pass_threshold_pct, p_daily_time,
      v_next_run_on, coalesce(p_smart_mode, false), v_weekly_enabled,
      case when v_weekly_enabled then now() else null end
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
        daily_time = p_daily_time,
        smart_mode = coalesce(p_smart_mode, false),
        weekly_report_enabled = v_weekly_enabled,
        weekly_report_enabled_at = case
          when v_weekly_enabled and not v_schedule.weekly_report_enabled then now()
          when v_weekly_enabled then v_schedule.weekly_report_enabled_at
          else null
        end
    where id = v_schedule.id
    returning * into v_schedule;

    delete from public.daily_quiz_schedule_topics where schedule_id = v_schedule.id;
  end if;

  insert into public.daily_quiz_schedule_topics (schedule_id, topic_id)
  select v_schedule.id, izabrana.topic_id
  from unnest(p_topic_ids) as izabrana(topic_id);

  return v_schedule;
end;
$$;

drop function if exists public.list_daily_quiz_schedules();

create function public.list_daily_quiz_schedules()
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
  smart_mode boolean,
  weekly_report_enabled boolean,
  next_run_on date,
  last_sent_at timestamptz,
  last_quiz_id uuid,
  last_error text,
  last_weekly_report_at timestamptz
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
    s.timezone, s.is_active, s.smart_mode, s.weekly_report_enabled, s.next_run_on,
    poslednji.completed_at, poslednji.quiz_id, greska.error, izvestaj.created_at
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
  left join lateral (
    select r.created_at
    from public.smart_weekly_reports r
    where r.schedule_id = s.id
    order by r.week_start desc
    limit 1
  ) izvestaj on true
  where s.owner_id = auth.uid() and s.deleted_at is null and public.fn_is_admin()
  group by s.id, cp.id, poslednji.completed_at, poslednji.quiz_id, greska.error, izvestaj.created_at
  order by s.is_active desc, s.daily_time, cp.name;
$$;

drop function if exists public.claim_due_daily_quiz_runs(int);

create function public.claim_due_daily_quiz_runs(p_limit int default 20)
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
  smart_mode boolean,
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
    on conflict on constraint daily_quiz_runs_schedule_id_local_date_key do nothing;

    select r.* into v_run
    from public.daily_quiz_runs r
    where r.schedule_id = v_schedule.id and r.local_date = v_local_date
    for update;

    if v_run.status = 'succeeded'
      or (v_run.status = 'processing' and v_run.locked_at > now() - interval '10 minutes')
    then
      continue;
    end if;

    if v_run.attempts >= 3 then
      update public.daily_quiz_schedules s
      set next_run_on = v_local_date + 1
      where s.id = v_schedule.id;
      continue;
    end if;

    update public.daily_quiz_runs r
    set status = 'processing', attempts = r.attempts + 1, locked_at = now(), error = null
    where r.id = v_run.id
    returning r.* into v_run;

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
      v_schedule.pass_threshold_pct, v_schedule.smart_mode, v_local_date,
      coalesce((select array_agg(distinct k.question_key)
        from public.daily_quiz_runs prethodni
        join public.daily_quiz_run_question_keys k on k.run_id = prethodni.id
        where prethodni.schedule_id = v_schedule.id and prethodni.status = 'succeeded'), '{}'::text[]);
    v_count := v_count + 1;
  end loop;
end;
$$;

create or replace function public.get_smart_daily_quiz_topics(p_schedule_id uuid)
returns table (
  topic_id uuid,
  topic_slug text,
  topic_name text,
  answers_count int,
  success_pct numeric,
  last_answered_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.daily_quiz_schedules;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Nedozvoljena operacija.';
  end if;

  select * into v_schedule
  from public.daily_quiz_schedules
  where id = p_schedule_id and smart_mode and deleted_at is null;

  if v_schedule.id is null then
    raise exception 'Pametni dnevni raspored nije pronađen.';
  end if;

  return query
  with izabrane as (
    select t.id, t.slug, t.name, t.sort_order
    from public.daily_quiz_schedule_topics st
    join public.topics t on t.id = st.topic_id
    where st.schedule_id = v_schedule.id
  ), odgovori as (
    select qq.topic_id, aa.is_correct, a.submitted_at
    from public.attempts a
    join public.quizzes q on q.id = a.quiz_id and q.owner_id = v_schedule.owner_id
    join public.quiz_questions qq on qq.quiz_id = a.quiz_id
    left join public.attempt_answers aa
      on aa.attempt_id = a.id and aa.quiz_question_id = qq.id
    where a.child_profile_id = v_schedule.child_profile_id
      and a.status = 'submitted'
      and not a.review_pending
      and a.submitted_at >= now() - interval '90 days'
      and qq.topic_id in (select id from izabrane)
  )
  select
    i.id,
    i.slug,
    i.name,
    count(o.topic_id)::int,
    round(100.0 * count(*) filter (where o.is_correct) / nullif(count(o.topic_id), 0), 1),
    max(o.submitted_at)
  from izabrane i
  left join odgovori o on o.topic_id = i.id
  group by i.id, i.slug, i.name, i.sort_order
  order by i.sort_order, i.name;
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
    case when v_schedule.smart_mode then 'Pametna vežba' else v_subject_name end
      || ' — ' || v_profile.name || ' — ' || to_char(v_run.local_date, 'DD. MM. YYYY.'),
    case when v_schedule.smart_mode
      then 'Pametna dnevna vežba prilagođena dosadašnjem napretku (' || v_subject_name || ' — ' || v_schedule.grade || '. razred)'
      else 'Dnevni kviz (' || v_subject_name || ' — ' || v_schedule.grade || '. razred)'
    end,
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

create or replace function public.process_due_smart_weekly_reports(p_limit int default 50)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.daily_quiz_schedules;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
  v_current_week_start date := date_trunc('week', now() at time zone 'Europe/Belgrade')::date;
  v_week_start date := v_current_week_start - 7;
  v_week_end date := v_current_week_start - 1;
  v_summary jsonb;
  v_report_id uuid;
  v_notification_id uuid;
  v_child_name text;
  v_avg numeric;
  v_count int := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Nedozvoljena operacija.';
  end if;

  for v_schedule in
    select s.*
    from public.daily_quiz_schedules s
    where s.smart_mode
      and s.weekly_report_enabled
      and s.is_active
      and s.deleted_at is null
      and s.weekly_report_enabled_at < (v_current_week_start::timestamp at time zone 'Europe/Belgrade')
      and (v_local_now::date > v_current_week_start or s.daily_time <= v_local_now::time)
      and not exists (
        select 1 from public.smart_weekly_reports r
        where r.schedule_id = s.id and r.week_start = v_week_start
      )
    order by s.created_at
    for update of s skip locked
  loop
    exit when v_count >= greatest(1, least(coalesce(p_limit, 50), 100));

    with relevant as (
      select a.*
      from public.attempts a
      join public.quizzes q on q.id = a.quiz_id
      where q.daily_schedule_id = v_schedule.id
        and a.child_profile_id = v_schedule.child_profile_id
        and a.status = 'submitted'
        and not a.review_pending
        and a.submitted_at >= (v_week_start::timestamp at time zone 'Europe/Belgrade')
        and a.submitted_at < ((v_week_end + 1)::timestamp at time zone 'Europe/Belgrade')
    ), prethodni as (
      select round(avg(a.score_pct), 1) as avg_score_pct
      from public.attempts a
      join public.quizzes q on q.id = a.quiz_id
      where q.daily_schedule_id = v_schedule.id
        and a.child_profile_id = v_schedule.child_profile_id
        and a.status = 'submitted'
        and not a.review_pending
        and a.submitted_at >= ((v_week_start - 7)::timestamp at time zone 'Europe/Belgrade')
        and a.submitted_at < (v_week_start::timestamp at time zone 'Europe/Belgrade')
    ), topic_grouped as (
      select
        qq.topic_name,
        count(qq.id)::int as question_count,
        count(qq.id) filter (where aa.is_correct)::int as correct_count,
        round(100.0 * count(qq.id) filter (where aa.is_correct) / nullif(count(qq.id), 0), 1) as success_pct
      from relevant r
      join public.quiz_questions qq on qq.quiz_id = r.quiz_id
      left join public.attempt_answers aa
        on aa.attempt_id = r.id and aa.quiz_question_id = qq.id
      group by qq.topic_name
    ), totals as (
      select
        count(*)::int as completed_attempts,
        count(distinct (submitted_at at time zone 'Europe/Belgrade')::date)::int as active_days,
        round(avg(score_pct), 1) as avg_score_pct,
        coalesce(sum(correct_count), 0)::int as correct_count
      from relevant
    ), question_total as (
      select count(qq.id)::int as question_count
      from relevant r
      join public.quiz_questions qq on qq.quiz_id = r.quiz_id
    )
    select jsonb_build_object(
      'completedAttempts', totals.completed_attempts,
      'activeDays', totals.active_days,
      'avgScorePct', totals.avg_score_pct,
      'previousAvgScorePct', prethodni.avg_score_pct,
      'trendPct', case
        when totals.avg_score_pct is null or prethodni.avg_score_pct is null then null
        else round(totals.avg_score_pct - prethodni.avg_score_pct, 1)
      end,
      'questionCount', question_total.question_count,
      'correctCount', totals.correct_count,
      'topics', coalesce((
        select jsonb_agg(jsonb_build_object(
          'topicName', g.topic_name,
          'questionCount', g.question_count,
          'correctCount', g.correct_count,
          'successPct', g.success_pct
        ) order by g.success_pct, g.question_count desc, g.topic_name)
        from topic_grouped g
      ), '[]'::jsonb),
      'practiceTopics', coalesce((
        select jsonb_agg(jsonb_build_object(
          'topicName', p.topic_name,
          'questionCount', p.question_count,
          'successPct', p.success_pct
        ) order by p.success_pct, p.question_count desc, p.topic_name)
        from (
          select * from topic_grouped
          where question_count >= 2 and success_pct < 70
          order by success_pct, question_count desc, topic_name
          limit 3
        ) p
      ), '[]'::jsonb),
      'strongTopics', coalesce((
        select jsonb_agg(jsonb_build_object(
          'topicName', s.topic_name,
          'questionCount', s.question_count,
          'successPct', s.success_pct
        ) order by s.success_pct desc, s.question_count desc, s.topic_name)
        from (
          select * from topic_grouped
          where question_count >= 2 and success_pct >= 80
          order by success_pct desc, question_count desc, topic_name
          limit 3
        ) s
      ), '[]'::jsonb)
    )
    into v_summary
    from totals cross join prethodni cross join question_total;

    insert into public.smart_weekly_reports (
      schedule_id, owner_id, child_profile_id, week_start, week_end, summary
    ) values (
      v_schedule.id, v_schedule.owner_id, v_schedule.child_profile_id,
      v_week_start, v_week_end, v_summary
    ) returning id into v_report_id;

    select name into v_child_name
    from public.child_profiles where id = v_schedule.child_profile_id;
    v_avg := (v_summary ->> 'avgScorePct')::numeric;

    insert into public.notifications (
      owner_id, recipient_type, event_type, weekly_report_id,
      title, body, target_url
    ) values (
      v_schedule.owner_id,
      'admin',
      'weekly_report',
      v_report_id,
      'Nedeljni izveštaj: ' || coalesce(v_child_name, 'dete'),
      case
        when coalesce((v_summary ->> 'completedAttempts')::int, 0) = 0
          then coalesce(v_child_name, 'Dete') || ' nije završio/la nijednu pametnu vežbu prethodne nedelje.'
        else coalesce(v_child_name, 'Dete') || ' je završio/la '
          || (v_summary ->> 'completedAttempts') || ' vežbi uz prosečan rezultat '
          || coalesce(v_avg::text, '0') || '%.'
      end,
      '/admin/rezultati/statistika/' || v_schedule.child_profile_id
    ) returning id into v_notification_id;

    perform public.fn_enqueue_push_deliveries(
      v_notification_id, 'admin', v_schedule.owner_id, null
    );
    insert into public.notification_deliveries (notification_id, channel)
    values (v_notification_id, 'email')
    on conflict do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.save_daily_quiz_schedule(
  uuid, uuid, text, smallint, text, uuid[], smallint, text, int, int,
  boolean, boolean, int, time, boolean, boolean
) from public, anon;
revoke all on function public.list_daily_quiz_schedules() from public, anon;
revoke all on function public.claim_due_daily_quiz_runs(int) from public, anon, authenticated;
revoke all on function public.get_smart_daily_quiz_topics(uuid) from public, anon, authenticated;
revoke all on function public.process_due_smart_weekly_reports(int) from public, anon, authenticated;

grant execute on function public.save_daily_quiz_schedule(
  uuid, uuid, text, smallint, text, uuid[], smallint, text, int, int,
  boolean, boolean, int, time, boolean, boolean
) to authenticated;
grant execute on function public.list_daily_quiz_schedules() to authenticated;
grant execute on function public.claim_due_daily_quiz_runs(int) to service_role;
grant execute on function public.get_smart_daily_quiz_topics(uuid) to service_role;
grant execute on function public.process_due_smart_weekly_reports(int) to service_role;
