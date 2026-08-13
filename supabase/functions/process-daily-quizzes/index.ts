import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generisi, podrzaneOblasti } from '../../../src/generator/index.ts'
import { napraviRng, promesaj } from '../../../src/generator/random.ts'
import type { GenerisanoPitanje } from '../../../src/generator/types.ts'
import { napraviPlanOblastiKviza } from '../../../src/lib/raspodelaKviza.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Izvor = 'generator' | 'bank' | 'combined'

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

interface Tema {
  id: string
  slug: string
  name: string
}

type SnapshotBezPozicije = Omit<SnapshotPitanje, 'position'>

const PODRZANI_GENERATORI = new Set(podrzaneOblasti())

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

function generisiZaOblast(
  rad: DnevniRad,
  topicSlug: string,
  count: number,
  seed: number,
  indeks: number,
  prethodni: Set<string>,
): GenerisanoPitanje[] {
  const konfiguracija = {
    topicSlug,
    difficulty: (rad.difficulty ?? 3) as 1 | 2 | 3 | 4 | 5,
    count,
    type: (rad.question_type ?? 'auto') as 'auto' | 'single' | 'multi' | 'numeric' | 'text' | 'truefalse' | 'matching',
    wordProblems: false,
    allowRepeats: false,
    seed: seed + indeks,
    excludedSignatures: prethodni,
  }
  let pitanja = generisi(konfiguracija).questions

  // Kada je mali prostor zadataka već iskorišćen, dopuni kviz postojećim
  // kombinacijama, ali i dalje bez duplikata unutar istog dnevnog kviza.
  if (pitanja.length < count) {
    const dopuna = generisi({ ...konfiguracija, excludedSignatures: undefined, seed: seed + 1000 + indeks }).questions
    const vidjena = new Set(pitanja.map((p) => p.signature))
    pitanja = [...pitanja, ...dopuna.filter((p) => !vidjena.has(p.signature))].slice(0, count)
  }
  pitanja.forEach((pitanje) => prethodni.add(pitanje.signature))
  return pitanja
}

function generisiPitanja(rad: DnevniRad, seed: number): GenerisanoPitanje[] {
  const prethodni = new Set(rad.used_question_keys)
  const plan = napraviPlanOblastiKviza(
    rad.topic_slugs, rad.question_count, PODRZANI_GENERATORI, 'generator',
  )
  const sva = plan.flatMap((stavka, indeks) => generisiZaOblast(
    rad, stavka.topicSlug, stavka.questionCount, seed, indeks, prethodni,
  ))
  return promesaj(napraviRng(seed + 2000), sva)
}

function snapshotIzBanke(pitanje: PitanjeIzBanke, tema: Tema): SnapshotBezPozicije {
  return {
    source_question_id: pitanje.id,
    topic_id: pitanje.topic_id,
    topic_name: tema.name,
    type: pitanje.type,
    text: pitanje.text,
    options: pitanje.options,
    correct: pitanje.correct,
    explanation: pitanje.explanation,
    hint: pitanje.hint,
    points: pitanje.points,
    manual_review: pitanje.manual_review,
  }
}

function snapshotIzGeneratora(pitanje: GenerisanoPitanje, tema: Tema): SnapshotBezPozicije {
  return {
    source_question_id: null,
    topic_id: tema.id,
    topic_name: tema.name,
    type: pitanje.type,
    text: pitanje.text,
    options: pitanje.options,
    correct: pitanje.correct,
    explanation: pitanje.explanation || null,
    hint: pitanje.hint,
    points: pitanje.points,
    manual_review: false,
  }
}

async function obradi(rad: DnevniRad, supabase: ReturnType<typeof createClient>) {
  const seed = await seedZa(rad)
  let snapshot: SnapshotPitanje[]
  let kljucevi: string[]
  const { data: teme, error: greskaTema } = await supabase
    .from('topics')
    .select('id, slug, name')
    .in('id', rad.topic_ids)
  if (greskaTema) throw new Error(greskaTema.message)
  const mapaPoId = new Map((teme ?? []).map((tema) => [tema.id as string, tema as Tema]))
  const mapaPoSlugu = new Map((teme ?? []).map((tema) => [tema.slug as string, tema as Tema]))

  if (rad.source === 'bank') {
    const izabrana = izaberiIzBanke(
      await ucitajPitanjaIzBanke(supabase, rad), rad.used_question_keys, rad.question_count, seed,
    )
    if (izabrana.length === 0) {
      throw new Error('Nema pitanja u banci za izabrane oblasti, težinu i tip.')
    }
    snapshot = izabrana.map((pitanje, position) => ({
      ...snapshotIzBanke(pitanje, mapaPoId.get(pitanje.topic_id) ?? {
        id: pitanje.topic_id, slug: 'oblast', name: 'Oblast',
      }),
      position,
    }))
    kljucevi = izabrana.map((pitanje) => pitanje.id)
  } else if (rad.source === 'generator') {
    const generisana = generisiPitanja(rad, seed)
    if (generisana.length < rad.question_count) {
      throw new Error(`Generator je napravio ${generisana.length} od potrebnih ${rad.question_count} pitanja.`)
    }
    snapshot = generisana.map((pitanje, position) => {
      const tema = mapaPoSlugu.get(pitanje.topicSlug)
      if (!tema) throw new Error(`Oblast „${pitanje.topicSlug}“ nije pronađena.`)
      return { ...snapshotIzGeneratora(pitanje, tema), position }
    })
    kljucevi = generisana.map((pitanje) => pitanje.signature)
  } else {
    const plan = napraviPlanOblastiKviza(
      rad.topic_slugs, rad.question_count, PODRZANI_GENERATORI, 'combined',
    )
    const pitanjaIzBanke = await ucitajPitanjaIzBanke(supabase, rad)
    const prethodni = new Set(rad.used_question_keys)
    const stavke: Array<{ snapshot: SnapshotBezPozicije; key: string }> = []

    for (let indeks = 0; indeks < plan.length; indeks++) {
      const planirana = plan[indeks]
      const tema = mapaPoSlugu.get(planirana.topicSlug)
      if (!tema) throw new Error(`Oblast „${planirana.topicSlug}“ nije pronađena.`)

      if (planirana.source === 'generator') {
        const pitanja = generisiZaOblast(
          rad, planirana.topicSlug, planirana.questionCount, seed, indeks, prethodni,
        )
        if (pitanja.length < planirana.questionCount) {
          throw new Error(`Generator za oblast „${tema.name}“ napravio je ${pitanja.length} od potrebnih ${planirana.questionCount} pitanja.`)
        }
        stavke.push(...pitanja.map((pitanje) => ({
          snapshot: snapshotIzGeneratora(pitanje, tema), key: pitanje.signature,
        })))
        continue
      }

      const kandidati = pitanjaIzBanke.filter((pitanje) => pitanje.topic_id === tema.id)
      const izabrana = izaberiIzBanke(
        kandidati, rad.used_question_keys, planirana.questionCount, seed + indeks,
      )
      if (izabrana.length < planirana.questionCount) {
        throw new Error(`U banci za oblast „${tema.name}“ pronađeno je ${izabrana.length} od potrebnih ${planirana.questionCount} pitanja.`)
      }
      stavke.push(...izabrana.map((pitanje) => ({
        snapshot: snapshotIzBanke(pitanje, tema), key: pitanje.id,
      })))
    }

    const promesane = promesaj(napraviRng(seed + 2000), stavke)
    snapshot = promesane.map((stavka, position) => ({ ...stavka.snapshot, position }))
    kljucevi = promesane.map((stavka) => stavka.key)
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
