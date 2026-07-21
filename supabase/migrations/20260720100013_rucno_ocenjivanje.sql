-- Oznaka "ručno ocenjivanje" na pitanju: kad je uključena (i tip nije truefalse),
-- odgovor deteta ne dobija automatsku ocenu na predaji, već čeka administratora
-- (videti migraciju 20260720100014 za samo ocenjivanje). Postoji i na banci pitanja
-- (questions) i na zamrznutom snapshot-u kviza (quiz_questions), jer ocenjivanje
-- čita iz snapshot-a.
alter table public.questions      add column manual_review boolean not null default false;
alter table public.quiz_questions add column manual_review boolean not null default false;
