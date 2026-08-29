-- Matematika za 5. razred: oblasti, dozvoljeni razred i dnevni generator.
alter table public.topics drop constraint topics_grade_check;
alter table public.topics add constraint topics_grade_check check (grade in (3, 4, 5));

alter table public.quizzes drop constraint quizzes_grade_check;
alter table public.quizzes add constraint quizzes_grade_check check (grade in (3, 4, 5));

alter table public.daily_quiz_schedules drop constraint daily_quiz_schedules_grade_check;
alter table public.daily_quiz_schedules add constraint daily_quiz_schedules_grade_check check (grade in (3, 4, 5));

insert into public.topics (slug, name, sort_order, subject, grade) values
  ('prirodni-brojevi-5', 'Prirodni brojevi i izrazi', 500, 'matematika', 5),
  ('deljivost-5', 'Deljivost', 510, 'matematika', 5),
  ('skupovi-i-logika-5', 'Skupovi i logika', 520, 'matematika', 5),
  ('prosti-brojevi-5', 'Prosti brojevi', 530, 'matematika', 5),
  ('nzd-i-nzs-5', 'NZD i NZS', 540, 'matematika', 5),
  ('tacke-prave-i-duzi-5', 'Tačke, prave i duži', 550, 'matematika', 5),
  ('kruznica-i-krug-5', 'Kružnica i krug', 560, 'matematika', 5),
  ('centralna-simetrija-i-translacija-5', 'Centralna simetrija i translacija', 570, 'matematika', 5),
  ('uglovi-5', 'Uglovi', 580, 'matematika', 5),
  ('razlomci-5', 'Razlomci', 590, 'matematika', 5),
  ('decimalni-brojevi-5', 'Decimalni brojevi', 600, 'matematika', 5),
  ('operacije-sa-razlomcima-5', 'Operacije sa razlomcima', 610, 'matematika', 5),
  ('jednacine-i-nejednacine-5', 'Jednačine i nejednačine', 620, 'matematika', 5),
  ('procenti-prosek-i-razmera-5', 'Procenti, prosek i razmera', 630, 'matematika', 5),
  ('obrada-podataka-5', 'Obrada podataka', 640, 'matematika', 5),
  ('osna-simetrija-5', 'Osna simetrija', 650, 'matematika', 5);

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
    or p_subject not in ('matematika', 'srpski')
    or p_grade not in (3, 4, 5)
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
