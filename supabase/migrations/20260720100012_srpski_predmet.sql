-- Predmet ("subject") na temama: matematika (podrazumevano) ili srpski jezik.
-- Omogućava da se u banci pitanja i kvizu pitanja iz dva predmeta drže odvojeno.
alter table public.topics
  add column subject text not null default 'matematika'
  check (subject in ('matematika', 'srpski'));

-- Postojeće teme su sve matematika (default pokriva backfill).

-- Pod-teme za srpski jezik.
insert into public.topics (slug, name, sort_order, subject) values
  ('srpski-gramatika', 'Gramatika', 200, 'srpski'),
  ('srpski-pravopis', 'Pravopis', 210, 'srpski'),
  ('srpski-citanje', 'Čitanje i razumevanje', 220, 'srpski'),
  ('srpski-recnik', 'Rečnik', 230, 'srpski');
