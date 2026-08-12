-- Interna pomoćna funkcija prima identifikatore vlasnika i profila, zato nikad
-- ne sme biti dostupna klijentskim rolama. Koriste je samo SECURITY DEFINER
-- admin RPC funkcije iz prethodne migracije.
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from public;
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from anon;
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from authenticated;
