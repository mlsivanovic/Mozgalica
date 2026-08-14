-- Nove partije beleže pojačanu iterativnu verziju enginea.
alter table public.chess_games
  alter column engine_version set default 'mozgalica-2';
