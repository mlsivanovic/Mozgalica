// Edge funkcija: šalje mejl administratoru kada dete završi kviz.
// Pokreće se asinhrono iz submit_attempt (pg_net), nikad direktno sa klijenta.
// Deno runtime (Supabase Edge Functions).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const HOOK_SECRET = Deno.env.get('HOOK_SECRET')!

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-hook-secret') !== HOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let logId: string | null = null
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    const { attemptId, logId: lid } = await req.json()
    logId = lid ?? null

    const { data: attempt, error: attemptErr } = await supabase
      .from('attempts')
      .select('id, child_name, child_label, quiz_id, submitted_at, total_points, max_points, score_pct, correct_count, incorrect_count, stars_earned')
      .eq('id', attemptId)
      .single()
    if (attemptErr || !attempt) throw new Error(`Pokušaj nije pronađen: ${attemptErr?.message}`)

    const { data: quiz, error: quizErr } = await supabase
      .from('quizzes')
      .select('id, title, owner_id')
      .eq('id', attempt.quiz_id)
      .single()
    if (quizErr || !quiz) throw new Error(`Kviz nije pronađen: ${quizErr?.message}`)

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(quiz.owner_id)
    if (userErr || !userData?.user?.email) throw new Error(`Vlasnik kviza nije pronađen: ${userErr?.message}`)

    const adminEmail = userData.user.email
    const deepLink = `https://mlsivanovic.github.io/Mozgalica/#/admin/rezultati/${attempt.id}`
    const datumZavrsetka = attempt.submitted_at
      ? new Date(attempt.submitted_at).toLocaleString('sr-Latn-RS')
      : '—'

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>🧠 Mozgalica — novi rezultat</h2>
        <p><strong>${escapeHtml(attempt.child_name)}${attempt.child_label ? ` (${escapeHtml(attempt.child_label)})` : ''}</strong> je završio/la kviz <strong>${escapeHtml(quiz.title)}</strong>.</p>
        <ul>
          <li>Datum završetka: ${datumZavrsetka}</li>
          <li>Poeni: ${attempt.total_points} / ${attempt.max_points}</li>
          <li>Procenat uspešnosti: ${attempt.score_pct}%</li>
          <li>Osvojene zvezdice: ${attempt.stars_earned ?? 0} / 3</li>
          <li>Tačni odgovori: ${attempt.correct_count}</li>
          <li>Netačni odgovori: ${attempt.incorrect_count}</li>
        </ul>
        <p><a href="${deepLink}">Pogledaj detaljan rezultat u administratorskom panelu</a></p>
      </div>
    `

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mozgalica <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `Mozgalica: ${attempt.child_name} je završio/la „${quiz.title}"`,
        html,
      }),
    })

    if (!resendResp.ok) {
      throw new Error(`Resend greška ${resendResp.status}: ${await resendResp.text()}`)
    }

    if (logId) {
      await supabase.from('email_log').update({ status: 'sent' }).eq('id', logId)
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    if (logId) {
      await supabase.from('email_log').update({ status: 'failed', error: String(err) }).eq('id', logId)
    }
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
