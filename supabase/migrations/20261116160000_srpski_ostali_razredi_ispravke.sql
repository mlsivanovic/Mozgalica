-- Popravke i ukidanje težine za ostale razrede srpskog jezika (2, 3. i 5. razred):
-- - osiguranje da sva pitanja i dnevni rasporedi iz srpskog imaju difficulty = 5, points = 5,
-- - proširenje fn_text_fuzzy_match podrškom za „exact: true” (bez Levenshtein oprosta na pravopisu)
--   i normalizacijom navodnika („” -> "),
-- - ispravke pravopisnih pravila za rečcu NE sa imenicama, OCR grešaka i curenja odgovora,
-- - uključivanje case_sensitive / exact automatskog ocenjivanja na pravopisnim pitanjima 3. razreda,
-- - uklanjanje ijekavice, lažnih rima, samo-sinonima i gramatičkih grešaka u banci 3. razreda.

CREATE TABLE IF NOT EXISTS private.questions_srpski_ostali_backup_20261116 AS
TABLE public.questions;

-- 1. Zaštita jedinstvene težine (5) na svim pitanjima i dnevnim rasporedima srpskog jezika
UPDATE public.questions
SET difficulty = 5,
    points = 5
WHERE topic_id IN (SELECT id FROM public.topics WHERE subject = 'srpski')
  AND (difficulty <> 5 OR points <> 5);

UPDATE public.daily_quiz_schedules
SET difficulty = 5
WHERE subject = 'srpski'
  AND difficulty <> 5;

-- 2. Proširenje fn_text_fuzzy_match:
--    - case_sensitive: true  -> tačna veličina slova, bez Levenshtein tolerancije (dijakritici i navodnici se normalizuju)
--    - exact: true           -> neosetljivo na veličinu slova, ali bez Levenshtein tolerancije (da „nemogu”/„avijon” ne prolaze)
CREATE OR REPLACE FUNCTION public.fn_text_fuzzy_match(p_correct jsonb, p_answer text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_case_sensitive boolean;
  v_exact boolean;
  v_answer_norm text;
  v_answer_case text;
  v_accept text;
  v_accept_norm text;
  v_accept_case text;
begin
  v_case_sensitive := coalesce((p_correct->>'case_sensitive')::boolean, false);
  v_exact := coalesce((p_correct->>'exact')::boolean, false);
  v_answer_norm := regexp_replace(
    public.fn_normalize_text(translate(coalesce(p_answer, ''), '„”“’', '"""''')),
    '\s+', ' ', 'g'
  );
  if v_answer_norm = '' then
    return false;
  end if;

  if v_case_sensitive then
    v_answer_case := regexp_replace(
      trim(translate(coalesce(p_answer, ''), 'čćšžđČĆŠŽĐ„”“’', 'ccszdCCSZD"""''')),
      '\s+', ' ', 'g'
    );
  end if;

  for v_accept in select jsonb_array_elements_text(coalesce(p_correct->'accept', '[]'::jsonb))
  loop
    if v_case_sensitive then
      v_accept_case := regexp_replace(
        trim(translate(v_accept, 'čćšžđČĆŠŽĐ„”“’', 'ccszdCCSZD"""''')),
        '\s+', ' ', 'g'
      );
      if v_accept_case <> '' and v_accept_case = v_answer_case then
        return true;
      end if;
      continue;
    end if;

    v_accept_norm := regexp_replace(
      public.fn_normalize_text(translate(v_accept, '„”“’', '"""''')),
      '\s+', ' ', 'g'
    );
    if v_accept_norm = '' then
      continue;
    end if;

    if v_accept_norm = v_answer_norm then
      return true;
    end if;

    if v_exact then
      continue;
    end if;

    if char_length(v_answer_norm) >= 4 and levenshtein(v_accept_norm, v_answer_norm) <= 1 then
      return true;
    end if;
  end loop;

  return false;
end;
$function$;

-- 3. Automatsko strogo ocenjivanje pravopisnih zadataka 3. razreda (srpski-pravopis)
UPDATE public.questions
SET correct = (correct - 'exact') || '{"case_sensitive": true}'::jsonb,
    manual_review = false
WHERE id IN (
    '00a294f1-52bc-4070-99d2-2d9b960dfe92',
    '014202f8-53f6-4e31-8d5a-cb12ae45ec65',
    '01c1847f-1ddd-4f3f-a287-a68f038f5e12',
    '022dd57f-a224-4f9b-8a50-f243a8994d63',
    '05a8c572-1332-4aa2-a0c1-15eb20013709',
    '07fb1b9e-fb74-4b63-bea9-dfb5d86d477f',
    '087a0fe1-c951-4b2b-97a3-27d35268a3dd',
    '0adc446d-6fa1-4362-9315-8de013d0d0d7',
    '0ce6b71c-30bc-4b9a-9584-d5d2d6d219e4',
    '0d79274e-e8ac-4320-b324-5a768aed1de9',
    '0dc68a4e-d050-4569-a88a-a035f04fbd37',
    '10e9738e-451b-464b-9cb4-5cbc5983b537',
    '113efdab-9691-4a09-b25b-2efe94145491',
    '12ce863e-1baf-4194-af4c-c0dc0c9ec9f3',
    '133894ce-8a64-4fbd-b609-ce5f55ef0a8c',
    '13f1a153-f17d-4d64-b9b6-ace9d026264c',
    '182c480e-e662-4b5e-b3b9-b9a08d7fb9a7',
    '189e249b-7389-48f6-8862-f23c1ad3f139',
    '1974c613-f5bc-40c4-9fbf-48e0ea48f907',
    '19770ce0-8846-4005-92b9-b4480a67398d',
    '1b1cfb3d-df2f-4a53-a2c3-4111bc79e9b3',
    '1f501d85-45f0-4843-bba9-531ee6d2becb',
    '2262e698-6cc1-409a-8924-56034ab9e086',
    '22ae112d-4a3d-4430-a0eb-c66d599abc58',
    '22b3fb62-4de0-4bee-95e1-d0d9b02f8550',
    '24381f51-3c83-405e-aa07-0e8fc8f5777e',
    '24638b60-ca7b-4e12-b3d2-84d3a52afa47',
    '25f8a3d0-535c-4afc-ba9e-a3817cfb9061',
    '26ba962e-3b6d-4966-82d6-11fbf9682c92',
    '270a3506-c54a-4c50-bdc2-0806e4f030b2',
    '27372a79-409c-4682-8f62-e9307c988be8',
    '2ac26c87-e61a-41a9-98fa-ae16812d0af3',
    '2cf6b8e0-899b-4f1c-a8f2-91116f1975c1',
    '31e80ad8-e4e5-4863-8ef3-b37fcff05ab9',
    '32c21076-7f6b-49a0-a32c-701260b24e1f',
    '33e125ba-184e-459b-91fb-0bbcd5fad027',
    '33fbcec1-6b4c-41a0-8963-d974ef7b35d1',
    '3848e9a4-e3ba-4483-87b1-7efec3d754bf',
    '3c06dfa4-6be9-4aae-819f-101d1c94e6f9',
    '3f5acf13-81fb-43e8-921d-9c5c49aa5298',
    '412f1f80-3000-4da8-8680-c61ca6837945',
    '45cf2295-683b-4b57-a5ff-9f6378a992d8',
    '489c04d9-bd5a-4b47-a5ff-51ae064c9536',
    '4957440a-61aa-4738-9a11-e75162ccb9b7',
    '4a4bffdf-05c6-433a-b254-67b60624683f',
    '4c00af23-3c53-46e2-990e-a12f92d0a712',
    '4e404a39-f9bb-4212-a180-cc9a4605e946',
    '4ecf6641-c2fa-4639-bbbc-b73ccc008da6',
    '4ed4db25-f2db-4866-8f91-eef714d85f71',
    '4ee3c1df-e555-4a5d-81de-e76938ae0ebd',
    '51bedb70-95d5-4ee7-9ce6-bf9743597abc',
    '573654d4-4a40-4108-bd6e-6381d5e299c4',
    '5758d571-9759-4712-8a68-0128ab46ef82',
    '5791687f-efd7-4c2b-bd7b-c31434a63f3a',
    '58453e10-b203-49fe-8ecf-aa7d236803dd',
    '58a56ab2-dc85-424c-8f83-ebce3b41a53c',
    '5a06d55c-5721-4dd8-89ea-3c22b73c8cab',
    '5ab9886c-d9ea-4257-90fc-a3f62a40ff28',
    '5b1534f5-ba05-4cf9-bdbc-8cd78f29a452',
    '5df51924-9aa4-41f2-9014-807c5034c889',
    '5e816438-1ed5-43c0-a0a0-1cac75e23d57',
    '5ef870e5-2995-497a-acbe-7b92ee2d82e9',
    '624ce852-a787-4641-be58-684a9b09c046',
    '65cf63b8-29a8-48b7-85c3-7d3b51e50881',
    '663edc21-15a3-40e9-be78-ca5eaa0e96fc',
    '67075150-6f4a-408b-aa6e-85a52d0153a4',
    '676f0a24-f892-448c-b533-819e08c39d31',
    '67d33673-4536-47f6-b084-a52fabff0a40',
    '6872391e-458a-4bbf-aca1-fc5916d7e7f8',
    '69591c28-bd83-49bf-b626-6d24c36d7c99',
    '697aef30-3657-46da-aa84-4612fff57a09',
    '69e13bfb-cb7c-4e90-ab4e-8c8fffd21f1f',
    '6a0f8664-0d60-4415-86a3-1a2ec9305a61',
    '6a972ff4-5519-4c1b-95de-4c91423f60c4',
    '6ab03f39-69e4-4b80-8f61-acc31e4a9a9a',
    '6c7a24a3-125d-41cf-98c7-91293370c1e8',
    '6c9f9722-6557-4eb9-8300-75875d8ea6d7',
    '6ccab620-871f-4c69-bcdf-231722d535a7',
    '6d06093d-a28f-46b0-b23b-e9f448e59099',
    '6d31072c-5d41-4bd8-881b-be8ee32faba1',
    '6d3d0337-647a-4651-9e78-e9f7cd80e2f2',
    '701e760e-4d38-45f2-bdf8-3bd61c80bd87',
    '70af25af-8e82-4738-a1c6-57b3c1125245',
    '7102c4b0-c40a-439e-a5d9-58d797894692',
    '71394158-d56e-4af9-9ebb-948bca227364',
    '725868ce-c758-4f43-a706-054f232edb68',
    '762be8e0-2022-482e-b425-c42146fe4ff6',
    '76c10dfd-65fe-451f-84db-df114523ab6a',
    '773cf1e9-4dab-411b-8795-4aa4a98baebc',
    '794ee81d-6cb4-47e9-8715-c1dfb038a55d',
    '7c40e109-ff4b-492b-9993-f02c26df3833',
    '7ce6e716-cf83-4d8a-859e-5fbcef312991',
    '7da3610f-63e6-45b0-8595-3866f30330b6',
    '82d3308e-f4ac-4db9-bf09-1c3ef88e9f90',
    '82e25bea-0bc6-41cc-b118-4b1a89a978f8',
    '84efcf96-3570-4337-86c1-3eb5713508b6',
    '8755285a-7b17-40fd-bc7b-e92654156da0',
    '88267854-4696-44bf-9927-7d27bc01a0ac',
    '8d34fbbd-90ed-424e-9785-5d7ee4836292',
    '8e36418a-603e-41d7-aaf2-19fddd32c309',
    '8ef29ed8-085b-4cd8-a2f6-9301c83832c6',
    '920c498b-3c53-492f-86e0-08f1fb803616',
    '94b8d8da-1cb0-419f-9943-d558996c8852',
    '974b2394-3af6-46ea-9207-dabd7e44d9a1',
    '97511ed7-07b2-416f-8566-d3dc54ba93e0',
    '97845e08-14c1-4a84-95c0-f95545513e2e',
    '992226c9-d7b2-4908-aace-01dd28b3faa7',
    '9b132862-bfce-45ae-a319-5fdb939147bf',
    '9c2f2dd1-6a66-47ce-b209-0af3f8c92b92',
    '9d154060-1cd7-4542-95fa-501353ef7e80',
    '9e71f0d8-5fd3-49ef-8119-06783377bfed',
    '9fca6d49-08b0-426b-a0db-d912ff882c28',
    'a08c9f40-6229-4a78-943e-0253f1d37b15',
    'a24cc9e8-def9-4543-b61a-12b1b5a627d6',
    'a41d8771-bfc2-4a1d-b5fa-8726e048539b',
    'a4ff41f8-6a1c-46f3-bc1c-71e2a535ab1f',
    'a67650fa-ac4d-47f9-88a0-2714110ffc0c',
    'a6d9507e-9d96-4d8d-8264-2f129f270abf',
    'a978a869-6159-438b-b7e6-9c25745f5662',
    'a9dc6e3e-9ecc-4436-9e8d-72a32959a1f0',
    'aa4ae248-d0d5-459c-9b8a-1e26c2366627',
    'abacaabd-94b4-4870-b1c3-b230c262e0ea',
    'adeab938-e03f-4aaf-9fe3-7f0c1b1a11ab',
    'aff4dc53-b66e-4683-beb7-c3db339fbc37',
    'b3cbc5c6-f993-4b12-9094-23c6b1a4b762',
    'b474506f-245a-4aac-93a5-169dac30fa80',
    'b7e20663-1bea-45cb-afef-011b15e561f0',
    'b803b5e4-1284-4b79-b897-db7900e0b4ed',
    'b989e2c7-e687-4504-a037-3c05b63921e0',
    'ba3529f0-5f91-4312-a95e-32f6b5ded917',
    'ba656897-60c5-48db-a051-16f2b11db678',
    'ba8ef11e-f556-49f7-818b-e23a138daa8b',
    'baf3df61-970c-4bde-8057-c0d7e0ee30aa',
    'bb3b4560-43e2-408c-9e2d-ed329371a12c',
    'bc46fafd-7ceb-4311-be27-694d38e2a4a8',
    'bc549c21-5624-470a-bf0e-2bb35737d4d9',
    'bd005103-7904-42f1-8eef-6cc71ec5e150',
    'bd315638-65a8-46a0-9efe-f0c3b41a768e',
    'c0ff8d01-0b9a-4153-b8ba-496def338b5b',
    'c11addd3-c0b1-4828-bea1-8637388af34b',
    'c15f3141-e41a-466b-96fa-ea36b8d60ee5',
    'c1dfa815-e5ca-4e6e-904b-6cd07eb21df6',
    'c2afd40a-f5ef-44eb-bc18-cc189304d080',
    'c2f34295-64d6-48f2-96ed-76adcb9eba51',
    'c46bdedb-5a2c-4a6e-a8ed-a973756da8f3',
    'c4b5820e-007b-45fc-af51-368154b59eb6',
    'c5f02b59-0a8d-4daf-a55c-73f31849dc59',
    'c87b1213-1703-4df4-bd82-9b0e69265b5b',
    'c8c441bc-2df0-42d6-a5d3-8053c5721ea8',
    'c95cb2fc-7846-4170-8a75-abc11594d303',
    'cbb95edf-f226-405d-943a-23285e32af95',
    'cbf1110f-c1dd-4c13-97c8-d8a6f190544f',
    'ccdc3811-9ef3-4f33-983b-251cf4fd348d',
    'd022e204-4710-4122-b8ed-849fecd986f1',
    'd1bb8430-a961-48c8-8a11-2f058814f815',
    'd301720f-6792-41d3-be4e-2090d7541017',
    'd37b0e1e-79bd-4389-b99e-ecd12d9bc576',
    'd4c2b2d4-00dd-4c7b-ae3e-ac25fa66702c',
    'd63cb2d6-8a62-4465-a04a-7eff842aa786',
    'd6826fba-7696-4877-8cac-7dc03d4868a1',
    'da3f16b2-96d5-4792-be9b-e6e87a95ee1d',
    'da65f3ce-6b6f-414c-9b75-81ca1f630df2',
    'da6c853a-c1e8-43b2-a0e0-4bfa6eec36b1',
    'da8d474b-75d5-4691-b21e-5d6004837713',
    'dbb2fe96-eaf3-49f4-9e2a-a9cd1f0c667a',
    'dcbf5ac7-8945-426e-a714-1988f966ee6c',
    'e32aee92-ed4a-4780-aec7-bdc097b7562c',
    'e3720826-ddd1-4d71-9ad3-8ddd43be7050',
    'e49723c8-2734-43c9-a943-680b70d963ed',
    'e4aaa42e-684a-494f-8ed7-9eeee38eb139',
    'e6bfc58a-e287-4992-847a-aebfca531fb2',
    'e73bdd29-e1cf-4947-9da9-bc62b885a4e4',
    'e90c4726-25ed-4bfe-9b42-5a4c97a75ac1',
    'ea6a8cb3-0e2b-493e-afe8-7f7080a76820',
    'edb1a04e-7467-4b66-b2ec-af5e6436b564',
    'edc37836-e8f6-4281-9c88-74d43f78a12a',
    'eea5fb31-078a-4d05-8bf5-9ac0bb25a152',
    'f0a6a261-51bc-4640-a95c-83434c2bc6f7',
    'f0ea1f66-29e2-4799-94a0-21058f79176b',
    'f25a6db7-44da-4eae-894c-061c3732eca9',
    'f2ba38bb-f20f-4f45-acea-2d02941d4317',
    'f30c1aad-6be4-4f7b-a39e-4c3afc63a6b4',
    'f49cc304-f6fb-40be-b1a5-9e7a534ac698',
    'f54bc916-9462-4977-86d4-95c6d7a31e92',
    'f9335991-2c88-4b0c-8091-87a5fb83ee2c',
    'f934cf02-a867-4ed2-8bec-6880315b4046',
    'fc568501-a9f2-41c9-9d1e-af51b43342dd',
    'fd228f8a-6377-4ccd-ac17-cba5f4d8da4e',
    'fd576b7f-9d52-4121-b905-7ca7f87705de',
    'fd6b8dd3-81b8-4467-8fbc-64350647f6fb',
    'feb08e23-b0fb-4e52-a2ee-0bcda61ad636',
    'ff9637ed-7e16-41cd-87ef-14b4a15d91f6'
);

UPDATE public.questions
SET correct = (correct - 'case_sensitive') || '{"exact": true}'::jsonb,
    manual_review = false
WHERE id IN (
    '00806343-862f-4e78-8807-b0d2050a6b08',
    '0155311e-3c19-4d34-89f1-b6553589deb2',
    '0257d0c8-6bf8-4ee2-a214-052762ff99ef',
    '0264e7d1-bbcd-425b-b4ba-6de63c812e23',
    '02d909d4-5a4f-447d-8bbe-02eb48a2aa88',
    '039f77ec-788a-4d93-b6d7-4a1636b068cb',
    '04e299fd-f276-4752-9666-d0664b244ef7',
    '05642180-d1b8-469a-89e5-7112298118fd',
    '05797fe5-93c5-43e9-b802-7a5f323758f7',
    '05e44f37-3e60-47b7-995d-3dc53bdf9165',
    '076da966-f512-4780-acef-1906453aac23',
    '084c51e1-0a86-41bb-a1f1-204ba7574d9a',
    '0947d531-e9f8-4ae3-a058-2b8ec927b199',
    '09f9a059-98fb-4c3d-8e42-75fc04896efe',
    '0c77621b-670a-4281-bf61-7d495dda1a0d',
    '0e1a2db2-f6f2-4714-aa31-f3992f712bf6',
    '0e737092-5f15-4998-9f78-2d00dba22613',
    '0ece3eab-e38c-4b07-8d7c-715ed1725741',
    '0f6e26bd-60df-444f-85a3-9a759a134c6b',
    '0f9e338c-354e-4db2-846f-62c47383e9f4',
    '10a225fc-180c-4b4c-85b6-be713e68af49',
    '10be17d3-9a07-4d65-9938-0437e42460a5',
    '13368cc5-1714-41a9-9f02-250ff1848c44',
    '14027e0a-142e-49b6-80d8-c7a5abbf0297',
    '1527ec29-0c51-4fd1-b1b5-bc92d579d825',
    '1957f1ad-9b28-44da-b21a-e0ba8331abee',
    '1a009ad9-0137-40f3-90bb-b630a0d35bbf',
    '1ad8359a-a009-4af9-a6ab-1546231c2500',
    '1c3455ed-2c4c-480d-bd8a-0347ce291d7e',
    '1cafe28b-b72a-4d69-90da-02dd5d0d7b05',
    '1d711536-e441-4df3-9788-fb7394731452',
    '1d7f9587-e637-4a1f-b8ee-6c53e10c5a0c',
    '1e9f13ec-8bdd-4ca9-8ca0-5eaad6e0e91e',
    '1eb299d1-28fe-4acc-9660-f34d3aaa5277',
    '1f0201c2-8613-41cd-8e0f-356e3e701f84',
    '1f85aa9d-cda7-41fd-b934-50430fe058a7',
    '1f9cb146-6cb5-4490-9f84-58bd960835d0',
    '21361076-8eb9-4f54-a807-9a85439633b0',
    '21ce814e-2e5a-4096-83dc-eb06d926b810',
    '22aa449d-637d-4f06-9e85-bde56557281f',
    '22b1cba6-14d2-49c1-b004-3d6c2e673939',
    '23ecdadb-cb8e-4713-b286-0f666418ae06',
    '25615824-306f-4152-b30d-f4549ec1560b',
    '2707fdbf-9c2b-4f0a-96da-bce487ee0a60',
    '27e4aeec-0082-42de-bdc7-4aea36fbda4a',
    '2877a54e-c458-4721-bb4e-9f710ed35c7a',
    '28c2ce36-7648-4206-addd-ef14ff437319',
    '2966cd5f-5717-4577-9e0a-a8efe34ba87f',
    '29792e42-24f3-4781-b85a-aafc9688f670',
    '2b61b4d5-a46c-4db2-a67c-473e3749fa54',
    '2bd57404-df2b-4a0b-85ea-ed8f3b8581fc',
    '2be3772b-9d3d-4424-9d22-5181cee381a4',
    '2d8c4999-7da3-4978-ad55-58d489f6e5aa',
    '3039056f-c9cf-412d-b311-58657aafb340',
    '32107a75-3c44-403f-8a6c-a053031195fc',
    '32fe742b-d3a6-4dd1-b80d-fe01d56a60e9',
    '3354896e-ae6b-405f-85c9-fc5725effc25',
    '33885a9c-09d2-4bc1-9dac-af82424df86b',
    '33d6af20-a2f6-47c0-ac8e-b528eedb30c4',
    '34ae9d15-0c8f-4291-9f1a-68292166a4e1',
    '353d6651-6725-453e-b37c-9774629e6bcc',
    '35907726-42b0-4961-af0c-970a4b2b52d3',
    '364ac33d-0765-4d95-9ff4-bee25a278d17',
    '36620183-39a4-4d7c-9548-3817f5f27c7d',
    '366f4994-5f74-42dc-a999-8bff675582d1',
    '37093f68-81a0-4ed2-bc1e-f84e2ef82ecb',
    '372f77a9-2de7-46b6-b67f-7d895c891c04',
    '3793a2e9-ae67-4605-8c89-7cb2455e09df',
    '38074354-d733-4e66-ad64-77fd06c3ecfb',
    '394ba468-856f-453d-8bf5-33d70dee9870',
    '39df2a7e-e179-40c9-833e-b8d8f86f3526',
    '3dd50b60-108d-4fce-b1aa-8cd6ef20baec',
    '3ec0284b-3354-4de4-a81b-a1237af72852',
    '3fc81168-716f-4b4b-845b-8acff03a0056',
    '423ba1c1-9e89-4524-a1e5-50850fcd64d4',
    '433b87c3-b538-424b-9026-0b2c2e640d97',
    '4421dc21-70a8-4faa-bbde-4956adb10ae9',
    '4457594d-1d84-42b0-868c-d44bb3540cb6',
    '450cad7a-a297-4ae2-ab56-8a8c4fca7be0',
    '460fffab-3af6-4466-aa30-10f737fb6b2a',
    '46956c89-b54c-4015-bca8-98131ef33f7b',
    '46e49004-0603-4a16-9ecf-1f7fd309f051',
    '471b9350-047e-490d-a1fe-281a5b1c167e',
    '47331ec5-c7e7-4ac6-8216-677e0c0b32c3',
    '4824f859-1c39-46b7-8a46-4609bb32a966',
    '4b9e1302-ff19-40e9-8e0f-bbc65963f1bd',
    '4eba9a8e-30fc-460c-bc9f-14ba30eb339e',
    '4ef4a8ef-b8bc-4248-b0bd-acaea4aacaa1',
    '4f3287aa-8c9e-490e-89b7-cfdf68d26470',
    '4f577048-7f2b-47cb-a168-554f825652ce',
    '4fc6d848-d96e-44de-a30e-5bb9699258bc',
    '4fd906e6-6019-426c-9151-12e093c6ab4b',
    '4ffcba0c-eb22-48f9-8533-ba9c946930b8',
    '50029683-c4ae-4478-b0b0-8ececf80c3a1',
    '52f28291-bb86-4045-b046-9d39ca55ae96',
    '532f7e73-5dee-4fac-8c13-7d8e189c5492',
    '53734d23-47f9-4bda-a55a-76733a225369',
    '55cb35ef-e3de-4307-b78e-43823069287d',
    '5627ac28-e0d6-4916-b49e-e5a21779fab7',
    '581cca10-dd86-4684-b8d9-8657851216ed',
    '591b7b31-8116-40ac-bd5e-b409dfa8ba07',
    '5bb2518b-fa3f-44a2-898c-ab9e831c87eb',
    '5c745549-7f3f-435f-8eaa-4875578fb641',
    '5d3a4d6b-dff7-47cf-95f6-3c86fe0af6f1',
    '5d5b86b0-ca1d-490e-a023-470071a4910f',
    '5d8b0e01-dd48-46a1-88a8-3b9c4aa8ae09',
    '5ec0ed54-f72f-4fe2-9dbd-6405111b76ea',
    '60391b44-a783-43de-9992-96b3c89723b3',
    '60c7e2c8-5844-41bb-b40a-76d7cc3e6be9',
    '6333742c-1fd1-4b96-b888-6baef0291d6e',
    '6459635b-6ee8-4560-b6fa-f5d2113c43e0',
    '648f96c6-c93b-4032-8dc0-42dfc90092b2',
    '682c9299-32a1-44fb-a935-a455bf535c20',
    '685d9c22-cb02-4486-bfc6-a7142aa5ee67',
    '6a126056-7eff-4804-a7aa-0780e6015f48',
    '6a46ca00-bbd2-4ec8-800a-57e4f503d68b',
    '6a6635ff-d1ad-4994-a165-04a30ff7e537',
    '6c17aca6-2097-4b58-9ef0-f119494dc5ae',
    '6c3462c2-9b00-451a-8bfc-6aead326db89',
    '6ccec961-d84c-42ea-aed4-800b70e4fd62',
    '70450356-8d35-4118-9dcc-f2eec5d1220d',
    '713cb331-8ac7-4c3e-a4f9-2a996086cc14',
    '72df774a-36ca-4bc4-bc33-059270b08570',
    '738aec0a-70dd-4368-ad29-012f8267ef9f',
    '761a41d9-322f-49bd-952b-cfec82d8b0d7',
    '7692f579-336b-4d76-83b4-495d9ded45a1',
    '77b61ce6-a02a-4bb3-84f5-c6e77f52cd26',
    '77da5475-cff2-485b-b899-980156f6d9ca',
    '78d09906-e92c-45fa-9072-d9e25cc56486',
    '78e1cbdc-d1dd-481a-b12b-01edb1b271e5',
    '794728b4-0585-489c-8a9a-f2af756fcfc9',
    '79cabddb-ef67-42fb-8199-58dd7cbe53b4',
    '7ea800fb-00c7-45cd-93a6-db9a3855b1f5',
    '803851c9-9956-48a7-8c8a-1ebda8e9a494',
    '80831837-acf4-4bbe-990c-1a734cb93385',
    '81600ef2-faf5-4afc-8a8e-ec26971fe175',
    '83115fd5-d069-4b51-9a73-7d618f0c4971',
    '83a3df46-3c51-4f5e-aa8f-a1ae9d084bf1',
    '83ceae85-e8df-4a35-8a69-e4f958b9001a',
    '89c4aa9e-2f47-4ee1-ac81-b8321311fe97',
    '8afe5cb2-b5a1-4203-b923-660979ed1ce0',
    '8b6f939a-d9d1-4d9d-9e15-27daa6808fca',
    '8ba347bf-63dc-44b0-a361-fc9017f68103',
    '8c24ee1b-e89e-435f-8ff5-2efee60b864d',
    '8cd3c11b-f616-4279-9ce1-699e428d3471',
    '9045f5b4-558d-4c66-8a7c-16e15b270d91',
    '9080cfe8-8057-4440-bc6a-9e3a44610811',
    '90e05ad9-b2bd-49d0-a13b-6f0ffc1b6493',
    '91a56ede-e4bb-4737-b76e-aa0cd5fac769',
    '9309a0c0-c2b7-4ba6-9ec8-a436f3ad4b79',
    '931570f1-360e-4821-b013-f6d550a9c381',
    '9367d1cb-360f-42a8-8e0d-45cbf8220b9d',
    '956345c6-8f6b-4119-9cae-66b29b681b00',
    '95680317-20af-47c4-9e0e-6ff0319da87e',
    '961bc51b-de5d-4c7d-94fa-52e675067040',
    '966ba95a-e41c-4360-b692-1440b82ba244',
    '968d6b24-6a8c-48d1-b33e-30d60b3996d2',
    '9754e895-328f-4e26-82e0-11c6c9d8e678',
    '97f64c92-d537-466d-b533-ed70ec587372',
    '99318435-b54e-465c-9f69-16929e41fd18',
    '9987a31a-52d1-45d1-b6a5-acc7364299c4',
    '9b30a120-7584-4e5e-9a08-7007a3f4792c',
    '9b7b53e5-f63b-4ec7-bd25-f9566fd0a295',
    '9bcfff90-6948-47fc-9562-6f1f6aa07ae3',
    '9c48db73-d649-474e-91bd-ee6d5e35a043',
    'a11e0c86-aa05-40c8-bd62-59317d5bdefe',
    'a199de9b-2d60-459f-80e5-258c65141425',
    'a3cdd619-70c2-45ac-b7e5-f7101b28061a',
    'a498bd45-87f5-49f0-b7d1-664331345214',
    'a4fd398c-9f9c-4686-a576-409e58d8efec',
    'a5d79803-9f87-4dbf-b0bd-386a56552d6f',
    'a72b6353-738f-44a8-afe8-a5c38836cd7c',
    'a775c778-b46e-446c-b76f-e3e273007e52',
    'a77efcd4-2b7d-4758-8417-94f80a6df49b',
    'a78d5427-5b7b-41ff-ada7-f188bf63f804',
    'ab373896-cdf8-460f-ab35-e01c7a94f906',
    'ac4ae08b-fdac-4050-898a-a11af251067e',
    'ad243a67-36e6-4ea3-8325-966c6861b07f',
    'ad7882f3-76f0-4ae0-9148-b1ed88674e00',
    'adb84188-287d-413e-a630-3a810b85de70',
    'aec4b1e5-8be0-4cec-98b5-a34ce9946c63',
    'aed89751-3a98-42e9-8e11-bb519ca0cc7e',
    'afd40208-e666-4802-a824-154da7b496ec',
    'b039ce39-1b96-4283-bc36-a8a1ec91348f',
    'b0a499da-1526-4e6b-a86e-d58d6ac98d4d',
    'b243e57f-447e-4471-823a-be35fd576453',
    'b49dea93-765a-4abe-b080-8a7a27dd3b8f',
    'b5b2c477-65c8-4770-9736-ccdcbb3f0de9',
    'b729f8a9-c1af-4339-8879-48a46dd10b50',
    'b83119ee-9873-4464-88b7-6c3055b575b3',
    'ba068b4e-e492-498a-b97b-0e7395049d5a',
    'bb61bb18-f2df-4cd8-9238-51d4809a2014',
    'bc0a67d0-22a2-4dfc-a491-4af24ddfc996',
    'bddb9af7-ddf9-4cdc-96b0-0b665514c595',
    'be9cbda6-8e08-4617-a152-56ba44f9b31d',
    'c1eb13e8-3579-4df2-bd0b-5ac6323b8311',
    'c25912a9-aa97-4393-a78f-9b3ff2a0263f',
    'c2c4ad5f-251d-439c-9c5e-a6f6c68cee31',
    'c56f0d39-f672-40b9-99ca-e11e47fae5e0',
    'c5e29460-68ca-4722-8df8-de0ce7e3516d',
    'c8401069-620c-4286-885a-9a5e0b3c2ae1',
    'c9de26e1-9799-4fea-8acc-f0fc80d5fe68',
    'cc2b9241-7dda-47bf-be9d-30008f0b051b',
    'cfb1352d-ce53-4009-8042-ae083a693b60',
    'd0742838-a9e7-42c4-88ae-9124556a4c7d',
    'd2a81a69-2b8a-4ebe-85f7-a31f175da6a7',
    'd354bac7-0a39-443b-ac76-00618e563812',
    'd4f213c3-3110-4bde-ac41-2d524909d2b6',
    'd69d1630-d3f8-4abc-a726-90df96168214',
    'dc296e1e-321c-4b9a-a72c-7ebded799619',
    'dc94fac3-0bd7-48d7-8b95-53c3fba4794d',
    'de4011f0-0621-448c-9da8-7e645bfaec80',
    'dfc9c3ff-9c2a-47f9-b827-f80fe2cf10fa',
    'e11e957f-8e25-401e-bbb8-a4e85cd8037b',
    'e26f65e4-bf27-4227-92a6-b18918e915b3',
    'e2cec60d-7b3e-4760-83af-f4a1435551cb',
    'e3c82804-6655-485a-b919-44322d1b1b55',
    'e481d76a-fff0-4f6f-b313-316aac6217b5',
    'e486ab25-98d9-4189-a5d6-3183c0a2671f',
    'ec0e7bd9-16fd-444b-8981-8f2ede5ce54a',
    'ede71e7d-161a-493d-a85f-1f76638983a6',
    'ee2cc905-b86c-4332-8132-863cf4698785',
    'ee2def29-c343-4eca-a639-c4a67d554a15',
    'ee406df5-1b41-4159-a042-1d5f9b24e49a',
    'ef1e0eae-26da-4e83-88f8-7519ac222745',
    'eff5af75-8c7a-4ad4-a750-a27fbf5df339',
    'f11da921-3ecc-477f-ad31-c5e9943c163e',
    'f193f422-4a59-4f32-b5c6-1344bb3cc6bc',
    'f3f42822-c895-4f5d-a361-f4e360072cb1',
    'f40e5d02-6840-486d-9975-70804640306f',
    'f4e0027a-442d-48b1-99d9-ecc3b9fc089c',
    'f601fe68-0576-4c20-b442-095504a85547',
    'f7df84fc-245b-4de4-85eb-b50db872f567',
    'f80f5633-f200-4ebb-9dee-f12f9cde43fa',
    'fa8e982a-164f-4063-ac3d-31ffd52869dd',
    'fb507180-e7b9-495c-bca3-5c996994edb0',
    'fc969702-daab-4f36-af8b-3ac2718b31ac',
    'fd209044-8b5e-433c-9dfd-e72a2a3b8058',
    'fd54afab-0068-4ff2-87eb-10904e36b7c1',
    'fea25f85-01d4-4a74-9a34-004e992c0d48',
    'ff39efdf-880c-49c9-9805-cfd174a2780f'
);

-- 4. Konverzija 19 pitanja iz srpski-pravopis gde pitanje otkriva tačan odgovor u izbor
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "dialog"}, {"id": "o1", "text": "dijalog"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = '1d09f133-3728-483c-9082-797b0f65cbc0';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "nebriga"}, {"id": "o1", "text": "ne briga"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = '096ae259-f3ce-46bd-8b50-66eb241aa156';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "nedam"}, {"id": "o1", "text": "ne dam"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = '294bd339-e1d7-4249-b095-e32ef16f21c5';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "nemoj"}, {"id": "o1", "text": "ne moj"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = '3aba640e-a7da-49b9-9fd4-a1ee81b67a4e';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne istina"}, {"id": "o1", "text": "neistina"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = '4a14cc9e-a639-445a-8eca-0b59aaa31c7a';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "neću"}, {"id": "o1", "text": "ne ću"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = '4afff4c5-349c-4901-94cb-8431411c8974';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne mam"}, {"id": "o1", "text": "nemam"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = '521c6866-58c9-4bf4-8350-0053792f950e';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "neradan"}, {"id": "o1", "text": "ne radan"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = '544b7a0d-fe79-4410-b039-c29199d48330';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne veseo"}, {"id": "o1", "text": "neveseo"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = '60457bc3-6a4c-40d0-aec6-7efbb840e76b';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "netačan"}, {"id": "o1", "text": "ne tačan"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = '7f0e7765-e76b-46a2-b870-91bd3d59442f';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "nečitamo"}, {"id": "o1", "text": "ne čitamo"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = '872d8f4d-1348-488e-a012-e291d1f8e54c';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne znam"}, {"id": "o1", "text": "neznam"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = '8899f032-c266-4bf0-8a2b-5daa66215bb8';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne siguran"}, {"id": "o1", "text": "nesiguran"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = '93eb7eb0-076f-4e62-b368-310d6a677960';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne bih"}, {"id": "o1", "text": "nebih"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = 'ae05de96-8404-4092-add4-a42496b65c04';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne mir"}, {"id": "o1", "text": "nemir"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = 'dec58b4b-fd4b-4144-8b7c-37ce75a12e24';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "nečist"}, {"id": "o1", "text": "ne čist"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = 'df0289bb-30c1-45e1-b0c1-78378eb6d565';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "nebrini"}, {"id": "o1", "text": "ne brini"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = 'e4301012-69e8-40d9-814f-5fe464a68463';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "nisam"}, {"id": "o1", "text": "ni sam"}]'::jsonb, correct = '{"optionId": "o0"}'::jsonb, manual_review = false WHERE id = 'f172950b-a5d5-4a52-827a-5ece558bd24a';
UPDATE public.questions SET type = 'single', text = 'Koji je oblik pravilno napisan?', options = '[{"id": "o0", "text": "ne sreća"}, {"id": "o1", "text": "nesreća"}]'::jsonb, correct = '{"optionId": "o1"}'::jsonb, manual_review = false WHERE id = 'ffd75289-246a-4390-b88e-398ca6fc3448';

-- 5. Ispravke pravila za rečcu NE sa imenicama/pridevima, OCR grešaka i objašnjenja (srpski-pravopis)
UPDATE public.questions
SET correct = '{"value": false}'::jsonb,
    explanation = 'Rečca NE se uz imenice i prideve piše spojeno kada sa njima gradi novu reč (npr. nesreća, nemiran).'
WHERE id = '52ac0948-575c-400e-9be7-acb34fc7b5fb';

UPDATE public.questions
SET correct = '{"value": false}'::jsonb,
    explanation = 'Rečca NE se uz imenice piše spojeno kada sa njima gradi novu reč (npr. nečovek, nesreća, neznanje).'
WHERE id = 'ae1f25bc-907c-4f58-abb3-295c6c1aa773';

UPDATE public.questions
SET correct = '{"accept": ["nečovek"], "exact": true}'::jsonb,
    manual_review = false,
    explanation = 'Rečca NE se uz imenicu piše spojeno kada sa njom gradi novu reč (nečovek).'
WHERE id IN ('dfc9c3ff-9c2a-47f9-b827-f80fe2cf10fa', 'fea25f85-01d4-4a74-9a34-004e992c0d48');

UPDATE public.questions
SET text = 'Spoji ili odvoji: NEznanje.',
    correct = '{"accept": ["neznanje"], "exact": true}'::jsonb,
    manual_review = false,
    explanation = 'Rečca NE se uz imenicu piše spojeno kada gradi novu reč (neznanje).'
WHERE id = '00806343-862f-4e78-8807-b0d2050a6b08';

UPDATE public.questions
SET text = 'Spoji ili odvoji: NEistina.',
    correct = '{"accept": ["neistina"], "exact": true}'::jsonb,
    manual_review = false,
    explanation = 'Rečca NE se uz imenicu piše spojeno kada gradi novu reč (neistina).'
WHERE id = '9987a31a-52d1-45d1-b6a5-acc7364299c4';

UPDATE public.questions
SET text = 'Spoji ili odvoji: NEsloga.',
    correct = '{"accept": ["nesloga"], "exact": true}'::jsonb,
    manual_review = false,
    explanation = 'Rečca NE se uz imenicu piše spojeno kada gradi novu reč (nesloga).'
WHERE id = '3793a2e9-ae67-4605-8c89-7cb2455e09df';

UPDATE public.questions
SET correct = '{"accept": ["nevreme"], "exact": true}'::jsonb,
    manual_review = false,
    explanation = 'Rečca NE se uz imenicu piše spojeno kada sa njom gradi novu reč (nevreme).'
WHERE id = '1eb299d1-28fe-4acc-9660-f34d3aaa5277';

UPDATE public.questions
SET correct = '{"accept": ["neprijatelj"], "exact": true}'::jsonb,
    manual_review = false,
    explanation = 'Rečca NE se uz imenicu piše spojeno kada sa njom gradi novu reč (neprijatelj).'
WHERE id = 'ede71e7d-161a-493d-a85f-1f76638983a6';

UPDATE public.questions
SET correct = '{"accept": ["nesrećan"], "exact": true}'::jsonb,
    manual_review = false
WHERE id = '22aa449d-637d-4f06-9e85-bde56557281f';

UPDATE public.questions
SET explanation = 'Rečca NE se sa ovim glagolom piše spojeno (izuzetak od opšteg pravila).'
WHERE id IN ('32fe742b-d3a6-4dd1-b80d-fe01d56a60e9', '532f7e73-5dee-4fac-8c13-7d8e189c5492');

UPDATE public.questions
SET text = 'Napiši pridev: NE + poznat.',
    correct = '{"accept": ["nepoznat"], "exact": true}'::jsonb,
    manual_review = false
WHERE id = 'ee406df5-1b41-4159-a042-1d5f9b24e49a';

UPDATE public.questions
SET text = 'Napiši pridev: NE + poslušan.',
    correct = '{"accept": ["neposlušan"], "exact": true}'::jsonb,
    manual_review = false
WHERE id = 'ad243a67-36e6-4ea3-8325-966c6861b07f';

-- 6. Ostale pravopisne, slovne i faktografske ispravke u srpski-pravopis
UPDATE public.questions
SET explanation = 'Reči sa jednim slogom (npr. „dan”, „sto”) ne mogu se podeliti.'
WHERE id = '1faeb739-48e4-42ac-a13b-10fb69e2e50a';

UPDATE public.questions
SET text = 'Napiši skraćenicu za reč: godina.',
    explanation = 'Skraćenica za reč „godina” piše se malim slovima sa tačkom (god.).'
WHERE id = '72df774a-36ca-4bc4-bc33-059270b08570';

UPDATE public.questions
SET explanation = replace(explanation, 'jedninica', 'jedinica')
WHERE topic_id IN (SELECT id FROM public.topics WHERE subject = 'srpski')
  AND explanation LIKE '%jedninica%';

UPDATE public.questions
SET text = 'Napiši pravilno naziv praznika: vidovdan.'
WHERE id = '33fbcec1-6b4c-41a0-8963-d974ef7b35d1';

UPDATE public.questions
SET text = 'Napiši reč: ___orgovan.',
    correct = '{"accept": ["jorgovan"], "exact": true}'::jsonb,
    explanation = 'Mirisni prolećni cvet.'
WHERE id = 'f4e0027a-442d-48b1-99d9-ecc3b9fc089c';

UPDATE public.questions
SET text = 'Prebaci u upravni govor: Deca vele da su gladna.',
    correct = '{"accept": ["Deca vele: „Gladni smo.”", "Deca vele: „Gladna smo.”"]}'::jsonb
WHERE id = '88831838-ac72-4a69-8e96-5e2187505078';

UPDATE public.questions
SET text = 'Prebaci u upravni govor: Ana kaže da je umorna.',
    correct = '{"accept": ["Ana kaže: „Umorna sam.”"]}'::jsonb
WHERE id = 'e3b38d8f-ba10-45aa-ac3b-0a8482622c41';

UPDATE public.questions
SET text = 'Prebaci u neupravni govor: Otac kaže: „Idemo u šetnju."'
WHERE id = 'b8b57bfa-7808-40ca-9e92-326a25a56342';

UPDATE public.questions
SET correct = '{"accept": ["Majka veli da pijem mleko", "Majka veli da pijem mleko.", "Majka veli da piješ mleko", "Majka veli da piješ mleko."]}'::jsonb
WHERE id = '8df1c5ff-6ee7-44e5-b3a1-6c92e48068b0';

UPDATE public.questions
SET text = 'U reči „radio” piše se slovo J između I i O.',
    correct = '{"value": false}'::jsonb,
    explanation = 'Između samoglasnika I i O slovo J se ne piše (radio).'
WHERE id = 'ada66ca1-b6ca-4b0d-8bb0-4192efc74207';

UPDATE public.questions
SET text = 'Napiši sinonim (reč sličnog značenja) za reč ''srdžba''.'
WHERE id = '8588d5fc-df4f-4c90-9be4-3dfdff2d5d7c';

UPDATE public.questions
SET correct = '{"accept": ["šest", "6"], "exact": true}'::jsonb
WHERE id = '8c24ee1b-e89e-435f-8ff5-2efee60b864d';

UPDATE public.questions
SET text = 'Može li se reč „mesec" podeliti na kraju reda?'
WHERE id = '956345c6-8f6b-4119-9cae-66b29b681b00';

UPDATE public.questions
SET correct = '{"accept": ["OŠ", "O.Š."], "case_sensitive": true}'::jsonb
WHERE id = '97511ed7-07b2-416f-8566-d3dc54ba93e0';

UPDATE public.questions
SET explanation = 'Naziv škole se piše pod navodnicima, velikim početnim slovom prve reči.'
WHERE id = '25f8a3d0-535c-4afc-ba9e-a3817cfb9061';

-- Prihvaćene ravnopravne podele suglasničkih grupa na slogove
UPDATE public.questions SET correct = '{"accept": ["pro-le-će"], "exact": true}'::jsonb WHERE id = '2bd57404-df2b-4a0b-85ea-ed8f3b8581fc';
UPDATE public.questions SET correct = '{"accept": ["sves-ka", "sve-ska"], "exact": true}'::jsonb WHERE id = '433b87c3-b538-424b-9026-0b2c2e640d97';
UPDATE public.questions SET correct = '{"accept": ["lop-ta", "lo-pta"], "exact": true}'::jsonb WHERE id = 'f193f422-4a59-4f32-b5c6-1344bb3cc6bc';
UPDATE public.questions SET correct = '{"accept": ["med-ved", "me-dved"], "exact": true}'::jsonb WHERE id = '4ffcba0c-eb22-48f9-8533-ba9c946930b8';
UPDATE public.questions SET correct = '{"accept": ["zvez-da", "zve-zda"], "exact": true}'::jsonb WHERE id = '738aec0a-70dd-4368-ad29-012f8267ef9f';
UPDATE public.questions SET correct = '{"accept": ["stak-lo", "sta-klo"], "exact": true}'::jsonb WHERE id = 'cc2b9241-7dda-47bf-be9d-30008f0b051b';
UPDATE public.questions SET correct = '{"accept": ["vež-ba-nje", "ve-žba-nje"], "exact": true}'::jsonb WHERE id = '581cca10-dd86-4684-b8d9-8657851216ed';
UPDATE public.questions SET correct = '{"accept": ["ra-do-sno", "ra-dos-no"], "exact": true}'::jsonb WHERE id = '70450356-8d35-4118-9dcc-f2eec5d1220d';

-- 7. Lažne rime u srpski-citanje
UPDATE public.questions
SET correct = '{"accept": ["srce", "zrnce"]}'::jsonb
WHERE id = '0bb9dc47-fa03-4674-b0a9-4264b3754902';

UPDATE public.questions
SET correct = '{"accept": ["tačka", "značka", "igračka", "packa"]}'::jsonb
WHERE id = '2f5253b3-a34a-4a1a-9f0c-7bc319a4e055';

UPDATE public.questions
SET correct = '{"accept": ["kola", "pola", "bola", "dola", "stola"]}'::jsonb
WHERE id = 'b2d133af-b7a9-41e9-913a-fafed55faa98';

UPDATE public.questions
SET correct = '{"accept": ["san", "stan", "plan", "dlan", "gran", "ran"]}'::jsonb,
    explanation = 'Rima: isti završetak.'
WHERE id = 'c9a0ccb3-ab2d-429f-8039-d55d7ead7f4c';

-- 8. Ijekavica (zamjenjuju -> zamenjuju)
UPDATE public.questions SET text = replace(text, 'zamjenjuju', 'zamenjuju')
WHERE id = 'c6a8a5bd-d59c-4335-a38c-35cace7258b7';

UPDATE public.questions SET explanation = replace(explanation, 'zamjenjuju', 'zamenjuju')
WHERE id IN (
    '919f0c30-4d92-4190-9fea-927ce1c77ba0',
    'd2c775d1-d554-4deb-a56a-1e68f13e4939',
    'e30a7452-d7e5-49a4-a964-a1fcbd4de7da',
    'fc8edcd4-d19e-4f7b-ae7a-8bd922a55fc6'
);

-- 9. Zbirne imenice, pridevi, književnost, gramatika i duplikati u accept
UPDATE public.questions SET correct = '{"accept": ["kamenje"]}'::jsonb WHERE id = '4923fa2e-2a6a-4171-9ea4-426db7a19032';
UPDATE public.questions SET correct = '{"accept": ["pruće"]}'::jsonb WHERE id = '577cb0d7-2cc7-4062-9a9b-8aee7c8a489f';
UPDATE public.questions SET explanation = 'Zbirna imenica od „list” je „lišće” i označava skup listova.' WHERE id IN ('633d6be3-b94a-4bbb-a502-f8f60211c5a6', 'f079c6f5-9327-4727-b950-63fb84b941c6');
UPDATE public.questions SET explanation = 'Zbirna imenica od „cvet” je „cveće” i označava skup cvetova.' WHERE id = 'def79b80-790f-4d52-8899-9c20b08f6b77';
UPDATE public.questions SET explanation = 'Zbirna imenica od „grana” je „granje” i označava skup grana.' WHERE id = 'fa8ec9fc-aeba-497f-8da2-dd919b9219f6';
UPDATE public.questions SET correct = '{"accept": ["lepa", "mala", "crna", "bela", "siva", "umiljata"]}'::jsonb WHERE id = '0a5107b0-1db5-4c16-95f1-627d45f69e6f';

UPDATE public.questions
SET correct = '{"accept": ["zajednička", "zajednička imenica"]}'::jsonb
WHERE id IN (
    '53b87e1f-4dca-415c-a391-0f866da8b64d',
    'b7e141a1-f478-4674-b97b-b600cac634a8',
    'bd483b52-515a-4abe-96c8-b4ba47d6e269',
    'e119d34e-1c94-4127-b131-ba2dcd62760c'
);

UPDATE public.questions SET correct = '{"accept": ["granje"]}'::jsonb WHERE id = 'a5c9123f-8d78-499e-a9eb-6c15c2da828a';
UPDATE public.questions SET correct = '{"accept": ["telad"]}'::jsonb WHERE id = 'db2767ce-ed7f-4f21-afdd-b063dce9e893';
UPDATE public.questions SET correct = '{"accept": ["zapovedna", "uzvična", "uzvična rečenica"]}'::jsonb WHERE id = 'ed4f8ec8-e2a6-4a2d-bf61-12605be9ae89';
UPDATE public.questions SET correct = '{"accept": ["Morava, Zapadne, Južne", "Morava Zapadne Južne", "Morava, Zapadne, Južne."]}'::jsonb WHERE id = '3e4b7822-0365-4b7f-99f2-01f1952e2ea6';

UPDATE public.questions SET correct = '{"accept": ["imenice koje označavaju skup nečega u jednini"]}'::jsonb WHERE id = '4dce0d08-6c7a-4809-8227-e82b8dcf4969';
UPDATE public.questions SET text = 'Koju vrstu reči zamenjuje zamenica „on" u rečenici „Marko je došao. On je tu."?' WHERE id = 'ad4fd6fd-f1da-422a-9528-57f214644d75';
UPDATE public.questions SET text = '„Pas je malen, riđ i ima meku dlaku.” Da li ova rečenica prepričava ili opisuje?' WHERE id = 'c98b475a-abe7-4c2a-811d-2f02fc8ef1e1';
UPDATE public.questions SET text = replace(text, 'skoro sav vreme', 'skoro sve vreme') WHERE id IN ('d3c10aa1-8aa1-4069-b851-e1fe45427e8f', '051c485c-989f-4d0b-a190-e64ca2679898');
UPDATE public.questions SET text = 'Da li je „Zlatna jabuka i devet paunica” narodna ili umetnička bajka?' WHERE id = '46dfef25-8029-4e87-806d-bf2bcb59da1b';
UPDATE public.questions SET text = 'Stihovi se završavaju sa „šuma” i „druma”. Kako se zove to podudaranje?' WHERE id = '62ebfdb4-3c10-46a3-b849-5e2187505078';

-- 10. Uklanjanje same tražene reči iz prihvaćenih sinonima u srpski-recnik i popravka upita za „radostan”
UPDATE public.questions SET correct = '{"accept": ["krasan", "prelep"]}'::jsonb WHERE id = '07bc4677-ab0b-40d1-9b41-154ef288a39e';
UPDATE public.questions SET correct = '{"accept": ["hrabar", "neustrašiv"]}'::jsonb WHERE id = '09b016a4-f401-4a8f-a4e3-80103a27c4a3';
UPDATE public.questions SET correct = '{"accept": ["drug"]}'::jsonb WHERE id = '0cf4a97d-4ff6-4ac4-af83-81ef575a0582';
UPDATE public.questions SET correct = '{"accept": ["radostan", "srećan"]}'::jsonb WHERE id = '1be73791-7a42-4fc4-aaa7-f0ac70adbf5a';
UPDATE public.questions SET correct = '{"accept": ["govoriti", "kazivati"]}'::jsonb WHERE id = '4ca0d01e-944a-410a-a5dc-57d87657b8c0';
UPDATE public.questions SET correct = '{"accept": ["pripovetka", "pripovest"]}'::jsonb WHERE id = '57c69fe5-057f-45f4-87ab-874ff94fa054';
UPDATE public.questions SET correct = '{"accept": ["hitar"]}'::jsonb WHERE id = '5cd2e814-8579-49a5-a61c-71dbed43fe95';
UPDATE public.questions SET correct = '{"accept": ["ples"]}'::jsonb WHERE id = '802ff1fe-5612-4e38-87db-76dac8f21d6d';
UPDATE public.questions SET correct = '{"accept": ["miran"]}'::jsonb WHERE id = '8c2ed99e-07c8-4463-875e-652aaecc8304';
UPDATE public.questions SET correct = '{"accept": ["smel", "neustrašiv"]}'::jsonb WHERE id = '9ae62d9d-6e80-422e-9ded-bb571610e1e5';
UPDATE public.questions SET correct = '{"accept": ["put"]}'::jsonb WHERE id = 'c2b3fe89-da9d-4bca-8f4c-add0b692c673';
UPDATE public.questions SET text = 'Napiši sinonim za reč „radostan".' WHERE id = 'f72dd8b3-c16b-40cb-9d89-8b831fc91416';
