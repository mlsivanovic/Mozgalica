// Brisanje roditeljskog naloga u ime prijavljenog korisnika. Prvo se brišu svi podaci
// (obrisi_podatke_naloga, SQL), zatim auth nalog. Brisanje auth reda kaskadno briše
// preostale vlasničke redove (admin_settings, obaveštenja, push pretplate, ...).
// Vlasnik platforme ne može da obriše nalog. Traži se ukucana email adresa kao potvrda.
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

function greska(kod: string, status: number): Response {
  return json({ ok: false, error: kod }, status)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return greska('method_not_allowed', 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return greska('unauthorized', 401)

  const { data: korisnik, error: greskaKorisnika } = await admin.auth.getUser(token)
  if (greskaKorisnika || !korisnik.user) return greska('unauthorized', 401)

  let telo: { potvrda?: unknown }
  try {
    telo = await req.json()
  } catch {
    return greska('bad_request', 400)
  }
  const potvrda = typeof telo.potvrda === 'string' ? telo.potvrda.trim().toLowerCase() : ''
  const mejl = (korisnik.user.email ?? '').toLowerCase()
  if (!mejl || potvrda !== mejl) return greska('potvrda_nije_ispravna', 400)

  const { data: rezultat, error: greskaBrisanja } = await admin.rpc('obrisi_podatke_naloga', {
    p_user_id: korisnik.user.id,
  })
  if (greskaBrisanja) return greska('server', 500)

  if (!rezultat?.ok) {
    if (rezultat?.error === 'platform_owner') return greska('platform_owner', 403)
    if (rezultat?.error === 'shared_dependency') return greska('shared_dependency', 409)
    return greska('server', 500)
  }

  const { error: greskaNaloga } = await admin.auth.admin.deleteUser(korisnik.user.id)
  if (greskaNaloga) return greska('auth_delete_failed', 500)

  return json({ ok: true })
})
