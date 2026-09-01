-- Integraciona provera: supabase db query --linked -f supabase/tests/brisanje_profila_deteta.sql
-- Ne menja poslovne podatke. Autentifikacioni kontekst važi samo do ROLLBACK-a.
begin;
do $$
declare
  vlasnik uuid;
  dete uuid;
  drugo uuid;
  token text;
  kviz uuid;
  link uuid;
  raspored_kviz uuid;
  raspored_sah uuid;
  odgovor jsonb;
  pre_profila int;
begin
  if has_function_privilege('anon', 'public.delete_child_profile(uuid)', 'execute') then
    raise exception 'Anon ne sme da briše profile dece';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  if public.delete_child_profile(gen_random_uuid())->>'error' <> 'forbidden' then
    raise exception 'Nedostaje provera prijave';
  end if;

  select user_id into vlasnik from public.admin_settings limit 1;
  if vlasnik is null then raise exception 'Nema administratora za proveru'; end if;
  perform set_config('request.jwt.claim.sub', vlasnik::text, true);

  if public.delete_child_profile(gen_random_uuid())->>'error' <> 'not_found' then
    raise exception 'Nepostojeći profil mora biti greška';
  end if;

  select id into drugo from public.child_profiles
  where owner_id <> vlasnik
  limit 1;
  if drugo is not null then
    if public.delete_child_profile(drugo)->>'error' <> 'not_found' then
      raise exception 'Tuđi profil ne sme da se obriše';
    end if;
  end if;

  select count(*) into pre_profila from public.child_profiles where owner_id = vlasnik;

  insert into public.child_profiles (owner_id, name, avatar)
  values (vlasnik, '__test_brisanje_profila__', '🦊')
  returning id, public_token into dete, token;

  insert into public.daily_quiz_schedules (
    owner_id, child_profile_id, subject, grade, source, question_count, daily_time, next_run_on
  ) values (
    vlasnik, dete, 'matematika', 3, 'generator', 5, '08:00', current_date
  ) returning id into raspored_kviz;

  insert into public.daily_quiz_runs (schedule_id, local_date, status)
  values (raspored_kviz, current_date, 'succeeded');

  insert into public.daily_chess_schedules (
    owner_id, child_profile_id, approximate_elo, child_color, daily_time, next_run_on
  ) values (
    vlasnik, dete, 700, 'white', '18:00', current_date
  ) returning id into raspored_sah;

  insert into public.daily_chess_runs (schedule_id, local_date, status)
  values (raspored_sah, current_date, 'succeeded');

  insert into public.chess_games (
    owner_id, child_profile_id, assignment_request_id, approximate_elo, child_color, status
  ) values (
    vlasnik, dete, gen_random_uuid(), 700, 'white', 'assigned'
  );

  insert into public.chess_games (
    owner_id, child_profile_id, assignment_request_id, approximate_elo, child_color,
    status, result, termination, stars_awarded, completed_at,
    daily_schedule_id, daily_local_date
  ) values (
    vlasnik, dete, gen_random_uuid(), 700, 'white',
    'completed', 'child_loss', 'resignation', 0, now(),
    raspored_sah, current_date
  );

  insert into public.chess_games (
    owner_id, child_profile_id, assignment_request_id, approximate_elo, child_color,
    status, result, termination, stars_awarded, completed_at, retry_of_game_id
  )
  select
    vlasnik, dete, gen_random_uuid(), 700, 'white',
    'completed', 'child_win', 'checkmate', 3, now(), g.id
  from public.chess_games g
  where g.child_profile_id = dete and g.result = 'child_loss'
  limit 1;

  insert into public.chess_games (
    owner_id, child_profile_id, assignment_request_id, approximate_elo, child_color,
    status, completed_at
  ) values (
    vlasnik, dete, gen_random_uuid(), 900, 'black', 'cancelled', now()
  );

  insert into public.quizzes (owner_id, title)
  values (vlasnik, '__test_brisanje_kviz__')
  returning id into kviz;

  insert into public.quiz_links (quiz_id, child_profile_id)
  values (kviz, dete)
  returning id into link;

  insert into public.attempts (
    quiz_link_id, quiz_id, child_profile_id, attempt_no, child_name, layout
  ) values (
    link, kviz, dete, 1, '__test_brisanje_profila__', '[]'::jsonb
  );

  begin
    update public.chess_games
    set retry_of_game_id = retry_of_game_id
    where child_profile_id = dete and status = 'completed';
    raise exception 'Stražar šaha mora da blokira izmenu završene partije';
  exception
    when raise_exception then
      if sqlerrm not like '%nepromenjiva%' then raise; end if;
  end;

  odgovor := public.delete_child_profile(dete);
  if odgovor->>'ok' <> 'true' then
    raise exception 'Brisanje profila nije uspelo: %', odgovor;
  end if;

  if exists (select 1 from public.child_profiles where id = dete) then
    raise exception 'Profil je ostao u bazi';
  end if;
  if public.get_child_profile(token)->>'error' <> 'not_found' then
    raise exception 'Obrisani profil i dalje je dostupan tokenom';
  end if;
  if exists (select 1 from public.daily_quiz_schedules where id = raspored_kviz) then
    raise exception 'Dnevni raspored kviza nije obrisan';
  end if;
  if exists (select 1 from public.daily_chess_schedules where id = raspored_sah) then
    raise exception 'Dnevni raspored šaha nije obrisan';
  end if;
  if exists (select 1 from public.chess_games where child_profile_id = dete) then
    raise exception 'Šahovske partije nisu obrisane';
  end if;
  if exists (select 1 from public.quiz_links where id = link) then
    raise exception 'Profilni link kviza nije obrisan';
  end if;
  if exists (select 1 from public.attempts where child_profile_id = dete) then
    raise exception 'Pokušaji obrisanog profila nisu uklonjeni';
  end if;
  if not exists (select 1 from public.quizzes where id = kviz) then
    raise exception 'Kviz ne sme da nestane sa profilom deteta';
  end if;
  if (select count(*) from public.child_profiles where owner_id = vlasnik) <> pre_profila then
    raise exception 'Broj ostalih profila se promenio';
  end if;
  if public.delete_child_profile(dete)->>'error' <> 'not_found' then
    raise exception 'Ponovljeno brisanje mora biti not_found';
  end if;
end;
$$;
rollback;
