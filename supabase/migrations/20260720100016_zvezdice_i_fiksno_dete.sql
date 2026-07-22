-- Zvezdice se računaju isključivo u bazi. Kviz može da bude dodeljen Andreju ili
-- Filipu, a slobodni kviz i dalje čuva ime samo na konkretnom pokušaju.

-- ---------------------------------------------------------------------------
-- Fiksno dete po kvizu
-- ---------------------------------------------------------------------------
alter table public.quizzes
  add column fixed_child_name text
  check (fixed_child_name is null or fixed_child_name in ('Andrej', 'Filip'));

-- Dodela deteta je deo nepromenjivog snapshot-a kviza čim postoji pokušaj.
create or replace function public.fn_guard_fixed_child_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fixed_child_name is distinct from old.fixed_child_name
    and exists (select 1 from public.attempts where quiz_id = old.id)
  then
    raise exception 'Kviz već ima pokušaje — dodeljeno dete više ne može da se menja.';
  end if;

  return new;
end;
$$;

create trigger trg_quizzes_fixed_child_guard
  before update of fixed_child_name on public.quizzes
  for each row execute function public.fn_guard_fixed_child_name();

-- ---------------------------------------------------------------------------
-- Zvezdice pokušaja
-- ---------------------------------------------------------------------------
-- Generisana kolona prati svaku promenu procenta i statusa ručnog pregleda, pa
-- nema posebnog brojača koji bi mogao da se raziđe sa stvarnim rezultatom.
alter table public.attempts
  add column stars_earned smallint generated always as (
    case
      when status <> 'submitted' or review_pending or score_pct is null then null
      when score_pct < 60 then 0
      when score_pct <= 75 then 1
      when score_pct <= 90 then 2
      else 3
    end
  ) stored;

-- Ocenjivanja istog pokušaja se serijalizuju zaključavanjem roditeljskog reda.
-- Time dve paralelne ručne ocene ne mogu da ostave zastareo review_pending ili
-- zbir. Ujedno se poeni ograničavaju na 0 ili pun broj poena pitanja, što
-- sprečava procenat preko 100 i nezaslužene zvezdice.
create or replace function public.fn_guard_attempt_answer_grade()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_max_points int;
begin
  if new.is_correct is null and new.awarded_points is null then
    return new;
  end if;

  perform 1 from public.attempts where id = new.attempt_id for update;
  select points into v_max_points
  from public.quiz_questions where id = new.quiz_question_id;

  if v_max_points is null then
    raise exception 'Pitanje za ocenjivanje više ne postoji.';
  end if;

  if new.is_correct is true and new.awarded_points is distinct from v_max_points then
    raise exception 'Tačan odgovor mora dobiti pun broj poena (%).', v_max_points;
  elsif new.is_correct is false and new.awarded_points is distinct from 0 then
    raise exception 'Netačan odgovor mora dobiti 0 poena.';
  elsif new.is_correct is null and coalesce(new.awarded_points, 0) <> 0 then
    raise exception 'Odgovor koji čeka pregled ne može unapred dobiti poene.';
  end if;

  return new;
end;
$$;

create trigger trg_attempt_answers_grade_guard
  before insert or update on public.attempt_answers
  for each row execute function public.fn_guard_attempt_answer_grade();

-- Ukupan zbir je suma najboljeg pokušaja na svakom dodeljenom kvizu. Slobodni
-- kvizovi ne ulaze u zbir čak ni kada dete ručno unese ime Andrej ili Filip.
create or replace function public.fn_total_stars(p_owner_id uuid, p_child_name text)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(najbolji.stars), 0)::integer
  from (
    select max(a.stars_earned)::integer as stars
    from public.quizzes q
    join public.attempts a on a.quiz_id = q.id
    where p_child_name in ('Andrej', 'Filip')
      and q.owner_id = p_owner_id
      and q.fixed_child_name = p_child_name
      and a.stars_earned is not null
    group by q.id
  ) najbolji
$$;

revoke all on function public.fn_total_stars(uuid, text) from public;

-- Admin uvek dobija po jedan red za oba deteta, uključujući zbir nula. View
-- poštuje RLS svih baznih tabela i zato vidi samo podatke prijavljenog vlasnika.
create view public.v_child_star_totals
  with (security_invoker = true) as
select
  dete.child_name,
  coalesce(sum(najbolji.best_stars), 0)::integer as total_stars
from public.admin_settings podesavanja
cross join (values ('Andrej'::text), ('Filip'::text)) as dete(child_name)
left join (
  select
    q.owner_id,
    q.id as quiz_id,
    q.fixed_child_name as child_name,
    max(a.stars_earned)::integer as best_stars
  from public.quizzes q
  left join public.attempts a
    on a.quiz_id = q.id and a.stars_earned is not null
  where q.fixed_child_name is not null
  group by q.owner_id, q.id, q.fixed_child_name
) najbolji
  on najbolji.owner_id = podesavanja.user_id
  and najbolji.child_name = dete.child_name
group by podesavanja.user_id, dete.child_name;

grant select on public.v_child_star_totals to authenticated;

-- ---------------------------------------------------------------------------
-- get_quiz_by_token — fiksno ime i zbir pre početka kviza
-- ---------------------------------------------------------------------------
create or replace function public.get_quiz_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.quiz_links;
  v_quiz public.quizzes;
  v_attempts_count int;
  v_total_stars int;
begin
  select * into v_link from public.quiz_links where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_quiz from public.quizzes where id = v_link.quiz_id;

  if not v_link.is_active then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select count(*) into v_attempts_count
  from public.attempts
  where quiz_link_id = v_link.id and status = 'submitted';

  if v_attempts_count >= v_link.max_attempts then
    return jsonb_build_object('ok', false, 'error', 'no_attempts_left');
  end if;

  v_total_stars := case
    when v_quiz.fixed_child_name is not null
      then public.fn_total_stars(v_quiz.owner_id, v_quiz.fixed_child_name)
    else null
  end;

  return jsonb_build_object(
    'ok', true,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'questionCount', (select count(*) from public.quiz_questions where quiz_id = v_quiz.id),
    'totalPoints', (select coalesce(sum(points), 0) from public.quiz_questions where quiz_id = v_quiz.id),
    'timeLimitSeconds', v_quiz.time_limit_seconds,
    -- Slobodan kviz uvek traži ime; dodeljeni kviz ga već dobija sa servera.
    'requireName', v_quiz.fixed_child_name is null,
    'fixedChildName', v_quiz.fixed_child_name,
    'totalStars', v_total_stars,
    'requireLabel', v_quiz.require_label,
    'labelName', v_quiz.label_name,
    'attemptsLeft', v_link.max_attempts - v_attempts_count,
    'maxAttempts', v_link.max_attempts
  );
end;
$$;

revoke all on function public.get_quiz_by_token(text) from public;
grant execute on function public.get_quiz_by_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- start_attempt — server nameće dodeljeno ime i zadržava tok sa savetima
-- ---------------------------------------------------------------------------
create or replace function public.start_attempt(
  p_token text,
  p_child_name text,
  p_child_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.quiz_links;
  v_quiz public.quizzes;
  v_attempts_count int;
  v_next_no int;
  v_layout jsonb;
  v_attempt public.attempts;
  v_deadline timestamptz;
  v_child_name text;
begin
  select * into v_link from public.quiz_links where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if not v_link.is_active then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  -- SHARE zaključavanje upareno je sa triggerom za izmenu dodele: ako admin i
  -- dete krenu istovremeno, ili pokušaj dobija novu dodelu ili admin izmena pada
  -- nakon što pokušaj bude upisan; nikad ne nastaje pokušaj sa zastarelim imenom.
  select * into v_quiz from public.quizzes where id = v_link.quiz_id for share;

  -- Poslato ime se potpuno ignoriše na dodeljenom kvizu.
  v_child_name := coalesce(v_quiz.fixed_child_name, nullif(trim(p_child_name), ''));
  if v_child_name is null then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  -- Napušteni pokušaji (bez predaje) posle roka + 1h se ne računaju u limit.
  update public.attempts
  set status = 'expired'
  where quiz_link_id = v_link.id
    and status = 'in_progress'
    and (
      (deadline_at is not null and deadline_at < now() - interval '1 hour')
      or (deadline_at is null and started_at < now() - interval '24 hours')
    );

  select count(*) into v_attempts_count
  from public.attempts
  where quiz_link_id = v_link.id and status = 'submitted';

  if v_attempts_count >= v_link.max_attempts then
    return jsonb_build_object('ok', false, 'error', 'no_attempts_left');
  end if;

  select count(*) into v_attempts_count from public.attempts where quiz_link_id = v_link.id;
  if v_attempts_count >= public.fn_link_sanity_cap() then
    return jsonb_build_object('ok', false, 'error', 'too_many_tries');
  end if;

  select coalesce(max(attempt_no), 0) + 1 into v_next_no
  from public.attempts where quiz_link_id = v_link.id;

  -- Layout određuje redosled pitanja i opcija koji se servira ovom detetu.
  select coalesce(jsonb_agg(jsonb_build_object(
    'qq', qq.id,
    'opts', case
      when qq.type in ('single', 'multi') and v_quiz.shuffle_answers then (
        select jsonb_agg(o->>'id' order by random())
        from jsonb_array_elements(qq.options) o
      )
      when qq.type in ('single', 'multi') then (
        select jsonb_agg(o->>'id' order by ord)
        from jsonb_array_elements(qq.options) with ordinality as t(o, ord)
      )
      else null
    end
  ) order by case when v_quiz.shuffle_questions then random() else qq.position end),
  '[]'::jsonb)
  into v_layout
  from public.quiz_questions qq
  where qq.quiz_id = v_quiz.id;

  if v_layout = '[]'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'no_questions');
  end if;

  v_deadline := case when v_quiz.time_limit_seconds is not null
    then now() + (v_quiz.time_limit_seconds || ' seconds')::interval
    else null end;

  insert into public.attempts (
    quiz_link_id, quiz_id, attempt_no, child_name, child_label, layout, deadline_at
  ) values (
    v_link.id, v_quiz.id, v_next_no, v_child_name, nullif(trim(p_child_label), ''),
    v_layout, v_deadline
  )
  returning * into v_attempt;

  return jsonb_build_object(
    'ok', true,
    'attemptToken', v_attempt.attempt_token,
    'attemptId', v_attempt.id,
    'attemptNo', v_attempt.attempt_no,
    'childName', v_attempt.child_name,
    'deadlineAt', v_attempt.deadline_at,
    'serverNow', now(),
    'questions', public.fn_questions_for_layout(v_layout, '[]'::jsonb),
    'hintsUsed', 0,
    'hintsUnlocked', '[]'::jsonb
  );
end;
$$;

revoke all on function public.start_attempt(text, text, text) from public;
grant execute on function public.start_attempt(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- fn_build_result — zvezdice su dostupne i kada je detaljan rezultat skriven
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
  v_total_stars int;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;

  select v_link.max_attempts - count(*) filter (where a2.status = 'submitted')
  into v_attempts_left
  from public.quiz_links v_link
  left join public.attempts a2 on a2.quiz_link_id = v_link.id
  where v_link.id = v_attempt.quiz_link_id
  group by v_link.max_attempts;

  v_total_stars := case
    when p_quiz.fixed_child_name is not null
      then public.fn_total_stars(p_quiz.owner_id, p_quiz.fixed_child_name)
    else null
  end;

  if not p_quiz.show_result then
    return jsonb_build_object(
      'showResult', false,
      'childName', v_attempt.child_name,
      'starsEarned', v_attempt.stars_earned,
      'totalStars', v_total_stars,
      'attemptsLeft', v_attempts_left,
      'pendingReview', coalesce(v_attempt.review_pending, false)
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
    'explanation', case when p_quiz.show_correct then qq.explanation else null end
  ) order by qq.position)
  into v_questions
  from public.quiz_questions qq
  left join public.attempt_answers aa on aa.quiz_question_id = qq.id and aa.attempt_id = p_attempt_id
  where qq.quiz_id = p_quiz.id;

  return jsonb_build_object(
    'showResult', true,
    'showCorrect', p_quiz.show_correct,
    'childName', v_attempt.child_name,
    'starsEarned', v_attempt.stars_earned,
    'totalStars', v_total_stars,
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
