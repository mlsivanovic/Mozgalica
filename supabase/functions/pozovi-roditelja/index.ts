// Poziv novog roditelja. Samo vlasnik platforme sme da pozove. Email se upisuje u
// admin_allowlist (idempotentno, malim slovima), pa se šalje Supabase Auth pozivnica.
// Magic link u aplikaciji ne pravi naloge (shouldCreateUser: false), pa su nalozi
// isključivo rezultat ovog poziva.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://mozgalica.rs/app/'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const EMAIL_OBLIK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOZVOLJENI_RAZREDI = [2, 3, 4, 5] as const
const DOZVOLJENI_PREDMETI = ['matematika', 'srpski', 'priroda_drustvo'] as const
const RAZREDI_PO_PREDMETU: Record<(typeof DOZVOLJENI_PREDMETI)[number], readonly number[]> = {
  matematika: [2, 3, 4, 5],
  srpski: [2, 3, 4, 5],
  priroda_drustvo: [3, 4],
}

type DozvoljenRazred = (typeof DOZVOLJENI_RAZREDI)[number]
type DozvoljenPredmet = (typeof DOZVOLJENI_PREDMETI)[number]

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function json(telo: unknown, status = 200): Response {
  return Response.json(telo, { status, headers: CORS })
}

function greska(kod: string, status: number): Response {
  return json({ ok: false, error: kod }, status)
}

function emailJeIspravan(email: string): boolean {
  return email.length >= 3 && email.length <= 254 && EMAIL_OBLIK.test(email)
}

function parsirajRazrede(ulaz: unknown): DozvoljenRazred[] | null {
  if (!Array.isArray(ulaz)) return null
  const skup = new Set<DozvoljenRazred>()
  for (const stavka of ulaz) {
    if (typeof stavka !== 'number' || !DOZVOLJENI_RAZREDI.includes(stavka as DozvoljenRazred)) {
      return null
    }
    skup.add(stavka as DozvoljenRazred)
  }
  const rezultat = DOZVOLJENI_RAZREDI.filter((r) => skup.has(r))
  return rezultat.length > 0 ? rezultat : null
}

function parsirajPredmete(ulaz: unknown): DozvoljenPredmet[] | null {
  if (!Array.isArray(ulaz)) return null
  const skup = new Set<DozvoljenPredmet>()
  for (const stavka of ulaz) {
    if (typeof stavka !== 'string' || !DOZVOLJENI_PREDMETI.includes(stavka as DozvoljenPredmet)) {
      return null
    }
    skup.add(stavka as DozvoljenPredmet)
  }
  const rezultat = DOZVOLJENI_PREDMETI.filter((p) => skup.has(p))
  return rezultat.length > 0 ? rezultat : null
}

function pristupImaBarJednuKombinaciju(razredi: DozvoljenRazred[], predmeti: DozvoljenPredmet[]): boolean {
  return predmeti.some((p) => RAZREDI_PO_PREDMETU[p].some((r) => razredi.includes(r as DozvoljenRazred)))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return greska('method_not_allowed', 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return greska('unauthorized', 401)

  const { data: korisnik, error: greskaKorisnika } = await admin.auth.getUser(token)
  if (greskaKorisnika || !korisnik.user) return greska('unauthorized', 401)

  const { data: podesavanja, error: greskaPodesavanja } = await admin
    .from('admin_settings')
    .select('is_platform_owner')
    .eq('user_id', korisnik.user.id)
    .maybeSingle()
  if (greskaPodesavanja) return greska('server', 500)
  if (!podesavanja?.is_platform_owner) return greska('forbidden', 403)

  let telo: { email?: unknown; allowedGrades?: unknown; allowedSubjects?: unknown }
  try {
    telo = await req.json()
  } catch {
    return greska('bad_request', 400)
  }
  const email = typeof telo.email === 'string' ? telo.email.trim().toLowerCase() : ''
  if (!emailJeIspravan(email)) return greska('invalid_email', 400)

  const allowedGrades = telo.allowedGrades === undefined && telo.allowedSubjects === undefined
    ? [...DOZVOLJENI_RAZREDI]
    : parsirajRazrede(telo.allowedGrades)
  const allowedSubjects = telo.allowedGrades === undefined && telo.allowedSubjects === undefined
    ? [...DOZVOLJENI_PREDMETI]
    : parsirajPredmete(telo.allowedSubjects)

  if (!allowedGrades || !allowedSubjects || !pristupImaBarJednuKombinaciju(allowedGrades, allowedSubjects)) {
    return greska('invalid_access', 400)
  }

  const { data: postojeciId, error: greskaTrazenja } = await admin.rpc('fn_naloga_po_mejlu', { p_email: email })
  if (greskaTrazenja) return greska('server', 500)

  if (postojeciId) {
    const { data: postojeciPodesavanja, error: erPostojeci } = await admin
      .from('admin_settings')
      .select('is_platform_owner')
      .eq('user_id', postojeciId)
      .maybeSingle()
    if (erPostojeci) return greska('server', 500)
    if (postojeciPodesavanja?.is_platform_owner || postojeciId === korisnik.user.id) {
      return greska('owner_self', 400)
    }
  }

  const { error: greskaAllowlist } = await admin
    .from('admin_allowlist')
    .upsert(
      { email, allowed_grades: allowedGrades, allowed_subjects: allowedSubjects },
      { onConflict: 'email' },
    )
  if (greskaAllowlist) return greska('server', 500)

  if (postojeciId) {
    // Nalog već postoji: obezbeđuju se administratorska prava i ažurira nivo pristupa, bez novog mejla.
    const { error: greskaAktivacije } = await admin.rpc('fn_aktiviraj_roditelja', {
      p_user_id: postojeciId,
      p_grades: allowedGrades,
      p_subjects: allowedSubjects,
    })
    if (greskaAktivacije) return greska('server', 500)
    return json({ ok: true, status: 'vec_postoji' })
  }

  const { error: greskaPozivnice } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: APP_BASE_URL,
  })
  if (greskaPozivnice) {
    // Nalog je mogao nastati između provere i poziva.
    if (greskaPozivnice.code === 'email_exists' || /already/i.test(greskaPozivnice.message)) {
      const { data: naknadniId } = await admin.rpc('fn_naloga_po_mejlu', { p_email: email })
      if (naknadniId) {
        await admin.rpc('fn_aktiviraj_roditelja', {
          p_user_id: naknadniId,
          p_grades: allowedGrades,
          p_subjects: allowedSubjects,
        })
      }
      return json({ ok: true, status: 'vec_postoji' })
    }
    return greska('invite_failed', 502)
  }

  return json({ ok: true, status: 'pozivnica_poslata' })
})
