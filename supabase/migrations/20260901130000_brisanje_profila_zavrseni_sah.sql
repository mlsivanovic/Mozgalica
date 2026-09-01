-- Brisanje profila mora da dira i završene/otkazane partije (otkačinjanje
-- retry_of_game_id i SET NULL sa dnevnog rasporeda). Stražar to inače zabranjuje.

create or replace function public.fn_guard_chess_game_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('mozgalica.bypass_chess_guard', true) = '1' then
    return new;
  end if;

  if old.status in ('completed', 'cancelled') then
    raise exception 'Završena ili otkazana šahovska partija je nepromenjiva.';
  end if;

  if new.status = 'completed' then
    if new.result is null or new.termination is null then
      raise exception 'Završena partija mora imati rezultat i razlog završetka.';
    end if;
    new.stars_awarded := public.fn_chess_stars(new.owner_id, new.approximate_elo, new.result);
    new.completed_at := coalesce(new.completed_at, now());
    new.turn_started_at := null;
  elsif new.status = 'cancelled' then
    new.result := null;
    new.termination := null;
    new.stars_awarded := null;
    new.completed_at := coalesce(new.completed_at, now());
    new.turn_started_at := null;
  else
    new.result := null;
    new.termination := null;
    new.stars_awarded := null;
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

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

  -- Važi samo do kraja ovog RPC poziva; obične partije ostaju nepromenjive.
  perform set_config('mozgalica.bypass_chess_guard', '1', true);

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

  update public.chess_games
  set retry_of_game_id = null
  where child_profile_id = p_profile_id
    and retry_of_game_id is not null;

  delete from public.chess_games
  where child_profile_id = p_profile_id;

  delete from public.quiz_links
  where child_profile_id = p_profile_id;

  delete from public.attempts
  where child_profile_id = p_profile_id;

  delete from public.child_profiles
  where id = p_profile_id and owner_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;
