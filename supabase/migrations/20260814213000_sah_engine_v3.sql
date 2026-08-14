-- Nove partije beleže verziju sa dubljom taktičkom proverom i knjigom otvaranja.
alter table public.chess_games
  alter column engine_version set default 'mozgalica-3';
