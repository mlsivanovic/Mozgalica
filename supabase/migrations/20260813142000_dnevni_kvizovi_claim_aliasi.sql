-- Izlazne kolone RETURNS TABLE postaju PL/pgSQL promenljive, pa su neoznačeni
-- schedule_id/local_date bili dvosmisleni čim postoji raspored za preuzimanje.
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
      v_schedule.pass_threshold_pct, v_local_date,
      coalesce((select array_agg(distinct k.question_key)
        from public.daily_quiz_runs prethodni
        join public.daily_quiz_run_question_keys k on k.run_id = prethodni.id
        where prethodni.schedule_id = v_schedule.id and prethodni.status = 'succeeded'), '{}'::text[]);
    v_count := v_count + 1;
  end loop;
end;
$$;
