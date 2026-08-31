-- Ponovni pokušaj netačnih zadataka ostaje samo za matematiku.
-- Generator tamo pravi novu verziju sa drugim brojevima; za prirodu i društvo
-- (i ostale predmete) ponavljanje istog činjeničnog pitanja posle viđenog
-- tačnog odgovora nije smisleno.

create or replace function public.fn_kviz_dozvoljava_ponovni(p_quiz_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.quiz_questions where quiz_id = p_quiz_id
  ) and not exists (
    select 1
    from public.quiz_questions qq
    left join public.topics t on t.id = qq.topic_id
    where qq.quiz_id = p_quiz_id
      and t.subject is distinct from 'matematika'
  );
$$;

revoke all on function public.fn_kviz_dozvoljava_ponovni(uuid) from public, anon, authenticated;

create or replace function public.fn_build_result(p_attempt_id uuid, p_quiz public.quizzes)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_questions jsonb;
  v_attempts_left int;
  v_profile_token text;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;

  if v_attempt.child_profile_id is not null then
    select public_token into v_profile_token
    from public.child_profiles where id = v_attempt.child_profile_id;
    v_attempts_left := 0;
  else
    select v_link.max_attempts - count(*) filter (where a2.status = 'submitted')
    into v_attempts_left
    from public.quiz_links v_link
    left join public.attempts a2 on a2.quiz_link_id = v_link.id
    where v_link.id = v_attempt.quiz_link_id
    group by v_link.max_attempts;
  end if;

  if not p_quiz.show_result then
    return jsonb_build_object(
      'showResult', false,
      'accessMode', case when v_attempt.child_profile_id is null then 'generic' else 'profile' end,
      'profileToken', v_profile_token,
      'starsAwarded', v_attempt.stars_awarded,
      'attemptsLeft', v_attempts_left
    );
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', qq.id,
    'type', qq.type,
    'text', qq.text,
    'options', qq.options,
    'points', qq.points,
    'answer', aa.answer,
    'isCorrect', coalesce(aa.is_correct, false),
    'awardedPoints', coalesce(aa.awarded_points, 0),
    'correct', case when p_quiz.show_correct then qq.correct else null end,
    'explanation', case when p_quiz.show_correct then qq.explanation else null end,
    'topicSlug', t.slug
  ) order by qq.position)
  into v_questions
  from public.quiz_questions qq
  left join public.attempt_answers aa
    on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  left join public.topics t on t.id = qq.topic_id
  where qq.quiz_id = p_quiz.id;

  return jsonb_build_object(
    'showResult', true,
    'showCorrect', p_quiz.show_correct,
    'accessMode', case when v_attempt.child_profile_id is null then 'generic' else 'profile' end,
    'profileToken', v_profile_token,
    'totalPoints', v_attempt.total_points,
    'maxPoints', v_attempt.max_points,
    'scorePct', v_attempt.score_pct,
    'correctCount', v_attempt.correct_count,
    'incorrectCount', v_attempt.incorrect_count,
    'passed', v_attempt.passed,
    'passThresholdPct', p_quiz.pass_threshold_pct,
    'attemptsLeft', v_attempts_left,
    'pendingReview', coalesce(v_attempt.review_pending, false),
    'starsAwarded', v_attempt.stars_awarded,
    'questions', v_questions,
    'retry', jsonb_build_object(
      'available', p_quiz.show_correct
        and not coalesce(v_attempt.review_pending, false)
        and coalesce(v_attempt.incorrect_count, 0) > 0
        and v_attempt.retry_submitted_at is null
        and public.fn_kviz_dozvoljava_ponovni(p_quiz.id),
      'explanationsSeen', v_attempt.explanations_seen_at is not null,
      'started', exists (
        select 1 from public.attempt_retry_questions r where r.attempt_id = p_attempt_id
      ),
      'submitted', v_attempt.retry_submitted_at is not null,
      'allCorrect', case when v_attempt.retry_submitted_at is null then null
        else not exists (
          select 1 from public.attempt_retry_questions r
          where r.attempt_id = p_attempt_id and r.is_correct is distinct from true
        )
      end
    )
  );
end;
$$;

create or replace function public.start_retry(p_attempt_token text, p_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_q jsonb;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'not_submitted');
  end if;
  if coalesce(v_attempt.review_pending, false) then
    return jsonb_build_object('ok', false, 'error', 'pending_review');
  end if;
  if not public.fn_kviz_dozvoljava_ponovni(v_attempt.quiz_id) then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if coalesce(v_attempt.incorrect_count, 0) = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_incorrect');
  end if;
  if v_attempt.retry_submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'already_locked');
  end if;
  if v_attempt.explanations_seen_at is null then
    return jsonb_build_object('ok', false, 'error', 'explanations_not_seen');
  end if;
  if exists (select 1 from public.attempt_retry_questions r where r.attempt_id = v_attempt.id) then
    return jsonb_build_object('ok', false, 'error', 'already_started');
  end if;
  if jsonb_typeof(p_questions) <> 'array'
    or jsonb_array_length(p_questions) <> v_attempt.incorrect_count then
    return jsonb_build_object('ok', false, 'error', 'bad_count');
  end if;

  -- Osnovna validacija oblika svakog novog pitanja (izuzeci iz check ograničenja
  -- bi inace prekinuli funkciju bez jasne greške detetu)
  for v_q in select * from jsonb_array_elements(p_questions)
  loop
    if v_q->>'type' not in ('single', 'multi', 'numeric', 'text', 'truefalse', 'matching')
      or nullif(trim(coalesce(v_q->>'text', '')), '') is null
      or v_q->'correct' is null
      or jsonb_typeof(v_q->'correct') <> 'object'
      or coalesce(v_q->>'points', '') !~ '^[1-9][0-9]{0,2}$'
      or coalesce(v_q->>'sourceId', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then
      return jsonb_build_object('ok', false, 'error', 'bad_payload');
    end if;
  end loop;

  -- Svaki sourceId mora biti jedinstven i pripadati netačnim pitanjima ovog pokušaja
  if exists (
    select 1
    from jsonb_array_elements(p_questions) q
    where (q->>'sourceId') not in (
      select aa.quiz_question_id::text
      from public.attempt_answers aa
      where aa.attempt_id = v_attempt.id and aa.is_correct = false
    )
  ) or exists (
    select 1
    from jsonb_array_elements(p_questions) q
    group by q->>'sourceId'
    having count(*) > 1
  ) then
    return jsonb_build_object('ok', false, 'error', 'bad_source');
  end if;

  insert into public.attempt_retry_questions (
    attempt_id, position, source_quiz_question_id, type, text,
    options, correct, explanation, points
  )
  select
    v_attempt.id,
    (ord - 1)::int,
    (q->>'sourceId')::uuid,
    q->>'type',
    q->>'text',
    q->'options',
    q->'correct',
    q->>'explanation',
    (q->>'points')::int
  from jsonb_array_elements(p_questions) with ordinality as t(q, ord);

  return jsonb_build_object('ok', true) || public.fn_build_retry_result(v_attempt.id, false);
end;
$$;

revoke all on function public.start_retry(text, jsonb) from public;
grant execute on function public.start_retry(text, jsonb) to anon, authenticated;
