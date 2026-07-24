-- Trajna obaveštenja, dečji mejl, Web Push pretplate i pouzdan outbox.
-- Slanje radi Edge funkcija dispatch-notifications; klijenti nikad ne vide API/VAPID tajne.

-- ---------------------------------------------------------------------------
-- Profil deteta i izbor kanala pri dodeli
-- ---------------------------------------------------------------------------

alter table public.child_profiles
  add column email text,
  add column notify_new_quiz_email boolean not null default true;

alter table public.child_profiles
  add constraint child_profiles_email_check
  check (
    email is null
    or (
      length(email) between 3 and 254
      and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

create or replace function public.fn_normalize_child_email()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  return new;
end;
$$;

create trigger trg_child_profiles_normalize_email
  before insert or update of email on public.child_profiles
  for each row execute function public.fn_normalize_child_email();

alter table public.quiz_links
  add column notify_child_email boolean not null default false,
  add column assignment_request_id uuid;

create unique index uq_quiz_links_assignment_request
  on public.quiz_links (assignment_request_id)
  where assignment_request_id is not null;

create or replace function public.fn_guard_assignment_notification()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_email text;
begin
  if new.child_profile_id is null then
    new.notify_child_email := false;
    return new;
  end if;

  if new.notify_child_email then
    select email into v_email
    from public.child_profiles
    where id = new.child_profile_id;

    if v_email is null then
      raise exception 'Profil deteta nema email adresu.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_quiz_links_notification_guard
  before insert or update of child_profile_id, notify_child_email on public.quiz_links
  for each row execute function public.fn_guard_assignment_notification();

-- ---------------------------------------------------------------------------
-- Inbox, pretplate uređaja i isporuke
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  recipient_type text not null check (recipient_type in ('admin', 'child')),
  event_type text not null check (event_type in ('new_quiz', 'quiz_completed')),
  quiz_id uuid references public.quizzes (id) on delete cascade,
  quiz_link_id uuid references public.quiz_links (id) on delete cascade,
  attempt_id uuid references public.attempts (id) on delete cascade,
  title text not null check (length(title) between 1 and 240),
  body text not null check (length(body) between 1 and 1000),
  target_url text not null check (target_url like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (recipient_type = 'admin' and child_profile_id is null)
    or (recipient_type = 'child' and child_profile_id is not null)
  )
);

create unique index uq_notifications_new_quiz
  on public.notifications (quiz_link_id, recipient_type)
  where event_type = 'new_quiz';

create unique index uq_notifications_quiz_completed
  on public.notifications (attempt_id, recipient_type)
  where event_type = 'quiz_completed';

create index idx_notifications_admin_inbox
  on public.notifications (owner_id, created_at desc)
  where recipient_type = 'admin';

create index idx_notifications_child_inbox
  on public.notifications (child_profile_id, created_at desc)
  where recipient_type = 'child';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  recipient_type text not null check (recipient_type in ('admin', 'child')),
  endpoint text not null check (
    length(endpoint) between 12 and 2048
    and endpoint ~ '^https://[^[:space:]]+$'
  ),
  p256dh text not null check (
    length(p256dh) between 16 and 512
    and p256dh ~ '^[A-Za-z0-9_-]+={0,2}$'
  ),
  auth_key text not null check (
    length(auth_key) between 8 and 256
    and auth_key ~ '^[A-Za-z0-9_-]+={0,2}$'
  ),
  user_agent text check (user_agent is null or length(user_agent) <= 500),
  is_active boolean not null default true,
  failure_count int not null default 0 check (failure_count >= 0),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (recipient_type = 'admin' and child_profile_id is null)
    or (recipient_type = 'child' and child_profile_id is not null)
  )
);

create unique index uq_push_subscriptions_admin
  on public.push_subscriptions (owner_id, endpoint)
  where recipient_type = 'admin';

create unique index uq_push_subscriptions_child
  on public.push_subscriptions (child_profile_id, endpoint)
  where recipient_type = 'child';

create index idx_push_subscriptions_endpoint
  on public.push_subscriptions (endpoint);

create trigger trg_push_subscriptions_touch
  before update on public.push_subscriptions
  for each row execute function public.fn_touch_updated_at();

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null check (channel in ('email', 'push')),
  push_subscription_id uuid references public.push_subscriptions (id),
  recipient_email text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts int not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (channel = 'email' and push_subscription_id is null)
    or (channel = 'push' and push_subscription_id is not null and recipient_email is null)
  )
);

create unique index uq_notification_delivery_email
  on public.notification_deliveries (notification_id, channel)
  where channel = 'email';

create unique index uq_notification_delivery_push
  on public.notification_deliveries (notification_id, push_subscription_id)
  where channel = 'push';

create index idx_notification_deliveries_pending
  on public.notification_deliveries (next_attempt_at, created_at)
  where status in ('pending', 'processing');

create trigger trg_notification_deliveries_touch
  before update on public.notification_deliveries
  for each row execute function public.fn_touch_updated_at();

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

revoke all on public.notifications, public.push_subscriptions, public.notification_deliveries
  from anon, authenticated;

grant select, update (read_at) on public.notifications to authenticated;

create policy notifications_admin_select on public.notifications
  for select to authenticated
  using (
    recipient_type = 'admin'
    and owner_id = auth.uid()
    and public.fn_is_admin()
  );

create policy notifications_admin_update on public.notifications
  for update to authenticated
  using (
    recipient_type = 'admin'
    and owner_id = auth.uid()
    and public.fn_is_admin()
  )
  with check (
    recipient_type = 'admin'
    and owner_id = auth.uid()
    and public.fn_is_admin()
  );

-- ---------------------------------------------------------------------------
-- Pomoćne funkcije za događaje i outbox
-- ---------------------------------------------------------------------------

create or replace function public.fn_enqueue_push_deliveries(
  p_notification_id uuid,
  p_recipient_type text,
  p_owner_id uuid,
  p_child_profile_id uuid default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notification_deliveries (
    notification_id, channel, push_subscription_id
  )
  select p_notification_id, 'push', ps.id
  from public.push_subscriptions ps
  where ps.is_active
    and ps.recipient_type = p_recipient_type
    and ps.owner_id = p_owner_id
    and (
      (p_recipient_type = 'admin' and ps.child_profile_id is null)
      or (p_recipient_type = 'child' and ps.child_profile_id = p_child_profile_id)
    )
  on conflict do nothing
$$;

revoke all on function public.fn_enqueue_push_deliveries(uuid, text, uuid, uuid) from public;

create or replace function public.fn_create_new_quiz_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_quiz public.quizzes;
  v_notification_id uuid;
begin
  if new.child_profile_id is null then
    return new;
  end if;

  select * into v_profile
  from public.child_profiles
  where id = new.child_profile_id;

  select * into v_quiz
  from public.quizzes
  where id = new.quiz_id;

  insert into public.notifications (
    owner_id, child_profile_id, recipient_type, event_type,
    quiz_id, quiz_link_id, title, body, target_url
  ) values (
    v_quiz.owner_id,
    v_profile.id,
    'child',
    'new_quiz',
    v_quiz.id,
    new.id,
    'Novi kviz: ' || v_quiz.title,
    v_profile.name || ', stigao ti je novi kviz „' || v_quiz.title || '”.',
    '/kviz/' || new.token
  )
  on conflict (quiz_link_id, recipient_type) where event_type = 'new_quiz'
  do nothing
  returning id into v_notification_id;

  if v_notification_id is null then
    return new;
  end if;

  perform public.fn_enqueue_push_deliveries(
    v_notification_id, 'child', v_quiz.owner_id, v_profile.id
  );

  if new.notify_child_email then
    insert into public.notification_deliveries (
      notification_id, channel, recipient_email
    ) values (
      v_notification_id, 'email', v_profile.email
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger trg_quiz_links_send_new_quiz_notification
  after insert on public.quiz_links
  for each row execute function public.fn_create_new_quiz_notification();

create or replace function public.fn_ensure_completion_notification(
  p_attempt_id uuid,
  p_enqueue_push boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.attempts;
  v_quiz public.quizzes;
  v_notification_id uuid;
  v_is_new boolean := false;
  v_child_name text;
  v_body text;
begin
  select * into v_attempt
  from public.attempts
  where id = p_attempt_id and status = 'submitted';

  if not found then
    return null;
  end if;

  select * into v_quiz
  from public.quizzes
  where id = v_attempt.quiz_id;

  v_child_name := coalesce(nullif(trim(v_attempt.child_name), ''), 'Dete');
  v_body := case
    when coalesce(v_attempt.review_pending, false)
      then v_child_name || ' je završio/la kviz „' || v_quiz.title || '” — čeka pregled.'
    else v_child_name || ' je završio/la kviz „' || v_quiz.title || '” — rezultat '
      || coalesce(v_attempt.score_pct::text, '0') || '%.'
  end;

  insert into public.notifications (
    owner_id, recipient_type, event_type, quiz_id, attempt_id,
    title, body, target_url
  ) values (
    v_quiz.owner_id,
    'admin',
    'quiz_completed',
    v_quiz.id,
    v_attempt.id,
    'Kviz je završen',
    v_body,
    '/admin/rezultati/' || v_attempt.id
  )
  on conflict (attempt_id, recipient_type) where event_type = 'quiz_completed'
  do nothing
  returning id into v_notification_id;

  if v_notification_id is not null then
    v_is_new := true;
  else
    select id into v_notification_id
    from public.notifications
    where attempt_id = v_attempt.id
      and recipient_type = 'admin'
      and event_type = 'quiz_completed';

    update public.notifications
    set body = v_body
    where id = v_notification_id;
  end if;

  if v_is_new and p_enqueue_push then
    perform public.fn_enqueue_push_deliveries(
      v_notification_id, 'admin', v_quiz.owner_id, null
    );
  end if;

  return v_notification_id;
end;
$$;

revoke all on function public.fn_ensure_completion_notification(uuid, boolean) from public;

create or replace function public.fn_attempt_completion_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'submitted' then
    perform public.fn_ensure_completion_notification(new.id, true);
  end if;
  return new;
end;
$$;

create trigger trg_attempt_completion_notification
  after update of total_points, max_points, score_pct, review_pending on public.attempts
  for each row
  when (new.status = 'submitted')
  execute function public.fn_attempt_completion_notification();

-- Postojeći pozivaoci ostaju isti, ali se rezultat više ne šalje direktno kroz pg_net.
create or replace function public.fn_notify_result(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_notify boolean;
  v_pending boolean;
  v_notification_id uuid;
begin
  select q.owner_id, a.review_pending
  into v_owner, v_pending
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  where a.id = p_attempt_id;

  if v_owner is null or coalesce(v_pending, false) then
    return;
  end if;

  select coalesce(email_notifications, true)
  into v_notify
  from public.admin_settings
  where user_id = v_owner;

  if not coalesce(v_notify, true) then
    return;
  end if;

  v_notification_id := public.fn_ensure_completion_notification(p_attempt_id, false);
  if v_notification_id is null then
    return;
  end if;

  insert into public.notification_deliveries (notification_id, channel)
  values (v_notification_id, 'email')
  on conflict do nothing;
exception when others then
  -- Obaveštenje nikad ne sme da obori predaju ili ručno ocenjivanje.
  null;
end;
$$;

revoke all on function public.fn_notify_result(uuid) from public;

-- ---------------------------------------------------------------------------
-- Administratorska dodela i registracija uređaja
-- ---------------------------------------------------------------------------

create or replace function public.assign_quiz_to_profile(
  p_quiz_id uuid,
  p_child_profile_id uuid,
  p_send_email boolean default null,
  p_idempotency_key uuid default null
)
returns public.quiz_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.quizzes;
  v_profile public.child_profiles;
  v_send_email boolean;
  v_link public.quiz_links;
  v_idempotency_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
begin
  if not public.fn_is_admin() then
    raise exception 'Nedozvoljena operacija.';
  end if;

  select * into v_quiz
  from public.quizzes
  where id = p_quiz_id and owner_id = auth.uid();

  select * into v_profile
  from public.child_profiles
  where id = p_child_profile_id and owner_id = auth.uid();

  if v_quiz.id is null or v_profile.id is null then
    raise exception 'Kviz i profil moraju pripadati prijavljenom administratoru.';
  end if;

  v_send_email := coalesce(
    p_send_email,
    v_profile.notify_new_quiz_email and v_profile.email is not null
  );

  if v_send_email and v_profile.email is null then
    raise exception 'Profil deteta nema email adresu.';
  end if;

  insert into public.quiz_links (
    quiz_id, child_profile_id, max_attempts, label, expires_at,
    notify_child_email, assignment_request_id
  ) values (
    v_quiz.id, v_profile.id, 1, null, null, v_send_email, v_idempotency_key
  )
  on conflict (assignment_request_id) where assignment_request_id is not null
  do nothing
  returning * into v_link;

  if v_link.id is null then
    select ql.* into v_link
    from public.quiz_links ql
    join public.quizzes q on q.id = ql.quiz_id
    where ql.assignment_request_id = v_idempotency_key
      and q.owner_id = auth.uid();

    if v_link.id is null
      or v_link.quiz_id <> v_quiz.id
      or v_link.child_profile_id <> v_profile.id
      or v_link.notify_child_email <> v_send_email
    then
      raise exception 'Idempotency ključ je već iskorišćen za drugu dodelu.';
    end if;
  end if;

  return v_link;
end;
$$;

revoke all on function public.assign_quiz_to_profile(uuid, uuid, boolean, uuid) from public;
grant execute on function public.assign_quiz_to_profile(uuid, uuid, boolean, uuid) to authenticated;

create or replace function public.register_admin_push(
  p_subscription jsonb,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_endpoint text := p_subscription->>'endpoint';
  v_p256dh text := p_subscription#>>'{keys,p256dh}';
  v_auth text := p_subscription#>>'{keys,auth}';
  v_id uuid;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if v_endpoint is null or v_endpoint !~ '^https://[^[:space:]]+$'
    or v_p256dh is null or v_p256dh !~ '^[A-Za-z0-9_-]+={0,2}$'
    or v_auth is null or v_auth !~ '^[A-Za-z0-9_-]+={0,2}$'
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_subscription');
  end if;

  insert into public.push_subscriptions (
    owner_id, recipient_type, endpoint, p256dh, auth_key, user_agent,
    is_active, failure_count, last_seen_at
  ) values (
    auth.uid(), 'admin', v_endpoint, v_p256dh, v_auth,
    left(p_user_agent, 500), true, 0, now()
  )
  on conflict (owner_id, endpoint) where recipient_type = 'admin'
  do update set
    p256dh = excluded.p256dh,
    auth_key = excluded.auth_key,
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
    where owner_id = auth.uid() and recipient_type = 'admin' and is_active
    order by last_seen_at desc, created_at desc
    offset 5
  );

  return jsonb_build_object('ok', true, 'subscriptionId', v_id);
end;
$$;

create or replace function public.unregister_admin_push(p_endpoint text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  update public.push_subscriptions
  set is_active = false
  where owner_id = auth.uid()
    and recipient_type = 'admin'
    and endpoint = p_endpoint;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.register_child_push(
  p_profile_token text,
  p_subscription jsonb,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
  v_endpoint text := p_subscription->>'endpoint';
  v_p256dh text := p_subscription#>>'{keys,p256dh}';
  v_auth text := p_subscription#>>'{keys,auth}';
  v_id uuid;
begin
  select * into v_profile
  from public.child_profiles
  where public_token = p_profile_token;

  if v_profile.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_endpoint is null or v_endpoint !~ '^https://[^[:space:]]+$'
    or v_p256dh is null or v_p256dh !~ '^[A-Za-z0-9_-]+={0,2}$'
    or v_auth is null or v_auth !~ '^[A-Za-z0-9_-]+={0,2}$'
  then
    return jsonb_build_object('ok', false, 'error', 'invalid_subscription');
  end if;

  -- Instalirana dečja aplikacija predstavlja jedan profil: isti endpoint se seli
  -- sa prethodnog profila, dok administratorska veza ostaje netaknuta.
  update public.push_subscriptions
  set is_active = false
  where endpoint = v_endpoint
    and recipient_type = 'child'
    and child_profile_id <> v_profile.id;

  insert into public.push_subscriptions (
    owner_id, child_profile_id, recipient_type, endpoint, p256dh, auth_key,
    user_agent, is_active, failure_count, last_seen_at
  ) values (
    v_profile.owner_id, v_profile.id, 'child', v_endpoint, v_p256dh, v_auth,
    left(p_user_agent, 500), true, 0, now()
  )
  on conflict (child_profile_id, endpoint) where recipient_type = 'child'
  do update set
    p256dh = excluded.p256dh,
    auth_key = excluded.auth_key,
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
    where child_profile_id = v_profile.id and recipient_type = 'child' and is_active
    order by last_seen_at desc, created_at desc
    offset 5
  );

  return jsonb_build_object('ok', true, 'subscriptionId', v_id);
end;
$$;

create or replace function public.unregister_child_push(
  p_profile_token text,
  p_endpoint text
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
    and endpoint = p_endpoint;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_admin_push_status(p_endpoint text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.fn_is_admin()
      then jsonb_build_object('ok', false, 'error', 'forbidden')
    else jsonb_build_object(
      'ok', true,
      'active', exists (
        select 1
        from public.push_subscriptions
        where owner_id = auth.uid()
          and recipient_type = 'admin'
          and endpoint = p_endpoint
          and is_active
      )
    )
  end
$$;

create or replace function public.get_child_push_status(
  p_profile_token text,
  p_endpoint text
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
        and endpoint = p_endpoint
        and is_active
    )
  );
end;
$$;

revoke all on function public.register_admin_push(jsonb, text) from public;
revoke all on function public.unregister_admin_push(text) from public;
revoke all on function public.register_child_push(text, jsonb, text) from public;
revoke all on function public.unregister_child_push(text, text) from public;
revoke all on function public.get_admin_push_status(text) from public;
revoke all on function public.get_child_push_status(text, text) from public;

grant execute on function public.register_admin_push(jsonb, text) to authenticated;
grant execute on function public.unregister_admin_push(text) to authenticated;
grant execute on function public.register_child_push(text, jsonb, text) to anon, authenticated;
grant execute on function public.unregister_child_push(text, text) to anon, authenticated;
grant execute on function public.get_admin_push_status(text) to authenticated;
grant execute on function public.get_child_push_status(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Inbox deteta
-- ---------------------------------------------------------------------------

create or replace function public.get_child_notifications(
  p_profile_token text,
  p_limit int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_notifications jsonb;
  v_unread int;
begin
  select id into v_profile_id
  from public.child_profiles
  where public_token = p_profile_token;

  if v_profile_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select count(*) into v_unread
  from public.notifications
  where child_profile_id = v_profile_id
    and recipient_type = 'child'
    and read_at is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id,
    'eventType', n.event_type,
    'title', n.title,
    'body', n.body,
    'targetUrl', n.target_url,
    'readAt', n.read_at,
    'createdAt', n.created_at
  ) order by n.created_at desc), '[]'::jsonb)
  into v_notifications
  from (
    select *
    from public.notifications
    where child_profile_id = v_profile_id
      and recipient_type = 'child'
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 50))
  ) n;

  return jsonb_build_object(
    'ok', true,
    'unreadCount', v_unread,
    'notifications', v_notifications
  );
end;
$$;

create or replace function public.mark_child_notifications_read(
  p_profile_token text,
  p_notification_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_count int;
begin
  select id into v_profile_id
  from public.child_profiles
  where public_token = p_profile_token;

  if v_profile_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where child_profile_id = v_profile_id
    and recipient_type = 'child'
    and read_at is null
    and (p_notification_ids is null or id = any(p_notification_ids));

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'updated', v_count);
end;
$$;

revoke all on function public.get_child_notifications(text, int) from public;
revoke all on function public.mark_child_notifications_read(text, uuid[]) from public;
grant execute on function public.get_child_notifications(text, int) to anon, authenticated;
grant execute on function public.mark_child_notifications_read(text, uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomsko preuzimanje outbox poslova za Edge funkciju
-- ---------------------------------------------------------------------------

create or replace function public.claim_notification_deliveries(p_limit int default 50)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with kandidati as (
    select d.id
    from public.notification_deliveries d
    where d.attempts < 5
      and (
        (d.status = 'pending' and d.next_attempt_at <= now())
        or (
          d.status = 'processing'
          and d.last_attempt_at < now() - interval '10 minutes'
        )
      )
    order by d.next_attempt_at, d.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  )
  update public.notification_deliveries d
  set
    status = 'processing',
    attempts = d.attempts + 1,
    last_attempt_at = now(),
    error = null
  from kandidati k
  where d.id = k.id
  returning d.*;
end;
$$;

revoke all on function public.claim_notification_deliveries(int) from public;
grant execute on function public.claim_notification_deliveries(int) to service_role;

-- Stari pg_net tok više nije aktivan; istorijski email_log ostaje netaknut.
delete from public.app_config where key in ('functions_url', 'hook_secret');
