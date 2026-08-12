-- Supabase projekat ima podrazumevani execute grant za anon rolu. Statistika je
-- isključivo administratorski RPC, pa anon pristup ukidamo eksplicitno i na već
-- postojećim projektima na kojima je prethodna migracija već primenjena.
revoke all on function public.admin_get_child_statistics_overview() from anon;
revoke all on function public.admin_get_child_statistics_detail(uuid, date, date) from anon;
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from anon;
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from authenticated;

revoke all on function public.admin_get_child_statistics_overview() from public;
revoke all on function public.admin_get_child_statistics_detail(uuid, date, date) from public;
revoke all on function public.fn_child_statistics_attempts(uuid, uuid, text, date, date) from public;

grant execute on function public.admin_get_child_statistics_overview() to authenticated;
grant execute on function public.admin_get_child_statistics_detail(uuid, date, date) to authenticated;
