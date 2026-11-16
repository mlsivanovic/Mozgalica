// Poziv novog roditelja. Samo vlasnik platforme sme da pozove. Email se upisuje u
// admin_allowlist (idempotentno, malim slovima), pa se šalje Supabase Auth pozivnica.
// Magic link u aplikaciji ne pravi naloge (shouldCreateUser: false), pa su nalozi
// isključivo rezultat ovog poziva.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://mlsivanovic.github.io/Mozgalica/'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const EMAIL_OBLIK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  let telo: { email?: unknown }
  try {
    telo = await req.json()
  } catch {
    return greska('bad_request', 400)
  }
  const email = typeof telo.email === 'string' ? telo.email.trim().toLowerCase() : ''
  if (!emailJeIspravan(email)) return greska('invalid_email', 400)

  const { error: greskaAllowlist } = await admin
    .from('admin_allowlist')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
  if (greskaAllowlist) return greska('server', 500)

  const { data: postojeciId, error: greskaTrazenja } = await admin.rpc('fn_naloga_po_mejlu', { p_email: email })
  if (greskaTrazenja) return greska('server', 500)

  if (postojeciId) {
    // Nalog već postoji: samo se obezbeđuju administratorska prava, bez novog mejla.
    const { error: greskaAktivacije } = await admin.rpc('fn_aktiviraj_roditelja', { p_user_id: postojeciId })
    if (greskaAktivacije) return greska('server', 500)
    return json({ ok: true, status: 'vec_postoji' })
  }

  const { error: greskaPozivnice } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: APP_BASE_URL,
  })
  if (greskaPozivnice) {
    // Nalog je mogao nastati između provere i poziva.
    if (greskaPozivnice.code === 'email_exists' || /already/i.test(greskaPozivnice.message)) {
      return json({ ok: true, status: 'vec_postoji' })
    }
    return greska('invite_failed', 502)
  }

  return json({ ok: true, status: 'pozivnica_poslata' })
})
