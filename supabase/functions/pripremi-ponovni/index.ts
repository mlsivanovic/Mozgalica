// Priprema ponovnog pokušaja netačnih zadataka bez generatora u klijentu.
// Klijent šalje samo token pokušaja; server čita netačna pitanja iz snapshot-a,
// generiše nove verzije istim generatorom i tek onda poziva start_retry. Tako
// tačni odgovori novih pitanja više ne prolaze kroz pregledač ni native klijent.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generisiPonovne } from '../../../src/lib/ponovni.ts'
import type { OpcijeJson, TacanOdgovor, TipPitanja } from '../../../src/types/db.ts'
import type { RezultatPitanja } from '../../../src/types/kviz.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function json(telo: unknown, status = 200): Response {
  return Response.json(telo, { status, headers: CORS })
}

function greska(kod: string, status = 200): Response {
  return json({ ok: false, error: kod }, status)
}

interface PokusajRed {
  id: string
  status: string
  review_pending: boolean | null
  incorrect_count: number | null
  retry_submitted_at: string | null
  explanations_seen_at: string | null
}

interface PitanjeRed {
  id: string
  position: number
  type: TipPitanja
  text: string
  options: OpcijeJson
  points: number
  correct: TacanOdgovor
  explanation: string | null
  topic_id: string | null
}

interface TemaRed {
  id: string
  slug: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return greska('method_not_allowed', 405)

  let telo: { attemptToken?: unknown }
  try {
    telo = await req.json()
  } catch {
    return greska('bad_request', 400)
  }
  const attemptToken = typeof telo.attemptToken === 'string' ? telo.attemptToken.trim() : ''
  if (!attemptToken || attemptToken.length > 200) return greska('bad_request', 400)

  const { data: pokusaj, error: greskaPokusaja } = await admin
    .from('attempts')
    .select('id, status, review_pending, incorrect_count, retry_submitted_at, explanations_seen_at')
    .eq('attempt_token', attemptToken)
    .maybeSingle<PokusajRed>()

  if (greskaPokusaja) return greska('server', 500)
  if (!pokusaj) return greska('not_found')
  if (pokusaj.status !== 'submitted') return greska('not_submitted')
  if (pokusaj.review_pending) return greska('pending_review')
  if (pokusaj.retry_submitted_at) return greska('already_locked')
  if (!pokusaj.explanations_seen_at) return greska('explanations_not_seen')
  if ((pokusaj.incorrect_count ?? 0) <= 0) return greska('no_incorrect')

  const { count: postojeciRetry, error: greskaRetry } = await admin
    .from('attempt_retry_questions')
    .select('id', { count: 'exact', head: true })
    .eq('attempt_id', pokusaj.id)
  if (greskaRetry) return greska('server', 500)
  if ((postojeciRetry ?? 0) > 0) return greska('already_started')

  const { data: netacniRedovi, error: greskaNetacnih } = await admin
    .from('attempt_answers')
    .select('quiz_question_id')
    .eq('attempt_id', pokusaj.id)
    .eq('is_correct', false)

  if (greskaNetacnih) return greska('server', 500)
  const netacniIds = (netacniRedovi ?? []).map((red) => red.quiz_question_id as string)
  if (netacniIds.length === 0 || netacniIds.length !== pokusaj.incorrect_count) {
    return greska('bad_state')
  }

  const { data: pitanjaRedovi, error: greskaPitanja } = await admin
    .from('quiz_questions')
    .select('id, position, type, text, options, points, correct, explanation, topic_id')
    .in('id', netacniIds)
    .order('position')

  if (greskaPitanja) return greska('server', 500)
  const pitanja = (pitanjaRedovi ?? []) as PitanjeRed[]
  if (pitanja.length !== netacniIds.length) return greska('bad_state')

  const topicIds = [...new Set(pitanja.map((p) => p.topic_id).filter((id): id is string => !!id))]
  const teme = new Map<string, string>()
  if (topicIds.length > 0) {
    const { data: temeRedovi, error: greskaTema } = await admin
      .from('topics')
      .select('id, slug')
      .in('id', topicIds)
    if (greskaTema) return greska('server', 500)
    for (const tema of (temeRedovi ?? []) as TemaRed[]) teme.set(tema.id, tema.slug)
  }

  // Oblik koji očekuje generisiPonovne — isti kao RezultatPitanja iz submit_attempt.
  const netacna = pitanja.map((p) => ({
    id: p.id,
    type: p.type,
    text: p.text,
    options: p.options,
    points: p.points,
    answer: null,
    isCorrect: false,
    awardedPoints: 0,
    correct: p.correct,
    explanation: p.explanation,
    topicSlug: p.topic_id ? (teme.get(p.topic_id) ?? null) : null,
  })) as unknown as RezultatPitanja[]

  let ponovna: ReturnType<typeof generisiPonovne>
  try {
    ponovna = generisiPonovne(netacna)
  } catch {
    return greska('generation_failed', 500)
  }
  if (ponovna.length !== netacna.length) return greska('generation_failed', 500)

  const { data, error } = await admin.rpc('start_retry', {
    p_attempt_token: attemptToken,
    p_questions: ponovna,
  })
  if (error) return greska('server', 500)
  return json(data)
})
