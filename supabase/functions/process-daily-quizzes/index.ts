import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generisi, podrzaneOblasti } from '../../../src/generator/index.ts'
import { napraviRng, promesaj } from '../../../src/generator/random.ts'
import type { GenerisanoPitanje } from '../../../src/generator/types.ts'
import {
  napraviPametniPlan, type StavkaPametneVezbe, type TemaPametneVezbe,
} from '../../../src/lib/pametnaVezba.ts'
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
  smart_mode: boolean
  local_date: string
  used_question_keys: string[]
}

interface TemaPametneVezbeIzBaze {
  topic_id: string
  topic_slug: string
  topic_name: string
  answers_count: number
  success_pct: number | null
  last_answered_at: string | null
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
    (rad.smart_mode || rad.difficulty == null || pitanje.difficulty === rad.difficulty)
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
  difficulty = rad.difficulty ?? 3,
): GenerisanoPitanje[] {
  const konfiguracija = {
    topicSlug,
    difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
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

function generisiPitanja(
  rad: DnevniRad,
  seed: number,
  pametniPlan: StavkaPametneVezbe[] | null,
): GenerisanoPitanje[] {
  const prethodni = new Set(rad.used_question_keys)
  const plan = pametniPlan ?? napraviPlanOblastiKviza(
    rad.topic_slugs, rad.question_count, PODRZANI_GENERATORI, 'generator',
  ).map((stavka) => ({ ...stavka, difficulty: rad.difficulty ?? 3 }))
  const sva = plan.flatMap((stavka, indeks) => generisiZaOblast(
    rad, stavka.topicSlug, stavka.questionCount, seed, indeks, prethodni, stavka.difficulty,
  ))
  return promesaj(napraviRng(seed + 2000), sva)
}

async function ucitajPametniPlan(
  supabase: ReturnType<typeof createClient>,
  rad: DnevniRad,
): Promise<StavkaPametneVezbe[] | null> {
  if (!rad.smart_mode) return null
  const { data, error } = await supabase.rpc('get_smart_daily_quiz_topics', {
    p_schedule_id: rad.schedule_id,
  })
  if (error) throw new Error(error.message)
  const teme = ((data ?? []) as TemaPametneVezbeIzBaze[]).map((tema): TemaPametneVezbe => ({
    topicId: tema.topic_id,
    topicSlug: tema.topic_slug,
    topicName: tema.topic_name,
    answersCount: tema.answers_count,
    successPct: tema.success_pct,
    lastAnsweredAt: tema.last_answered_at,
  }))
  const plan = napraviPametniPlan(teme, rad.question_count, rad.difficulty)
  if (plan.length === 0) throw new Error('Pametna vežba nema dostupne oblasti.')
  return plan
}

function izaberiPametnaPitanjaIzBanke(
  pitanja: PitanjeIzBanke[],
  plan: StavkaPametneVezbe[],
  prethodniKljucevi: readonly string[],
  seed: number,
): PitanjeIzBanke[] {
  const izabrana: PitanjeIzBanke[] = []
  for (let indeks = 0; indeks < plan.length; indeks++) {
    const stavka = plan[indeks]
    const kandidati = pitanja.filter((pitanje) => pitanje.topic_id === stavka.topicId)
    const tacnaTezina = kandidati.filter((pitanje) => pitanje.difficulty === stavka.difficulty)
    const prethodni = [...prethodniKljucevi, ...izabrana.map((pitanje) => pitanje.id)]
    const prvo = izaberiIzBanke(tacnaTezina, prethodni, stavka.questionCount, seed + indeks)
    const nedostaje = stavka.questionCount - prvo.length
    if (nedostaje <= 0) {
      izabrana.push(...prvo)
      continue
    }
    const vecIzabrani = new Set([...izabrana, ...prvo].map((pitanje) => pitanje.id))
    const dopuna = izaberiIzBanke(
      kandidati.filter((pitanje) => !vecIzabrani.has(pitanje.id)),
      [...prethodni, ...prvo.map((pitanje) => pitanje.id)],
      nedostaje,
      seed + 1000 + indeks,
    )
    izabrana.push(...prvo, ...dopuna)
  }
  return izabrana
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
  const pametniPlan = await ucitajPametniPlan(supabase, rad)
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
    const pitanjaIzBanke = await ucitajPitanjaIzBanke(supabase, rad)
    const izabrana = pametniPlan
      ? izaberiPametnaPitanjaIzBanke(pitanjaIzBanke, pametniPlan, rad.used_question_keys, seed)
      : izaberiIzBanke(pitanjaIzBanke, rad.used_question_keys, rad.question_count, seed)
    if (izabrana.length === 0) {
      throw new Error('Nema pitanja u banci za izabrane oblasti, težinu i tip.')
    }
    if (pametniPlan && izabrana.length < rad.question_count) {
      throw new Error(`Pametna vežba je pronašla ${izabrana.length} od potrebnih ${rad.question_count} pitanja u banci.`)
    }
    snapshot = izabrana.map((pitanje, position) => ({
      ...snapshotIzBanke(pitanje, mapaPoId.get(pitanje.topic_id) ?? {
        id: pitanje.topic_id, slug: 'oblast', name: 'Oblast',
      }),
      position,
    }))
    kljucevi = izabrana.map((pitanje) => pitanje.id)
  } else if (rad.source === 'generator') {
    const generisana = generisiPitanja(rad, seed, pametniPlan)
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
    const plan = pametniPlan
      ? pametniPlan.map((stavka) => ({
        ...stavka,
        source: PODRZANI_GENERATORI.has(stavka.topicSlug) ? 'generator' as const : 'bank' as const,
      }))
      : napraviPlanOblastiKviza(
        rad.topic_slugs, rad.question_count, PODRZANI_GENERATORI, 'combined',
      ).map((stavka) => ({ ...stavka, difficulty: rad.difficulty ?? 3 }))
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
          planirana.difficulty,
        )
        if (pitanja.length < planirana.questionCount) {
          throw new Error(`Generator za oblast „${tema.name}“ napravio je ${pitanja.length} od potrebnih ${planirana.questionCount} pitanja.`)
        }
        stavke.push(...pitanja.map((pitanje) => ({
          snapshot: snapshotIzGeneratora(pitanje, tema), key: pitanje.signature,
        })))
        continue
      }

      const kandidatiZaTemu = pitanjaIzBanke.filter((pitanje) => pitanje.topic_id === tema.id)
      const kandidatiTacneTezine = kandidatiZaTemu.filter((pitanje) => pitanje.difficulty === planirana.difficulty)
      const izabrana = izaberiIzBanke(
        kandidatiTacneTezine.length >= planirana.questionCount ? kandidatiTacneTezine : kandidatiZaTemu,
        [...rad.used_question_keys, ...stavke.map((stavka) => stavka.key)],
        planirana.questionCount, seed + indeks,
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
  const { data: izvestaji, error: greskaIzvestaja } = await supabase.rpc(
    'process_due_smart_weekly_reports', { p_limit: 50 },
  )
  return Response.json({
    obradjeno: ishodi.length,
    ishodi,
    nedeljniIzvestaji: izvestaji ?? 0,
    greskaIzvestaja: greskaIzvestaja?.message ?? null,
  })
})
