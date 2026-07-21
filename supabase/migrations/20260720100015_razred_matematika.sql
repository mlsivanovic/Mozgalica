-- Razred ("grade") na temama — trenutno samo matematika ima više razreda.
-- Omogućava da se pitanja/kvizovi 3. i 4. razreda drže potpuno odvojeno.
alter table public.topics
  add column grade smallint not null default 3
  check (grade in (3, 4));

-- Postojeće teme su sve 3. razred (default pokriva backfill).

-- 4. razred — matematika (13 novih oblasti, generator postoji za svaku).
insert into public.topics (slug, name, sort_order, subject, grade) values
  ('veliki-brojevi-4', 'Veliki brojevi', 300, 'matematika', 4),
  ('sabiranje-4', 'Sabiranje', 310, 'matematika', 4),
  ('oduzimanje-4', 'Oduzimanje', 320, 'matematika', 4),
  ('mnozenje-4', 'Množenje', 330, 'matematika', 4),
  ('deljenje-4', 'Deljenje', 340, 'matematika', 4),
  ('kombinovane-operacije-4', 'Kombinovane računske operacije', 350, 'matematika', 4),
  ('jednacine-4', 'Jednačine', 360, 'matematika', 4),
  ('nejednacine-4', 'Nejednačine', 370, 'matematika', 4),
  ('povrsina-4', 'Površina', 380, 'matematika', 4),
  ('zapremina-4', 'Zapremina', 390, 'matematika', 4),
  ('geometrijska-tela-4', 'Geometrijska tela', 400, 'matematika', 4),
  ('razlomci-4', 'Razlomci', 410, 'matematika', 4),
  ('decimalni-brojevi-4', 'Decimalni brojevi', 420, 'matematika', 4);
