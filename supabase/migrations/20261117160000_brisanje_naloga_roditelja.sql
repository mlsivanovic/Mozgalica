-- Brisanje celog roditeljskog naloga i svih njegovih podataka.
--
-- 1) Zavisnosti profila deteta (RESTRICT FK-ovi ka kvizovima, pokušajima, šahu i
--    dnevnim rasporedima) izdvojene su u fn_obrisi_zavisnosti_profila, da ih koriste
--    i delete_child_profile (administratorski panel) i obrisi_podatke_naloga (Edge
--    funkcija obrisi-nalog, bez auth.uid()). Ponašanje delete_child_profile ostaje isto.
-- 2) obrisi_podatke_naloga briše sve podatke roditelja. Ostatak (admin_settings,
--    title_levels, notifications, push_subscriptions, shop_*, school_timetables, ...)
--    nestaje kaskadno kada se obriše auth.users red, što radi Edge funkcija.
-- Vlasnik platforme ne može da obriše nalog: njegova pitanja su zajednička banka.

create or replace function public.fn_obrisi_zavisnosti_profila(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Važi samo do kraja transakcije; obične partije ostaju nepromenjive.
  perform set_config('mozgalica.bypass_chess_guard', '1', true);

  -- Dnevni rasporedi: runs i nedeljni izveštaji drže schedule RESTRICT.
  delete from public.smart_weekly_reports
  where child_profile_id = p_profile_id;

  delete from public.daily_quiz_runs r
  using public.daily_quiz_schedules s
  where r.schedule_id = s.id and s.child_profile_id = p_profile_id;

  delete from public.daily_quiz_schedules
  where child_profile_id = p_profile_id;

  delete from public.daily_chess_runs r
  using public.daily_chess_schedules s
  where r.schedule_id = s.id and s.child_profile_id = p_profile_id;

  delete from public.daily_chess_schedules
  where child_profile_id = p_profile_id;

  update public.chess_games
  set retry_of_game_id = null
  where child_profile_id = p_profile_id
    and retry_of_game_id is not null;

  delete from public.chess_games
  where child_profile_id = p_profile_id;

  delete from public.quiz_links
  where child_profile_id = p_profile_id;

  delete from public.attempts
  where child_profile_id = p_profile_id;
end;
$$;

revoke all on function public.fn_obrisi_zavisnosti_profila(uuid) from public, anon, authenticated;

create or replace function public.delete_child_profile(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.child_profiles;
begin
  if not public.fn_is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_profile
  from public.child_profiles
  where id = p_profile_id and owner_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  perform public.fn_obrisi_zavisnosti_profila(p_profile_id);

  delete from public.child_profiles
  where id = p_profile_id and owner_id = auth.uid();

  return jsonb_build_object('ok', true);
end;
$$;

-- Briše sve podatke roditelja (ne i auth nalog). Samo service role (Edge funkcija).
create or replace function public.obrisi_podatke_naloga(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_vlasnik boolean;
  v_email text;
  v_zavisnih int;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'bad_request');
  end if;

  select coalesce(is_platform_owner, false) into v_vlasnik
  from public.admin_settings
  where user_id = p_user_id;

  if coalesce(v_vlasnik, false) then
    return jsonb_build_object('ok', false, 'error', 'platform_owner');
  end if;

  -- Pitanja ovog roditelja ne smeju da budu snapshot u tuđim kvizovima.
  select count(*) into v_zavisnih
  from public.quiz_questions qq
  join public.questions q on q.id = qq.source_question_id
  join public.quizzes kviz on kviz.id = qq.quiz_id
  where q.owner_id = p_user_id
    and kviz.owner_id <> p_user_id;

  if v_zavisnih > 0 then
    return jsonb_build_object('ok', false, 'error', 'shared_dependency');
  end if;

  select lower(email) into v_email
  from auth.users
  where id = p_user_id;

  for v_profile_id in
    select id from public.child_profiles where owner_id = p_user_id order by created_at
  loop
    perform public.fn_obrisi_zavisnosti_profila(v_profile_id);
    delete from public.child_profiles where id = v_profile_id;
  end loop;

  -- Kvizovi nose snapshot pitanja (kaskada), a pitanja su vlasnikova.
  delete from public.quizzes where owner_id = p_user_id;
  delete from public.questions where owner_id = p_user_id;
  delete from public.shop_items where owner_id = p_user_id;
  delete from public.chess_reward_settings where owner_id = p_user_id;

  if v_email is not null then
    delete from public.admin_allowlist where lower(email) = v_email;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.obrisi_podatke_naloga(uuid) from public, anon, authenticated;
grant execute on function public.obrisi_podatke_naloga(uuid) to service_role;
