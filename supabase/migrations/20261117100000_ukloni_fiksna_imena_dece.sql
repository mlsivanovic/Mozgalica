-- Novi roditelj dobija prazan nalog. Ranije je svaki email sa admin_allowlist
-- dobijao profile dece 'Andrej' i 'Filip' i početne sezone titula. Podrazumevani
-- nivoi titula ostaju.

create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.admin_allowlist where lower(email) = lower(new.email)) then
    insert into public.admin_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;

    insert into public.title_levels (owner_id, name, min_stars) values
      (new.id, 'Početnik', 0),
      (new.id, 'Istraživač', 5),
      (new.id, 'Znalac', 12),
      (new.id, 'Majstor', 24),
      (new.id, 'Šampion', 40)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_admin_settings_initial_child_title_seasons on public.admin_settings;
drop function if exists public.fn_create_initial_child_title_seasons();

-- Zastareli sistem sezona titula (pre child_profiles). Ništa živo ga ne poziva
-- (provereno pre uklanjanja). Tabele child_title_* ostaju kao istorijski podaci.
drop view if exists public.v_child_star_totals;
drop function if exists public.admin_get_child_title_statuses();
drop function if exists public.admin_start_new_title_season(text);
drop function if exists public.fn_child_title_progress(uuid, text, uuid);
drop function if exists public.fn_refresh_child_title_season(uuid, text, uuid);
drop function if exists public.fn_ensure_active_child_title_season(uuid, text);
drop function if exists public.fn_child_title_season_stars(uuid);
drop function if exists public.fn_total_stars(uuid, text);

-- Kolone quizzes.fixed_child_name i child_title_seasons.child_name ostaju; uklanjaju
-- se samo ograničenja koja su dozvoljavala samo dva imena.
alter table public.quizzes drop constraint if exists quizzes_fixed_child_name_check;
alter table public.child_title_seasons drop constraint if exists child_title_seasons_child_name_check;
