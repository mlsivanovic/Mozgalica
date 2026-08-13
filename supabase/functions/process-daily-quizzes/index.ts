import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generisi } from '../../../src/generator/index.ts'
import { napraviRng, promesaj } from '../../../src/generator/random.ts'
import type { GenerisanoPitanje } from '../../../src/generator/types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Izvor = 'generator' | 'bank'

interface DnevniRad {
  run_id: string
  schedule_id: string
  owner_id: string
  child_profile_id: string
  child_name: string
  subject: 'matematika' | 'srpski'
  grade: 3 | 4
  source: Izvor
  topic_ids: string[]
  topic_slugs: string[]
  difficulty: number | null
  question_type: string | null
  question_count: number
  time_limit_seconds: number | null
  shuffle_questions: boolean
  shuffle_answers: boolean
  pass_threshold_pct: number
  local_date: string
  used_question_keys: string[]
}

interface PitanjeIzBanke {
  id: string
  topic_id: string
  type: string
  difficulty: number
  text: string
  options: unknown
  correct: unknown
  explanation: string | null
  hint: string | null
  points: number
  manual_review: boolean
}

interface SnapshotPitanje {
  source_question_id: string | null
  position: number
  topic_id: string | null
  topic_name: string
  type: string
  text: string
  options: unknown
  correct: unknown
  explanation: string | null
  hint: string | null
  points: number
  manual_review: boolean
}

function odgovor(tekst: string, status = 200) {
  return new Response(JSON.stringify(tekst), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function seedZa(rad: DnevniRad): Promise<number> {
  const bytes = new TextEncoder().encode(`${rad.schedule_id}:${rad.local_date}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return new DataView(hash).getUint32(0)
}

async function ucitajPitanjaIzBanke(
  supabase: ReturnType<typeof createClient>,
  rad: DnevniRad,
): Promise<PitanjeIzBanke[]> {
  const sva: PitanjeIzBanke[] = []
  const velicinaStrane = 1000
  for (let od = 0; ; od += velicinaStrane) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, topic_id, type, difficulty, text, options, correct, explanation, hint, points, manual_review')
      .eq('owner_id', rad.owner_id)
      .in('topic_id', rad.topic_ids)
      .range(od, od + velicinaStrane - 1)
    if (error) throw new Error(error.message)
    const strana = (data ?? []) as PitanjeIzBanke[]
    sva.push(...strana)
    if (strana.length < velicinaStrane) break
  }

  return sva.filter((pitanje) =>
    (rad.difficulty == null || pitanje.difficulty === rad.difficulty)
    && (rad.question_type == null || pitanje.type === rad.question_type),
  )
}

function izaberiIzBanke(
  pitanja: PitanjeIzBanke[],
  prethodniKljucevi: readonly string[],
  broj: number,
  seed: number,
): PitanjeIzBanke[] {
  const ucestalost = new Map<string, number>()
  for (const kljuc of prethodniKljucevi) ucestalost.set(kljuc, (ucestalost.get(kljuc) ?? 0) + 1)
  const rng = napraviRng(seed)

  return pitanja
    .map((pitanje) => ({
      pitanje,
      korisceno: ucestalost.get(pitanje.id) ?? 0,
      redosled: rng(),
    }))
    .sort((a, b) => a.korisceno - b.korisceno || a.redosled - b.redosled || a.pitanje.id.localeCompare(b.pitanje.id))
    .slice(0, broj)
    .map(({ pitanje }) => pitanje)
}

function generisiPitanja(rad: DnevniRad, seed: number): GenerisanoPitanje[] {
  const prethodni = new Set(rad.used_question_keys)
  const sva: GenerisanoPitanje[] = []
  const brojOblasti = rad.topic_slugs.length
  if (brojOblasti === 0) return sva

  for (let indeks = 0; indeks < brojOblasti; indeks++) {
    const brojZaOblast = Math.floor(rad.question_count / brojOblasti)
      + (indeks < rad.question_count % brojOblasti ? 1 : 0)
    if (brojZaOblast === 0) continue

    const konfiguracija = {
      topicSlug: rad.topic_slugs[indeks],
      difficulty: (rad.difficulty ?? 3) as 1 | 2 | 3 | 4 | 5,
      count: brojZaOblast,
      type: (rad.question_type ?? 'auto') as 'auto' | 'single' | 'multi' | 'numeric' | 'text' | 'truefalse' | 'matching',
      wordProblems: false,
      allowRepeats: false,
      seed: seed + indeks,
      excludedSignatures: prethodni,
    }
    let pitanja = generisi(konfiguracija).questions

    // Kada je mali prostor zadataka već iskorišćen, dopuni kviz postojećim
    // kombinacijama, ali i dalje bez duplikata unutar istog dnevnog kviza.
    if (pitanja.length < brojZaOblast) {
      const dopuna = generisi({ ...konfiguracija, excludedSignatures: undefined, seed: seed + 1000 + indeks }).questions
      const vidjena = new Set(pitanja.map((p) => p.signature))
      pitanja = [...pitanja, ...dopuna.filter((p) => !vidjena.has(p.signature))].slice(0, brojZaOblast)
    }
    pitanja.forEach((pitanje) => prethodni.add(pitanje.signature))
    sva.push(...pitanja)
  }

  return promesaj(napraviRng(seed + 2000), sva)
}

async function obradi(rad: DnevniRad, supabase: ReturnType<typeof createClient>) {
  const seed = await seedZa(rad)
  let snapshot: SnapshotPitanje[]
  let kljucevi: string[]

  if (rad.source === 'bank') {
    const izabrana = izaberiIzBanke(
      await ucitajPitanjaIzBanke(supabase, rad), rad.used_question_keys, rad.question_count, seed,
    )
    if (izabrana.length === 0) {
      throw new Error('Nema pitanja u banci za izabrane oblasti, težinu i tip.')
    }
    const mapaOblasti = new Map(rad.topic_ids.map((id, indeks) => [id, rad.topic_slugs[indeks] ?? 'Oblast']))
    snapshot = izabrana.map((pitanje, position) => ({
      source_question_id: pitanje.id,
      position,
      topic_id: pitanje.topic_id,
      topic_name: mapaOblasti.get(pitanje.topic_id) ?? 'Oblast',
      type: pitanje.type,
      text: pitanje.text,
      options: pitanje.options,
      correct: pitanje.correct,
      explanation: pitanje.explanation,
      hint: pitanje.hint,
      points: pitanje.points,
      manual_review: pitanje.manual_review,
    }))
    kljucevi = izabrana.map((pitanje) => pitanje.id)
  } else {
    const generisana = generisiPitanja(rad, seed)
    if (generisana.length === 0) {
      throw new Error('Generator nije uspeo da napravi nijedno pitanje za izabrane oblasti.')
    }
    const { data: teme, error: greskaTema } = await supabase
      .from('topics')
      .select('id, slug, name')
      .in('id', rad.topic_ids)
    if (greskaTema) throw new Error(greskaTema.message)
    const mapaOblasti = new Map((teme ?? []).map((tema) => [tema.slug as string, tema]))
    snapshot = generisana.map((pitanje, position) => ({
      source_question_id: null,
      position,
      topic_id: mapaOblasti.get(pitanje.topicSlug)?.id ?? null,
      topic_name: mapaOblasti.get(pitanje.topicSlug)?.name ?? pitanje.topicSlug,
      type: pitanje.type,
      text: pitanje.text,
      options: pitanje.options,
      correct: pitanje.correct,
      explanation: pitanje.explanation || null,
      hint: pitanje.hint,
      points: pitanje.points,
      manual_review: false,
    }))
    kljucevi = generisana.map((pitanje) => pitanje.signature)
  }

  const { error } = await supabase.rpc('complete_daily_quiz_run', {
    p_run_id: rad.run_id,
    p_questions: snapshot,
    p_question_keys: kljucevi,
  })
  if (error) throw new Error(error.message)
  return snapshot.length
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return odgovor('Metoda nije dozvoljena.', 405)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data, error } = await supabase.rpc('claim_due_daily_quiz_runs', { p_limit: 20 })
  if (error) return odgovor(`Preuzimanje dnevnih kvizova nije uspelo: ${error.message}`, 500)

  const ishodi: Array<{ runId: string; pitanja?: number; error?: string }> = []
  for (const raw of (data ?? [])) {
    const rad = raw as DnevniRad
    try {
      ishodi.push({ runId: rad.run_id, pitanja: await obradi(rad, supabase) })
    } catch (e) {
      const poruka = String((e as Error).message ?? e)
      ishodi.push({ runId: rad.run_id, error: poruka })
      const { error: greskaUpisa } = await supabase.rpc('fail_daily_quiz_run', {
        p_run_id: rad.run_id,
        p_error: poruka,
      })
      if (greskaUpisa) console.error('Nije upisana greška dnevnog kviza:', greskaUpisa.message)
    }
  }
  return Response.json({ obradjeno: ishodi.length, ishodi })
})
