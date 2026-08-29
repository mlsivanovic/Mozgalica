-- Pogrešno svrstana pitanja premeštamo u 4. razred, bez izmene istorijskih
-- snapshot-a. Rezervna kopija ostaje van javno izložene šeme.
create temporary table pitanja_za_premestanje on commit drop as
select q.id,
  case
    when t.slug = 'srpski-gramatika'
      and lower(q.text || ' ' || coalesce(q.explanation, '')) ~ '(subjekat|predikat)'
      then 'srpski-gramatika-4'
    when t.slug = 'srpski-pravopis'
      and lower(q.text) ~ 'naziv ulice ili trga'
      then 'srpski-pravopis-4'
    when t.slug = 'srpski-recnik'
      and lower(q.text) ~ '(bogu iza leđa|dati vetar u leđa|hvatati zjale|imati mekano srce|imati zlatne ruke|izvući deblji kraj|kriti se kao zmija noge|mlatiti praznu slamu|obećavati kule i gradove|pao mi je kamen sa srca|pao mi je mrak na oči|pokazati zube|progledati kroz prste|sipati iz rukava|soliti pamet|srce mi je sišlo u pete)'
      then 'srpski-recnik-4'
  end as ciljni_slug
from public.questions q
join public.topics t on t.id = q.topic_id
where t.grade = 3
  and t.subject = 'srpski';

delete from pitanja_za_premestanje where ciljni_slug is null;

do $$
declare
  v_gramatika integer;
  v_pravopis integer;
  v_recnik integer;
begin
  select count(*) filter (where ciljni_slug = 'srpski-gramatika-4'),
         count(*) filter (where ciljni_slug = 'srpski-pravopis-4'),
         count(*) filter (where ciljni_slug = 'srpski-recnik-4')
    into v_gramatika, v_pravopis, v_recnik
  from pitanja_za_premestanje;

  if v_gramatika <> 100 or v_pravopis <> 15 or v_recnik <> 19 then
    raise exception 'Neočekivan broj pitanja za premeštanje: gramatika %, pravopis %, rečnik %.',
      v_gramatika, v_pravopis, v_recnik;
  end if;

  if exists (
    select 1
    from pitanja_za_premestanje p
    join public.questions q3 on q3.id = p.id
    join public.topics t4 on t4.slug = p.ciljni_slug
    join public.questions q4 on q4.topic_id = t4.id
      and lower(regexp_replace(trim(q3.text), '\s+', ' ', 'g'))
        = lower(regexp_replace(trim(q4.text), '\s+', ' ', 'g'))
  ) then
    raise exception 'Pronađen je duplikat pitanja u ciljnoj oblasti 4. razreda.';
  end if;
end;
$$;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table private.questions_srpski_program_backup_20260829 as
select q.*
from public.questions q
join pitanja_za_premestanje p on p.id = q.id;

alter table private.questions_srpski_program_backup_20260829 add primary key (id);
revoke all on private.questions_srpski_program_backup_20260829 from public, anon, authenticated;
comment on table private.questions_srpski_program_backup_20260829 is
  'Rezervna kopija 134 pitanja pre usklađivanja programa srpskog za 3. i 4. razred.';

update public.questions q
set topic_id = t.id
from pitanja_za_premestanje p
join public.topics t on t.slug = p.ciljni_slug
where q.id = p.id;

-- Jezičke greške pronađene u pregledanom skupu banke pitanja.
update public.questions
set text = replace(text, 'ulica svetog saves', 'ulica svetog save')
where id = '1763f29b-75d0-4a6e-8c56-b860e784112e';

update public.questions
set explanation = 'Izraz „imati mekano srce” znači biti saosećajan i dobar.'
where id = 'f24984d7-dcb2-458e-a675-af4e16f9f543';

update public.questions
set explanation = 'Izraz „imati zlatne ruke” znači biti izuzetno spretan i vredan.'
where id = 'a35a544f-320c-4f3b-ac06-85dfe54eff1d';

update public.questions
set explanation = 'Izraz „pao mi je mrak na oči” označava jak bes i ljutnju.'
where id = '052f8dc5-3fb7-4e86-b18a-c3ae1c8b3250';

update public.questions
set explanation = 'Izraz „soliti pamet” znači nametljivo i dosadno davati neželjene savete.'
where id = '8f0035ca-4cb3-4408-b097-86d544cd3f23';

update public.questions
set text = 'Objasni značenje ustaljenog izraza: „sipati kao iz rukava”.',
    correct = '{"accept":["govoriti tečno i bez zastajkivanja","govoriti lako","govoriti bez zastajkivanja"]}'::jsonb,
    explanation = 'Izraz „sipati kao iz rukava” znači govoriti lako, tečno i bez zastajkivanja.'
where id = 'e3a39603-6e53-4942-87f0-22c94dfced81';

update public.questions
set explanation = case id
  when 'b5122adb-9465-4fe6-8d41-758ed592ad8e' then 'Izraz „pao mi je kamen sa srca” znači da sam osetio veliko olakšanje.'
  when '568f9ddc-3baa-4653-89a4-38dafe824940' then 'Izraz „pao mi je mrak na oči” znači da sam se veoma naljutio.'
  when '2352fa54-deab-46cd-96a1-12976f672fb0' then 'Izraz „srce mi je sišlo u pete” znači da sam se veoma uplašio.'
end
where id in (
  'b5122adb-9465-4fe6-8d41-758ed592ad8e',
  '568f9ddc-3baa-4653-89a4-38dafe824940',
  '2352fa54-deab-46cd-96a1-12976f672fb0'
);
