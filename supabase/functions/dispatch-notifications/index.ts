// Obrađuje trajni outbox za Brevo mejlove i standardni Web Push.
// Funkciju pozivaju samo autentifikovani Database Webhook i Supabase Cron.
import { buildPushPayload } from 'npm:@block65/webcrypto-web-push@1.0.2'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  apsolutnaHashRuta, escapeHtml, proceniHttpIsporuku, sledeciPokusaj,
} from '../_shared/notification-utils.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://mlsivanovic.github.io/Mozgalica/'

interface Isporuka {
  id: string
  notification_id: string
  channel: 'email' | 'push'
  push_subscription_id: string | null
  recipient_email: string | null
  attempts: number
}

interface Obavestenje {
  id: string
  owner_id: string
  child_profile_id: string | null
  recipient_type: 'admin' | 'child'
  event_type: 'new_quiz' | 'quiz_completed' | 'new_chess_game' | 'chess_game_completed'
  quiz_id: string | null
  quiz_link_id: string | null
  attempt_id: string | null
  chess_game_id: string | null
  title: string
  body: string
  target_url: string
}

interface PushPretplata {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
  is_active: boolean
}

class GreskaIsporuke extends Error {
  constructor(
    poruka: string,
    readonly ponoviti: boolean,
    readonly deaktivirajPretplatu = false,
  ) {
    super(poruka)
  }
}

function servisniPozivJeDozvoljen(req: Request): boolean {
  const authorization = req.headers.get('authorization')
  if (authorization === `Bearer ${SERVICE_ROLE_KEY}`) return true
  if (!authorization?.startsWith('Bearer ')) return false

  try {
    const token = authorization.slice(7)
    const payloadSegment = token.split('.')[1]
    if (!payloadSegment) return false

    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]

    // Gateway sa uključenim verify_jwt prethodno proverava potpis ovog tokena.
    return payload.role === 'service_role' && payload.ref === projectRef
  } catch {
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!servisniPozivJeDozvoljen(req)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data, error } = await supabase.rpc('claim_notification_deliveries', { p_limit: 50 })
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  const isporuke = (data ?? []) as Isporuka[]
  let poslato = 0
  let neuspesno = 0

  for (let i = 0; i < isporuke.length; i += 5) {
    const grupa = isporuke.slice(i, i + 5)
    const rezultati = await Promise.all(grupa.map(async (isporuka) => {
      try {
        const providerId = await obradiIsporuku(supabase, isporuka)
        await supabase.from('notification_deliveries').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: providerId,
          error: null,
        }).eq('id', isporuka.id)
        return true
      } catch (greska) {
        const poznata = greska instanceof GreskaIsporuke
          ? greska
          : new GreskaIsporuke(String(greska), true)
        const sledeci = poznata.ponoviti ? sledeciPokusaj(isporuka.attempts) : null

        if (poznata.deaktivirajPretplatu && isporuka.push_subscription_id) {
          await supabase.from('push_subscriptions').update({
            is_active: false,
            failure_count: isporuka.attempts,
          }).eq('id', isporuka.push_subscription_id)
        }

        await supabase.from('notification_deliveries').update({
          status: sledeci ? 'pending' : 'failed',
          next_attempt_at: sledeci ?? new Date().toISOString(),
          error: poznata.message.slice(0, 2000),
        }).eq('id', isporuka.id)
        return false
      }
    }))
    poslato += rezultati.filter(Boolean).length
    neuspesno += rezultati.filter((rezultat) => !rezultat).length
  }

  return Response.json({ ok: true, claimed: isporuke.length, sent: poslato, failed: neuspesno })
})

async function obradiIsporuku(
  supabase: ReturnType<typeof createClient>,
  isporuka: Isporuka,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', isporuka.notification_id)
    .single()

  if (error || !data) throw new GreskaIsporuke(`Obaveštenje nije pronađeno: ${error?.message}`, false)
  const obavestenje = data as Obavestenje

  if (isporuka.channel === 'email') {
    return posaljiMejl(supabase, obavestenje, isporuka.recipient_email)
  }
  if (!isporuka.push_subscription_id) {
    throw new GreskaIsporuke('Push isporuka nema pretplatu.', false)
  }
  return posaljiPush(supabase, obavestenje, isporuka.push_subscription_id)
}

async function posaljiPush(
  supabase: ReturnType<typeof createClient>,
  obavestenje: Obavestenje,
  subscriptionId: string,
): Promise<string | null> {
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    throw new GreskaIsporuke('VAPID tajne nisu podešene.', false)
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key, is_active')
    .eq('id', subscriptionId)
    .single()

  if (error || !data) throw new GreskaIsporuke(`Push pretplata nije pronađena: ${error?.message}`, false)
  const pretplata = data as PushPretplata
  if (!pretplata.is_active) throw new GreskaIsporuke('Push pretplata više nije aktivna.', false)

  const upitZaBroj = supabase.from('notifications').select('id', { count: 'exact', head: true })
    .is('read_at', null)
  const { count } = obavestenje.recipient_type === 'admin'
    ? await upitZaBroj.eq('owner_id', obavestenje.owner_id).eq('recipient_type', 'admin')
    : await upitZaBroj.eq('child_profile_id', obavestenje.child_profile_id!).eq('recipient_type', 'child')

  const payload = JSON.stringify({
    title: obavestenje.title,
    body: obavestenje.body,
    url: apsolutnaHashRuta(APP_BASE_URL, obavestenje.target_url),
    tag: `mozgalica-${obavestenje.id}`,
    unreadCount: count ?? 1,
  })

  const zahtev = await buildPushPayload(
    { data: payload, options: { ttl: 86_400 } },
    {
      endpoint: pretplata.endpoint,
      expirationTime: null,
      keys: { p256dh: pretplata.p256dh, auth: pretplata.auth_key },
    },
    {
      subject: vapidSubject,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    },
  )
  const odgovor = await fetch(pretplata.endpoint, zahtev)
  const ishod = await proceniHttpIsporuku(odgovor, 'push')
  if (ishod.uspesno) {
    await supabase.from('push_subscriptions').update({
      failure_count: 0,
      last_seen_at: new Date().toISOString(),
    }).eq('id', pretplata.id)
    return odgovor.headers.get('location')
  }

  throw new GreskaIsporuke(
    `Push greška ${ishod.status}: ${ishod.detalj}`,
    ishod.ponoviti,
    ishod.deaktiviratiPretplatu,
  )
}

async function posaljiMejl(
  supabase: ReturnType<typeof createClient>,
  obavestenje: Obavestenje,
  sacuvaniPrimalac: string | null,
): Promise<string | null> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'Mozgalica'
  if (!apiKey || !senderEmail) {
    throw new GreskaIsporuke('Brevo podešavanja nisu potpuna.', false)
  }

  const mejl = obavestenje.event_type === 'new_quiz'
    ? await napraviMejlZaNoviKviz(supabase, obavestenje, sacuvaniPrimalac)
    : obavestenje.event_type === 'new_chess_game'
      ? await napraviMejlZaNovuSahPartiju(supabase, obavestenje, sacuvaniPrimalac)
      : obavestenje.event_type === 'chess_game_completed'
        ? await napraviMejlZaSahRezultat(supabase, obavestenje)
        : await napraviMejlZaRezultat(supabase, obavestenje)

  const odgovor = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: mejl.to, name: mejl.recipientName }],
      subject: mejl.subject,
      htmlContent: mejl.html,
      textContent: mejl.text,
    }),
  })

  const ishod = await proceniHttpIsporuku(odgovor, 'email')
  if (!ishod.uspesno) {
    throw new GreskaIsporuke(
      `Brevo greška ${ishod.status}: ${ishod.detalj}`,
      ishod.ponoviti,
    )
  }

  const telo = await odgovor.json().catch(() => ({})) as { messageId?: string }
  return telo.messageId ?? null
}

async function napraviMejlZaNoviKviz(
  supabase: ReturnType<typeof createClient>,
  obavestenje: Obavestenje,
  primalac: string | null,
) {
  if (!obavestenje.child_profile_id || !obavestenje.quiz_id || !primalac) {
    throw new GreskaIsporuke('Nedostaju podaci za mejl detetu.', false)
  }

  const [{ data: profil }, { data: kviz }, { count: brojPitanja }] = await Promise.all([
    supabase.from('child_profiles').select('name, public_token').eq('id', obavestenje.child_profile_id).single(),
    supabase.from('quizzes').select('title, description, time_limit_seconds').eq('id', obavestenje.quiz_id).single(),
    supabase.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('quiz_id', obavestenje.quiz_id),
  ])
  if (!profil || !kviz) throw new GreskaIsporuke('Profil ili kviz za mejl nisu pronađeni.', false)

  const link = apsolutnaHashRuta(APP_BASE_URL, `/dete/${profil.public_token}`)
  const vreme = kviz.time_limit_seconds
    ? ` Vreme za rešavanje: ${Math.ceil(kviz.time_limit_seconds / 60)} min.`
    : ''
  const opis = kviz.description ? `<p>${escapeHtml(kviz.description)}</p>` : ''
  const subject = `Mozgalica: novi kviz „${kviz.title}”`
  const text = `Zdravo ${profil.name}! Stigao ti je novi kviz „${kviz.title}”. `
    + `Ima ${brojPitanja ?? 0} pitanja.${vreme} Otvori svoj profil: ${link}`
  const html = omotMejla(`
    <h2>🧠 Stigao ti je novi kviz!</h2>
    <p>Zdravo <strong>${escapeHtml(profil.name)}</strong>!</p>
    <p>Čeka te kviz <strong>„${escapeHtml(kviz.title)}”</strong>.</p>
    ${opis}
    <p>📝 ${brojPitanja ?? 0} pitanja.${escapeHtml(vreme)}</p>
    ${dugmeMejla(link, 'Otvori moj profil')}
  `)
  return { to: primalac, recipientName: profil.name, subject, text, html }
}

async function napraviMejlZaRezultat(
  supabase: ReturnType<typeof createClient>,
  obavestenje: Obavestenje,
) {
  if (!obavestenje.attempt_id || !obavestenje.quiz_id) {
    throw new GreskaIsporuke('Nedostaju podaci za mejl administratoru.', false)
  }

  const [{ data: attempt }, { data: quiz }, { data: userData }] = await Promise.all([
    supabase.from('attempts')
      .select('child_name, child_label, submitted_at, total_points, max_points, score_pct, correct_count, incorrect_count, stars_awarded')
      .eq('id', obavestenje.attempt_id).single(),
    supabase.from('quizzes').select('title').eq('id', obavestenje.quiz_id).single(),
    supabase.auth.admin.getUserById(obavestenje.owner_id),
  ])
  const adminEmail = userData?.user?.email
  if (!attempt || !quiz || !adminEmail) {
    throw new GreskaIsporuke('Rezultat ili administratorski mejl nisu pronađeni.', false)
  }

  const link = apsolutnaHashRuta(APP_BASE_URL, `/admin/rezultati/${obavestenje.attempt_id}`)
  const ime = attempt.child_name || 'Dete'
  const oznaka = attempt.child_label ? ` (${attempt.child_label})` : ''
  const datum = attempt.submitted_at
    ? new Date(attempt.submitted_at).toLocaleString('sr-Latn-RS')
    : '—'
  const subject = `Mozgalica: ${ime} je završio/la „${quiz.title}”`
  const text = `${ime}${oznaka} je završio/la kviz „${quiz.title}”. `
    + `Poeni ${attempt.total_points}/${attempt.max_points}, rezultat ${attempt.score_pct}%, `
    + `${attempt.stars_awarded ?? 0}/5 zvezdica. Detalji: ${link}`
  const html = omotMejla(`
    <h2>🧠 Mozgalica — novi rezultat</h2>
    <p><strong>${escapeHtml(ime)}${escapeHtml(oznaka)}</strong> je završio/la
      kviz <strong>„${escapeHtml(quiz.title)}”</strong>.</p>
    <ul>
      <li>Datum završetka: ${escapeHtml(datum)}</li>
      <li>Poeni: ${attempt.total_points ?? 0} / ${attempt.max_points ?? 0}</li>
      <li>Procenat uspešnosti: ${attempt.score_pct ?? 0}%</li>
      <li>Osvojene zvezdice: ${attempt.stars_awarded ?? 0} / 5</li>
      <li>Tačni odgovori: ${attempt.correct_count ?? 0}</li>
      <li>Netačni odgovori: ${attempt.incorrect_count ?? 0}</li>
    </ul>
    ${dugmeMejla(link, 'Pogledaj detaljan rezultat')}
  `)
  return { to: adminEmail, recipientName: 'Administrator', subject, text, html }
}

async function napraviMejlZaNovuSahPartiju(
  supabase: ReturnType<typeof createClient>,
  obavestenje: Obavestenje,
  primalac: string | null,
) {
  if (!obavestenje.child_profile_id || !obavestenje.chess_game_id || !primalac) {
    throw new GreskaIsporuke('Nedostaju podaci za šahovski mejl detetu.', false)
  }
  const [{ data: profil }, { data: partija }] = await Promise.all([
    supabase.from('child_profiles').select('name, public_token').eq('id', obavestenje.child_profile_id).single(),
    supabase.from('chess_games').select('approximate_elo, child_color, clock_seconds').eq('id', obavestenje.chess_game_id).single(),
  ])
  if (!profil || !partija) throw new GreskaIsporuke('Profil ili šahovska partija nisu pronađeni.', false)

  const link = apsolutnaHashRuta(APP_BASE_URL, `/dete/${profil.public_token}`)
  const boja = partija.child_color === 'white' ? 'belim' : 'crnim'
  const sat = partija.clock_seconds ? `${partija.clock_seconds / 60}+0` : 'bez sata'
  const subject = `Mozgalica: nova šahovska partija protiv ELO ${partija.approximate_elo}`
  const text = `Zdravo ${profil.name}! Čeka te šahovska partija protiv računara ELO ${partija.approximate_elo}. `
    + `Igraš ${boja}, ${sat}. Otvori svoj profil: ${link}`
  const html = omotMejla(`
    <h2>♟️ Čeka te nova šahovska partija!</h2>
    <p>Zdravo <strong>${escapeHtml(profil.name)}</strong>!</p>
    <p>Protivnik je računar približne jačine <strong>ELO ${partija.approximate_elo}</strong>.</p>
    <p>Igraš ${escapeHtml(boja)} · ${escapeHtml(sat)}</p>
    ${dugmeMejla(link, 'Otvori moj profil')}
  `)
  return { to: primalac, recipientName: profil.name, subject, text, html }
}

async function napraviMejlZaSahRezultat(
  supabase: ReturnType<typeof createClient>,
  obavestenje: Obavestenje,
) {
  if (!obavestenje.chess_game_id) {
    throw new GreskaIsporuke('Nedostaju podaci za šahovski rezultat.', false)
  }
  const [{ data: partija }, { data: userData }] = await Promise.all([
    supabase.from('chess_games')
      .select('child_profile_id, approximate_elo, result, termination, stars_awarded, completed_at')
      .eq('id', obavestenje.chess_game_id).single(),
    supabase.auth.admin.getUserById(obavestenje.owner_id),
  ])
  if (!partija || !userData?.user?.email) {
    throw new GreskaIsporuke('Šahovski rezultat ili administratorski mejl nisu pronađeni.', false)
  }
  const { data: profil } = await supabase.from('child_profiles').select('name')
    .eq('id', partija.child_profile_id).single()
  if (!profil) throw new GreskaIsporuke('Profil deteta nije pronađen.', false)

  const rezultat = partija.result === 'child_win' ? 'pobeda' : partija.result === 'draw' ? 'remi' : 'poraz'
  const link = apsolutnaHashRuta(APP_BASE_URL, '/admin/sah')
  const subject = `Mozgalica: ${profil.name} — šahovski rezultat (${rezultat})`
  const text = `${profil.name}: ${rezultat} protiv ELO ${partija.approximate_elo}, `
    + `${partija.stars_awarded ?? 0}/5 zvezdica. Detalji: ${link}`
  const html = omotMejla(`
    <h2>♟️ Završena šahovska partija</h2>
    <p><strong>${escapeHtml(profil.name)}</strong>: ${escapeHtml(rezultat)} protiv
      računara ELO ${partija.approximate_elo}.</p>
    <ul>
      <li>Završetak: ${escapeHtml(partija.termination ?? '—')}</li>
      <li>Osvojene zvezdice: ${partija.stars_awarded ?? 0} / 5</li>
    </ul>
    ${dugmeMejla(link, 'Pogledaj šahovske partije')}
  `)
  return { to: userData.user.email, recipientName: 'Administrator', subject, text, html }
}

function dugmeMejla(link: string, tekst: string): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#5b6ee1;color:#fff;`
    + `padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">${escapeHtml(tekst)}</a></p>`
}

function omotMejla(sadrzaj: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.55">`
    + `${sadrzaj}<p style="margin-top:32px;color:#6b7280;font-size:13px">Mozgalica</p></div>`
}
