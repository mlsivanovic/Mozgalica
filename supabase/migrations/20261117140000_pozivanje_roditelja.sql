-- Pozivanje roditelja. Nalozi nastaju isključivo preko Edge funkcije pozovi-roditelja
-- (vlasnik platforme, service role). Ovde su pomoćne funkcije koje ta funkcija koristi
-- i spisak pozvanih za administratorski panel vlasnika.

-- Pronalazi auth korisnika po email adresi. Dostupno samo service role-u (Edge funkcija).
create or replace function public.fn_naloga_po_mejlu(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1
$$;

revoke all on function public.fn_naloga_po_mejlu(text) from public, anon, authenticated;
grant execute on function public.fn_naloga_po_mejlu(text) to service_role;

-- Isti efekat kao fn_handle_new_user za administratorski deo, za nalog koji već postoji
-- u auth.users, a još nema administratorska prava. Idempotentno.
create or replace function public.fn_aktiviraj_roditelja(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_settings (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.title_levels (owner_id, name, min_stars) values
    (p_user_id, 'Početnik', 0),
    (p_user_id, 'Istraživač', 5),
    (p_user_id, 'Znalac', 12),
    (p_user_id, 'Majstor', 24),
    (p_user_id, 'Šampion', 40)
  on conflict do nothing;
end;
$$;

revoke all on function public.fn_aktiviraj_roditelja(uuid) from public, anon, authenticated;
grant execute on function public.fn_aktiviraj_roditelja(uuid) to service_role;

-- Spisak pozvanih roditelja za vlasnika platforme. Allowlist sam po sebi nema politike.
create or replace function public.listaj_pozvane_roditelje()
returns table (email text, nalog_postoji boolean, aktivan boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.fn_is_platform_owner() then
    raise exception 'Samo vlasnik platforme može da vidi spisak roditelja.';
  end if;

  return query
  select
    a.email::text,
    (u.id is not null) as nalog_postoji,
    (u.last_sign_in_at is not null) as aktivan
  from public.admin_allowlist a
  left join auth.users u on lower(u.email) = lower(a.email)
  order by a.email;
end;
$$;

revoke all on function public.listaj_pozvane_roditelje() from public, anon;
grant execute on function public.listaj_pozvane_roditelje() to authenticated;
