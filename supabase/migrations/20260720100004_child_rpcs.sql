-- Mozgalica: RPC funkcije kojima dete pristupa kvizu (bez naloga).
-- Sve su SECURITY DEFINER i EXECUTE se daje samo anon+authenticated, eksplicitno.
-- Nijedna od njih ne otkriva tačne odgovore niti podatke drugih kvizova/dece.

-- Sanity cap protiv zloupotrebe jednog linka (dokumentovana MVP mera, bez per-IP brojanja)
create or replace function public.fn_link_sanity_cap()
returns int language sql immutable as $$ select 20 $$;

-- ---------------------------------------------------------------------------
-- get_quiz_by_token — meta podaci kviza PRE početka (bez pitanja, bez odgovora)
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

  return jsonb_build_object(
    'ok', true,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'questionCount', (select count(*) from public.quiz_questions where quiz_id = v_quiz.id),
    'totalPoints', (select coalesce(sum(points), 0) from public.quiz_questions where quiz_id = v_quiz.id),
    'timeLimitSeconds', v_quiz.time_limit_seconds,
    'requireName', v_quiz.require_name,
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
-- Interni helper: pitanja spremna za dete (bez tačnog odgovora), po datom layout-u
-- ---------------------------------------------------------------------------
create or replace function public.fn_questions_for_layout(p_layout jsonb)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', qq.id,
    'type', qq.type,
    'text', qq.text,
    'options', case
      -- Opcije se serviraju u redosledu iz layout-a (mešanje je već odlučeno pri startu)
      when qq.type in ('single', 'multi') and item->'opts' is not null then (
        select jsonb_agg(opt order by ord)
        from jsonb_array_elements_text(item->'opts') with ordinality as t(optid, ord)
        join jsonb_array_elements(qq.options) opt on (opt->>'id') = t.optid
      )
      else qq.options
    end,
    'hint', qq.hint,
    'points', qq.points
  ) order by item_ord), '[]'::jsonb)
  from jsonb_array_elements(p_layout) with ordinality as arr(item, item_ord)
  join public.quiz_questions qq on qq.id = (item->>'qq')::uuid
$$;

-- ---------------------------------------------------------------------------
-- start_attempt — validacija linka, kreiranje novog pokušaja
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

  select * into v_quiz from public.quizzes where id = v_link.quiz_id;

  if v_quiz.require_name and coalesce(trim(p_child_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  -- Napušteni pokušaji (bez predaje) posle roka + 1h se ne računaju u limit
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

  -- Layout: redosled pitanja (i opcija) serviran ovom detetu
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
    v_link.id, v_quiz.id, v_next_no, nullif(trim(p_child_name), ''), nullif(trim(p_child_label), ''),
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
    'questions', public.fn_questions_for_layout(v_layout)
  );
end;
$$;

revoke all on function public.start_attempt(text, text, text) from public;
grant execute on function public.start_attempt(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- resume_attempt — nastavak posle refresh-a/offline prekida
-- ---------------------------------------------------------------------------
create or replace function public.resume_attempt(p_attempt_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_saved jsonb;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;

  select coalesce(jsonb_object_agg(quiz_question_id, answer), '{}'::jsonb)
  into v_saved
  from public.attempt_answers
  where attempt_id = v_attempt.id;

  return jsonb_build_object(
    'ok', true,
    'attemptToken', v_attempt.attempt_token,
    'attemptId', v_attempt.id,
    'attemptNo', v_attempt.attempt_no,
    'childName', v_attempt.child_name,
    'deadlineAt', v_attempt.deadline_at,
    'serverNow', now(),
    'questions', public.fn_questions_for_layout(v_attempt.layout),
    'savedAnswers', v_saved
  );
end;
$$;

revoke all on function public.resume_attempt(text) from public;
grant execute on function public.resume_attempt(text) to anon, authenticated;
