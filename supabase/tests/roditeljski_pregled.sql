-- Integraciona provera na linkovanoj bazi: supabase db query --linked -f supabase/tests/roditeljski_pregled.sql
-- Ne menja poslovne podatke. Autentifikacioni kontekst važi samo do ROLLBACK-a.
begin;
do $$
declare
  vlasnik uuid;
  dete record;
  pregled jsonb;
  zadaci jsonb;
  red jsonb;
  ocekuje bigint;
  danas date := (now() at time zone 'Europe/Belgrade')::date;
begin
  if has_function_privilege('anon', 'public.admin_parent_overview(uuid)', 'execute')
    or has_function_privilege('anon', 'public.admin_parent_tasks(uuid)', 'execute') then
    raise exception 'Anon ne sme imati pristup roditeljskom pregledu';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  if public.admin_parent_overview()->>'error' <> 'forbidden' then raise exception 'Nedostaje provera prijave'; end if;
  for vlasnik in select user_id from public.admin_settings loop
    perform set_config('request.jwt.claim.sub', vlasnik::text, true);
    pregled := public.admin_parent_overview();
    if pregled->>'ok' <> 'true' then raise exception 'Pregled vlasnika nije uspeo'; end if;
    if jsonb_array_length(pregled->'events') > 5 then raise exception 'Lista događaja nije ograničena'; end if;
    if (pregled->>'date')::date <> danas then raise exception 'Dan nije u beogradskoj zoni'; end if;
    if exists(select 1 from jsonb_array_elements(pregled->'children') x where not exists (
      select 1 from public.child_profiles cp where cp.id = (x->>'id')::uuid and cp.owner_id = vlasnik
    )) then raise exception 'Pregled sadrži tuđi profil'; end if;
    if jsonb_array_length(pregled->'children') <> (select count(*) from public.child_profiles where owner_id = vlasnik) then
      raise exception 'Nedostaje profil u pregledu';
    end if;
    if public.admin_parent_overview(gen_random_uuid())->>'error' <> 'not_found' then raise exception 'Nepostojeći profil mora biti greška'; end if;
    for dete in select id, owner_id from public.child_profiles loop
      pregled := public.admin_parent_overview(dete.id);
      if dete.owner_id <> vlasnik then
        if pregled->>'error' <> 'not_found' then raise exception 'Pristup tuđem profilu'; end if;
        continue;
      end if;
      if jsonb_array_length(pregled->'children') <> 1 then raise exception 'Filter profila nije primenjen'; end if;
      zadaci := public.admin_parent_tasks(dete.id)->'tasks';
      if exists(select 1 from jsonb_array_elements(zadaci) x where x->>'childProfileId' is distinct from dete.id::text) then
        raise exception 'Zadatak pogrešnog profila';
      end if;
      red := pregled->'children'->0;
      select count(*) into ocekuje from jsonb_array_elements(zadaci) x where x->>'kind' = 'quiz';
      if (red->>'quizCount')::bigint <> ocekuje then raise exception 'Brojač kvizova ne odgovara listi'; end if;
      select count(*) into ocekuje from jsonb_array_elements(zadaci) x where x->>'kind' = 'chess';
      if (red->>'chessCount')::bigint <> ocekuje then raise exception 'Brojač šaha ne odgovara listi'; end if;
      select count(distinct a.quiz_id) into ocekuje from public.attempts a join public.quizzes q on q.id = a.quiz_id
        where q.owner_id = vlasnik and a.child_profile_id = dete.id and a.status = 'submitted'
        and a.submitted_at >= (danas::timestamp at time zone 'Europe/Belgrade')
        and a.submitted_at < ((danas+1)::timestamp at time zone 'Europe/Belgrade');
      ocekuje := ocekuje + (select count(*) from public.chess_games g where g.owner_id = vlasnik and g.child_profile_id = dete.id
        and g.status = 'completed' and g.completed_at >= (danas::timestamp at time zone 'Europe/Belgrade')
        and g.completed_at < ((danas+1)::timestamp at time zone 'Europe/Belgrade'));
      if (red->>'completedToday')::bigint <> ocekuje then raise exception 'Brojač završenog danas nije tačan'; end if;
      if exists(select 1 from jsonb_array_elements(pregled->'events') x where x->>'childProfileId' is distinct from dete.id::text) then
        raise exception 'Događaj pogrešnog profila';
      end if;
    end loop;
    if exists(select 1 from jsonb_array_elements(public.admin_list_shop_purchases()->'purchases') x
      where not exists(select 1 from public.child_profiles cp where cp.id = (x->>'childProfileId')::uuid and cp.owner_id = vlasnik)) then
      raise exception 'Kupovina bez identifikatora vlasnikovog deteta';
    end if;
  end loop;
end;
$$;
rollback;
