-- Ispravke formulacija, gramatike i jednog pogrešnog saveta u bazi pitanja iz matematike (3. razred)
-- Backup pogođenih redova pre izmene (po pravilu iz AGENTS.md)
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.questions_matematika_backup_20261116 AS
SELECT * FROM public.questions
WHERE id IN (
  '4f0e34ea-ee9a-429c-a9e6-71e8bec8ae07',
  'd21ef489-e080-4445-be66-86ae6a57ce45',
  'c405928c-05db-407e-9bbf-d6263a08c98a',
  'a6ee3903-11a6-4ea5-a6e3-d5d8d5d0c8e3',
  'aee9a494-6b37-4dd3-8236-e2daf4d8b8a3',
  '7b1192b5-102f-4cea-85b6-116c333f3da0',
  'ece5c50b-724a-4ee6-a001-771b98c5e9a0',
  'dc6e070d-2270-4d0d-aea6-8fbdada2d558',
  'e8fc0070-5e4d-44f2-956b-3793d63b08e1',
  'e5ba0041-73a6-432f-b8b5-0c2cbbf60c88',
  'b1820b9b-0198-4f27-8043-22cb295cfaef'
);

UPDATE public.questions
SET text = 'Kako se zove zajednička početna tačka krakova ugla?'
WHERE id = '4f0e34ea-ee9a-429c-a9e6-71e8bec8ae07';

UPDATE public.questions
SET explanation = 'Upravan položaj pravih znači da obrazuju prav ugao.'
WHERE id = 'd21ef489-e080-4445-be66-86ae6a57ce45';

UPDATE public.questions
SET hint = 'Koliko ostane preko najvećeg umnoška broja 5 manjeg od 23.'
WHERE id = 'c405928c-05db-407e-9bbf-d6263a08c98a';

UPDATE public.questions
SET explanation = 'Kad su brojilac i imenilac jednaki, uzeta je cela jedinica (1).'
WHERE id = 'a6ee3903-11a6-4ea5-a6e3-d5d8d5d0c8e3';

UPDATE public.questions
SET text = 'Koji razlomak je najveći?'
WHERE id = 'aee9a494-6b37-4dd3-8236-e2daf4d8b8a3';

UPDATE public.questions
SET text = 'Razlomak 3/3 ne označava celu jedinicu, jer je imenilac 3.'
WHERE id = '7b1192b5-102f-4cea-85b6-116c333f3da0';

UPDATE public.questions
SET text = 'Koji komad iste pice je najveći?'
WHERE id = 'ece5c50b-724a-4ee6-a001-771b98c5e9a0';

UPDATE public.questions
SET text = 'Koji razlomak označava celu jedinicu (1)?'
WHERE id = 'dc6e070d-2270-4d0d-aea6-8fbdada2d558';

UPDATE public.questions
SET explanation = '3 od 10 jednakih delova (olovaka) je 3/10.'
WHERE id = 'e8fc0070-5e4d-44f2-956b-3793d63b08e1';

UPDATE public.questions
SET text = 'Ana je pojela 1/2 pice, a Luka 1/4 pice iste veličine. Ko je pojeo više?'
WHERE id = 'e5ba0041-73a6-432f-b8b5-0c2cbbf60c88';

UPDATE public.questions
SET text = 'Ujutru je palo 125 litara kiše u burad, a popodne 87 litara više nego ujutru. Koliko je litara palo popodne?'
WHERE id = 'b1820b9b-0198-4f27-8043-22cb295cfaef';
