-- Mozgalica: početni podaci — 15 oblasti i administratorska allowlist
insert into public.topics (slug, name, sort_order) values
  ('sabiranje', 'Sabiranje', 10),
  ('oduzimanje', 'Oduzimanje', 20),
  ('mnozenje', 'Množenje', 30),
  ('deljenje', 'Deljenje', 40),
  ('kombinovane-operacije', 'Kombinovane računske operacije', 50),
  ('tekstualni-zadaci', 'Tekstualni zadaci', 60),
  ('poredjenje-brojeva', 'Poređenje brojeva', 70),
  ('nizovi-i-obrasci', 'Nizovi i prepoznavanje obrazaca', 80),
  ('geometrija', 'Geometrija', 90),
  ('obim-i-merenje', 'Obim i merenje dužine', 100),
  ('vreme-i-sat', 'Vreme i sat', 110),
  ('novac', 'Novac', 120),
  ('merne-jedinice', 'Merne jedinice', 130),
  ('razlomci', 'Jednostavni razlomci', 140),
  ('logicki-zadaci', 'Logički matematički zadaci', 150);

-- Vlasnik naloga postaje administrator čim se registruje sa ovim email-om
insert into public.admin_allowlist (email) values ('mls.ivanovic@gmail.com');
