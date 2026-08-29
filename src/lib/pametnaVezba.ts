export type RazlogPametneVezbe = 'slaba_oblast' | 'ponavljanje' | 'izazov'

export interface TemaPametneVezbe {
  topicId: string
  topicSlug: string
  topicName: string
  answersCount: number
  successPct: number | null
  lastAnsweredAt: string | null
}

export interface StavkaPametneVezbe {
  topicId: string
  topicSlug: string
  topicName: string
  questionCount: number
  difficulty: 1 | 2 | 3 | 4 | 5
  reason: RazlogPametneVezbe
}

function vreme(datum: string | null): number {
  if (!datum) return 0
  const vrednost = Date.parse(datum)
  return Number.isFinite(vrednost) ? vrednost : 0
}

function procenat(tema: TemaPametneVezbe): number {
  return tema.successPct ?? 50
}

function rasporedi(
  teme: TemaPametneVezbe[],
  broj: number,
  difficulty: StavkaPametneVezbe['difficulty'],
  reason: RazlogPametneVezbe,
): StavkaPametneVezbe[] {
  if (broj <= 0 || teme.length === 0) return []
  const stavke = new Map<string, StavkaPametneVezbe>()
  for (let i = 0; i < broj; i++) {
    const tema = teme[i % teme.length]
    const kljuc = `${tema.topicId}:${difficulty}:${reason}`
    const postojeca = stavke.get(kljuc)
    if (postojeca) {
      postojeca.questionCount += 1
    } else {
      stavke.set(kljuc, {
        topicId: tema.topicId,
        topicSlug: tema.topicSlug,
        topicName: tema.topicName,
        questionCount: 1,
        difficulty,
        reason,
      })
    }
  }
  return [...stavke.values()]
}

// Plan ostaje deterministički: isti podaci daju isti izbor oblasti, dok se konkretni
// zadaci i dalje menjaju kroz seed dnevnog rasporeda.
export function napraviPametniPlan(
  teme: TemaPametneVezbe[],
  brojPitanja: number,
  osnovnaTezina: number | null,
  fiksnaTezina?: StavkaPametneVezbe['difficulty'],
): StavkaPametneVezbe[] {
  const broj = Math.max(1, Math.floor(brojPitanja))
  if (teme.length === 0) return []

  const baza = fiksnaTezina
    ?? Math.max(1, Math.min(5, Math.round(osnovnaTezina ?? 3))) as StavkaPametneVezbe['difficulty']
  const poSlabosti = [...teme].sort((a, b) =>
    procenat(a) - procenat(b)
    || a.answersCount - b.answersCount
    || vreme(a.lastAnsweredAt) - vreme(b.lastAnsweredAt)
    || a.topicSlug.localeCompare(b.topicSlug),
  )
  const poPonavljanju = [...teme].sort((a, b) =>
    vreme(a.lastAnsweredAt) - vreme(b.lastAnsweredAt)
    || a.answersCount - b.answersCount
    || procenat(a) - procenat(b)
    || a.topicSlug.localeCompare(b.topicSlug),
  )
  const poSnazi = [...teme].sort((a, b) =>
    procenat(b) - procenat(a)
    || b.answersCount - a.answersCount
    || vreme(a.lastAnsweredAt) - vreme(b.lastAnsweredAt)
    || a.topicSlug.localeCompare(b.topicSlug),
  )

  const stvarnoSlabe = poSlabosti.filter((tema) => tema.answersCount >= 3 && procenat(tema) < 70)
  const nedovoljnoVezbane = poSlabosti.filter((tema) => tema.answersCount < 3)
  const savladane = poSnazi.filter((tema) => tema.answersCount >= 3 && procenat(tema) >= 80)
  const slabe = stvarnoSlabe.length > 0
    ? [...stvarnoSlabe, ...nedovoljnoVezbane]
    : nedovoljnoVezbane.length > 0 ? nedovoljnoVezbane : poSlabosti
  const izazovne = savladane.length > 0 ? savladane : poSnazi

  const brojSlabih = Math.round(broj * 0.6)
  const brojPonavljanja = Math.round(broj * 0.25)
  const brojIzazova = Math.max(0, broj - brojSlabih - brojPonavljanja)
  const najlosijiProcenat = slabe[0]?.successPct
  const laksaTezina = fiksnaTezina ?? (najlosijiProcenat != null && najlosijiProcenat < 40
    ? Math.max(1, baza - 1) as StavkaPametneVezbe['difficulty']
    : baza)
  const tezaTezina = fiksnaTezina ?? Math.min(5, baza + 1) as StavkaPametneVezbe['difficulty']

  return [
    ...rasporedi(slabe, brojSlabih, laksaTezina, 'slaba_oblast'),
    ...rasporedi(poPonavljanju, brojPonavljanja, baza, 'ponavljanje'),
    ...rasporedi(izazovne, brojIzazova, tezaTezina, 'izazov'),
  ]
}
