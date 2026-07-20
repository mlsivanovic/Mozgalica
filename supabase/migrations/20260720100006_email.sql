-- Mozgalica: podrška za asinhrono slanje mejlova iz submit_attempt (pg_net)
-- pg_net zahteva sopstvenu šemu 'net' (Supabase konvencija) — ne premeštati u 'extensions'
create extension if not exists pg_net;

-- Napomena za administratora (videti SETUP.md):
-- posle deploy-a Edge funkcije treba ručno upisati u app_config:
--   insert into public.app_config (key, value) values
--     ('functions_url', 'https://<project-ref>.functions.supabase.co'),
--     ('hook_secret', '<slucajan-tajni-string>')
--   on conflict (key) do update set value = excluded.value;
-- To se radi kroz Supabase SQL Editor (radi kao postgres rola, RLS se ne primenjuje).
