-- Pametnije auto-ocenjivanje tekstualnih odgovora iz srpskog jezika.
--
-- Do sada su sva pitanja sa manual_review (osim tačno/netačno) na predaji ostajala
-- 'pending' i čekala administratora — uključujući i one gde je dete ukucalo tačan
-- (ili gotovo tačan) odgovor. Sada se tekstualni odgovor auto-ocenjuje kad jasno
-- (ne)pripada rešenju, ostavljajući za admina samo one koji zahtevaju ljudsku
-- prosudbu:
--   * Prazan odgovor          → automatski netačno (nema šta da se pregleda).
--   * Exact podudaranje        → automatski tačno (nakon normalizacije veličine
--                                slova, dijakritika č/ć/š/ž/đ i kolapsa razmaka).
--   * Blizak odgovor (≤ 1 greška) → automatski tačno, ali samo za odgovore ≥ 4
--                                    slova (kratki poput "da"/"ne" bi lažno
--                                    prolazili sa jednom izmenom).
--   * Ostalo                   → pending za admina (kao i do sada).
--
-- Levenshtein(≤ 1) pokriva jedno umetnuto, izostavljeno ili pogrešno slovo.
-- Idempotentnost: već predati pokušaji se ne diraju (submit_attempt ih vraća na
-- prvom status='submitted' pre ocenjivačke petlje) — ocenjuju se samo nove predaje.

create extension if not exists fuzzystrmatch;

-- ---------------------------------------------------------------------------
-- fn_text_fuzzy_match — da li tekstualni odgovor pripada nekom od prihvaćenih.
-- Exact (normalizovano) ILI Levenshtein ≤ 1 za odgovore ≥ 4 slova.
-- ---------------------------------------------------------------------------
create or replace function public.fn_text_fuzzy_match(p_correct jsonb, p_answer text)
returns boolean
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  v_answer_norm text;
  v_accept text;
  v_accept_norm text;
begin
  v_answer_norm := public.fn_normalize_text(p_answer);
  if v_answer_norm = '' then
    return false;
  end if;

  for v_accept in select jsonb_array_elements_text(coalesce(p_correct->'accept', '[]'::jsonb))
  loop
    v_accept_norm := public.fn_normalize_text(v_accept);
    if v_accept_norm = '' then
      continue;
    end if;

    -- Exact (već normalizovano: zanemareni veličina slova, dijakritici, višak razmaka)
    if v_accept_norm = v_answer_norm then
      return true;
    end if;

    -- Fuzzy: dozvoljena jedna greška (umetnuto/izostavljeno/pogrešno slovo), ali
    -- samo za odgovore od bar 4 slova — kratki ("da", "ne", "ako") bi lažno prolazili.
    if char_length(v_answer_norm) >= 4 and levenshtein(v_accept_norm, v_answer_norm) <= 1 then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_attempt — u petlji za ocenjivanje, tekstualni manual_review odgovori se
-- auto-ocenjuju kad (ne)pripadaju rešenju; ostali manual_review tipovi ostaju pending.
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
  v_graded_by text;
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
  -- obično ostaju 'pending' za administratora, ALI tekstualni odgovori se auto-ocenjuju
  -- kad jasno (ne)pripadaju rešenju (vidi komentar u zaglavlju migracije).
  for v_qq in select * from public.quiz_questions where quiz_id = v_quiz.id
  loop
    -- v_answer se MORA resetovati svaki krug: kad pitanje nema sačuvan odgovor,
    -- SELECT INTO ne menja promenljivu i bez ovoga bi ostao odgovor iz prethodne iteracije
    v_answer := null;
    select answer into v_answer
    from public.attempt_answers where attempt_id = v_attempt.id and quiz_question_id = v_qq.id;

    if v_qq.manual_review and v_qq.type <> 'truefalse' then
      if v_qq.type = 'text' and public.fn_normalize_text(v_answer->>'text') = '' then
        -- Prazan tekstualni odgovor — očigledno netačno, ne opterećuje admina
        v_is_correct := false; v_points := 0; v_graded_by := 'auto';
      elsif v_qq.type = 'text' and public.fn_text_fuzzy_match(v_qq.correct, v_answer->>'text') then
        -- Blizak/tvrd odgovor — auto-tačno
        v_is_correct := true; v_points := v_qq.points; v_graded_by := 'auto';
      else
        -- Zahteva ljudsku prosudbu — čeka admina
        v_is_correct := null; v_points := 0; v_graded_by := 'pending';
      end if;
    else
      v_is_correct := coalesce(public.fn_grade_answer(v_qq.type, v_qq.correct, v_answer), false);
      v_points := case when v_is_correct then v_qq.points else 0 end;
      v_graded_by := 'auto';
    end if;

    insert into public.attempt_answers (attempt_id, quiz_question_id, answer, is_correct, awarded_points, graded_by)
    values (v_attempt.id, v_qq.id, v_answer, v_is_correct, v_points, v_graded_by)
    on conflict (attempt_id, quiz_question_id)
    do update set is_correct = excluded.is_correct, awarded_points = excluded.awarded_points, graded_by = excluded.graded_by;
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
