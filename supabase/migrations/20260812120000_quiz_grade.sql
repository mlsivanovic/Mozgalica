-- Razred kviza kao denormalizovana kolona.
-- Do sada se razred pokušaja izvlačio posredno preko quiz_questions.topic_id,
-- što pada za kvizove čija su pitanja izgubila topic_id (on delete set null).
-- Kolumna je nullable da ne puca na postojećim redovima; backfill niže
-- popunjava vrednost gde god se razred može pouzdano izvući iz snapshot pitanja.
alter table public.quizzes
  add column if not exists grade smallint check (grade in (3, 4));

-- Backfill: razred = minimalan grade među oblastima pitanja kviza.
-- Kvizovi za koje se ne nađe nijedan topic_id ostaju NULL — prikazuju se pod
-- "Svi razredi", a razred im se kasnije postavlja ručno kroz formu.
update public.quizzes q
set grade = (
  select min(t.grade)
  from public.quiz_questions qq
  join public.topics t on t.id = qq.topic_id
  where qq.quiz_id = q.id and qq.topic_id is not null
)
where q.grade is null
  and exists (
    select 1 from public.quiz_questions qq
    join public.topics t on t.id = qq.topic_id
    where qq.quiz_id = q.id and qq.topic_id is not null
  );
