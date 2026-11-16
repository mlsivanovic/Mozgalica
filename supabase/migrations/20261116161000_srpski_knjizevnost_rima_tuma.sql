-- Dopuna: ispravka tačnog UUID-a za pitanje o rimi u srpski-knjizevnost („tuma” -> „druma”).
UPDATE public.questions
SET text = 'Stihovi se završavaju sa „šuma” i „druma”. Kako se zove to podudaranje?'
WHERE id = '62ebfdb4-3c10-46a3-b849-5e65c0e2a6a5';
