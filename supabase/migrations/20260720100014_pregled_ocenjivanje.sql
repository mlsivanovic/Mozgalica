-- Ocenjivanje pitanja označenih za "ručno ocenjivanje" (manual_review): takva pitanja
-- (osim tačno/netačno, koje se UVEK ocenjuje automatski) na predaji NE dobijaju ocenu,
-- već ostaju 'pending' dok ih administrator ne oceni. Mejl roditelju se odlaže dok
-- ijedno pitanje čeka ocenu, da bi uvek nosio konačan rezultat.
--
-- Status pokušaja OSTAJE 'submitted' dok čeka ocenu (bez novog attempts.status) —
-- umesto toga se dodaje denormalizovani attempts.review_pending koji fn_recompute_attempt
-- održava. Time ostaju netaknuta sva mesta koja već računaju na status='submitted'
-- (limit pokušaja, statistike, idempotentnost predaje).

-- ---------------------------------------------------------------------------
-- Šema
-- ---------------------------------------------------------------------------
alter table public.attempt_answers drop constraint attempt_answers_graded_by_check;
alter table public.attempt_answers add constraint attempt_answers_graded_by_check
  check (graded_by in ('auto', 'manual', 'pending'));

alter table public.attempts add column review_pending boolean not null default false;

-- ---------------------------------------------------------------------------
-- fn_recompute_attempt — preračuna totale I da li pokušaj čeka ručnu ocenu.
-- NULL is_correct (pending) se već ne broji ni kao tačno ni kao netačno (FILTER
-- broji samo TRUE redove), a njegovi awarded_points (0) ulaze u total_points —
-- rezultat je privremeno umanjen dok se sve ne oceni.
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
    passed = v_pct >= v_quiz.pass_threshold_pct,
    review_pending = exists (
      select 1 from public.attempt_answers
      where attempt_id = p_attempt_id and is_correct is null
    )
  where id = p_attempt_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_notify_result — šalje mejl roditelju sa rezultatom. IDEMPOTENTNO: nikad ne
-- šalje dvaput za isti pokušaj (proverava email_log). Pozivaju je submit_attempt
-- (kad odmah nema pending pitanja) i admin_override_grade (kad se poslednje
-- pending pitanje oceni). Interna funkcija — bez granta klijentima.
-- ---------------------------------------------------------------------------
create or replace function public.fn_notify_result(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_notify boolean;
  v_log_id uuid;
begin
  if exists (
    select 1 from public.email_log where attempt_id = p_attempt_id and status in ('pending', 'sent')
  ) then
    return;
  end if;

  select q.owner_id into v_owner
  from public.attempts a join public.quizzes q on q.id = a.quiz_id
  where a.id = p_attempt_id;

  select coalesce(s.email_notifications, true) into v_notify
  from public.admin_settings s where s.user_id = v_owner;

  if coalesce(v_notify, true) then
    insert into public.email_log (attempt_id, status) values (p_attempt_id, 'pending')
    returning id into v_log_id;

    perform net.http_post(
      url := (select value from public.app_config where key = 'functions_url') || '/send-result-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-hook-secret', (select value from public.app_config where key = 'hook_secret')
      ),
      body := jsonb_build_object('attemptId', p_attempt_id, 'logId', v_log_id)
    );
  end if;
exception when others then
  -- Slanje mejla nikad ne sme da obori pozivaoca (predaju ili ručnu ocenu)
  null;
end;
$$;

revoke all on function public.fn_notify_result(uuid) from public;

-- ---------------------------------------------------------------------------
-- submit_attempt — atomska predaja: claim, ocenjivanje (auto ili pending), totali,
-- odloženi mejl kad nema pending pitanja.
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
  v_pending boolean;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_quiz from public.quizzes where id = v_attempt.quiz_id;

  -- Ako je već predat, vrati isti rezultat (idempotentno za offline retry; pokriva
  -- i pokušaje koji čekaju ručnu ocenu, jer status ostaje 'submitted' dok se ne oceni)
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

  -- Server-side ocenjivanje svih pitanja iz snapshot-a (uključujući neodgovorena).
  -- Pitanja sa manual_review (osim tačno/netačno — to se UVEK ocenjuje automatski)
  -- ostaju 'pending' dok ih administrator ne oceni.
  for v_qq in select * from public.quiz_questions where quiz_id = v_quiz.id
  loop
    -- v_answer se MORA resetovati svaki krug: kad pitanje nema sačuvan odgovor,
    -- SELECT INTO ne menja promenljivu i bez ovoga bi ostao odgovor iz prethodne iteracije
    v_answer := null;
    select answer into v_answer
    from public.attempt_answers where attempt_id = v_attempt.id and quiz_question_id = v_qq.id;

    if v_qq.manual_review and v_qq.type <> 'truefalse' then
      insert into public.attempt_answers (attempt_id, quiz_question_id, answer, is_correct, awarded_points, graded_by)
      values (v_attempt.id, v_qq.id, v_answer, null, 0, 'pending')
      on conflict (attempt_id, quiz_question_id)
      do update set is_correct = null, awarded_points = 0, graded_by = 'pending';
    else
      v_is_correct := coalesce(public.fn_grade_answer(v_qq.type, v_qq.correct, v_answer), false);
      v_points := case when v_is_correct then v_qq.points else 0 end;

      insert into public.attempt_answers (attempt_id, quiz_question_id, answer, is_correct, awarded_points, graded_by)
      values (v_attempt.id, v_qq.id, v_answer, v_is_correct, v_points, 'auto')
      on conflict (attempt_id, quiz_question_id)
      do update set is_correct = excluded.is_correct, awarded_points = excluded.awarded_points, graded_by = 'auto';
    end if;
  end loop;

  perform public.fn_recompute_attempt(v_attempt.id);

  -- Mejl ide tek kad NEMA pitanja koja čekaju ručnu ocenu — inače bi roditelj dobio
  -- mejl sa privremeno umanjenim rezultatom.
  select review_pending into v_pending from public.attempts where id = v_attempt.id;
  if not coalesce(v_pending, false) then
    perform public.fn_notify_result(v_attempt.id);
  end if;

  select * into v_attempt from public.attempts where id = v_attempt.id;
  v_result := public.fn_build_result(v_attempt.id, v_quiz);
  return v_result || jsonb_build_object('ok', true, 'alreadySubmitted', false);
end;
$$;

revoke all on function public.submit_attempt(text, jsonb) from public;
grant execute on function public.submit_attempt(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- fn_build_result — dodato pendingReview, da dečji ekran zna da prikaže
-- "čeka pregled" umesto ocene.
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
    'pendingReview', coalesce(v_attempt.review_pending, false),
    'questions', v_questions
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_override_grade — posle preračuna, ako više nema pending pitanja, šalje
-- odloženi mejl (prvi put kad je poslednje pitanje ocenjeno).
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
  v_pending boolean;
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

  select review_pending into v_pending from public.attempts where id = v_attempt_id;
  if not coalesce(v_pending, false) then
    perform public.fn_notify_result(v_attempt_id);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_override_grade(uuid, boolean, int) from public;
grant execute on function public.admin_override_grade(uuid, boolean, int) to authenticated;
