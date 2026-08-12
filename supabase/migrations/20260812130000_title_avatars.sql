-- Dodavanje kolone avatar u tabelu title_levels i ažuriranje funkcija save_title_levels i get_child_profile.

alter table public.title_levels
  add column if not exists avatar text;

-- 1. Ažuriranje funkcije save_title_levels
create or replace function public.save_title_levels(p_levels jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_distinct_count int;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if jsonb_typeof(p_levels) <> 'array' or jsonb_array_length(p_levels) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_levels');
  end if;

  select count(*), count(distinct min_stars)
  into v_count, v_distinct_count
  from jsonb_to_recordset(p_levels) as x(name text, min_stars int, avatar text);

  if v_count <> v_distinct_count
    or exists (
      select 1
      from jsonb_to_recordset(p_levels) as x(name text, min_stars int, avatar text)
      where coalesce(length(trim(name)), 0) = 0
         or length(trim(name)) > 60
         or min_stars is null
         or min_stars < 0
    )
    or not exists (
      select 1
      from jsonb_to_recordset(p_levels) as x(name text, min_stars int, avatar text)
      where min_stars = 0
    )
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_levels');
  end if;

  delete from public.title_levels where owner_id = auth.uid();

  insert into public.title_levels (owner_id, name, min_stars, avatar)
  select auth.uid(), trim(name), min_stars, avatar
  from jsonb_to_recordset(p_levels) as x(name text, min_stars int, avatar text)
  order by min_stars;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.save_title_levels(jsonb) from public;
grant execute on function public.save_title_levels(jsonb) to authenticated;


-- 2. Ažuriranje funkcije get_child_profile
create or replace function public.get_child_profile(p_profile_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_total_stars int;
  v_current_title jsonb;
  v_next_title jsonb;
  v_active_quizzes jsonb;
  v_history jsonb;
begin
  select * into v_profile
  from public.child_profiles
  where public_token = p_profile_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(sum(stars_awarded), 0)::int
  into v_total_stars
  from public.attempts
  where child_profile_id = v_profile.id
    and status = 'submitted'
    and not review_pending;

  select jsonb_build_object('name', tl.name, 'minStars', tl.min_stars, 'avatar', tl.avatar)
  into v_current_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars <= v_total_stars
  order by tl.min_stars desc
  limit 1;

  select jsonb_build_object(
    'name', tl.name,
    'minStars', tl.min_stars,
    'starsNeeded', tl.min_stars - v_total_stars,
    'avatar', tl.avatar
  )
  into v_next_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars > v_total_stars
  order by tl.min_stars
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'quizToken', l.token,
    'title', q.title,
    'description', q.description,
    'questionCount', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id),
    'attemptState', case when a.id is null then 'new' else 'in_progress' end,
    'answeredCount', coalesce((
      select count(*)
      from public.attempt_answers aa
      join public.quiz_questions qq on qq.id = aa.quiz_question_id
      where aa.attempt_id = a.id
        and public.fn_answer_is_filled(qq.type, aa.answer)
    ), 0),
    'timeLimitSeconds', q.time_limit_seconds,
    'remainingSeconds', a.remaining_seconds
  ) order by l.created_at desc), '[]'::jsonb)
  into v_active_quizzes
  from public.quiz_links l
  join public.quizzes q on q.id = l.quiz_id
  left join public.attempts a
    on a.child_profile_id = v_profile.id and a.quiz_id = q.id
  where l.child_profile_id = v_profile.id
    and l.is_active
    and (l.expires_at is null or l.expires_at >= now())
    and (a.id is null or a.status = 'in_progress');

  select coalesce(jsonb_agg(jsonb_build_object(
    'attemptId', a.id,
    'title', q.title,
    'submittedAt', a.submitted_at,
    'scorePct', a.score_pct,
    'starsAwarded', a.stars_awarded,
    'pendingReview', a.review_pending
  ) order by a.submitted_at desc), '[]'::jsonb)
  into v_history
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  where a.child_profile_id = v_profile.id and a.status = 'submitted';

  return jsonb_build_object(
    'ok', true,
    'name', v_profile.name,
    'avatar', v_profile.avatar,
    'totalStars', v_total_stars,
    'currentTitle', v_current_title,
    'nextTitle', v_next_title,
    'activeQuizzes', v_active_quizzes,
    'history', v_history
  );
end;
$$;

revoke all on function public.get_child_profile(text) from public;
grant execute on function public.get_child_profile(text) to anon, authenticated;
