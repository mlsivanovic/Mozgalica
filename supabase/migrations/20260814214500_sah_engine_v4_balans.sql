-- Nove partije beleže verziju sa ujednačenim nivoima i materijalnom zaštitom.
alter table public.chess_games
  alter column engine_version set default 'mozgalica-4';
