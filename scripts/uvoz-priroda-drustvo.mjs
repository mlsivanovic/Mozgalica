import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PRIRODA_DRUSTVO_BANKA } from '../src/data/prirodaDrustvoBanka.ts'

export function napraviSqlUvoza(primeni = false) {
  const payload = JSON.stringify(PRIRODA_DRUSTVO_BANKA).replaceAll("'", "''")
  return `begin;
create temporary table pid_uvoz on commit drop as
select * from jsonb_to_recordset('${payload}'::jsonb) as q(
  "topicSlug" text, type text, difficulty smallint, text text, options jsonb,
  correct jsonb, explanation text, hint text, points int, source text,
  gen_signature text, manual_review boolean
);
do $$
declare
  v_owner uuid;
  v_broj int;
begin
  select count(distinct q.owner_id) into v_broj
  from public.questions q join public.admin_settings a on a.user_id = q.owner_id;
  if v_broj <> 1 then
    raise exception 'Uvoz zahteva tačno jednog administratorskog vlasnika postojeće banke; pronađeno: %', v_broj;
  end if;
  select distinct q.owner_id into strict v_owner
  from public.questions q join public.admin_settings a on a.user_id = q.owner_id;

  if exists (
    select 1 from pid_uvoz u left join public.topics t on t.slug = u."topicSlug"
    where t.id is null or t.subject <> 'priroda_drustvo' or t.grade not in (3, 4) or t.grade <> right(u."topicSlug", 1)::int
  ) then
    raise exception 'Nedostaju odgovarajuće oblasti prirode i društva za 3. i 4. razred.';
  end if;

  if (select count(*) from pid_uvoz) <> 300
    or (select count(distinct gen_signature) from pid_uvoz) <> 300
    or (select count(distinct "topicSlug") from pid_uvoz) <> 10
    or exists (select 1 from pid_uvoz group by "topicSlug" having count(*) <> 30)
  then
    raise exception 'Banka mora sadržati 300 jedinstvenih pitanja, po 30 u 10 oblasti.';
  end if;

  if exists (
    select 1 from pid_uvoz u
    where public.fn_grade_answer(u.type, u.correct, u.correct) is distinct from true
      or public.fn_grade_answer(u.type, u.correct, null) is distinct from false
      or public.fn_grade_answer(u.type, u.correct, '{}'::jsonb) is distinct from false
      or public.fn_grade_answer(u.type, u.correct, case u.type
        when 'single' then jsonb_build_object('optionId', (
          select o->>'id' from jsonb_array_elements(u.options) o
          where o->>'id' <> u.correct->>'optionId' limit 1
        ))
        when 'truefalse' then jsonb_build_object('value', not (u.correct->>'value')::boolean)
        when 'matching' then jsonb_build_object('pairs',
          (u.correct->'pairs') || jsonb_build_object('l0',u.correct->'pairs'->>'l1','l1',u.correct->'pairs'->>'l0'))
      end) is distinct from false
  ) then
    raise exception 'Serverska provera tačnih, pogrešnih ili praznih odgovora nije prošla.';
  end if;

  if exists (
    select 1 from pid_uvoz u
    join public.topics t on t.slug = u."topicSlug"
    join public.questions q on q.owner_id = v_owner and q.topic_id = t.id
      and q.type = u.type
      and lower(regexp_replace(trim(q.text), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(u.text), '\\s+', ' ', 'g'))
    where q.gen_signature is distinct from u.gen_signature
  ) then
    raise exception 'U banci već postoji pitanje sa istim tekstom i drugim potpisom.';
  end if;

  insert into public.questions (
    owner_id, topic_id, type, difficulty, text, options, correct, explanation,
    hint, points, source, gen_signature, manual_review
  )
  select v_owner, t.id, u.type, u.difficulty, u.text, u.options, u.correct,
    u.explanation, u.hint, u.points, u.source, u.gen_signature, u.manual_review
  from pid_uvoz u join public.topics t on t.slug = u."topicSlug"
  on conflict (owner_id, gen_signature) where gen_signature is not null do nothing;

  -- Postojeće ručne izmene se ne prepisuju; neslaganje prekida ceo uvoz.
  if exists (
    select 1 from pid_uvoz u
    join public.topics t on t.slug = u."topicSlug"
    left join public.questions q on q.owner_id = v_owner and q.gen_signature = u.gen_signature
    where q.id is null or row(q.topic_id,q.type,q.difficulty,q.text,q.options,q.correct,q.explanation,q.hint,q.points,q.source,q.manual_review)
      is distinct from row(t.id,u.type,u.difficulty,u.text,u.options,u.correct,u.explanation,u.hint,u.points,u.source,u.manual_review)
  ) then
    raise exception 'Postojeće pitanje se razlikuje od verzionisane banke; ništa nije prepisano.';
  end if;
end;
$$;
${primeni ? 'commit' : 'rollback'};
select '${primeni ? 'Uvoz potvrđen' : 'Provera završena bez trajnog upisa'}' as rezultat;
`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opcija = process.argv[2] ?? '--dry-run'
  if (!['--dry-run', '--apply', '--sql'].includes(opcija) || process.argv.length > 3) {
    throw new Error('Upotreba: node scripts/uvoz-priroda-drustvo.mjs [--dry-run|--apply|--sql]')
  }
  const sql = napraviSqlUvoza(opcija === '--apply')
  if (opcija === '--sql') process.stdout.write(sql)
  else {
    const folder = mkdtempSync(join(tmpdir(), 'mozgalica-pid-'))
    try {
      // Skup je veći od dozvoljene dužine jednog argumenta procesa na Linux-u.
      const fajl = join(folder, 'uvoz.sql')
      writeFileSync(fajl, sql, { mode: 0o600 })
      const rezultat = spawnSync('supabase', ['db', 'query', '--linked', '-f', fajl], {
        cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 2 ** 20,
      })
      process.stdout.write(rezultat.stdout ?? '')
      process.stderr.write(rezultat.stderr ?? '')
      if (rezultat.error) process.stderr.write(rezultat.error.message + '\n')
      process.exitCode = rezultat.status ?? 1
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  }
}
