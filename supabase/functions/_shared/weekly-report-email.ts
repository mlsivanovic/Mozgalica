import { apsolutnaHashRuta, escapeHtml } from './notification-utils.ts'

export interface TemaNedeljnogIzvestaja {
  topicName: string
  questionCount: number
  successPct: number | null
}

export interface PredmetNedeljnogIzvestaja {
  subject: string
  completedQuizzes: number
  activeDays: number
  avgScorePct: number | null
  previousAvgScorePct: number | null
  trendPct: number | null
  questionCount: number
  correctCount: number
  strongTopics: TemaNedeljnogIzvestaja[]
  practiceTopics: TemaNedeljnogIzvestaja[]
}

export interface SahNedeljnogIzvestaja {
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  starsAwarded: number
}

export interface DeteNedeljnogIzvestaja {
  childProfileId: string
  name: string
  avatar: string
  completedQuizzes: number
  activeDays: number
  avgScorePct: number | null
  previousAvgScorePct: number | null
  trendPct: number | null
  questionCount: number
  correctCount: number
  starsAwarded: number
  subjects: PredmetNedeljnogIzvestaja[]
  chess: SahNedeljnogIzvestaja | null
}

export interface SazetakObjedinjenogIzvestaja {
  hasActivity: boolean
  weekStart: string
  weekEnd: string
  totals?: {
    activeChildren: number
    completedQuizzes: number
    questionCount: number
    correctCount: number
    avgScorePct: number | null
    chessGamesPlayed: number
  }
  children: DeteNedeljnogIzvestaja[]
}

export function srpskiOblik(broj: number, jedan: string, dva: string, pet: string): string {
  const n = Math.abs(Math.trunc(broj))
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return pet
  const mod10 = n % 10
  if (mod10 === 1) return jedan
  if (mod10 >= 2 && mod10 <= 4) return dva
  return pet
}

function formatirajBrojSr(vrednost: number): string {
  const zaokruzeno = Math.round(vrednost * 10) / 10
  return Number.isInteger(zaokruzeno)
    ? String(zaokruzeno)
    : zaokruzeno.toFixed(1).replace('.', ',')
}

export function formatirajProcenatSr(vrednost: number | null | undefined): string {
  if (vrednost == null || Number.isNaN(Number(vrednost))) return '—'
  return `${formatirajBrojSr(Number(vrednost))}%`
}

export function formatirajTrendSr(trendPct: number | null | undefined): string | null {
  if (trendPct == null || Number.isNaN(Number(trendPct))) return null
  const vrednost = Number(trendPct)
  if (vrednost > 0) {
    return `+${formatirajBrojSr(vrednost)} p.p. u odnosu na prethodnu sedmicu`
  }
  if (vrednost < 0) {
    return `-${formatirajBrojSr(Math.abs(vrednost))} p.p. u odnosu na prethodnu sedmicu`
  }
  return 'Isti prosek kao prethodne sedmice'
}

export function formatirajPeriodSr(weekStart: string, weekEnd: string): string {
  const [g1, m1, d1] = weekStart.split('-')
  const [g2, m2, d2] = weekEnd.split('-')
  if (!g1 || !m1 || !d1 || !g2 || !m2 || !d2) return `${weekStart}–${weekEnd}`
  if (g1 === g2) return `${d1}.${m1}.–${d2}.${m2}.${g2}.`
  return `${d1}.${m1}.${g1}.–${d2}.${m2}.${g2}.`
}

function metaPredmeta(subject: string): { naziv: string; ikona: string } {
  switch (subject) {
    case 'matematika':
      return { naziv: 'Matematika', ikona: '📘' }
    case 'srpski':
      return { naziv: 'Srpski jezik', ikona: '📖' }
    case 'priroda_drustvo':
      return { naziv: 'Priroda i društvo', ikona: '🌿' }
    default:
      return { naziv: 'Ostali zadaci', ikona: '📝' }
  }
}

function formatirajTemeSr(teme: TemaNedeljnogIzvestaja[] | null | undefined): string {
  return (teme ?? [])
    .map((tema) => `${tema.topicName} (${formatirajProcenatSr(tema.successPct)})`)
    .join(', ')
}

export function napraviSadrzajObjedinjenogIzvestaja(
  sazetak: SazetakObjedinjenogIzvestaja,
  appBaseUrl: string,
): { subject: string; text: string; html: string } {
  const period = formatirajPeriodSr(sazetak.weekStart, sazetak.weekEnd)
  const glavniLink = apsolutnaHashRuta(appBaseUrl, '/admin/napredak')
  const subject = `Mozgalica: nedeljni izveštaj (${period})`

  const deca = sazetak.children ?? []
  const ukupnoKvizova = sazetak.totals?.completedQuizzes
    ?? deca.reduce((zbir, d) => zbir + d.completedQuizzes, 0)
  const ukupnoSaha = sazetak.totals?.chessGamesPlayed
    ?? deca.reduce((zbir, d) => zbir + (d.chess?.gamesPlayed ?? 0), 0)
  const ukupnoPitanja = sazetak.totals?.questionCount
    ?? deca.reduce((zbir, d) => zbir + d.questionCount, 0)
  const ukupnoTacnih = sazetak.totals?.correctCount
    ?? deca.reduce((zbir, d) => zbir + d.correctCount, 0)

  const sazetakDelovi: string[] = [
    `${deca.length} ${srpskiOblik(deca.length, 'aktivno dete', 'aktivna deteta', 'aktivne dece')}`,
  ]
  if (ukupnoKvizova > 0) {
    sazetakDelovi.push(
      `${ukupnoKvizova} ${srpskiOblik(ukupnoKvizova, 'kviz', 'kviza', 'kvizova')}`,
    )
  }
  if (ukupnoPitanja > 0) {
    sazetakDelovi.push(`${ukupnoTacnih}/${ukupnoPitanja} tačnih odgovora`)
  }
  if (ukupnoSaha > 0) {
    sazetakDelovi.push(
      `${ukupnoSaha} ${srpskiOblik(ukupnoSaha, 'šah partija', 'šah partije', 'šah partija')}`,
    )
  }

  const tekstLinije: string[] = [
    `Mozgalica — Nedeljni izveštaj (${period})`,
    sazetakDelovi.join(' · '),
    '',
  ]

  const htmlKartice: string[] = []

  for (const dete of deca) {
    const linkDeteta = apsolutnaHashRuta(appBaseUrl, `/admin/napredak?dete=${dete.childProfileId}`)
    const brojDana = `${dete.activeDays} ${srpskiOblik(dete.activeDays, 'aktivan dan', 'aktivna dana', 'aktivnih dana')}`
    const opstiDelovi: string[] = []
    if (dete.completedQuizzes > 0) {
      opstiDelovi.push(
        `${dete.completedQuizzes} ${srpskiOblik(dete.completedQuizzes, 'kviz', 'kviza', 'kvizova')}`,
      )
      opstiDelovi.push(`prosek ${formatirajProcenatSr(dete.avgScorePct)}`)
    }
    if (dete.chess && dete.chess.gamesPlayed > 0) {
      opstiDelovi.push(
        `${dete.chess.gamesPlayed} ${srpskiOblik(dete.chess.gamesPlayed, 'partija šaha', 'partije šaha', 'partija šaha')}`,
      )
    }
    opstiDelovi.push(brojDana)
    if (dete.starsAwarded > 0) {
      opstiDelovi.push(`${dete.starsAwarded} ⭐`)
    }

    tekstLinije.push(`${dete.avatar} ${dete.name} — ${opstiDelovi.join(' · ')}`)
    const trendDeteta = formatirajTrendSr(dete.trendPct)
    if (trendDeteta) tekstLinije.push(`  Napredak: ${trendDeteta}`)

    const predmetBlokoviHtml: string[] = []
    for (const predmet of dete.subjects ?? []) {
      const meta = metaPredmeta(predmet.subject)
      const trendPredmeta = formatirajTrendSr(predmet.trendPct)
      const jake = formatirajTemeSr(predmet.strongTopics)
      const zaVezbu = formatirajTemeSr(predmet.practiceTopics)

      const predmetRezime = `${predmet.completedQuizzes} ${srpskiOblik(predmet.completedQuizzes, 'kviz', 'kviza', 'kvizova')}`
        + ` · ${predmet.correctCount}/${predmet.questionCount} tačnih`
        + ` · prosek ${formatirajProcenatSr(predmet.avgScorePct)}`

      tekstLinije.push(`  - ${meta.naziv}: ${predmetRezime}`)
      if (trendPredmeta) tekstLinije.push(`    Trend: ${trendPredmeta}`)
      if (jake) tekstLinije.push(`    Jake oblasti: ${jake}`)
      if (zaVezbu) tekstLinije.push(`    Za dodatnu vežbu: ${zaVezbu}`)

      const trendBoja = predmet.trendPct == null
        ? '#6b7280'
        : predmet.trendPct > 0
          ? '#15803d'
          : predmet.trendPct < 0
            ? '#b45309'
            : '#4b5563'

      predmetBlokoviHtml.push(`
        <div style="margin-top:10px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px">
          <div style="font-weight:700;font-size:15px;color:#111827">${meta.ikona} ${escapeHtml(meta.naziv)}</div>
          <div style="margin-top:4px;font-size:14px;color:#374151">${escapeHtml(predmetRezime)}</div>
          ${trendPredmeta ? `<div style="margin-top:4px;font-size:13px;font-weight:600;color:${trendBoja}">${escapeHtml(trendPredmeta)}</div>` : ''}
          ${jake ? `<div style="margin-top:6px;font-size:13px;color:#1f2937">🌟 <strong>Jake oblasti:</strong> ${escapeHtml(jake)}</div>` : ''}
          ${zaVezbu ? `<div style="margin-top:4px;font-size:13px;color:#1f2937">🎯 <strong>Za dodatnu vežbu:</strong> ${escapeHtml(zaVezbu)}</div>` : ''}
        </div>
      `)
    }

    let sahHtml = ''
    if (dete.chess && dete.chess.gamesPlayed > 0) {
      const s = dete.chess
      const bilans = [
        `${s.wins} ${srpskiOblik(s.wins, 'pobeda', 'pobede', 'pobeda')}`,
        `${s.draws} ${srpskiOblik(s.draws, 'remi', 'remija', 'remija')}`,
        `${s.losses} ${srpskiOblik(s.losses, 'poraz', 'poraza', 'poraza')}`,
      ].join(', ')
      const sahLinija = `${s.gamesPlayed} ${srpskiOblik(s.gamesPlayed, 'partija', 'partije', 'partija')} (${bilans})`
        + (s.starsAwarded > 0 ? ` · ${s.starsAwarded} ⭐` : '')
      tekstLinije.push(`  - Šah: ${sahLinija}`)

      sahHtml = `
        <div style="margin-top:10px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px">
          <div style="font-weight:700;font-size:15px;color:#111827">♟️ Šah</div>
          <div style="margin-top:4px;font-size:14px;color:#374151">${escapeHtml(sahLinija)}</div>
        </div>
      `
    }

    tekstLinije.push(`  Detaljna statistika: ${linkDeteta}`)
    tekstLinije.push('')

    htmlKartice.push(`
      <div style="margin-top:16px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:baseline">
              <h3 style="margin:0;font-size:18px;color:#111827">${escapeHtml(dete.avatar)} ${escapeHtml(dete.name)}</h3>
            </td>
            <td style="vertical-align:baseline;text-align:right;white-space:nowrap">
              <a href="${escapeHtml(linkDeteta)}" style="font-size:13px;color:#5b6ee1;text-decoration:none;font-weight:600">Statistika →</a>
            </td>
          </tr>
        </table>
        <p style="margin:6px 0 0;font-size:14px;color:#4b5563">${escapeHtml(opstiDelovi.join(' · '))}</p>
        ${trendDeteta ? `<p style="margin:4px 0 0;font-size:13px;color:#4b5563"><strong>${escapeHtml(trendDeteta)}</strong></p>` : ''}
        ${predmetBlokoviHtml.join('')}
        ${sahHtml}
      </div>
    `)
  }

  tekstLinije.push(`Pregled napretka u aplikaciji: ${glavniLink}`)

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.55">
      <h2 style="margin:0;color:#111827">📊 Nedeljni izveštaj</h2>
      <p style="margin:4px 0 12px;color:#6b7280;font-size:14px">${escapeHtml(period)} · ${escapeHtml(sazetakDelovi.join(' · '))}</p>
      ${htmlKartice.join('')}
      <p style="margin:24px 0">
        <a href="${escapeHtml(glavniLink)}" style="display:inline-block;background:#5b6ee1;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
          Pogledaj napredak u aplikaciji
        </a>
      </p>
      <p style="margin-top:32px;color:#6b7280;font-size:13px">Mozgalica</p>
    </div>
  `.trim()

  return {
    subject,
    text: tekstLinije.join('\n'),
    html,
  }
}
