-- Proširenje težine pitanja sa 1-3 na 1-5 (dodati nivoi 4 „Vrlo teško" i 5 „Ekspert").
-- quiz_questions snapshot nema kolonu difficulty pa se ne dira.
alter table public.questions drop constraint questions_difficulty_check;
alter table public.questions add constraint questions_difficulty_check
  check (difficulty between 1 and 5);
