-- Školski raspored časova: roditelj piše, dete čita preko profilnog tokena.

create or replace function public.fn_school_periods_valid(p_periods jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  v_item jsonb;
  v_seen int[] := '{}';
  v_no int;
  v_start time;
  v_end time;
begin
  if p_periods is null or jsonb_typeof(p_periods) <> 'array' then return false; end if;
  if jsonb_array_length(p_periods) < 1 or jsonb_array_length(p_periods) > 9 then return false; end if;
  for v_item in select value from jsonb_array_elements(p_periods)
  loop
    if coalesce(v_item->>'periodNo', '') = ''
      or coalesce(v_item->>'startsAt', '') = ''
      or coalesce(v_item->>'endsAt', '') = '' then
      return false;
    end if;
    begin
      v_no := (v_item->>'periodNo')::int;
      v_start := (v_item->>'startsAt')::time;
      v_end := (v_item->>'endsAt')::time;
    exception when others then
      return false;
    end;
    if v_no < 0 or v_no > 8 or v_no = any(v_seen) or v_end <= v_start then
      return false;
    end if;
    v_seen := v_seen || v_no;
  end loop;
  return true;
end;
$$;

create table public.school_timetables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid not null unique references public.child_profiles (id) on delete cascade,
  rotation_mode text not null check (rotation_mode in ('fixed', 'alternating')),
  default_shift text not null check (default_shift in ('morning', 'afternoon')),
  anchor_monday date not null,
  include_saturday boolean not null default false,
  shared_slots boolean not null default true,
  morning_periods jsonb not null,
  afternoon_periods jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (public.fn_school_periods_valid(morning_periods)),
  check (public.fn_school_periods_valid(afternoon_periods)),
  check (extract(isodow from anchor_monday)::int = 1)
);

create trigger trg_school_timetables_touch
  before update on public.school_timetables
  for each row execute function public.fn_touch_updated_at();

create table public.school_timetable_slots (
  id uuid primary key default gen_random_uuid(),
  timetable_id uuid not null references public.school_timetables (id) on delete cascade,
  shift text check (shift is null or shift in ('morning', 'afternoon')),
  weekday smallint not null check (weekday between 1 and 6),
  period_no smallint not null check (period_no between 0 and 8),
  subject text not null check (length(trim(subject)) between 1 and 60),
  teacher text check (teacher is null or length(trim(teacher)) between 1 and 60),
  room text check (room is null or length(trim(room)) between 1 and 30),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  note text check (note is null or length(note) <= 200)
);

create unique index uq_school_timetable_slots_shared
  on public.school_timetable_slots (timetable_id, weekday, period_no)
  where shift is null;

create unique index uq_school_timetable_slots_shift
  on public.school_timetable_slots (timetable_id, shift, weekday, period_no)
  where shift is not null;

create index idx_school_timetable_slots_timetable
  on public.school_timetable_slots (timetable_id);

create table public.school_timetable_week_overrides (
  timetable_id uuid not null references public.school_timetables (id) on delete cascade,
  week_monday date not null,
  shift text not null check (shift in ('morning', 'afternoon')),
  primary key (timetable_id, week_monday),
  check (extract(isodow from week_monday)::int = 1)
);

alter table public.school_timetables enable row level security;
alter table public.school_timetable_slots enable row level security;
alter table public.school_timetable_week_overrides enable row level security;

revoke all on public.school_timetables, public.school_timetable_slots, public.school_timetable_week_overrides
  from public, anon, authenticated;

create or replace function public.fn_school_monday(p_date date)
returns date
language sql
immutable
as $$
  select p_date - (extract(isodow from p_date)::int - 1);
$$;

create or replace function public.fn_school_shift(
  p_mode text,
  p_default text,
  p_anchor date,
  p_week_monday date,
  p_override text
)
returns text
language sql
immutable
as $$
  select case
    when p_override in ('morning', 'afternoon') then p_override
    when p_mode = 'fixed' then p_default
    when mod((p_week_monday - p_anchor) / 7, 2) = 0 then p_default
    when p_default = 'morning' then 'afternoon'
    else 'morning'
  end;
$$;

create or replace function public.fn_school_normalize_periods(p_periods jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'periodNo', (e->>'periodNo')::int,
    'startsAt', to_char((e->>'startsAt')::time, 'HH24:MI'),
    'endsAt', to_char((e->>'endsAt')::time, 'HH24:MI')
  ) order by (e->>'periodNo')::int), '[]'::jsonb)
  from jsonb_array_elements(p_periods) e;
$$;

create or replace function public.fn_school_day_payload(
  p_timetable public.school_timetables,
  p_date date,
  p_now_time text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_weekday int := extract(isodow from p_date)::int;
  v_monday date := public.fn_school_monday(p_date);
  v_override text;
  v_shift text;
  v_periods jsonb;
  v_lessons jsonb;
begin
  if v_weekday = 7 or (v_weekday = 6 and not p_timetable.include_saturday) then
    return jsonb_build_object(
      'date', p_date, 'weekday', v_weekday, 'isBreak', true,
      'shift', null, 'lessons', '[]'::jsonb
    );
  end if;

  select o.shift into v_override
  from public.school_timetable_week_overrides o
  where o.timetable_id = p_timetable.id and o.week_monday = v_monday;

  v_shift := public.fn_school_shift(
    p_timetable.rotation_mode, p_timetable.default_shift, p_timetable.anchor_monday, v_monday, v_override
  );
  v_periods := case when v_shift = 'afternoon' then p_timetable.afternoon_periods else p_timetable.morning_periods end;

  with periodi as (
    select (e->>'periodNo')::int as period_no,
           e->>'startsAt' as starts_at,
           e->>'endsAt' as ends_at
    from jsonb_array_elements(v_periods) e
  ), casovi as (
    select p.period_no, p.starts_at, p.ends_at,
           s.subject, s.teacher, s.room, s.color, s.note
    from periodi p
    join public.school_timetable_slots s
      on s.timetable_id = p_timetable.id
     and s.weekday = v_weekday
     and s.period_no = p.period_no
     and (
       (p_timetable.shared_slots and s.shift is null)
       or (not p_timetable.shared_slots and s.shift = v_shift)
     )
  ), oznaceni as (
    select c.*,
      case when p_now_time is not null and c.starts_at <= p_now_time and p_now_time < c.ends_at then true else false end as is_current
    from casovi c
  ), sa_sledecim as (
    select o.*,
      case
        when p_now_time is null then false
        when exists (select 1 from oznaceni x where x.is_current)
          then o.period_no = (
            select min(x.period_no) from oznaceni x
            where x.period_no > (select y.period_no from oznaceni y where y.is_current)
          )
        else o.period_no = (
          select min(x.period_no) from oznaceni x where x.starts_at > p_now_time
        )
      end as is_next
    from oznaceni o
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'periodNo', period_no, 'startsAt', starts_at, 'endsAt', ends_at,
    'subject', subject, 'teacher', teacher, 'room', room, 'color', color, 'note', note,
    'isCurrent', is_current, 'isNext', is_next
  ) order by period_no), '[]'::jsonb)
  into v_lessons
  from sa_sledecim;

  return jsonb_build_object(
    'date', p_date, 'weekday', v_weekday, 'isBreak', false,
    'shift', v_shift, 'lessons', v_lessons
  );
end;
$$;

create or replace function public.fn_school_resolved(p_timetable public.school_timetables)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'Europe/Belgrade')::date;
  v_time text := to_char(v_now at time zone 'Europe/Belgrade', 'HH24:MI');
  v_tomorrow date := v_today + 1;
  v_monday date := public.fn_school_monday(v_today);
  v_override text;
  v_week jsonb := '[]'::jsonb;
  v_day date;
  v_last date;
begin
  select o.shift into v_override
  from public.school_timetable_week_overrides o
  where o.timetable_id = p_timetable.id and o.week_monday = v_monday;

  v_last := v_monday + case when p_timetable.include_saturday then 5 else 4 end;
  for v_day in
    select d::date from generate_series(v_monday::timestamp, v_last::timestamp, interval '1 day') as d
  loop
    v_week := v_week || jsonb_build_array(
      public.fn_school_day_payload(p_timetable, v_day, case when v_day = v_today then v_time else null end)
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'exists', true,
    'rotationMode', p_timetable.rotation_mode,
    'includeSaturday', p_timetable.include_saturday,
    'sharedSlots', p_timetable.shared_slots,
    'thisWeekShift', public.fn_school_shift(
      p_timetable.rotation_mode, p_timetable.default_shift, p_timetable.anchor_monday, v_monday, v_override
    ),
    'weekMonday', v_monday,
    'overrideShift', v_override,
    'serverNow', v_now,
    'today', public.fn_school_day_payload(p_timetable, v_today, v_time),
    'tomorrow', public.fn_school_day_payload(p_timetable, v_tomorrow, null),
    'week', v_week
  );
end;
$$;

create or replace function public.fn_school_slots_json(p_timetable_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'shift', s.shift, 'weekday', s.weekday, 'periodNo', s.period_no,
    'subject', s.subject, 'teacher', s.teacher, 'room', s.room, 'color', s.color, 'note', s.note
  ) order by s.weekday, s.period_no, s.shift nulls first), '[]'::jsonb)
  from public.school_timetable_slots s
  where s.timetable_id = p_timetable_id;
$$;

create or replace function public.admin_get_school_timetable(p_child_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_timetable public.school_timetables;
  v_resolved jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select * into v_profile
  from public.child_profiles
  where id = p_child_profile_id and owner_id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select * into v_timetable
  from public.school_timetables
  where child_profile_id = v_profile.id;
  if not found then
    return jsonb_build_object('ok', true, 'exists', false, 'childProfileId', v_profile.id,
      'childName', v_profile.name, 'childAvatar', v_profile.avatar);
  end if;
  v_resolved := public.fn_school_resolved(v_timetable);
  v_resolved := v_resolved || jsonb_build_object('childName', v_profile.name);
  return jsonb_build_object(
    'ok', true, 'exists', true,
    'childProfileId', v_profile.id, 'childName', v_profile.name, 'childAvatar', v_profile.avatar,
    'timetable', jsonb_build_object(
      'id', v_timetable.id,
      'rotationMode', v_timetable.rotation_mode,
      'defaultShift', v_timetable.default_shift,
      'anchorMonday', v_timetable.anchor_monday,
      'includeSaturday', v_timetable.include_saturday,
      'sharedSlots', v_timetable.shared_slots,
      'morningPeriods', v_timetable.morning_periods,
      'afternoonPeriods', v_timetable.afternoon_periods,
      'slots', public.fn_school_slots_json(v_timetable.id),
      'updatedAt', v_timetable.updated_at
    ),
    'resolved', v_resolved
  );
end;
$$;

create or replace function public.admin_list_school_timetables(p_child_profile_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_children jsonb := '[]'::jsonb;
  v_profile public.child_profiles;
  v_timetable public.school_timetables;
  v_today jsonb;
  v_next text;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_child_profile_id is not null and not exists (
    select 1 from public.child_profiles where id = p_child_profile_id and owner_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  for v_profile in
    select * from public.child_profiles
    where owner_id = auth.uid()
      and (p_child_profile_id is null or id = p_child_profile_id)
    order by created_at, id
  loop
    select * into v_timetable from public.school_timetables where child_profile_id = v_profile.id;
    if not found then
      v_children := v_children || jsonb_build_array(jsonb_build_object(
        'childProfileId', v_profile.id, 'childName', v_profile.name, 'childAvatar', v_profile.avatar,
        'exists', false, 'today', null, 'nextSubject', null
      ));
      continue;
    end if;
    v_today := public.fn_school_resolved(v_timetable)->'today';
    select x->>'subject' into v_next
    from jsonb_array_elements(coalesce(v_today->'lessons', '[]'::jsonb)) x
    where (x->>'isCurrent')::boolean or (x->>'isNext')::boolean
    order by (x->>'periodNo')::int
    limit 1;
    v_children := v_children || jsonb_build_array(jsonb_build_object(
      'childProfileId', v_profile.id, 'childName', v_profile.name, 'childAvatar', v_profile.avatar,
      'exists', true, 'today', v_today, 'nextSubject', v_next
    ));
  end loop;

  return jsonb_build_object('ok', true, 'children', v_children);
end;
$$;

create or replace function public.admin_upsert_school_timetable(p_child_profile_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_timetable public.school_timetables;
  v_slot jsonb;
  v_shift text;
  v_shared boolean;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  select * into v_profile
  from public.child_profiles
  where id = p_child_profile_id and owner_id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if coalesce(p_payload->>'rotationMode', '') not in ('fixed', 'alternating')
    or coalesce(p_payload->>'defaultShift', '') not in ('morning', 'afternoon')
    or coalesce(p_payload->>'anchorMonday', '') = ''
    or extract(isodow from (p_payload->>'anchorMonday')::date)::int <> 1
    or not public.fn_school_periods_valid(p_payload->'morningPeriods')
    or not public.fn_school_periods_valid(p_payload->'afternoonPeriods')
    or jsonb_typeof(coalesce(p_payload->'slots', '[]'::jsonb)) <> 'array'
  then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_shared := coalesce((p_payload->>'sharedSlots')::boolean, true);

  insert into public.school_timetables (
    owner_id, child_profile_id, rotation_mode, default_shift, anchor_monday,
    include_saturday, shared_slots, morning_periods, afternoon_periods
  ) values (
    auth.uid(), v_profile.id,
    p_payload->>'rotationMode', p_payload->>'defaultShift', (p_payload->>'anchorMonday')::date,
    coalesce((p_payload->>'includeSaturday')::boolean, false), v_shared,
    public.fn_school_normalize_periods(p_payload->'morningPeriods'),
    public.fn_school_normalize_periods(p_payload->'afternoonPeriods')
  )
  on conflict (child_profile_id) do update set
    rotation_mode = excluded.rotation_mode,
    default_shift = excluded.default_shift,
    anchor_monday = excluded.anchor_monday,
    include_saturday = excluded.include_saturday,
    shared_slots = excluded.shared_slots,
    morning_periods = excluded.morning_periods,
    afternoon_periods = excluded.afternoon_periods
  returning * into v_timetable;

  for v_slot in select value from jsonb_array_elements(coalesce(p_payload->'slots', '[]'::jsonb))
  loop
    v_shift := nullif(v_slot->>'shift', '');
    if v_shared then
      v_shift := null;
    elsif v_shift is null or v_shift not in ('morning', 'afternoon') then
      raise exception 'invalid';
    end if;
    if length(trim(coalesce(v_slot->>'subject', ''))) not between 1 and 60
      or (v_slot->>'weekday')::int not between 1 and 6
      or (v_slot->>'periodNo')::int not between 0 and 8 then
      raise exception 'invalid';
    end if;
  end loop;

  delete from public.school_timetable_slots where timetable_id = v_timetable.id;

  for v_slot in select value from jsonb_array_elements(coalesce(p_payload->'slots', '[]'::jsonb))
  loop
    v_shift := case when v_shared then null else nullif(v_slot->>'shift', '') end;
    insert into public.school_timetable_slots (
      timetable_id, shift, weekday, period_no, subject, teacher, room, color, note
    ) values (
      v_timetable.id, v_shift, (v_slot->>'weekday')::int, (v_slot->>'periodNo')::int,
      trim(v_slot->>'subject'),
      nullif(trim(coalesce(v_slot->>'teacher', '')), ''),
      nullif(trim(coalesce(v_slot->>'room', '')), ''),
      nullif(v_slot->>'color', ''),
      nullif(trim(coalesce(v_slot->>'note', '')), '')
    );
  end loop;

  return public.admin_get_school_timetable(v_profile.id);
exception when others then
  return jsonb_build_object('ok', false, 'error', 'invalid');
end;
$$;

create or replace function public.admin_set_week_shift(
  p_child_profile_id uuid, p_week_monday date, p_shift text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timetable public.school_timetables;
  v_natural text;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_shift not in ('morning', 'afternoon') or extract(isodow from p_week_monday)::int <> 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select t.* into v_timetable
  from public.school_timetables t
  join public.child_profiles cp on cp.id = t.child_profile_id
  where t.child_profile_id = p_child_profile_id and cp.owner_id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  v_natural := public.fn_school_shift(
    v_timetable.rotation_mode, v_timetable.default_shift, v_timetable.anchor_monday, p_week_monday, null
  );
  if p_shift = v_natural then
    delete from public.school_timetable_week_overrides
    where timetable_id = v_timetable.id and week_monday = p_week_monday;
  else
    insert into public.school_timetable_week_overrides (timetable_id, week_monday, shift)
    values (v_timetable.id, p_week_monday, p_shift)
    on conflict (timetable_id, week_monday) do update set shift = excluded.shift;
  end if;
  return public.admin_get_school_timetable(p_child_profile_id);
end;
$$;

create or replace function public.admin_copy_school_timetable(p_from_child uuid, p_to_child uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.school_timetables;
  v_payload jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_from_child = p_to_child then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if (select count(*) from public.child_profiles
      where id in (p_from_child, p_to_child) and owner_id = auth.uid()) <> 2 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select * into v_src from public.school_timetables where child_profile_id = p_from_child;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  v_payload := jsonb_build_object(
    'rotationMode', v_src.rotation_mode,
    'defaultShift', v_src.default_shift,
    'anchorMonday', v_src.anchor_monday,
    'includeSaturday', v_src.include_saturday,
    'sharedSlots', v_src.shared_slots,
    'morningPeriods', v_src.morning_periods,
    'afternoonPeriods', v_src.afternoon_periods,
    'slots', public.fn_school_slots_json(v_src.id)
  );
  return public.admin_upsert_school_timetable(p_to_child, v_payload);
end;
$$;

create or replace function public.admin_delete_school_timetable(p_child_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.school_timetables t
  using public.child_profiles cp
  where t.child_profile_id = cp.id
    and t.child_profile_id = p_child_profile_id
    and cp.owner_id = auth.uid()
  returning t.id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  return jsonb_build_object('ok', true, 'exists', false);
end;
$$;

create or replace function public.get_child_school_timetable(p_profile_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_timetable public.school_timetables;
  v_resolved jsonb;
begin
  select * into v_profile from public.child_profiles where public_token = p_profile_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  select * into v_timetable from public.school_timetables where child_profile_id = v_profile.id;
  if not found then
    return jsonb_build_object('ok', true, 'exists', false);
  end if;
  v_resolved := public.fn_school_resolved(v_timetable);
  return v_resolved || jsonb_build_object('childName', v_profile.name);
end;
$$;

revoke all on function public.fn_school_periods_valid(jsonb) from public, anon, authenticated;
revoke all on function public.fn_school_monday(date) from public, anon, authenticated;
revoke all on function public.fn_school_shift(text, text, date, date, text) from public, anon, authenticated;
revoke all on function public.fn_school_normalize_periods(jsonb) from public, anon, authenticated;
revoke all on function public.fn_school_day_payload(public.school_timetables, date, text) from public, anon, authenticated;
revoke all on function public.fn_school_resolved(public.school_timetables) from public, anon, authenticated;
revoke all on function public.fn_school_slots_json(uuid) from public, anon, authenticated;

revoke all on function public.admin_get_school_timetable(uuid) from public, anon;
grant execute on function public.admin_get_school_timetable(uuid) to authenticated;

revoke all on function public.admin_list_school_timetables(uuid) from public, anon;
grant execute on function public.admin_list_school_timetables(uuid) to authenticated;

revoke all on function public.admin_upsert_school_timetable(uuid, jsonb) from public, anon;
grant execute on function public.admin_upsert_school_timetable(uuid, jsonb) to authenticated;

revoke all on function public.admin_set_week_shift(uuid, date, text) from public, anon;
grant execute on function public.admin_set_week_shift(uuid, date, text) to authenticated;

revoke all on function public.admin_copy_school_timetable(uuid, uuid) from public, anon;
grant execute on function public.admin_copy_school_timetable(uuid, uuid) to authenticated;

revoke all on function public.admin_delete_school_timetable(uuid) from public, anon;
grant execute on function public.admin_delete_school_timetable(uuid) to authenticated;

revoke all on function public.get_child_school_timetable(text) from public;
grant execute on function public.get_child_school_timetable(text) to anon, authenticated;
