-- Ukucani odgovori (text) ocenjuju se istom tolerantnom logikom koja je već
-- postojala na putanji za ručnu ocenu (fn_text_fuzzy_match iz
-- 20260805120000_fuzzy_text_grading.sql): pored tačnog pogotka po normalizaciji
-- (velika/mala slova, dijakritici, razmaci) priznaje se i jedna greška u
-- kucanju za odgovore od bar 4 slova.
--
-- Razlog: generatori srpskog jezika sada traže ukucane kratke odgovore bez
-- ručne ocene (manual_review = false). Bez ove izmene bi dete za sitnu
-- slovnu grešku („Minja" umesto „Mina") dobilo netačan odgovor ODMAH na
-- predaji — a pre ove izmene bi takav odgovor otišao na čekanje admina i
-- zadržao ceo rezultat. Fuzzy poređenje daje tolerantno ocenjivanje sa
-- trenutnim rezultatom, bez posla za administratora.

create or replace function public.fn_grade_answer(p_type text, p_correct jsonb, p_answer jsonb)
returns boolean
language plpgsql
immutable
set search_path = public, extensions
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
      return public.fn_text_fuzzy_match(p_correct, p_answer->>'text');

    when 'matching' then
      v_pairs_correct := coalesce(p_correct->'pairs', '{}'::jsonb);
      v_pairs_answer := coalesce(p_answer->'pairs', '{}'::jsonb);
      return v_pairs_correct = v_pairs_answer;

    else
      return false;
  end case;
end;
$$;
