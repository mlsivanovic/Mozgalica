-- Priroda i društvo za 3. i 4. razred: oblasti, dnevni rasporedi i nazivi kvizova.
alter table public.topics
  drop constraint topics_subject_check,
  add constraint topics_subject_check
    check (subject in ('matematika', 'srpski', 'priroda_drustvo'));

alter table public.daily_quiz_schedules
  drop constraint daily_quiz_schedules_subject_check,
  add constraint daily_quiz_schedules_subject_check
    check (subject in ('matematika', 'srpski', 'priroda_drustvo'));

insert into public.topics (slug, name, sort_order, subject, grade) values
  ('pid-priroda-covek-drustvo-3', 'Priroda, čovek i društvo', 700, 'priroda_drustvo', 3),
  ('pid-orijentacija-3', 'Orijentacija', 710, 'priroda_drustvo', 3),
  ('pid-proslost-3', 'Prošlost', 720, 'priroda_drustvo', 3),
  ('pid-kretanje-3', 'Kretanje', 730, 'priroda_drustvo', 3),
  ('pid-materijali-3', 'Materijali', 740, 'priroda_drustvo', 3),
  ('pid-odlike-srbije-4', 'Odlike Srbije', 800, 'priroda_drustvo', 4),
  ('pid-covek-4', 'Čovek', 810, 'priroda_drustvo', 4),
  ('pid-materijali-4', 'Materijali', 820, 'priroda_drustvo', 4),
  ('pid-proslost-srbije-4', 'Prošlost Srbije', 830, 'priroda_drustvo', 4);

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
    or p_subject not in ('matematika', 'srpski', 'priroda_drustvo')
    or p_grade not in (3, 4, 5)
    or (p_subject in ('srpski', 'priroda_drustvo') and p_grade not in (3, 4))
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
      auth.uid(), p_child_profile_id, p_subject, p_grade, p_source,
      case when p_subject in ('srpski', 'priroda_drustvo') then 5 else p_difficulty end,
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
        difficulty = case when p_subject in ('srpski', 'priroda_drustvo') then 5 else p_difficulty end,
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
    when 'priroda_drustvo' then 'Priroda i društvo'
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
