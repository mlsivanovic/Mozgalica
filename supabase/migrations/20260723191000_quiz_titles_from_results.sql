-- Stari kvizovi možda nemaju profilni quiz_link, ali sada imaju povezane pokušaje.
-- I oni dobijaju isti automatski naziv kao nove profilne dodele.
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
    from public.child_profiles cp
    where cp.id in (
      select l.child_profile_id
      from public.quiz_links l
      where l.quiz_id = p_quiz_id
        and l.child_profile_id is not null
      union
      select a.child_profile_id
      from public.attempts a
      where a.quiz_id = p_quiz_id
        and a.child_profile_id is not null
    )
  ) d;

  if v_child_names is not null then
    update public.quizzes
    set title = v_subject_name || ' — ' || v_child_names
    where id = p_quiz_id;
  end if;
end;
$$;

revoke all on function public.fn_refresh_quiz_auto_title(uuid) from public;

create or replace function public.fn_refresh_quiz_title_from_attempt()
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

create trigger trg_attempts_refresh_quiz_title
  after insert or update of quiz_id, child_profile_id or delete on public.attempts
  for each row execute function public.fn_refresh_quiz_title_from_attempt();

do $$
declare
  v_quiz_id uuid;
begin
  for v_quiz_id in
    select distinct a.quiz_id
    from public.attempts a
    where a.child_profile_id is not null
  loop
    perform public.fn_refresh_quiz_auto_title(v_quiz_id);
  end loop;
end;
$$;
