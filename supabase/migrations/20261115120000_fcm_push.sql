-- FCM pored Web Push-a: ista outbox tabela, drugi transport.
-- Web Push RPC-ji i njihovi potpisi ostaju netaknuti; native koristi *_fcm_push.

create table if not exists public.push_subscriptions_backup_20261115
  as table public.push_subscriptions;
revoke all on public.push_subscriptions_backup_20261115 from anon, authenticated;
alter table public.push_subscriptions_backup_20261115 enable row level security;

alter table public.push_subscriptions
  add column transport text not null default 'webpush'
    check (transport in ('webpush', 'fcm'));

alter table public.push_subscriptions
  add column fcm_token text;

alter table public.push_subscriptions
  alter column endpoint drop not null,
  alter column p256dh drop not null,
  alter column auth_key drop not null;

alter table public.push_subscriptions
  add constraint push_subscriptions_transport_shape check (
    (
      transport = 'webpush'
      and endpoint is not null and p256dh is not null and auth_key is not null
      and fcm_token is null
    )
    or (
      transport = 'fcm'
      and fcm_token is not null and length(fcm_token) between 20 and 4096
      and fcm_token !~ '\s'
      and endpoint is null and p256dh is null and auth_key is null
    )
  );

create unique index if not exists uq_push_subscriptions_fcm_admin
  on public.push_subscriptions (owner_id, fcm_token)
  where transport = 'fcm' and recipient_type = 'admin';

create unique index if not exists uq_push_subscriptions_fcm_child
  on public.push_subscriptions (child_profile_id, fcm_token)
  where transport = 'fcm' and recipient_type = 'child';

create index if not exists idx_push_subscriptions_fcm_active
  on public.push_subscriptions (fcm_token)
  where transport = 'fcm' and is_active;

create or replace function public.register_child_fcm_push(
  p_profile_token text,
  p_fcm_token text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_id uuid;
begin
  select * into v_profile
  from public.child_profiles
  where public_token = p_profile_token;

  if v_profile.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_fcm_token is null
    or length(p_fcm_token) < 20
    or length(p_fcm_token) > 4096
    or p_fcm_token ~ '\s'
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  update public.push_subscriptions
  set is_active = false
  where transport = 'fcm'
    and recipient_type = 'child'
    and fcm_token = p_fcm_token
    and child_profile_id <> v_profile.id;

  insert into public.push_subscriptions (
    owner_id, child_profile_id, recipient_type, transport, fcm_token,
    user_agent, is_active, failure_count, last_seen_at
  ) values (
    v_profile.owner_id, v_profile.id, 'child', 'fcm', p_fcm_token,
    left(p_user_agent, 500), true, 0, now()
  )
  on conflict (child_profile_id, fcm_token)
    where transport = 'fcm' and recipient_type = 'child'
  do update set
    user_agent = excluded.user_agent,
    is_active = true,
    failure_count = 0,
    last_seen_at = now()
  returning id into v_id;

  update public.push_subscriptions
  set is_active = false
  where id in (
    select id
    from public.push_subscriptions
    where child_profile_id = v_profile.id
      and recipient_type = 'child'
      and transport = 'fcm'
      and is_active
    order by last_seen_at desc, created_at desc
    offset 5
  );

  return jsonb_build_object('ok', true, 'subscriptionId', v_id);
end;
$$;

create or replace function public.unregister_child_fcm_push(
  p_profile_token text,
  p_fcm_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select id into v_profile_id
  from public.child_profiles
  where public_token = p_profile_token;

  if v_profile_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.push_subscriptions
  set is_active = false
  where child_profile_id = v_profile_id
    and recipient_type = 'child'
    and transport = 'fcm'
    and fcm_token = p_fcm_token;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_child_fcm_push_status(
  p_profile_token text,
  p_fcm_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  select id into v_profile_id
  from public.child_profiles
  where public_token = p_profile_token;

  if v_profile_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'active', exists (
      select 1
      from public.push_subscriptions
      where child_profile_id = v_profile_id
        and recipient_type = 'child'
        and transport = 'fcm'
        and fcm_token = p_fcm_token
        and is_active
    )
  );
end;
$$;

revoke all on function public.register_child_fcm_push(text, text, text) from public;
revoke all on function public.unregister_child_fcm_push(text, text) from public;
revoke all on function public.get_child_fcm_push_status(text, text) from public;

grant execute on function public.register_child_fcm_push(text, text, text) to anon, authenticated;
grant execute on function public.unregister_child_fcm_push(text, text) to anon, authenticated;
grant execute on function public.get_child_fcm_push_status(text, text) to anon, authenticated;
