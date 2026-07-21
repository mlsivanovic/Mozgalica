-- Saveti: umesto slobodnog prikaza saveta na svakom pitanju, dete otključava
-- savet dugmetom — najviše 3 puta po pokušaju. Tekst saveta se NE šalje klijentu
-- dok nije otključan (isto načelo kao i tačni odgovori — nikad pre potvrde).

alter table public.attempts add column hints_used int not null default 0;
alter table public.attempts add column hints_unlocked jsonb not null default '[]'::jsonb;

create or replace function public.fn_hint_cap()
returns int language sql immutable as $$ select 3 $$;

-- ---------------------------------------------------------------------------
-- fn_questions_for_layout — sada prima i listu već otključanih pitanja;
-- hint tekst se šalje samo ako je otključan, hasHint govori da savet postoji.
-- Stari 1-arg oblik se BRIŠE pre pravljenja novog (drugačiji broj argumenata bi
-- inače napravio dvosmislen overload sa istim imenom).
-- ---------------------------------------------------------------------------
drop function if exists public.fn_questions_for_layout(jsonb);

create or replace function public.fn_questions_for_layout(p_layout jsonb, p_unlocked jsonb)
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
    'hasHint', (qq.hint is not null),
    'hint', case when coalesce(p_unlocked, '[]'::jsonb) ? qq.id::text then qq.hint else null end,
    'points', qq.points
  ) order by item_ord), '[]'::jsonb)
  from jsonb_array_elements(p_layout) with ordinality as arr(item, item_ord)
  join public.quiz_questions qq on qq.id = (item->>'qq')::uuid
$$;

-- ---------------------------------------------------------------------------
-- start_attempt — isto telo, samo poziva fn_questions_for_layout sa praznom
-- listom otključanih i vraća hintsUsed/hintsUnlocked u odgovoru.
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
    'questions', public.fn_questions_for_layout(v_layout, '[]'::jsonb),
    'hintsUsed', 0,
    'hintsUnlocked', '[]'::jsonb
  );
end;
$$;

revoke all on function public.start_attempt(text, text, text) from public;
grant execute on function public.start_attempt(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- resume_attempt — vraća i broj/listu otključanih saveta da preživi refresh
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
    'questions', public.fn_questions_for_layout(v_attempt.layout, v_attempt.hints_unlocked),
    'savedAnswers', v_saved,
    'hintsUsed', v_attempt.hints_used,
    'hintsUnlocked', v_attempt.hints_unlocked
  );
end;
$$;

revoke all on function public.resume_attempt(text) from public;
grant execute on function public.resume_attempt(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- use_hint — otključaj savet za JEDNO pitanje iz TEKUĆEG pokušaja.
-- Ponovni poziv za već otključano pitanje je besplatan (ne troši novi savet).
-- Kapa (3) se proverava i uvećava atomično preko row-level lock-a (FOR UPDATE).
-- ---------------------------------------------------------------------------
create or replace function public.use_hint(p_attempt_token text, p_quiz_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_hint text;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_attempt.layout) l where (l->>'qq') = p_quiz_question_id::text
  ) then
    return jsonb_build_object('ok', false, 'error', 'wrong_question');
  end if;

  select hint into v_hint from public.quiz_questions where id = p_quiz_question_id;
  if v_hint is null then
    return jsonb_build_object('ok', false, 'error', 'no_hint');
  end if;

  -- Već otključano — vrati besplatno, ne troši dodatni savet
  if v_attempt.hints_unlocked ? p_quiz_question_id::text then
    return jsonb_build_object(
      'ok', true, 'hint', v_hint,
      'hintsUsed', v_attempt.hints_used,
      'remaining', public.fn_hint_cap() - v_attempt.hints_used
    );
  end if;

  if v_attempt.hints_used >= public.fn_hint_cap() then
    return jsonb_build_object('ok', false, 'error', 'limit_reached');
  end if;

  update public.attempts
  set hints_used = hints_used + 1,
      hints_unlocked = hints_unlocked || to_jsonb(p_quiz_question_id::text)
  where id = v_attempt.id;

  return jsonb_build_object(
    'ok', true, 'hint', v_hint,
    'hintsUsed', v_attempt.hints_used + 1,
    'remaining', public.fn_hint_cap() - v_attempt.hints_used - 1
  );
end;
$$;

revoke all on function public.use_hint(text, uuid) from public;
grant execute on function public.use_hint(text, uuid) to anon, authenticated;
