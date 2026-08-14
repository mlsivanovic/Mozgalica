-- Dnevni rasporedi šaha automatski dodeljuju novu partiju u izabrano vreme po
-- vremenu Srbije. Postojeći trigger na chess_games zatim pravi inbox i push
-- obaveštenje, pa zakazani i ručno dodeljeni šah koriste isti pouzdani outbox.

create table public.daily_chess_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid not null references public.child_profiles (id) on delete restrict,
  approximate_elo smallint not null check (approximate_elo in (700, 900, 1100, 1300, 1500)),
  child_color text not null check (child_color in ('white', 'black')),
  clock_seconds int check (clock_seconds is null or clock_seconds in (300, 600, 900, 1800)),
  daily_time time not null,
  timezone text not null default 'Europe/Belgrade' check (timezone = 'Europe/Belgrade'),
  is_active boolean not null default true,
  next_run_on date not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_daily_chess_schedules_due
  on public.daily_chess_schedules (is_active, next_run_on, daily_time)
  where deleted_at is null;

create trigger trg_daily_chess_schedules_touch
  before update on public.daily_chess_schedules
  for each row execute function public.fn_touch_updated_at();

create table public.daily_chess_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.daily_chess_schedules (id) on delete restrict,
  local_date date not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 3),
  chess_game_id uuid references public.chess_games (id) on delete set null,
  error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, local_date)
);

create index idx_daily_chess_runs_schedule_status
  on public.daily_chess_runs (schedule_id, status, local_date desc);

create trigger trg_daily_chess_runs_touch
  before update on public.daily_chess_runs
  for each row execute function public.fn_touch_updated_at();

alter table public.chess_games
  add column daily_schedule_id uuid references public.daily_chess_schedules (id) on delete set null,
  add column daily_local_date date;

create unique index uq_chess_games_daily_schedule_date
  on public.chess_games (daily_schedule_id, daily_local_date)
  where daily_schedule_id is not null;

alter table public.daily_chess_schedules enable row level security;
alter table public.daily_chess_runs enable row level security;
revoke all on public.daily_chess_schedules, public.daily_chess_runs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Administratorsko upravljanje rasporedima
-- ---------------------------------------------------------------------------

create or replace function public.save_daily_chess_schedule(
  p_schedule_id uuid,
  p_child_profile_id uuid,
  p_approximate_elo int,
  p_child_color text,
  p_clock_seconds int,
  p_daily_time time
)
returns public.daily_chess_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.daily_chess_schedules;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
  v_next_run_on date;
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;
  if p_approximate_elo not in (700, 900, 1100, 1300, 1500) then
    raise exception 'Nepodržan ELO nivo.';
  end if;
  if p_child_color not in ('white', 'black') then
    raise exception 'Nepodržana boja deteta.';
  end if;
  if p_clock_seconds is not null and p_clock_seconds not in (300, 600, 900, 1800) then
    raise exception 'Nepodržana vremenska kontrola.';
  end if;
  if not exists (
    select 1 from public.child_profiles
    where id = p_child_profile_id and owner_id = auth.uid()
  ) then
    raise exception 'Profil deteta nije pronađen.';
  end if;

  v_next_run_on := v_local_now::date
    + case when p_daily_time <= v_local_now::time then 1 else 0 end;

  if p_schedule_id is null then
    insert into public.daily_chess_schedules (
      owner_id, child_profile_id, approximate_elo, child_color,
      clock_seconds, daily_time, next_run_on
    ) values (
      auth.uid(), p_child_profile_id, p_approximate_elo, p_child_color,
      p_clock_seconds, p_daily_time, v_next_run_on
    ) returning * into v_schedule;
  else
    update public.daily_chess_schedules
    set child_profile_id = p_child_profile_id,
        approximate_elo = p_approximate_elo,
        child_color = p_child_color,
        clock_seconds = p_clock_seconds,
        daily_time = p_daily_time,
        next_run_on = case when is_active then v_next_run_on else next_run_on end
    where id = p_schedule_id and owner_id = auth.uid() and deleted_at is null
    returning * into v_schedule;

    if v_schedule.id is null then
      raise exception 'Raspored nije pronađen.';
    end if;
  end if;

  return v_schedule;
end;
$$;

create or replace function public.set_daily_chess_schedule_active(
  p_schedule_id uuid,
  p_is_active boolean
)
returns public.daily_chess_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.daily_chess_schedules;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  update public.daily_chess_schedules
  set is_active = p_is_active,
      next_run_on = case when p_is_active then
        v_local_now::date + case when daily_time <= v_local_now::time then 1 else 0 end
      else next_run_on end
  where id = p_schedule_id and owner_id = auth.uid() and deleted_at is null
  returning * into v_schedule;

  if v_schedule.id is null then
    raise exception 'Raspored nije pronađen.';
  end if;
  return v_schedule;
end;
$$;

create or replace function public.delete_daily_chess_schedule(p_schedule_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  update public.daily_chess_schedules
  set is_active = false, deleted_at = coalesce(deleted_at, now())
  where id = p_schedule_id and owner_id = auth.uid() and deleted_at is null;

  if not found then
    raise exception 'Raspored nije pronađen.';
  end if;
end;
$$;

create or replace function public.list_daily_chess_schedules()
returns table (
  id uuid,
  child_profile_id uuid,
  child_name text,
  child_avatar text,
  approximate_elo smallint,
  child_color text,
  clock_seconds int,
  daily_time time,
  timezone text,
  is_active boolean,
  next_run_on date,
  last_sent_at timestamptz,
  last_game_id uuid,
  last_error text
)
language sql
security definer
set search_path = public
as $$
  select
    s.id, s.child_profile_id, cp.name, cp.avatar, s.approximate_elo,
    s.child_color, s.clock_seconds, s.daily_time, s.timezone, s.is_active,
    s.next_run_on, poslednji.completed_at, poslednji.chess_game_id, greska.error
  from public.daily_chess_schedules s
  join public.child_profiles cp on cp.id = s.child_profile_id
  left join lateral (
    select r.completed_at, r.chess_game_id
    from public.daily_chess_runs r
    where r.schedule_id = s.id and r.status = 'succeeded'
    order by r.local_date desc
    limit 1
  ) poslednji on true
  left join lateral (
    select r.error
    from public.daily_chess_runs r
    where r.schedule_id = s.id and r.status = 'failed'
    order by r.updated_at desc
    limit 1
  ) greska on true
  where s.owner_id = auth.uid() and s.deleted_at is null and public.fn_is_admin()
  order by s.is_active desc, s.daily_time, cp.name;
$$;

revoke all on function public.save_daily_chess_schedule(uuid, uuid, int, text, int, time) from public, anon;
revoke all on function public.set_daily_chess_schedule_active(uuid, boolean) from public, anon;
revoke all on function public.delete_daily_chess_schedule(uuid) from public, anon;
revoke all on function public.list_daily_chess_schedules() from public, anon;
grant execute on function public.save_daily_chess_schedule(uuid, uuid, int, text, int, time) to authenticated;
grant execute on function public.set_daily_chess_schedule_active(uuid, boolean) to authenticated;
grant execute on function public.delete_daily_chess_schedule(uuid) to authenticated;
grant execute on function public.list_daily_chess_schedules() to authenticated;

-- ---------------------------------------------------------------------------
-- Serverska obrada; jedinstveni dnevni red i ID zahteva sprečavaju duplo slanje.
-- ---------------------------------------------------------------------------

create or replace function public.process_due_daily_chess_schedules(p_limit int default 100)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule record;
  v_run public.daily_chess_runs;
  v_game_id uuid;
  v_local_now timestamp := now() at time zone 'Europe/Belgrade';
  v_local_date date := (now() at time zone 'Europe/Belgrade')::date;
  v_count int := 0;
  v_examined int := 0;
begin
  for v_schedule in
    select s.*
    from public.daily_chess_schedules s
    where s.is_active
      and s.deleted_at is null
      and s.next_run_on <= v_local_date
      and s.daily_time <= v_local_now::time
    order by s.next_run_on, s.daily_time, s.created_at
    for update of s skip locked
  loop
    exit when v_examined >= greatest(1, least(coalesce(p_limit, 100), 500));
    v_examined := v_examined + 1;
    v_game_id := null;

    insert into public.daily_chess_runs (schedule_id, local_date)
    values (v_schedule.id, v_local_date)
    on conflict on constraint daily_chess_runs_schedule_id_local_date_key do nothing;

    select r.* into v_run
    from public.daily_chess_runs r
    where r.schedule_id = v_schedule.id and r.local_date = v_local_date
    for update;

    if v_run.status = 'succeeded' then
      update public.daily_chess_schedules s
      set next_run_on = v_local_date + 1
      where s.id = v_schedule.id;
      continue;
    end if;

    if v_run.attempts >= 3 then
      update public.daily_chess_schedules s
      set next_run_on = v_local_date + 1
      where s.id = v_schedule.id;
      continue;
    end if;

    update public.daily_chess_runs r
    set attempts = r.attempts + 1, status = 'pending', error = null
    where r.id = v_run.id
    returning r.* into v_run;

    begin
      insert into public.chess_games (
        owner_id, child_profile_id, assignment_request_id, approximate_elo,
        child_color, clock_seconds, white_remaining_ms, black_remaining_ms,
        notify_child_email, daily_schedule_id, daily_local_date
      ) values (
        v_schedule.owner_id, v_schedule.child_profile_id, v_run.id,
        v_schedule.approximate_elo, v_schedule.child_color, v_schedule.clock_seconds,
        case when v_schedule.clock_seconds is null then null else v_schedule.clock_seconds::bigint * 1000 end,
        case when v_schedule.clock_seconds is null then null else v_schedule.clock_seconds::bigint * 1000 end,
        false, v_schedule.id, v_local_date
      )
      on conflict (assignment_request_id) do nothing
      returning id into v_game_id;

      if v_game_id is null then
        select g.id into v_game_id
        from public.chess_games g
        where g.assignment_request_id = v_run.id;
      end if;

      if v_game_id is null then
        raise exception 'Zakazana šahovska partija nije napravljena.';
      end if;

      update public.daily_chess_runs r
      set status = 'succeeded', chess_game_id = v_game_id,
          completed_at = now(), error = null
      where r.id = v_run.id;

      update public.daily_chess_schedules s
      set next_run_on = v_local_date + 1
      where s.id = v_schedule.id;

      v_count := v_count + 1;
    exception when others then
      update public.daily_chess_runs r
      set status = 'failed', error = left(sqlerrm, 2000)
      where r.id = v_run.id;

      if v_run.attempts >= 3 then
        update public.daily_chess_schedules s
        set next_run_on = v_local_date + 1
        where s.id = v_schedule.id;
      end if;
    end;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.process_due_daily_chess_schedules(int) from public, anon, authenticated;

select cron.schedule(
  'process_daily_chess_games',
  '* * * * *',
  'select public.process_due_daily_chess_schedules();'
);
