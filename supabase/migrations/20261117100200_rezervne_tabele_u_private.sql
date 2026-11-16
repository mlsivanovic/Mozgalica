-- Rezervne tabele premeštene iz public u private šemu. Šema private nema USAGE za
-- anon, authenticated i service_role, pa tabele nisu dostupne preko API-ja.
-- Podaci se ne menjaju.

alter table public.backup_faza9_attempt_answers set schema private;
alter table public.backup_faza9_attempt_retry_questions set schema private;
alter table public.backup_faza9_attempts set schema private;
alter table public.backup_faza9_chess_games set schema private;
alter table public.backup_faza9_chess_moves set schema private;
alter table public.backup_faza9_child_profiles set schema private;
alter table public.backup_faza9_daily_chess_schedules set schema private;
alter table public.backup_faza9_daily_quiz_schedules set schema private;
alter table public.backup_faza9_notification_deliveries set schema private;
alter table public.backup_faza9_notifications set schema private;
alter table public.backup_faza9_push_subscriptions set schema private;
alter table public.backup_faza9_quiz_links set schema private;
alter table public.backup_faza9_quiz_questions set schema private;
alter table public.backup_faza9_quizzes set schema private;
alter table public.backup_faza9_school_timetables set schema private;
alter table public.backup_faza9_shop_items set schema private;
alter table public.backup_faza9_shop_purchases set schema private;
alter table public.backup_faza9_smart_weekly_reports set schema private;
alter table public.push_subscriptions_backup_20261115 set schema private;
alter table public.questions_backup_20260814_srpski_razredi set schema private;
