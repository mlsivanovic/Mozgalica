-- Samostalna provera rasporeda i ocenjivanja bez trajnih upisa ili slanja poruka.
begin;
do $$
declare
  v_owner uuid;
  v_profile uuid;
  v_topics uuid[];
  v_stari_topic uuid;
  v_raspored public.daily_quiz_schedules;
  v_pitanje record;
  v_odgovor text;
begin
  select distinct q.owner_id into strict v_owner
  from public.questions q join public.topics t on t.id = q.topic_id
  where t.subject = 'srpski' and t.grade in (3, 4);
  select id into strict v_profile from public.child_profiles
  where owner_id = v_owner order by id limit 1;
  select array_agg(id order by sort_order) into v_topics from public.topics
  where subject = 'srpski' and grade = 5;
  select id into strict v_stari_topic from public.topics where slug = 'srpski-gramatika-4';
  if cardinality(v_topics) <> 6 then raise exception 'Nisu pronađene sve oblasti.'; end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  v_raspored := public.save_daily_quiz_schedule(
    null::uuid, v_profile, 'srpski', 5::smallint, 'combined', v_topics, 1::smallint,
    'auto', 20, null::int, true, true, 60, '23:59'::time, false, false
  );
  if v_raspored.grade <> 5 or v_raspored.difficulty <> 5 then
    raise exception 'Dnevni raspored nije sačuvao očekivani razred i težinu.';
  end if;
  if (select count(*) from public.daily_quiz_schedule_topics where schedule_id = v_raspored.id) <> 6 then
    raise exception 'Raspored nije dobio sve oblasti.';
  end if;

  begin
    perform public.save_daily_quiz_schedule(null::uuid, v_profile, 'srpski', 5::smallint,
      'combined', array[v_stari_topic], 5::smallint, 'auto', 10, null::int, true, true, 60, '23:59'::time);
    raise exception 'Prihvaćena je oblast drugog razreda.';
  exception when raise_exception then
    if sqlerrm <> 'Sve oblasti moraju pripadati izabranom predmetu i razredu.' then raise; end if;
  end;
  begin
    perform public.save_daily_quiz_schedule(null::uuid, v_profile, 'priroda_drustvo', 5::smallint,
      'generator', v_topics, 5::smallint, 'auto', 10, null::int, true, true, 60, '23:59'::time);
    raise exception 'Priroda i društvo je nepravilno dobila 5. razred.';
  exception when raise_exception then
    if sqlerrm <> 'Neispravna podešavanja izvora pitanja.' then raise; end if;
  end;

  for v_pitanje in select q.* from public.questions q join public.topics t on t.id = q.topic_id
    where q.owner_id = v_owner and t.subject = 'srpski' and t.grade = 5
  loop
    if v_pitanje.type = 'text' then
      for v_odgovor in select jsonb_array_elements_text(v_pitanje.correct->'accept') loop
        if not public.fn_grade_answer('text', v_pitanje.correct, jsonb_build_object('text', v_odgovor)) then
          raise exception 'SQL ne prihvata ispravan odgovor: %', v_pitanje.gen_signature;
        end if;
      end loop;
      if public.fn_grade_answer('text', v_pitanje.correct, '{"text":"potpuno pogrešan odgovor"}'::jsonb) then
        raise exception 'SQL prihvata pogrešan odgovor: %', v_pitanje.gen_signature;
      end if;
    elsif v_pitanje.type = 'truefalse' then
      if not public.fn_grade_answer('truefalse', v_pitanje.correct, v_pitanje.correct)
        or public.fn_grade_answer('truefalse', v_pitanje.correct,
          jsonb_build_object('value', not (v_pitanje.correct->>'value')::boolean)) then
        raise exception 'Neispravno ocenjivanje tvrdnje: %', v_pitanje.gen_signature;
      end if;
    end if;
  end loop;
end;
$$;
rollback;
