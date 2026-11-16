-- Postgres podrazumevano daje EXECUTE grupi PUBLIC, pa su interne SECURITY DEFINER
-- pomoćne funkcije bile dostupne anon ključu preko /rest/v1/rpc. Primalac sa tuđim
-- UUID-om je mogao da pokrene mejlove/push roditelju, a claim_notification_deliveries
-- je dozvoljavao da bilo ko "pokupi" i potroši pokušaje slanja obaveštenja.
-- Pozivaju ih samo druge SECURITY DEFINER funkcije (kao vlasnik) i Edge funkcije
-- (service_role), pa klijentima ne trebaju.

do $$
declare
  v_fn regprocedure;
begin
  for v_fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'claim_notification_deliveries',
        'fn_chess_retries_used',
        'fn_chess_stars',
        'fn_child_title_progress',
        'fn_child_title_season_stars',
        'fn_enqueue_push_deliveries',
        'fn_ensure_active_child_title_season',
        'fn_ensure_completion_notification',
        'fn_insert_default_chess_rewards',
        'fn_notify_result',
        'fn_profile_current_title',
        'fn_profile_total_stars',
        'fn_recompute_attempt',
        'fn_refresh_child_title_season',
        'fn_refresh_quiz_auto_title',
        'fn_spendable_stars'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn);
    execute format('grant execute on function %s to service_role', v_fn);
  end loop;
end;
$$;

-- Oblasti su zajedničke za sve administratore: svako sme da doda novu, ali ne i da
-- menja ili briše tuđe (UI ionako samo dodaje).
revoke update, delete on public.topics from authenticated;
