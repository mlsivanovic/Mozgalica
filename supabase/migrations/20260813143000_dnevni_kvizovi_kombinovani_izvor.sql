-- Dnevni raspored može za svaku oblast da bira generator ili banku pitanja.
alter table public.daily_quiz_schedules
  drop constraint daily_quiz_schedules_source_check,
  add constraint daily_quiz_schedules_source_check
    check (source in ('generator', 'bank', 'combined'));

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
  select v_schedule.id, izabrana.topic_id
  from unnest(p_topic_ids) as izabrana(topic_id);

  return v_schedule;
end;
$$;
