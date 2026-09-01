-- Brisanje profila deteta iz administratorskog panela.
-- FK-ovi ka kvizovima, pokušajima, šahu i dnevnim rasporedima su RESTRICT
-- (da slučajan DELETE ne obriše istoriju), pa RPC prvo uklanja zavisne redove.

create or replace function public.delete_child_profile(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_profile
  from public.child_profiles
  where id = p_profile_id and owner_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  -- Dnevni rasporedi: runs i nedeljni izveštaji drže schedule RESTRICT.
  delete from public.smart_weekly_reports
  where child_profile_id = p_profile_id;

  delete from public.daily_quiz_runs r
  using public.daily_quiz_schedules s
  where r.schedule_id = s.id and s.child_profile_id = p_profile_id;

  delete from public.daily_quiz_schedules
  where child_profile_id = p_profile_id;

  delete from public.daily_chess_runs r
  using public.daily_chess_schedules s
  where r.schedule_id = s.id and s.child_profile_id = p_profile_id;

  delete from public.daily_chess_schedules
  where child_profile_id = p_profile_id;

  -- Samoreferenca retry_of_game_id: prvo otkači, pa obriši partije.
  update public.chess_games
  set retry_of_game_id = null
  where child_profile_id = p_profile_id
    and retry_of_game_id is not null;

  delete from public.chess_games
  where child_profile_id = p_profile_id;

  -- Profilni linkovi povlače pokušaje (quiz_link_id ON DELETE CASCADE).
  delete from public.quiz_links
  where child_profile_id = p_profile_id;

  -- Stariji pokušaji povezani samo po imenu, preko generičkog linka.
  delete from public.attempts
  where child_profile_id = p_profile_id;

  delete from public.child_profiles
  where id = p_profile_id and owner_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.delete_child_profile(uuid) from public, anon;
grant execute on function public.delete_child_profile(uuid) to authenticated;
