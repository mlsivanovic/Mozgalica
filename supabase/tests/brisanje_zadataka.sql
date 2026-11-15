-- Integraciona provera brisanja zadataka: supabase db query --linked -f supabase/tests/brisanje_zadataka.sql
-- Ne menja poslovne podatke. Autentifikacioni kontekst važi samo do ROLLBACK-a.
begin;
do $$
declare
  vlasnik uuid;
  zadatak record;
  rezultat jsonb;
begin
  if has_function_privilege('anon', 'public.admin_delete_parent_tasks(jsonb)', 'execute') then
    raise exception 'Anon ne sme da briše zadatke';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  if public.admin_delete_parent_tasks('[]'::jsonb)->>'error' <> 'forbidden' then
    raise exception 'Nedostaje provera prijave';
  end if;

  for vlasnik in select distinct owner_id from public.quizzes loop
    perform set_config('request.jwt.claim.sub', vlasnik::text, true);

    -- 1) Dodela bez pokušaja: link se briše i zadatak nestaje sa liste.
    select ql.id, ql.quiz_id, ql.child_profile_id into zadatak
    from public.quiz_links ql
    join public.quizzes q on q.id = ql.quiz_id and q.owner_id = vlasnik and q.deleted_at is null
    where ql.child_profile_id is not null and ql.is_active
      and not exists (select 1 from public.attempts a where a.quiz_link_id = ql.id)
    limit 1;
    if found then
      rezultat := public.admin_delete_parent_tasks(jsonb_build_array(jsonb_build_object(
        'kind', 'quiz', 'id', zadatak.quiz_id, 'childProfileId', zadatak.child_profile_id)));
      if (rezultat->>'removed')::int <> 1 then raise exception 'Dodela bez pokušaja nije obrisana'; end if;
      if exists (select 1 from public.quiz_links where id = zadatak.id) then raise exception 'Link bez pokušaja je ostao'; end if;
      if exists (
        select 1 from jsonb_array_elements(public.admin_parent_tasks(null)->'tasks') x
        where x->>'id' = zadatak.quiz_id::text and x->>'childProfileId' = zadatak.child_profile_id::text
      ) then raise exception 'Obrisani zadatak je i dalje u listi'; end if;
    end if;

    -- 2) Dodela sa pokušajima: link se deaktivira, istorija ostaje.
    select ql.id, ql.quiz_id, ql.child_profile_id into zadatak
    from public.quiz_links ql
    join public.quizzes q on q.id = ql.quiz_id and q.owner_id = vlasnik and q.deleted_at is null
    where ql.child_profile_id is not null and ql.is_active
      and exists (select 1 from public.attempts a where a.quiz_link_id = ql.id)
    limit 1;
    if found then
      rezultat := public.admin_delete_parent_tasks(jsonb_build_array(jsonb_build_object(
        'kind', 'quiz', 'id', zadatak.quiz_id, 'childProfileId', zadatak.child_profile_id)));
      if (rezultat->>'preserved')::int <> 1 then raise exception 'Dodela sa pokušajima nije deaktivirana'; end if;
      if exists (select 1 from public.quiz_links where id = zadatak.id and is_active) then
        raise exception 'Link sa pokušajima je ostao aktivan';
      end if;
      if not exists (select 1 from public.attempts where quiz_link_id = zadatak.id) then
        raise exception 'Istorija pokušaja je izgubljena';
      end if;
    end if;

    -- 3) Aktivna šahovska partija se otkazuje.
    select g.id into zadatak from public.chess_games g
    where g.owner_id = vlasnik and g.status in ('assigned', 'in_progress') limit 1;
    if found then
      rezultat := public.admin_delete_parent_tasks(jsonb_build_array(jsonb_build_object(
        'kind', 'chess', 'id', zadatak.id, 'childProfileId', null)));
      if (rezultat->>'removed')::int <> 1 then raise exception 'Šahovska partija nije otkazana'; end if;
      if exists (select 1 from public.chess_games where id = zadatak.id and status <> 'cancelled') then
        raise exception 'Partija je ostala aktivna';
      end if;
    end if;

    -- 4) Pripremljen kviz bez dodele ide u arhivu (pravimo ga u transakciji, pa se rollback-uje).
    insert into public.quizzes (owner_id, title) values (vlasnik, 'Probni pripremljen kviz') returning id into zadatak.id;
    rezultat := public.admin_delete_parent_tasks(jsonb_build_array(jsonb_build_object(
      'kind', 'quiz', 'id', zadatak.id, 'childProfileId', null)));
    if (rezultat->>'archived')::int <> 1 then raise exception 'Pripremljen kviz nije arhiviran'; end if;
    if exists (select 1 from public.quizzes where id = zadatak.id and deleted_at is null) then
      raise exception 'Arhivirani kviz je ostao u listi';
    end if;

    -- 5) Tuđi kviz se odbija i ostaje netaknut.
    select q.id into zadatak from public.quizzes q
    where q.owner_id <> vlasnik and q.deleted_at is null limit 1;
    if found then
      rezultat := public.admin_delete_parent_tasks(jsonb_build_array(jsonb_build_object(
        'kind', 'quiz', 'id', zadatak.id, 'childProfileId', null)));
      if jsonb_array_length(rezultat->'errors') <> 1 then raise exception 'Tuđi kviz nije odbijen'; end if;
      if exists (select 1 from public.quizzes where id = zadatak.id and deleted_at is not null) then
        raise exception 'Tuđi kviz je obrisan';
      end if;
    end if;
  end loop;
end;
$$;
rollback;
