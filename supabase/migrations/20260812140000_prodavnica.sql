-- Prodavnica nagrada: admin konfiguriše stavke (cena u zvezdicama, opciono ponavljajuće),
-- dete troši osvojene zvezdice. totalStars (doživotni zbir koji hrani titule) ostaje
-- netaknut — uvodi se odvojeno „raspoloživo” = ukupno − potrošeno.

-- ============================================================================
-- 1. Šema
-- ============================================================================

create table if not exists public.shop_items (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null check (length(trim(title)) between 1 and 60),
  description text,
  emoji       text not null default '🎁' check (length(emoji) between 1 and 8),
  cost        int  not null check (cost > 0),
  repeatable  boolean not null default false,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_shop_items_owner_sort
  on public.shop_items (owner_id, sort_order);

-- shop_item_id je „on delete set null” jer se istorijske kupovine oslanjaju na
-- snapshot kolone (item_title, item_emoji, cost, is_repeatable) — ostaju čitljive
-- i nakon što admin obriše/edituje stavku kataloga.
create table if not exists public.shop_purchases (
  id               uuid primary key default gen_random_uuid(),
  shop_item_id     uuid references public.shop_items (id) on delete set null,
  child_profile_id uuid not null references public.child_profiles (id) on delete cascade,
  owner_id         uuid not null references auth.users (id) on delete cascade,
  item_title       text not null,
  item_emoji       text not null,
  cost             int  not null check (cost >= 0),
  is_repeatable    boolean not null default false,
  status           text not null default 'requested'
                   check (status in ('requested', 'consumed', 'cancelled')),
  requested_at     timestamptz not null default now(),
  consumed_at      timestamptz,
  note             text
);

create index if not exists idx_shop_purchases_owner_requested
  on public.shop_purchases (owner_id, requested_at desc);
create index if not exists idx_shop_purchases_child_item
  on public.shop_purchases (child_profile_id, shop_item_id);

-- Pravila jednokratnosti / ponavljanja se izvršavaju atomski u purchase_shop_item
-- RPC-u (uz FOR UPDATE bravu na profilu deteta), pa ovde ne postavljamo UNIQUE
-- ograničenje — ono ne bi moglo da izrazi hibridnu semantiku po stavci.

-- ============================================================================
-- 2. RLS — podrazumevano sve zabranjeno; admin pun CRUD nad svojim redovima
-- ============================================================================

alter table public.shop_items enable row level security;
alter table public.shop_purchases enable row level security;

revoke all on public.shop_items from anon;
revoke all on public.shop_purchases from anon;

grant select, insert, update, delete on public.shop_items to authenticated;
grant select, update on public.shop_purchases to authenticated;

create policy shop_items_all on public.shop_items
  for all to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (public.fn_is_admin() and owner_id = auth.uid());

create policy shop_purchases_select on public.shop_purchases
  for select to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid());

create policy shop_purchases_update on public.shop_purchases
  for update to authenticated
  using (public.fn_is_admin() and owner_id = auth.uid())
  with check (public.fn_is_admin() and owner_id = auth.uid());

-- ============================================================================
-- 3. updated_at održavanje na shop_items (samo za admina, RLS već štiti)
-- ============================================================================

create or replace function public.fn_shop_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_shop_items_touch_updated_at on public.shop_items;
create trigger trg_shop_items_touch_updated_at
  before update on public.shop_items
  for each row execute function public.fn_shop_touch_updated_at();

-- ============================================================================
-- 4. Interna funkcija — raspoloživi balans (ukupno osvojeno − potrošeno)
--    cancelled kupovine se ne odbijaju (vraćaju zvezdice detetu).
-- ============================================================================

create or replace function public.fn_spendable_stars(p_profile_id uuid)
returns int
language sql stable security definer set search_path = public as $$
  select (select coalesce(sum(stars_awarded), 0)::int
            from public.attempts
            where child_profile_id = p_profile_id
              and status = 'submitted'
              and not review_pending)
       - (select coalesce(sum(cost), 0)::int
            from public.shop_purchases
            where child_profile_id = p_profile_id
              and status in ('requested', 'consumed'));
$$;

revoke all on function public.fn_spendable_stars(uuid) from public;

-- ============================================================================
-- 5. Dečji RPC (anon): pregled prodavnice i atomska kupovina
-- ============================================================================

create or replace function public.get_shop(p_profile_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile     public.child_profiles;
  v_total_stars int;
  v_balance     int;
  v_items       jsonb;
  v_purchases   jsonb;
begin
  select * into v_profile
    from public.child_profiles
    where public_token = p_profile_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(sum(stars_awarded), 0)::int
    into v_total_stars
    from public.attempts
    where child_profile_id = v_profile.id
      and status = 'submitted'
      and not review_pending;

  v_balance := public.fn_spendable_stars(v_profile.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'title', i.title,
    'description', i.description,
    'emoji', i.emoji,
    'cost', i.cost,
    'repeatable', i.repeatable,
    'purchased',
      case
        when i.repeatable then exists (
          select 1 from public.shop_purchases p
          where p.shop_item_id = i.id
            and p.child_profile_id = v_profile.id
            and p.status = 'requested'
        )
        else exists (
          select 1 from public.shop_purchases p
          where p.shop_item_id = i.id
            and p.child_profile_id = v_profile.id
        )
      end,
    'awaitingConsumption', i.repeatable and exists (
      select 1 from public.shop_purchases p
      where p.shop_item_id = i.id
        and p.child_profile_id = v_profile.id
        and p.status = 'requested'
    ),
    'previousCount',
      (select count(*) from public.shop_purchases p
       where p.shop_item_id = i.id
         and p.child_profile_id = v_profile.id
         and p.status = 'consumed')
  ) order by i.sort_order, i.created_at), '[]'::jsonb)
  into v_items
  from public.shop_items i
  where i.owner_id = v_profile.owner_id
    and i.is_active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'title', p.item_title,
    'emoji', p.item_emoji,
    'cost', p.cost,
    'isRepeatable', p.is_repeatable,
    'status', p.status,
    'requestedAt', p.requested_at,
    'consumedAt', p.consumed_at
  ) order by p.requested_at desc), '[]'::jsonb)
  into v_purchases
  from public.shop_purchases p
  where p.child_profile_id = v_profile.id;

  return jsonb_build_object(
    'ok', true,
    'name', v_profile.name,
    'avatar', v_profile.avatar,
    'balance', v_balance,
    'totalStars', v_total_stars,
    'items', v_items,
    'purchases', v_purchases
  );
end;
$$;

revoke all on function public.get_shop(text) from public;
grant execute on function public.get_shop(text) to anon, authenticated;


create or replace function public.purchase_shop_item(
  p_profile_token text,
  p_item_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile  public.child_profiles;
  v_item     public.shop_items;
  v_balance  int;
  v_active   int;
  v_new_id   uuid;
begin
  select * into v_profile
    from public.child_profiles
    where public_token = p_profile_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  select * into v_item
    from public.shop_items
    where id = p_item_id
      and owner_id = v_profile.owner_id
      and is_active;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  -- Serijalizacija paralelnih kupovina istog deteta: dok držimo bravu na redu
  -- profila, druga transakcija ne može da pročita/poveća trošak.
  perform 1 from public.child_profiles where id = v_profile.id for update;

  if not v_item.repeatable then
    select count(*) into v_active
      from public.shop_purchases
      where shop_item_id = p_item_id
        and child_profile_id = v_profile.id;
    if v_active > 0 then
      return jsonb_build_object('ok', false, 'error', 'already_purchased');
    end if;
  else
    select count(*) into v_active
      from public.shop_purchases
      where shop_item_id = p_item_id
        and child_profile_id = v_profile.id
        and status = 'requested';
    if v_active > 0 then
      return jsonb_build_object('ok', false, 'error', 'awaiting_consumption');
    end if;
  end if;

  v_balance := public.fn_spendable_stars(v_profile.id);
  if v_balance < v_item.cost then
    return jsonb_build_object(
      'ok', false, 'error', 'insufficient_balance',
      'balance', v_balance, 'cost', v_item.cost
    );
  end if;

  insert into public.shop_purchases (
    shop_item_id, child_profile_id, owner_id,
    item_title, item_emoji, cost, is_repeatable, status
  )
  values (
    p_item_id, v_profile.id, v_profile.owner_id,
    v_item.title, v_item.emoji, v_item.cost, v_item.repeatable, 'requested'
  )
  returning id into v_new_id;

  return jsonb_build_object(
    'ok', true,
    'purchaseId', v_new_id,
    'newBalance', v_balance - v_item.cost
  );
end;
$$;

revoke all on function public.purchase_shop_item(text, uuid) from public;
grant execute on function public.purchase_shop_item(text, uuid) to anon, authenticated;

-- ============================================================================
-- 6. Admin RPC: upravljanje katalogom i kupovinama
-- ============================================================================

-- Replace-all po obrascu save_title_levels: briše stavke koje nisu u payloadu,
-- upisuje preostale. Id-jevi se ne čuvaju (novo kreirani); istorija kupovina
-- oslanja se na snapshot kolone, pa je brisanje stavki bezbedno i kada je kupljena.
create or replace function public.save_shop_items(p_items jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'invalid_items');
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as x(
      title text, description text, emoji text, cost int,
      repeatable boolean, is_active boolean, sort_order int
    )
    where coalesce(length(trim(title)), 0) = 0
       or length(trim(title)) > 60
       or cost is null or cost <= 0
       or emoji is null or length(emoji) < 1 or length(emoji) > 8
       or repeatable is null
       or is_active is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_items');
  end if;

  delete from public.shop_items where owner_id = auth.uid();

  insert into public.shop_items (
    owner_id, title, description, emoji, cost, repeatable, is_active, sort_order
  )
  select
    auth.uid(),
    trim(x.title),
    x.description,
    x.emoji,
    x.cost,
    x.repeatable,
    x.is_active,
    coalesce(x.sort_order, 0)
  from jsonb_to_recordset(p_items) as x(
    title text, description text, emoji text, cost int,
    repeatable boolean, is_active boolean, sort_order int
  )
  order by coalesce(sort_order, 0);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.save_shop_items(jsonb) from public;
grant execute on function public.save_shop_items(jsonb) to authenticated;


create or replace function public.admin_list_shop_purchases()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'childName', cp.name,
    'childAvatar', cp.avatar,
    'title', p.item_title,
    'emoji', p.item_emoji,
    'cost', p.cost,
    'isRepeatable', p.is_repeatable,
    'status', p.status,
    'requestedAt', p.requested_at,
    'consumedAt', p.consumed_at,
    'note', p.note
  ) order by p.requested_at desc), '[]'::jsonb)
  into v_result
  from public.shop_purchases p
  join public.child_profiles cp on cp.id = p.child_profile_id
  where p.owner_id = auth.uid();

  return jsonb_build_object('ok', true, 'purchases', v_result);
end;
$$;

revoke all on function public.admin_list_shop_purchases() from public;
grant execute on function public.admin_list_shop_purchases() to authenticated;


-- Označi kupovinu kao konzumiranu (oslobađa slot za ponavljajuće stavke).
create or replace function public.admin_consume_purchase(
  p_purchase_id uuid,
  p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_updated int;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  with upd as (
    update public.shop_purchases
    set status = 'consumed', consumed_at = now(), note = p_note
    where id = p_purchase_id
      and owner_id = auth.uid()
      and status = 'requested'
    returning 1
  )
  select count(*) into v_updated from upd;

  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found_or_not_requested');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_consume_purchase(uuid, text) from public;
grant execute on function public.admin_consume_purchase(uuid, text) to authenticated;


-- Otkaži kupovinu — vraća potrošene zvezdice (cancelled se ne odbija iz balansa).
-- Dozvoljeno iz stanja 'requested' ili 'consumed'.
create or replace function public.admin_cancel_purchase(
  p_purchase_id uuid,
  p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_updated int;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  with upd as (
    update public.shop_purchases
    set status = 'cancelled', note = p_reason
    where id = p_purchase_id
      and owner_id = auth.uid()
      and status in ('requested', 'consumed')
    returning 1
  )
  select count(*) into v_updated from upd;

  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_cancel_purchase(uuid, text) from public;
grant execute on function public.admin_cancel_purchase(uuid, text) to authenticated;

-- ============================================================================
-- 7. Proširenje get_child_profile sa spendableStars (raspoloživo za prodavnicu)
--    totalStars i dalje hrani titule — nepromenjeno.
-- ============================================================================

create or replace function public.get_child_profile(p_profile_token text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_profile         public.child_profiles;
  v_total_stars     int;
  v_spendable_stars int;
  v_current_title   jsonb;
  v_next_title      jsonb;
  v_active_quizzes  jsonb;
  v_history         jsonb;
begin
  select * into v_profile
  from public.child_profiles
  where public_token = p_profile_token;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(sum(stars_awarded), 0)::int
  into v_total_stars
  from public.attempts
  where child_profile_id = v_profile.id
    and status = 'submitted'
    and not review_pending;

  v_spendable_stars := public.fn_spendable_stars(v_profile.id);

  select jsonb_build_object('name', tl.name, 'minStars', tl.min_stars, 'avatar', tl.avatar)
  into v_current_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars <= v_total_stars
  order by tl.min_stars desc
  limit 1;

  select jsonb_build_object(
    'name', tl.name,
    'minStars', tl.min_stars,
    'starsNeeded', tl.min_stars - v_total_stars,
    'avatar', tl.avatar
  )
  into v_next_title
  from public.title_levels tl
  where tl.owner_id = v_profile.owner_id and tl.min_stars > v_total_stars
  order by tl.min_stars
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'quizToken', l.token,
    'title', q.title,
    'description', q.description,
    'questionCount', (select count(*) from public.quiz_questions qq where qq.quiz_id = q.id),
    'attemptState', case when a.id is null then 'new' else 'in_progress' end,
    'answeredCount', coalesce((
      select count(*)
      from public.attempt_answers aa
      join public.quiz_questions qq on qq.id = aa.quiz_question_id
      where aa.attempt_id = a.id
        and public.fn_answer_is_filled(qq.type, aa.answer)
    ), 0),
    'timeLimitSeconds', q.time_limit_seconds,
    'remainingSeconds', a.remaining_seconds
  ) order by l.created_at desc), '[]'::jsonb)
  into v_active_quizzes
  from public.quiz_links l
  join public.quizzes q on q.id = l.quiz_id
  left join public.attempts a
    on a.child_profile_id = v_profile.id and a.quiz_id = q.id
  where l.child_profile_id = v_profile.id
    and l.is_active
    and (l.expires_at is null or l.expires_at >= now())
    and (a.id is null or a.status = 'in_progress');

  select coalesce(jsonb_agg(jsonb_build_object(
    'attemptId', a.id,
    'title', q.title,
    'submittedAt', a.submitted_at,
    'scorePct', a.score_pct,
    'starsAwarded', a.stars_awarded,
    'pendingReview', a.review_pending
  ) order by a.submitted_at desc), '[]'::jsonb)
  into v_history
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  where a.child_profile_id = v_profile.id and a.status = 'submitted';

  return jsonb_build_object(
    'ok', true,
    'name', v_profile.name,
    'avatar', v_profile.avatar,
    'totalStars', v_total_stars,
    'spendableStars', v_spendable_stars,
    'currentTitle', v_current_title,
    'nextTitle', v_next_title,
    'activeQuizzes', v_active_quizzes,
    'history', v_history
  );
end;
$$;

revoke all on function public.get_child_profile(text) from public;
grant execute on function public.get_child_profile(text) to anon, authenticated;
