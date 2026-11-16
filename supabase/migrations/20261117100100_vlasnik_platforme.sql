-- Oblasti (topics) su zajedničke za sve administratore. Menjati ih sme samo vlasnik
-- platforme. Vlasništvo se ne može dodeliti preko API-ja: kolona se ne nalazi u
-- column-level grant-u za update.

alter table public.admin_settings
  add column if not exists is_platform_owner boolean not null default false;

-- Postojeći administrator (jedini red) postaje vlasnik. Migracija ne upisuje email
-- ni uuid, nego bira red po redosledu nastanka. Ako ima više redova, prekida se.
do $$
declare
  v_broj integer;
begin
  select count(*) into v_broj from public.admin_settings;
  if v_broj > 1 then
    raise exception 'Očekivan najviše jedan administratorski red pri uvođenju vlasnika platforme (nađeno %).', v_broj;
  end if;

  update public.admin_settings
  set is_platform_owner = true
  where user_id = (select user_id from public.admin_settings order by created_at limit 1);
end;
$$;

-- Korisnik sme da menja samo svoje obaveštenje. Ostale kolone (uključujući
-- is_platform_owner) ostaju nedostupne za update preko API-ja.
revoke update on public.admin_settings from authenticated;
grant update (email_notifications) on public.admin_settings to authenticated;

create or replace function public.fn_is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_settings
    where user_id = auth.uid()
      and is_platform_owner
  )
$$;

revoke all on function public.fn_is_platform_owner() from public, anon;
grant execute on function public.fn_is_platform_owner() to authenticated, service_role;

drop policy if exists topics_all on public.topics;

create policy topics_select on public.topics
  for select to authenticated
  using (public.fn_is_admin());

create policy topics_insert on public.topics
  for insert to authenticated
  with check (public.fn_is_platform_owner());

create policy topics_update on public.topics
  for update to authenticated
  using (public.fn_is_platform_owner())
  with check (public.fn_is_platform_owner());

create policy topics_delete on public.topics
  for delete to authenticated
  using (public.fn_is_platform_owner());
