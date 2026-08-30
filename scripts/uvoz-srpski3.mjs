import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { SRPSKI3_BANKA } from '../src/data/srpski3Banka.ts'

export function napraviSqlUvoza(primeni = false) {
  const payload = JSON.stringify(SRPSKI3_BANKA).replaceAll("'", "''")
  return `begin;
create temporary table srpski3_uvoz on commit drop as
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
  from public.questions q join public.topics t on t.id = q.topic_id
  where t.subject = 'srpski' and t.grade = 3;
  if v_broj <> 1 then
    raise exception 'Uvoz zahteva tačno jednog vlasnika postojeće srpske banke 3. razreda; pronađeno: %', v_broj;
  end if;
  select distinct q.owner_id into strict v_owner
  from public.questions q join public.topics t on t.id = q.topic_id
  where t.subject = 'srpski' and t.grade = 3;

  if exists (
    select 1 from srpski3_uvoz u left join public.topics t on t.slug = u."topicSlug"
    where t.id is null or t.subject <> 'srpski' or t.grade <> 3
  ) then
    raise exception 'Nedostaju oblasti srpskog za 3. razred.';
  end if;

  insert into public.questions (
    owner_id, topic_id, type, difficulty, text, options, correct, explanation,
    hint, points, source, gen_signature, manual_review
  )
  select v_owner, t.id, u.type, u.difficulty, u.text, u.options, u.correct,
    u.explanation, u.hint, u.points, u.source, u.gen_signature, u.manual_review
  from srpski3_uvoz u join public.topics t on t.slug = u."topicSlug"
  on conflict (owner_id, gen_signature) where gen_signature is not null do nothing;

  if exists (
    select 1 from srpski3_uvoz u
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
    throw new Error('Upotreba: node scripts/uvoz-srpski3.mjs [--dry-run|--apply|--sql]')
  }
  const sql = napraviSqlUvoza(opcija === '--apply')
  if (opcija === '--sql') process.stdout.write(sql)
  else {
    const tmp = `/tmp/uvoz-srpski3-${opcija === '--apply' ? 'apply' : 'dry'}.sql`
    writeFileSync(tmp, sql)
    const rezultat = spawnSync('supabase', ['db', 'query', '--linked', '-f', tmp], {
      cwd: new URL('..', import.meta.url), encoding: 'utf8', maxBuffer: 2 ** 20,
    })
    process.stdout.write(rezultat.stdout ?? '')
    process.stderr.write(rezultat.stderr ?? '')
    if (rezultat.error) process.stderr.write(rezultat.error.message + '\n')
    process.exitCode = rezultat.status ?? 1
  }
}
