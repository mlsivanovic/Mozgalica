-- start_retry prima pitanja i tačne odgovore; samo Edge funkcija pripremi-ponovni
-- sme da ga pozove service role klijentom. resume_retry i submit_retry ostaju javni.
revoke all on function public.start_retry(text, jsonb) from public, anon, authenticated;
grant execute on function public.start_retry(text, jsonb) to service_role;
