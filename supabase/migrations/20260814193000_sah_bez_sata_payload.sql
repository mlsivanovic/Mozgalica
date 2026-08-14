-- Partije bez sata zadržavaju null za oba vremena i dok su u toku.
create or replace function public.get_child_profile(p_profile_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile public.child_profiles;
  v_total_stars int;
  v_spendable_stars int;
  v_current_title jsonb;
  v_next_title jsonb;
  v_active_quizzes jsonb;
  v_history jsonb;
  v_active_chess jsonb;
  v_chess_history jsonb;
begin
  select * into v_profile from public.child_profiles where public_token = p_profile_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  v_total_stars := public.fn_profile_total_stars(v_profile.id);
  v_spendable_stars := public.fn_spendable_stars(v_profile.id);
  v_current_title := public.fn_profile_current_title(v_profile.id);

  select jsonb_build_object(
    'name', tl.name, 'minStars', tl.min_stars,
    'starsNeeded', tl.min_stars - v_total_stars, 'avatar', tl.avatar
  ) into v_next_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars > v_total_stars
  order by tl.min_stars limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'quizToken', l.token, 'title', q.title, 'description', q.description,
    'questionCount', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id),
    'attemptState', case when a.id is null then 'new' else 'in_progress' end,
    'answeredCount', coalesce((select count(*) from public.attempt_answers aa
      join public.quiz_questions qq on qq.id = aa.quiz_question_id
      where aa.attempt_id = a.id and public.fn_answer_is_filled(qq.type, aa.answer)), 0),
    'timeLimitSeconds', q.time_limit_seconds, 'remainingSeconds', a.remaining_seconds
  ) order by l.created_at desc), '[]'::jsonb) into v_active_quizzes
  from public.quiz_links l
  join public.quizzes q on q.id = l.quiz_id
  left join public.attempts a on a.child_profile_id = v_profile.id and a.quiz_id = q.id
  where l.child_profile_id = v_profile.id and l.is_active
    and (l.expires_at is null or l.expires_at >= now())
    and (a.id is null or a.status = 'in_progress');

  select coalesce(jsonb_agg(jsonb_build_object(
    'attemptId', a.id, 'title', q.title, 'submittedAt', a.submitted_at,
    'scorePct', a.score_pct, 'starsAwarded', a.stars_awarded, 'pendingReview', a.review_pending
  ) order by a.submitted_at desc), '[]'::jsonb) into v_history
  from public.attempts a join public.quizzes q on q.id = a.quiz_id
  where a.child_profile_id = v_profile.id and a.status = 'submitted';

  select coalesce(jsonb_agg(jsonb_build_object(
    'playToken', g.play_token, 'approximateElo', g.approximate_elo,
    'childColor', g.child_color, 'clockSeconds', g.clock_seconds,
    'status', g.status, 'fen', g.fen, 'turnColor', g.turn_color,
    'whiteRemainingMs', case
      when g.clock_seconds is not null and g.status = 'in_progress'
        and g.turn_color = 'white' and g.turn_started_at is not null
        then greatest(0, g.white_remaining_ms - floor(extract(epoch from (now() - g.turn_started_at)) * 1000)::bigint)
      else g.white_remaining_ms end,
    'blackRemainingMs', case
      when g.clock_seconds is not null and g.status = 'in_progress'
        and g.turn_color = 'black' and g.turn_started_at is not null
        then greatest(0, g.black_remaining_ms - floor(extract(epoch from (now() - g.turn_started_at)) * 1000)::bigint)
      else g.black_remaining_ms end,
    'createdAt', g.created_at
  ) order by g.created_at desc), '[]'::jsonb) into v_active_chess
  from public.chess_games g
  where g.child_profile_id = v_profile.id and g.status in ('assigned', 'in_progress');

  select coalesce(jsonb_agg(jsonb_build_object(
    'gameId', g.id, 'playToken', g.play_token, 'approximateElo', g.approximate_elo,
    'childColor', g.child_color, 'result', g.result, 'termination', g.termination,
    'starsAwarded', g.stars_awarded, 'completedAt', g.completed_at
  ) order by g.completed_at desc), '[]'::jsonb) into v_chess_history
  from public.chess_games g
  where g.child_profile_id = v_profile.id and g.status = 'completed';

  return jsonb_build_object(
    'ok', true, 'name', v_profile.name, 'avatar', v_profile.avatar,
    'totalStars', v_total_stars, 'spendableStars', v_spendable_stars,
    'currentTitle', v_current_title, 'nextTitle', v_next_title,
    'activeQuizzes', v_active_quizzes, 'history', v_history,
    'activeChessGames', v_active_chess, 'chessHistory', v_chess_history
  );
end;
$$;

revoke all on function public.get_child_profile(text) from public;
grant execute on function public.get_child_profile(text) to anon, authenticated;
