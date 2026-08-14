-- Oblasti srpskog jezika za 4. razred: moduli su već registrovani u generatoru,
-- ali bez redova u topics tabeli admin panel ih ne nudi, a dnevni kvizovi ih
-- odbijaju validacijom predmet+razred.
insert into public.topics (slug, name, sort_order, subject, grade) values
  ('srpski-gramatika-4', 'Gramatika', 200, 'srpski', 4),
  ('srpski-pravopis-4', 'Pravopis', 210, 'srpski', 4),
  ('srpski-citanje-4', 'Čitanje i razumevanje', 220, 'srpski', 4),
  ('srpski-recnik-4', 'Rečnik', 230, 'srpski', 4)
on conflict (slug) do nothing;
