-- Radni listić (beležke) deteta po pitanju tokom rešavanja kviza.
-- Beležke se čuvaju na pokušaju kao jsonb mapa (quiz_question_id -> tekst) da bi
-- roditelj mogao posle da vidi kako je dete računalo. Ne utiču na ocenjivanje.
alter table public.attempts
  add column if not exists notes jsonb not null default '{}'::jsonb;

comment on column public.attempts.notes is 'Radni listić deteta: quiz_question_id -> tekst koji je dete pisalo tokom rešavanja';

-- save_attempt_notes — čuvanje radnog listića; dozvoljeno dok je pokušaj u toku
-- (isti prozor kao save_answers: deadline + 30s grace).
create or replace function public.save_attempt_notes(p_attempt_token text, p_notes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_item record;
  v_cist jsonb := '{}'::jsonb;
  v_tekst text;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;
  if v_attempt.deadline_at is not null and v_attempt.deadline_at + interval '30 seconds' < now() then
    return jsonb_build_object('ok', false, 'error', 'deadline_passed');
  end if;
  if jsonb_typeof(coalesce(p_notes, '{}'::jsonb)) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid_notes');
  end if;

  -- Prihvataju se samo pitanja iz layout-a ovog pokušaja; prazne beležke se brišu,
  -- a tekst se skraćuje da jedan pokušaj ne može da napumpa red do ogromne veličine.
  for v_item in select * from jsonb_each(coalesce(p_notes, '{}'::jsonb))
  loop
    if not exists (
      select 1 from jsonb_array_elements(v_attempt.layout) l where (l->>'qq') = v_item.key
    ) then
      continue;
    end if;
    if jsonb_typeof(v_item.value) <> 'string' then
      continue;
    end if;
    v_tekst := left(v_item.value #>> '{}', 2000);
    if btrim(v_tekst) = '' then
      continue;
    end if;
    v_cist := v_cist || jsonb_build_object(v_item.key, v_tekst);
  end loop;

  update public.attempts set notes = v_cist where id = v_attempt.id;

  return jsonb_build_object(
    'ok', true,
    'saved', (select count(*) from jsonb_object_keys(v_cist)),
    'serverNow', now()
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'save_failed');
end;
$$;

revoke all on function public.save_attempt_notes(text, jsonb) from public;
grant execute on function public.save_attempt_notes(text, jsonb) to anon, authenticated;

-- resume_attempt — vraća i radni listić da preživi refresh/offline prekid
create or replace function public.resume_attempt(p_attempt_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_profile public.child_profiles;
  v_saved jsonb;
  v_profile_token text;
begin
  select * into v_attempt from public.attempts where attempt_token = p_attempt_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'not_in_progress');
  end if;

  if v_attempt.child_profile_id is not null then
    select * into v_profile from public.child_profiles where id = v_attempt.child_profile_id;
    v_profile_token := v_profile.public_token;
  end if;

  select coalesce(jsonb_object_agg(quiz_question_id, answer), '{}'::jsonb)
  into v_saved
  from public.attempt_answers
  where attempt_id = v_attempt.id;

  return jsonb_build_object(
    'ok', true,
    'accessMode', case when v_attempt.child_profile_id is null then 'generic' else 'profile' end,
    'profileToken', v_profile_token,
    'attemptToken', v_attempt.attempt_token,
    'attemptId', v_attempt.id,
    'attemptNo', v_attempt.attempt_no,
    'childName', case
      when v_attempt.child_profile_id is not null then v_profile.name
      else v_attempt.child_name
    end,
    'deadlineAt', v_attempt.deadline_at,
    'remainingSeconds', v_attempt.remaining_seconds,
    'serverNow', now(),
    'questions', public.fn_questions_for_layout(v_attempt.layout, v_attempt.hints_unlocked),
    'savedAnswers', v_saved,
    'notes', coalesce(v_attempt.notes, '{}'::jsonb),
    'hintsUsed', v_attempt.hints_used,
    'hintsUnlocked', v_attempt.hints_unlocked
  );
end;
$$;

revoke all on function public.resume_attempt(text) from public;
grant execute on function public.resume_attempt(text) to anon, authenticated;
