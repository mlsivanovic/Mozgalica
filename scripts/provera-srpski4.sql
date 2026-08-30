-- Samostalna provera uvoza i ocenjivanja bez trajnih upisa.
begin;
do $$
declare
  v_owner uuid;
  v_broj int;
  v_pitanje record;
  v_odgovor text;
begin
  select count(*) into v_broj
  from public.questions q join public.topics t on t.id = q.topic_id
  where q.gen_signature like 'srpski-%-4:banka:%';
  if v_broj <> 140 then
    raise exception 'Očekivano je 140 uvezenih pitanja; pronađeno: %', v_broj;
  end if;

  select distinct q.owner_id into strict v_owner
  from public.questions q join public.topics t on t.id = q.topic_id
  where t.subject = 'srpski' and t.grade in (3, 4);

  for v_pitanje in
    select q.* from public.questions q
    where q.owner_id = v_owner and q.gen_signature like 'srpski-%-4:banka:%'
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
select 'Provera banke 4. razreda završena bez trajnog upisa' as rezultat;
