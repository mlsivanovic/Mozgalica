-- Integraciona provera: supabase db query --linked -f supabase/tests/raspored_casova.sql
begin;
do $$
declare
  vlasnik uuid;
  dete record;
  drugo uuid;
  token text;
  payload jsonb;
  odgovor jsonb;
  smena text;
begin
  if has_function_privilege('anon', 'public.admin_upsert_school_timetable(uuid, jsonb)', 'execute')
    or has_function_privilege('anon', 'public.admin_get_school_timetable(uuid)', 'execute')
    or has_function_privilege('anon', 'public.admin_delete_school_timetable(uuid)', 'execute') then
    raise exception 'Anon ne sme da piše raspored časova';
  end if;
  if not has_function_privilege('anon', 'public.get_child_school_timetable(text)', 'execute') then
    raise exception 'Anon mora da čita raspored časova tokenom';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  if public.admin_get_school_timetable(gen_random_uuid())->>'error' <> 'forbidden' then
    raise exception 'Nedostaje provera prijave';
  end if;

  if public.fn_school_shift('fixed', 'morning', '2026-08-31', '2026-09-07', null) <> 'morning' then
    raise exception 'Fiksna smena mora da ostane ista';
  end if;
  if public.fn_school_shift('alternating', 'afternoon', '2026-08-31', '2026-08-31', null) <> 'afternoon' then
    raise exception 'Sidro naizmenične smene';
  end if;
  if public.fn_school_shift('alternating', 'afternoon', '2026-08-31', '2026-09-07', null) <> 'morning' then
    raise exception 'Sledeća nedelja mora da promeni smenu';
  end if;
  if public.fn_school_shift('alternating', 'afternoon', '2026-08-31', '2026-09-07', 'afternoon') <> 'afternoon' then
    raise exception 'Override nedelje mora da pobedi rotaciju';
  end if;

  select user_id into vlasnik from public.admin_settings limit 1;
  if vlasnik is null then raise exception 'Nema administratora za proveru'; end if;
  perform set_config('request.jwt.claim.sub', vlasnik::text, true);

  select * into dete from public.child_profiles where owner_id = vlasnik order by created_at limit 1;
  if dete.id is null then raise exception 'Nema deteta za proveru'; end if;
  token := dete.public_token;

  if public.admin_get_school_timetable(gen_random_uuid())->>'error' <> 'not_found' then
    raise exception 'Nepostojeći profil mora biti greška';
  end if;

  payload := jsonb_build_object(
    'rotationMode', 'alternating',
    'defaultShift', 'afternoon',
    'anchorMonday', public.fn_school_monday((now() at time zone 'Europe/Belgrade')::date),
    'includeSaturday', false,
    'sharedSlots', true,
    'morningPeriods', jsonb_build_array(
      jsonb_build_object('periodNo', 1, 'startsAt', '08:00', 'endsAt', '08:45')
    ),
    'afternoonPeriods', jsonb_build_array(
      jsonb_build_object('periodNo', 0, 'startsAt', '13:10', 'endsAt', '13:55'),
      jsonb_build_object('periodNo', 1, 'startsAt', '14:00', 'endsAt', '14:45')
    ),
    'slots', jsonb_build_array(
      jsonb_build_object('shift', null, 'weekday', 1, 'periodNo', 0, 'subject', 'Srpski jezik'),
      jsonb_build_object('shift', null, 'weekday', 1, 'periodNo', 1, 'subject', 'Matematika')
    )
  );

  odgovor := public.admin_upsert_school_timetable(dete.id, payload);
  if odgovor->>'ok' <> 'true' or odgovor->>'exists' <> 'true' then
    raise exception 'Upis rasporeda nije uspeo: %', odgovor;
  end if;
  if odgovor#>'{timetable,afternoonPeriods,0,periodNo}' <> '0' then
    raise exception 'Popodnevni pretčas nije sačuvan';
  end if;

  odgovor := public.get_child_school_timetable(token);
  if odgovor->>'ok' <> 'true' or odgovor->>'exists' <> 'true' then
    raise exception 'Dete ne vidi sačuvani raspored';
  end if;
  if odgovor->>'childName' is null then raise exception 'Nedostaje ime deteta'; end if;
  if odgovor::text like '%owner_id%' then raise exception 'Token ne sme da otkrije vlasnika'; end if;
  smena := odgovor#>>'{today,shift}';
  if smena is not null and smena not in ('morning', 'afternoon') then
    raise exception 'Smena današnjeg dana nije prepoznata';
  end if;
  if jsonb_typeof(odgovor->'tomorrow') <> 'object' then
    raise exception 'Nedostaje sutrašnji dan';
  end if;

  select id into drugo from public.child_profiles
  where owner_id = vlasnik and id <> dete.id
  order by created_at limit 1;
  if drugo is not null then
    odgovor := public.admin_copy_school_timetable(dete.id, drugo);
    if odgovor->>'ok' <> 'true' then raise exception 'Kopiranje na drugo dete nije uspelo'; end if;
  end if;

  odgovor := public.admin_set_week_shift(
    dete.id, public.fn_school_monday((now() at time zone 'Europe/Belgrade')::date), 'morning'
  );
  if odgovor->>'ok' <> 'true' then raise exception 'Override smene nije uspeo'; end if;
  if public.get_child_school_timetable(token)->>'thisWeekShift' <> 'morning' then
    raise exception 'Override nije primenjen';
  end if;

  if public.admin_delete_school_timetable(dete.id)->>'ok' <> 'true' then
    raise exception 'Brisanje rasporeda nije uspelo';
  end if;
  if public.get_child_school_timetable(token)->>'exists' <> 'false' then
    raise exception 'Obrisani raspored i dalje je vidljiv detetu';
  end if;
end;
$$;
rollback;
