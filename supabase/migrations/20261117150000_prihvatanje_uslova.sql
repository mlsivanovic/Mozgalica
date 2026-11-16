-- Saglasnost sa uslovima korišćenja i politikom privatnosti. Roditelj mora da je
-- prihvati pre ulaska u administratorski panel. Kolona se ne menja direktno preko
-- API-ja (column-level grant ostaje samo za email_notifications), nego kroz accept_terms().

alter table public.admin_settings
  add column if not exists terms_accepted_at timestamptz;

-- Postojeći vlasnik platforme se tretira kao da je već prihvatio (bez uuid-a i email-a).
update public.admin_settings
set terms_accepted_at = now()
where is_platform_owner
  and terms_accepted_at is null;

create or replace function public.accept_terms()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prihvaceno timestamptz;
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  -- Prvo prihvatanje se čuva; ponovni poziv ne pomera datum.
  update public.admin_settings
  set terms_accepted_at = coalesce(terms_accepted_at, now())
  where user_id = auth.uid()
  returning terms_accepted_at into v_prihvaceno;

  return v_prihvaceno;
end;
$$;

revoke all on function public.accept_terms() from public, anon;
grant execute on function public.accept_terms() to authenticated;
