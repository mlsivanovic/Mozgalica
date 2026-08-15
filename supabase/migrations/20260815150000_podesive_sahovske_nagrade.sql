-- Administrator podešava nagrade za pobedu i remi po ELO nivou.
-- Završene partije zadržavaju već upisanu nagradu; izmene važe ubuduće.

alter table public.chess_games
  drop constraint if exists chess_games_stars_awarded_check;
alter table public.chess_games
  add constraint chess_games_stars_awarded_check
  check (stars_awarded is null or stars_awarded between 0 and 10);

create table public.chess_reward_settings (
  owner_id uuid not null references public.admin_settings (user_id) on delete cascade,
  approximate_elo smallint not null check (approximate_elo in (700, 900, 1100, 1300, 1500)),
  win_stars smallint not null check (win_stars between 0 and 10),
  draw_stars smallint not null check (draw_stars between 0 and 5),
  updated_at timestamptz not null default now(),
  primary key (owner_id, approximate_elo)
);

alter table public.chess_reward_settings enable row level security;
revoke all on public.chess_reward_settings from anon, authenticated;
grant select on public.chess_reward_settings to authenticated;

create policy chess_reward_settings_select on public.chess_reward_settings
  for select to authenticated
  using (owner_id = auth.uid() and public.fn_is_admin());

create or replace function public.fn_insert_default_chess_rewards(p_owner_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.chess_reward_settings (
    owner_id, approximate_elo, win_stars, draw_stars
  ) values
    (p_owner_id, 700, 1, 0),
    (p_owner_id, 900, 2, 1),
    (p_owner_id, 1100, 3, 1),
    (p_owner_id, 1300, 4, 2),
    (p_owner_id, 1500, 5, 3)
  on conflict (owner_id, approximate_elo) do nothing
$$;

revoke all on function public.fn_insert_default_chess_rewards(uuid) from public;

insert into public.chess_reward_settings (
  owner_id, approximate_elo, win_stars, draw_stars
)
select
  podesavanja.user_id,
  nagrada.approximate_elo,
  nagrada.win_stars,
  nagrada.draw_stars
from public.admin_settings podesavanja
cross join (values
  (700::smallint, 1::smallint, 0::smallint),
  (900::smallint, 2::smallint, 1::smallint),
  (1100::smallint, 3::smallint, 1::smallint),
  (1300::smallint, 4::smallint, 2::smallint),
  (1500::smallint, 5::smallint, 3::smallint)
) as nagrada(approximate_elo, win_stars, draw_stars)
on conflict (owner_id, approximate_elo) do nothing;

create or replace function public.fn_admin_settings_default_chess_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.fn_insert_default_chess_rewards(new.user_id);
  return new;
end;
$$;

revoke all on function public.fn_admin_settings_default_chess_rewards() from public;

create trigger trg_admin_settings_default_chess_rewards
  after insert on public.admin_settings
  for each row execute function public.fn_admin_settings_default_chess_rewards();

create or replace function public.save_chess_reward_settings(p_rewards jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_distinct_elo int;
  v_valid boolean;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_rewards is null or jsonb_typeof(p_rewards) <> 'array' or jsonb_array_length(p_rewards) <> 5 then
    return jsonb_build_object('ok', false, 'error', 'invalid_rewards');
  end if;

  select
    count(*),
    count(distinct x.approximate_elo),
    coalesce(bool_and(
      x.approximate_elo = trunc(x.approximate_elo)
      and x.approximate_elo in (700, 900, 1100, 1300, 1500)
      and x.win_stars = trunc(x.win_stars)
      and x.win_stars between 0 and 10
      and x.draw_stars = trunc(x.draw_stars)
      and x.draw_stars between 0 and 5
    ), false)
  into v_count, v_distinct_elo, v_valid
  from jsonb_to_recordset(p_rewards) as x(
    approximate_elo numeric,
    win_stars numeric,
    draw_stars numeric
  );

  if v_count <> 5 or v_distinct_elo <> 5 or not v_valid then
    return jsonb_build_object('ok', false, 'error', 'invalid_rewards');
  end if;

  insert into public.chess_reward_settings (
    owner_id, approximate_elo, win_stars, draw_stars, updated_at
  )
  select
    auth.uid(),
    x.approximate_elo::smallint,
    x.win_stars::smallint,
    x.draw_stars::smallint,
    now()
  from jsonb_to_recordset(p_rewards) as x(
    approximate_elo numeric,
    win_stars numeric,
    draw_stars numeric
  )
  on conflict (owner_id, approximate_elo) do update
  set
    win_stars = excluded.win_stars,
    draw_stars = excluded.draw_stars,
    updated_at = now();

  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'invalid_rewards');
end;
$$;

revoke all on function public.save_chess_reward_settings(jsonb) from public, anon;
grant execute on function public.save_chess_reward_settings(jsonb) to authenticated;

create or replace function public.fn_chess_stars(
  p_owner_id uuid,
  p_elo int,
  p_result text
)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_result = 'child_loss' then 0::smallint
    when p_result = 'draw' then coalesce((
      select draw_stars
      from public.chess_reward_settings
      where owner_id = p_owner_id and approximate_elo = p_elo
    ), 0::smallint)
    when p_result = 'child_win' then coalesce((
      select win_stars
      from public.chess_reward_settings
      where owner_id = p_owner_id and approximate_elo = p_elo
    ), 0::smallint)
    else 0::smallint
  end
$$;

revoke all on function public.fn_chess_stars(uuid, int, text) from public;

create or replace function public.fn_guard_chess_game_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
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

drop function public.fn_chess_stars(int, text);
