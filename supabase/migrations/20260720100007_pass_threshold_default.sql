-- Podrazumevani prag za prolaz je 90% (bilo 50%)
alter table public.quizzes alter column pass_threshold_pct set default 90;
