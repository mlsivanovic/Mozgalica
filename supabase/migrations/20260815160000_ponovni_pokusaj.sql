-- Mozgalica: ponovni pokušaj netačnih zadataka
--
-- Na stranici rezultata dete može da otvori objašnjenja netačno odgovorenih
-- zadataka, a zatim da ih reši ponovo — sa novim, istovrsnim zadacima koje je
-- generisao klijentski generator (isti topicSlug/težina, novi seed). Nova
-- pitanja se upisuju u poseban „mini-snapshot" po pokušaju jer se originalni
-- quiz_questions snapshot zamrzava posle prvog pokušaja (trg_quiz_questions_guard)
-- i po arhitekturi nikad ne sme da se menja retroaktivno.
--
-- Nagrada: ako su u ponovnom pokušaju SVI zadaci tačni, zvezdice se dopune do
-- pune kvote (5) — dopuna je ugrađena u fn_recompute_attempt, tako da ostaje
-- konzistentna i posle eventualne administratorske korekcije ocene. Nakon
-- predatog ponovnog pokušaja (retry_submitted_at) kviz je zaključan: nema
-- ponovnog otvaranja objašnjenja niti novog ponovnog pokušaja.

-- ---------------------------------------------------------------------------
-- Stanje pokušaja
-- ---------------------------------------------------------------------------

alter table public.attempts
  add column if not exists explanations_seen_at timestamptz,
  add column if not exists retry_submitted_at timestamptz;

comment on column public.attempts.explanations_seen_at is
  'Kada je dete otvorilo objašnjenja netačnih zadataka (uslov za ponovni pokušaj).';
comment on column public.attempts.retry_submitted_at is
  'Kada je predat ponovni pokušaj netačnih zadataka — kviz je od tada zaključan.';

-- ---------------------------------------------------------------------------
-- Snapshot pitanja ponovnog pokušaja
-- ---------------------------------------------------------------------------

create table if not exists public.attempt_retry_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  position int not null,
  source_quiz_question_id uuid references public.quiz_questions (id) on delete set null,
  type text not null check (type in ('single', 'multi', 'numeric', 'text', 'truefalse', 'matching')),
  text text not null,
  options jsonb,
  correct jsonb not null,
  explanation text,
  points int not null default 1 check (points > 0),
  answer jsonb,
  is_correct boolean,
  answered_at timestamptz,
  unique (attempt_id, position)
);

create index if not exists idx_attempt_retry_questions_attempt
  on public.attempt_retry_questions (attempt_id);

alter table public.attempt_retry_questions enable row level security;

revoke all on public.attempt_retry_questions from anon, authenticated;

-- Admin SAMO čitanje (pisanje isključivo kroz RPC-ove ispod)
grant select on public.attempt_retry_questions to authenticated;

create policy attempt_retry_questions_select on public.attempt_retry_questions
  for select to authenticated
  using (
    public.fn_is_admin()
    and exists (
      select 1 from public.attempts a
      join public.quizzes q on q.id = a.quiz_id
      where a.id = attempt_id and q.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- fn_recompute_attempt — retry-svestan izračun zvezdica
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
  v_pending boolean;
  v_retry_submitted timestamptz;
  v_retry_sve_tacno boolean;
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
  left join public.attempt_answers aa
    on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = v_quiz.id;

  v_pct := case when v_max > 0 then round(100.0 * v_total / v_max, 1) else 0 end;
  v_pending := exists (
    select 1 from public.attempt_answers
    where attempt_id = p_attempt_id and is_correct is null
  );

  select retry_submitted_at into v_retry_submitted
  from public.attempts where id = p_attempt_id;

  -- Dopuna zvezdica važi samo ako je ponovni pokušaj predat i svi zadaci u njemu
  -- tačni (nagrada je „sve ili ništa"): tada idu na punu kvotu od 5 zvezdica.
  v_retry_sve_tacno := v_retry_submitted is not null
    and not exists (
      select 1 from public.attempt_retry_questions r
      where r.attempt_id = p_attempt_id and r.is_correct is distinct from true
    );

  update public.attempts set
    total_points = v_total,
    max_points = v_max,
    correct_count = v_correct,
    incorrect_count = v_incorrect,
    score_pct = v_pct,
    passed = v_pct >= v_quiz.pass_threshold_pct,
    review_pending = v_pending,
    stars_awarded = case
      when v_pending then null
      else greatest(
        public.fn_stars_for_score(v_pct),
        case when v_retry_sve_tacno then 5 else 0 end
      )
    end
  where id = p_attempt_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_build_result — topicSlug po pitanju + stanje ponovnog pokušaja
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
        and v_attempt.retry_submitted_at is null,
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

-- ---------------------------------------------------------------------------
-- RPC za tok ponovnog pokušaja
-- ---------------------------------------------------------------------------

-- Dete je otvorilo objašnjenja netačnih zadataka — otključava ponovni pokušaj.
create or replace function public.mark_explanations_seen(p_attempt_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'submitted' then
    return jsonb_build_object('ok', false, 'error', 'not_submitted');
  end if;

  update public.attempts
  set explanations_seen_at = coalesce(explanations_seen_at, now())
  where id = v_attempt.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.mark_explanations_seen(text) from public;
grant execute on function public.mark_explanations_seen(text) to anon, authenticated;

-- Zajednički pregled ponovnog pokušaja (koriste ga resume_retry i submit_retry).
-- p_submitted odlučuje da li se correct/explanation šalju detetu (samo posle predaje).
create or replace function public.fn_build_retry_result(p_attempt_id uuid, p_submitted boolean)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_questions jsonb;
  v_all_correct boolean;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;

  v_all_correct := not exists (
    select 1 from public.attempt_retry_questions r
    where r.attempt_id = p_attempt_id and r.is_correct is distinct from true
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'position', r.position,
    'type', r.type,
    'text', r.text,
    'options', r.options,
    'points', r.points,
    'answer', case when p_submitted then r.answer else null end,
    'isCorrect', case when p_submitted then coalesce(r.is_correct, false) else null end,
    'correct', case when p_submitted then r.correct else null end,
    'explanation', case when p_submitted then r.explanation else null end
  ) order by r.position), '[]'::jsonb)
  into v_questions
  from public.attempt_retry_questions r
  where r.attempt_id = p_attempt_id;

  return jsonb_build_object(
    'submitted', p_submitted,
    'allCorrect', case when p_submitted then v_all_correct else null end,
    'starsAwarded', v_attempt.stars_awarded,
    'questions', v_questions
  );
end;
$$;

-- Upisuje nova (klijentski generisana) pitanja ponovnog pokušaja. Server čuva
-- tačne odgovore iz payload-a i ocenjuje isključivo preko njih (fn_grade_answer),
-- tako da frontend nikad ne odlučuje o tačnosti.
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

-- Oporavak posle osvežavanja stranice: pitanja bez tačnih odgovora dok ponovni
-- pokušaj traje, pun rezultat ako je već predat.
create or replace function public.resume_retry(p_attempt_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.retry_submitted_at is not null then
    return jsonb_build_object('ok', true)
      || public.fn_build_retry_result(v_attempt.id, true);
  end if;
  if not exists (select 1 from public.attempt_retry_questions r where r.attempt_id = v_attempt.id) then
    return jsonb_build_object('ok', false, 'error', 'not_started');
  end if;

  return jsonb_build_object('ok', true) || public.fn_build_retry_result(v_attempt.id, false);
end;
$$;

revoke all on function public.resume_retry(text) from public;
grant execute on function public.resume_retry(text) to anon, authenticated;

-- Predaja ponovnog pokušaja: serversko ocenjivanje preko fn_grade_answer,
-- zaključavanje kviza i (ako je sve tačno) dopuna zvezdica preko fn_recompute_attempt.
create or replace function public.submit_retry(p_attempt_token text, p_answers jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_rq public.attempt_retry_questions;
  v_answer jsonb;
  v_is_correct boolean;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Idempotentno: već predat ponovni pokušaj samo vrati sačuvani ishod
  if v_attempt.retry_submitted_at is not null then
    return jsonb_build_object('ok', true, 'alreadySubmitted', true)
      || public.fn_build_retry_result(v_attempt.id, true);
  end if;
  if not exists (select 1 from public.attempt_retry_questions r where r.attempt_id = v_attempt.id) then
    return jsonb_build_object('ok', false, 'error', 'not_started');
  end if;

  for v_rq in
    select * from public.attempt_retry_questions
    where attempt_id = v_attempt.id
    order by position
  loop
    v_answer := coalesce(p_answers, '{}'::jsonb) -> v_rq.id::text;
    v_is_correct := coalesce(public.fn_grade_answer(v_rq.type, v_rq.correct, v_answer), false);

    update public.attempt_retry_questions
    set answer = v_answer, is_correct = v_is_correct, answered_at = now()
    where id = v_rq.id;
  end loop;

  update public.attempts
  set retry_submitted_at = now()
  where id = v_attempt.id and retry_submitted_at is null;

  perform public.fn_recompute_attempt(v_attempt.id);

  return jsonb_build_object('ok', true, 'alreadySubmitted', false)
    || public.fn_build_retry_result(v_attempt.id, true);
end;
$$;

revoke all on function public.submit_retry(text, jsonb) from public;
grant execute on function public.submit_retry(text, jsonb) to anon, authenticated;
