-- Mozgalica: čuvanje odgovora i ocenjivanje — ISKLJUČIVO na serveru.
-- Frontend nikad ne odlučuje da li je odgovor tačan.

-- ---------------------------------------------------------------------------
-- fn_normalize_text — lower+trim+kolaps razmaka+foldovanje srpskih dijakritika
-- ---------------------------------------------------------------------------
create or replace function public.fn_normalize_text(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(trim(
      translate(coalesce(p, ''),
        'čćšžđČĆŠŽĐ',
        'ccszdCCSZD'
      )
    )),
    '\s+', ' ', 'g'
  )
$$;

-- ---------------------------------------------------------------------------
-- fn_grade_answer — ocenjuje jedan odgovor prema tipu pitanja i snapshot correct
-- Vraća jsonb {"isCorrect": bool}
-- ---------------------------------------------------------------------------
create or replace function public.fn_grade_answer(p_type text, p_correct jsonb, p_answer jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_correct_ids text[];
  v_answer_ids text[];
  v_num_correct numeric;
  v_num_answer numeric;
  v_pairs_correct jsonb;
  v_pairs_answer jsonb;
begin
  if p_answer is null then
    return false;
  end if;

  case p_type
    when 'single' then
      return (p_answer->>'optionId') is not null
        and (p_answer->>'optionId') = (p_correct->>'optionId');

    when 'truefalse' then
      return (p_answer->>'value') is not null
        and (p_answer->>'value')::boolean = (p_correct->>'value')::boolean;

    when 'multi' then
      select array_agg(x order by x) into v_correct_ids
      from jsonb_array_elements_text(coalesce(p_correct->'optionIds', '[]'::jsonb)) x;
      select array_agg(x order by x) into v_answer_ids
      from jsonb_array_elements_text(coalesce(p_answer->'optionIds', '[]'::jsonb)) x;
      return v_correct_ids is not null and v_answer_ids is not null
        and v_correct_ids = v_answer_ids;

    when 'numeric' then
      begin
        -- Dozvoljavamo zarez kao decimalni separator (srpska notacija)
        v_num_answer := replace(trim(p_answer->>'value'), ',', '.')::numeric;
      exception when others then
        return false;
      end;
      v_num_correct := (p_correct->>'value')::numeric;
      return abs(v_num_answer - v_num_correct) < 0.0000001;

    when 'text' then
      return exists (
        select 1
        from jsonb_array_elements_text(coalesce(p_correct->'accept', '[]'::jsonb)) prihvaceno
        where public.fn_normalize_text(prihvaceno) = public.fn_normalize_text(p_answer->>'text')
          and public.fn_normalize_text(p_answer->>'text') <> ''
      );

    when 'matching' then
      v_pairs_correct := coalesce(p_correct->'pairs', '{}'::jsonb);
      v_pairs_answer := coalesce(p_answer->'pairs', '{}'::jsonb);
      return v_pairs_correct = v_pairs_answer;

    else
      return false;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_recompute_attempt — preračuna totale pokušaja iz attempt_answers
-- ---------------------------------------------------------------------------
create or replace function public.fn_recompute_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_max int;
  v_correct int;
  v_incorrect int;
  v_pct numeric;
  v_quiz public.quizzes;
begin
  select q.* into v_quiz
  from public.attempts a join public.quizzes q on q.id = a.quiz_id
  where a.id = p_attempt_id;

  select
    coalesce(sum(aa.awarded_points), 0),
    coalesce(sum(qq.points), 0),
    count(*) filter (where aa.is_correct),
    count(*) filter (where not aa.is_correct)
  into v_total, v_max, v_correct, v_incorrect
  from public.quiz_questions qq
  left join public.attempt_answers aa on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = v_quiz.id;

  v_pct := case when v_max > 0 then round(100.0 * v_total / v_max, 1) else 0 end;

  update public.attempts set
    total_points = v_total,
    max_points = v_max,
    correct_count = v_correct,
    incorrect_count = v_incorrect,
    score_pct = v_pct,
    passed = v_pct >= v_quiz.pass_threshold_pct
  where id = p_attempt_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- save_answers — autosave; dozvoljen do deadline + 30s grace perioda
-- ---------------------------------------------------------------------------
create or replace function public.save_answers(p_attempt_token text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_item record;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;
  if v_attempt.deadline_at is not null and v_attempt.deadline_at + interval '30 seconds' < now() then
    return jsonb_build_object('ok', false, 'error', 'deadline_passed');
  end if;

  for v_item in select * from jsonb_each(coalesce(p_answers, '{}'::jsonb))
  loop
    -- Samo pitanja koja pripadaju OVOM pokušaju (layout) mogu da se sačuvaju
    if not exists (
      select 1 from jsonb_array_elements(v_attempt.layout) l where (l->>'qq') = v_item.key
    ) then
      continue;
    end if;
    insert into public.attempt_answers (attempt_id, quiz_question_id, answer, answered_at)
    values (v_attempt.id, v_item.key::uuid, v_item.value, now())
    on conflict (attempt_id, quiz_question_id)
    do update set answer = excluded.answer, answered_at = excluded.answered_at;
  end loop;

  -- p_answers je jsonb OBJEKAT (mapa questionId → odgovor), ne niz —
  -- jsonb_array_length bi ovde bacio izuzetak i lažno prijavio neuspeh
  return jsonb_build_object(
    'ok', true,
    'saved', (select count(*) from jsonb_object_keys(coalesce(p_answers, '{}'::jsonb))),
    'serverNow', now()
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'save_failed');
end;
$$;

revoke all on function public.save_answers(text, jsonb) from public;
grant execute on function public.save_answers(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_attempt — atomska predaja: claim, ocenjivanje, totali, mejl (async)
-- ---------------------------------------------------------------------------
create or replace function public.submit_attempt(p_attempt_token text, p_answers jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_quiz public.quizzes;
  v_claimed boolean;
  v_qq public.quiz_questions;
  v_answer jsonb;
  v_is_correct boolean;
  v_points int;
  v_result jsonb;
  v_notify boolean;
  v_log_id uuid;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_quiz from public.quizzes where id = v_attempt.quiz_id;

  -- Ako je već predat, vrati isti rezultat (idempotentno za offline retry)
  if v_attempt.status = 'submitted' then
    v_result := public.fn_build_result(v_attempt.id, v_quiz);
    return v_result || jsonb_build_object('ok', true, 'alreadySubmitted', true);
  end if;
  if v_attempt.status = 'expired' then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- Poslednji batch odgovora (npr. finalni flush pre predaje)
  if p_answers is not null then
    perform public.save_answers(p_attempt_token, p_answers);
    select * into v_attempt from public.attempts where id = v_attempt.id;
  end if;

  -- Atomski claim — sprečava duplo slanje pri konkurentnim pozivima.
  -- FOUND (ne varijabla iz RETURNING) je pouzdan indikator da je red stvarno pogođen.
  update public.attempts
  set status = 'submitted', submitted_at = now(),
      duration_sec = extract(epoch from (now() - started_at))::int
  where id = v_attempt.id and status = 'in_progress';
  v_claimed := found;

  if not v_claimed then
    -- Neko drugi je u međuvremenu već predao — vrati postojeći rezultat
    v_result := public.fn_build_result(v_attempt.id, v_quiz);
    return v_result || jsonb_build_object('ok', true, 'alreadySubmitted', true);
  end if;

  -- Server-side ocenjivanje svih pitanja iz snapshot-a (uključujući neodgovorena)
  for v_qq in select * from public.quiz_questions where quiz_id = v_quiz.id
  loop
    -- v_answer se MORA resetovati svaki krug: kad pitanje nema sačuvan odgovor,
    -- SELECT INTO ne menja promenljivu i bez ovoga bi ostao odgovor iz prethodne iteracije
    v_answer := null;
    select answer into v_answer
    from public.attempt_answers where attempt_id = v_attempt.id and quiz_question_id = v_qq.id;

    v_is_correct := coalesce(public.fn_grade_answer(v_qq.type, v_qq.correct, v_answer), false);
    v_points := case when v_is_correct then v_qq.points else 0 end;

    insert into public.attempt_answers (attempt_id, quiz_question_id, answer, is_correct, awarded_points, graded_by)
    values (v_attempt.id, v_qq.id, v_answer, v_is_correct, v_points, 'auto')
    on conflict (attempt_id, quiz_question_id)
    do update set is_correct = excluded.is_correct, awarded_points = excluded.awarded_points;
  end loop;

  perform public.fn_recompute_attempt(v_attempt.id);

  -- Mejl obaveštenje — asinhrono, pad slanja ne sme oboriti predaju kviza
  begin
    select coalesce(s.email_notifications, true) into v_notify
    from public.admin_settings s where s.user_id = v_quiz.owner_id;

    if coalesce(v_notify, true) then
      insert into public.email_log (attempt_id, status) values (v_attempt.id, 'pending')
      returning id into v_log_id;

      perform net.http_post(
        url := (select value from public.app_config where key = 'functions_url') || '/send-result-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-hook-secret', (select value from public.app_config where key = 'hook_secret')
        ),
        body := jsonb_build_object('attemptId', v_attempt.id, 'logId', v_log_id)
      );
    end if;
  exception when others then
    -- Slanje mejla nikad ne sme da obori predaju kviza
    null;
  end;

  select * into v_attempt from public.attempts where id = v_attempt.id;
  v_result := public.fn_build_result(v_attempt.id, v_quiz);
  return v_result || jsonb_build_object('ok', true, 'alreadySubmitted', false);
end;
$$;

revoke all on function public.submit_attempt(text, jsonb) from public;
grant execute on function public.submit_attempt(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- fn_build_result — sastavlja payload rezultata filtriran po show_* podešavanjima
-- ---------------------------------------------------------------------------
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
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;

  select v_link.max_attempts - count(*) filter (where a2.status = 'submitted')
  into v_attempts_left
  from public.quiz_links v_link
  left join public.attempts a2 on a2.quiz_link_id = v_link.id
  where v_link.id = v_attempt.quiz_link_id
  group by v_link.max_attempts;

  if not p_quiz.show_result then
    return jsonb_build_object('showResult', false, 'attemptsLeft', v_attempts_left);
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
    'explanation', case when p_quiz.show_correct then qq.explanation else null end
  ) order by qq.position)
  into v_questions
  from public.quiz_questions qq
  left join public.attempt_answers aa on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = p_quiz.id;

  return jsonb_build_object(
    'showResult', true,
    'showCorrect', p_quiz.show_correct,
    'totalPoints', v_attempt.total_points,
    'maxPoints', v_attempt.max_points,
    'scorePct', v_attempt.score_pct,
    'correctCount', v_attempt.correct_count,
    'incorrectCount', v_attempt.incorrect_count,
    'passed', v_attempt.passed,
    'passThresholdPct', p_quiz.pass_threshold_pct,
    'attemptsLeft', v_attempts_left,
    'questions', v_questions
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_override_grade — ručna korekcija ocene jednog odgovora
-- ---------------------------------------------------------------------------
create or replace function public.admin_override_grade(p_answer_id uuid, p_is_correct boolean, p_awarded_points int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_owner uuid;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select aa.attempt_id, q.owner_id into v_attempt_id, v_owner
  from public.attempt_answers aa
  join public.attempts a on a.id = aa.attempt_id
  join public.quizzes q on q.id = a.quiz_id
  where aa.id = p_answer_id;

  if v_owner is null or v_owner <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.attempt_answers
  set is_correct = p_is_correct, awarded_points = p_awarded_points, graded_by = 'manual'
  where id = p_answer_id;

  perform public.fn_recompute_attempt(v_attempt_id);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_override_grade(uuid, boolean, int) from public;
grant execute on function public.admin_override_grade(uuid, boolean, int) to authenticated;
