-- Mejlovi o šahovskim partijama usklađeni sa kvizovima: privremeno isključeni.
-- Push i inbox ostaju. Prekidači u app_config (vidi 20261117130000):
--   mejl_detetu_nova_partija        — mejl detetu kad mu se dodeli partija
--   mejl_roditelju_posle_partije    — mejl roditelju kad dete završi partiju
-- Ponovno uključivanje: `update public.app_config set value = 'true' where key = '...';`
-- i konstante u src/lib/funkcije.ts.

insert into public.app_config (key, value) values
  ('mejl_detetu_nova_partija', 'false'),
  ('mejl_roditelju_posle_partije', 'false')
on conflict (key) do nothing;

create or replace function public.fn_create_new_chess_notification()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_profile public.child_profiles;
  v_notification_id uuid;
begin
  select * into v_profile from public.child_profiles where id = new.child_profile_id;
  insert into public.notifications (
    owner_id, child_profile_id, recipient_type, event_type, chess_game_id,
    title, body, target_url
  ) values (
    new.owner_id, new.child_profile_id, 'child', 'new_chess_game', new.id,
    'Nova šahovska partija',
    v_profile.name || ', čeka te partija protiv računara jačine ELO ' || new.approximate_elo || '.',
    '/sah/' || new.play_token
  )
  on conflict (chess_game_id, recipient_type) where event_type = 'new_chess_game'
  do nothing returning id into v_notification_id;
  if v_notification_id is null then return new; end if;
  perform public.fn_enqueue_push_deliveries(v_notification_id, 'child', new.owner_id, new.child_profile_id);
  if new.notify_child_email and public.fn_mejl_ukljucen('mejl_detetu_nova_partija') then
    insert into public.notification_deliveries (notification_id, channel, recipient_email)
    values (v_notification_id, 'email', v_profile.email) on conflict do nothing;
  end if;
  return new;
end;
$function$;

create or replace function public.fn_create_chess_completion_notification()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_profile public.child_profiles;
  v_notification_id uuid;
  v_result_text text;
  v_email boolean;
begin
  if old.status = 'completed' or new.status <> 'completed' then return new; end if;
  select * into v_profile from public.child_profiles where id = new.child_profile_id;
  v_result_text := case new.result
    when 'child_win' then 'pobeda' when 'draw' then 'remi' else 'poraz' end;
  insert into public.notifications (
    owner_id, recipient_type, event_type, chess_game_id, title, body, target_url
  ) values (
    new.owner_id, 'admin', 'chess_game_completed', new.id,
    'Šahovska partija je završena',
    v_profile.name || ': ' || v_result_text || ' protiv ELO ' || new.approximate_elo
      || ' — ' || new.stars_awarded || ' zvezdica.',
    '/admin/sah'
  )
  on conflict (chess_game_id, recipient_type) where event_type = 'chess_game_completed'
  do nothing returning id into v_notification_id;
  if v_notification_id is null then return new; end if;
  perform public.fn_enqueue_push_deliveries(v_notification_id, 'admin', new.owner_id, null);
  if not public.fn_mejl_ukljucen('mejl_roditelju_posle_partije') then return new; end if;
  select coalesce(email_notifications, true) into v_email
  from public.admin_settings where user_id = new.owner_id;
  if coalesce(v_email, true) then
    insert into public.notification_deliveries (notification_id, channel)
    values (v_notification_id, 'email') on conflict do nothing;
  end if;
  return new;
end;
$function$;
