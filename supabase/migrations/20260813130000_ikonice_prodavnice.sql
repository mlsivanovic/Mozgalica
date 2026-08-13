-- Ikonica je opciona HTTPS slika. Emoji ostaje rezerva za postojeće stavke,
-- kao i ako se udaljena slika više ne može učitati.

alter table public.shop_items
  add column if not exists icon_url text,
  add constraint shop_items_icon_url_check
    check (
      icon_url is null
      or (length(trim(icon_url)) between 12 and 2048 and trim(icon_url) ~ '^https://[^[:space:]]+$')
    );

alter table public.shop_purchases
  add column if not exists item_icon_url text,
  add constraint shop_purchases_item_icon_url_check
    check (
      item_icon_url is null
      or (length(trim(item_icon_url)) between 12 and 2048 and trim(item_icon_url) ~ '^https://[^[:space:]]+$')
    );

-- URL ikonice je deo snapshot-a kupovine, da izmene kataloga ne menjaju
-- prikaz istorijske nagrade.
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
    'iconUrl', i.icon_url,
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
    'iconUrl', p.item_icon_url,
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
    item_title, item_emoji, item_icon_url, cost, is_repeatable, status
  )
  values (
    p_item_id, v_profile.id, v_profile.owner_id,
    v_item.title, v_item.emoji, v_item.icon_url, v_item.cost, v_item.repeatable, 'requested'
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
      title text, description text, emoji text, icon_url text, cost int,
      repeatable boolean, is_active boolean, sort_order int
    )
    where coalesce(length(trim(title)), 0) = 0
       or length(trim(title)) > 60
       or cost is null or cost <= 0
       or emoji is null or length(emoji) < 1 or length(emoji) > 8
       or repeatable is null
       or is_active is null
       or (
         nullif(trim(icon_url), '') is not null
         and (
           length(trim(icon_url)) > 2048
           or trim(icon_url) !~ '^https://[^[:space:]]+$'
         )
       )
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_items');
  end if;

  delete from public.shop_items where owner_id = auth.uid();

  insert into public.shop_items (
    owner_id, title, description, emoji, icon_url, cost, repeatable, is_active, sort_order
  )
  select
    auth.uid(),
    trim(x.title),
    x.description,
    x.emoji,
    nullif(trim(x.icon_url), ''),
    x.cost,
    x.repeatable,
    x.is_active,
    coalesce(x.sort_order, 0)
  from jsonb_to_recordset(p_items) as x(
    title text, description text, emoji text, icon_url text, cost int,
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
    'iconUrl', p.item_icon_url,
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
