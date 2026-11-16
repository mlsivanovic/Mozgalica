-- Ujednačavanje srpskog jezika bez nivoa težine i ispravke pitanja u banci (3. i 4. razred).
-- Srpski jezik nema težinu ni bodovne razrede zadataka: sva pitanja u banci
-- dobijaju ujednačenu vrednost (difficulty = 5, points = 5, kao i generatori),
-- a ispravljaju se konkretne pravopisne i gramatičke greške uočene pri reviziji.

create schema if not exists private;

do $$
begin
  if to_regclass('private.questions_srpski_backup_20261116') is null then
    execute $bak$
      create table private.questions_srpski_backup_20261116 as
      select q.*
      from public.questions q
      join public.topics t on t.id = q.topic_id
      where t.subject = 'srpski'
    $bak$;
  end if;
end $$;

-- 1. Sva pitanja srpskog jezika (svi razredi) imaju jedinstvenu težinu i broj poena (5),
--    usklađeno sa KONFIGURACIJA_PREDMETA.srpski i generatorskim modulima.
update public.questions q
set
  difficulty = 5,
  points = 5
from public.topics t
where t.id = q.topic_id
  and t.subject = 'srpski'
  and (q.difficulty <> 5 or q.points <> 5);

update public.daily_quiz_schedules
set difficulty = 5
where subject = 'srpski'
  and difficulty is distinct from 5;

-- 2. Proširenje fn_text_fuzzy_match za pitanja koja proveravaju veliko/malo slovo
--    (kada p_correct sadrži "case_sensitive": true, ne radi se lower() ni Levenshtein).
create or replace function public.fn_text_fuzzy_match(p_correct jsonb, p_answer text)
returns boolean
language plpgsql
immutable
set search_path to 'public', 'extensions'
as $function$
declare
  v_case_sensitive boolean;
  v_answer_norm text;
  v_answer_case text;
  v_accept text;
  v_accept_norm text;
  v_accept_case text;
begin
  v_case_sensitive := coalesce((p_correct->>'case_sensitive')::boolean, false);
  v_answer_norm := public.fn_normalize_text(p_answer);
  if v_answer_norm = '' then
    return false;
  end if;

  if v_case_sensitive then
    v_answer_case := regexp_replace(
      trim(translate(coalesce(p_answer, ''), 'čćšžđČĆŠŽĐ', 'ccszdCCSZD')),
      '\s+', ' ', 'g'
    );
  end if;

  for v_accept in select jsonb_array_elements_text(coalesce(p_correct->'accept', '[]'::jsonb))
  loop
    if v_case_sensitive then
      v_accept_case := regexp_replace(
        trim(translate(v_accept, 'čćšžđČĆŠŽĐ', 'ccszdCCSZD')),
        '\s+', ' ', 'g'
      );
      if v_accept_case <> '' and v_accept_case = v_answer_case then
        return true;
      end if;
      continue;
    end if;

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
$function$;

-- 3. Pitanja u srpski-pravopis-4 koja proveravaju veliko slovo i inicijale država:
--    uključi case_sensitive proveru i automatsko ocenjivanje (bez pending čekanja za mala slova).
update public.questions q
set
  correct = q.correct || '{"case_sensitive": true}'::jsonb,
  manual_review = false
from public.topics t
where t.id = q.topic_id
  and t.slug = 'srpski-pravopis-4'
  and q.type = 'text'
  and (
    q.text ilike 'Napiši pravilno naziv ulice ili trga:%'
    or q.text ilike 'Kako se zove stanov%'
    or q.id in (
      '43f76dda-2ec1-4bc4-abfc-2af7e062052b', -- Andrija
      '128562f1-3cab-45e2-a923-01cf04daf477', -- Marija
      '9bf889aa-b20c-491b-b890-0430b87c82ab', -- Sofija
      '6d9545c8-734e-4b4a-8299-c5f561ca0da1', -- RS
      '3bce8595-fe76-4c9b-bc9d-5ecb0a6c0b9a'  -- SAD
    )
  );

-- 4. Reči sa slovom J gde je tekst pitanja već davao tačan oblik (9 pitanja u srpski-pravopis-4):
--    preformulacija u izbor pravilnog oblika za pisanje.
update public.questions set text = 'Kako se pravilno piše: „Andria” ili „Andrija”?' where id = '43f76dda-2ec1-4bc4-abfc-2af7e062052b';
update public.questions set text = 'Kako se pravilno piše: „armiski” ili „armijski”?' where id = 'd720d679-e362-44a0-aae8-265dc7b33b4b';
update public.questions set text = 'Kako se pravilno piše: „geografski” ili „geografjski”?' where id = '0d9df9f1-f4d8-4092-a210-2cf581fdb50d';
update public.questions set text = 'Kako se pravilno piše: „hemiski” ili „hemijski”?' where id = '4df90a81-bd0f-4198-b36e-fc5e2dd4a209';
update public.questions set text = 'Kako se pravilno piše: „istoriski” ili „istorijski”?' where id = '698657c1-3cb8-48d0-aabd-31f838214a56';
update public.questions set text = 'Kako se pravilno piše: „liniski” ili „linijski”?' where id = 'e236fb71-312f-49f7-a0e9-3c56ba2c1b7c';
update public.questions set text = 'Kako se pravilno piše: „Maria” ili „Marija”?' where id = '128562f1-3cab-45e2-a923-01cf04daf477';
update public.questions set text = 'Kako se pravilno piše: „pisajo” ili „pisao”?' where id = '8110cb87-fb52-479b-8e88-a88ce678850e';
update public.questions set text = 'Kako se pravilno piše: „Sofia” ili „Sofija”?' where id = '9bf889aa-b20c-491b-b890-0430b87c82ab';

-- 5. Ispravka 17 pokvarenih objašnjenja skraćenica u srpski-pravopis-4
update public.questions q
set explanation = case
  when (q.correct->>'value')::boolean then
    'Opšte skraćenice nastale skraćivanjem reči (npr. „god.”, „itd.”, „npr.”, „str.”) pišu se sa tačkom.'
  else
    'Skraćenice za merne jedinice (npr. cm, dm, g, kg, km, l, m, mm, s, t) pišu se bez tačke.'
end
from public.topics t
where t.id = q.topic_id
  and t.slug = 'srpski-pravopis-4'
  and q.explanation = 'Skraćenice skraćenica se pišu bez tačke.';

-- 6. Ispravka 6 objašnjenja upravnog govora sa „prati 1./2./3. model” u srpski-pravopis-4
update public.questions
set explanation = 'Tačno: kada piščeve reči prethode upravnom govoru, iza njih stoje dve tačke, a izgovorene reči su pod navodnicima.'
where id in ('5ba1bcb6-8f50-4153-9722-f2d422c91483', '04f8e001-1b00-45d5-8496-d88f8017ed10');

update public.questions
set explanation = 'Tačno: kada je upravni govor ispred piščevih reči, od njih se odvaja zapetom iza navodnika.'
where id in ('1df2e3f2-149f-45b0-8ab0-1344b432ff0f', 'c18caf35-68b0-4b82-8ae4-f54079f54e66');

update public.questions
set explanation = 'Tačno: kada piščeve reči prekidaju upravni govor, odvajaju se zapetama sa obe strane, a drugi deo se nastavlja malim slovom pod navodnicima.'
where id in ('3649e26c-d650-44d4-a839-81eb625ef6ec', 'fb946bd2-986f-450f-841b-adc413759c4e');

-- 7. Ispravka 4 pogrešne priloške odredbe za mesto u srpski-gramatika-4
update public.questions
set
  text = 'Pronađi prilošku odredbu za mesto u rečenici: „Gusta magla polako ujutru se spušta u dolinu.”',
  correct = '{"accept": ["u dolinu"]}'::jsonb,
  explanation = 'Priloška odredba za mesto označava mesto vršenja radnje, u rečenici to je „u dolinu”.'
where id = '1c12c771-3af3-44b7-827a-4312e44b7acf';

update public.questions
set
  text = 'Pronađi prilošku odredbu za mesto u rečenici: „Beli sneg tiho tokom noći pada na krovove.”',
  correct = '{"accept": ["na krovove"]}'::jsonb,
  explanation = 'Priloška odredba za mesto označava mesto vršenja radnje, u rečenici to je „na krovove”.'
where id = '3944b8c6-2eee-403b-8d23-fe472511dec3';

update public.questions
set
  text = 'Pronađi prilošku odredbu za mesto u rečenici: „Hladna kiša uporno ceo dan pada po njivi.”',
  correct = '{"accept": ["po njivi"]}'::jsonb,
  explanation = 'Priloška odredba za mesto označava mesto vršenja radnje, u rečenici to je „po njivi”.'
where id = 'a680336a-a6a3-4d0b-ac8a-33a29af78c7f';

update public.questions
set
  text = 'Pronađi prilošku odredbu za mesto u rečenici: „Toplo sunce nežno na nebu greje zemlju.”',
  correct = '{"accept": ["na nebu"]}'::jsonb,
  explanation = 'Priloška odredba za mesto označava mesto vršenja radnje, u rečenici to je „na nebu”.'
where id = '6859d218-95c8-4dd0-a9f1-ec094dda4052';

-- 8. Zamena dvosmislenih primera nepromenljivosti za brojeve „deset” i „pet” nedvosmislenim brojevima
update public.questions
set
  text = 'Da li je reč „treći” nepromenljiva reč?',
  explanation = 'Reč „treći” je promenljiva reč. Redni brojevi se menjaju po rodu, broju i padežu.'
where id = '06fe89d7-94fb-45d8-94c2-5b1b85f59607';

update public.questions
set
  text = 'Kojoj grupi reči po promenljivosti pripada reč „treći” (promenljive ili nepromenljive)?',
  explanation = 'Reč „treći” je promenljiva. Redni brojevi se menjaju po rodu, broju i padežu.'
where id = 'af23b1a3-f789-48d8-84c4-1ca7d4c57875';

update public.questions
set
  text = 'Da li je reč „jedan” nepromenljiva reč?',
  explanation = 'Reč „jedan” je promenljiva reč. Osnovni broj jedan menja se po rodu, broju i padežu.'
where id = '04f76020-4fba-4314-a8c7-f4115ddb07a2';

update public.questions
set
  text = 'Kojoj grupi reči po promenljivosti pripada reč „jedan” (promenljive ili nepromenljive)?',
  explanation = 'Reč „jedan” je promenljiva. Osnovni broj jedan menja se po rodu, broju i padežu.'
where id = '5a562508-9b4c-46eb-989e-c3c62a83412a';

-- 9. Ekavica u objašnjenjima („Pridjev” -> „Pridev”)
update public.questions
set explanation = replace(explanation, 'Pridjev', 'Pridev')
where id in (
  'e214b97f-5368-48e1-bd42-63dca890f126',
  '847f936c-c6bd-4cf8-9122-0fd3a5f1bbc0',
  'fd3bd547-2e59-4c6d-a308-edbd5eacbb87',
  '79ec92e6-0d3c-4f04-ab56-c4312ba8d9b3',
  '0f9e338c-354e-4db2-846f-62c47383e9f4',
  '5c745549-7f3f-435f-8eaa-4875578fb641',
  '46e49004-0603-4a16-9ecf-1f7fd309f051'
);

-- 10. Uklanjanje nekorišćenih duplikata u srpskom jeziku (3. razred)
delete from public.questions q
where q.id in (
  'd9bc740c-db43-4d41-ac13-879cd844c8cc',
  'f277949d-50e5-45a4-906e-9e26535e1804',
  '6a30e3d5-c929-49f8-8c1f-f7bd72b37820',
  'c7e27aa2-b6e5-4f49-9c93-52441373995b'
)
and not exists (
  select 1 from public.quiz_questions qq where qq.source_question_id = q.id
);
