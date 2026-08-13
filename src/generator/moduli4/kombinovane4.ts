// Generator: kombinovane računske operacije (4. razred) — veći brojevi, dublje
// ugnježdene zagrade, deljenje unutar izraza, i izrazi sa promenljivom
// (dat je x, izračunaj vrednost izraza).
import { ceoBroj, izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { poeniZaTezinu, upakujRacun } from '../moduli/zajednicko.ts'

const MAX_DISTRAKTOR = 2_000_000

interface Izraz {
  text: string
  tacan: number
  pogresanRedosled: number
  signature: string
  objasnjenje: string
}

function napraviIzraz(rng: Rng, tezina: 1 | 2 | 3 | 4 | 5): Izraz {
  if (tezina === 1) {
    // a · b ± c — veći operandi nego 3. razred
    const a = ceoBroj(rng, 10, 99)
    const b = ceoBroj(rng, 10, 99)
    const plus = rng() < 0.5
    const c = plus ? ceoBroj(rng, 10, 999) : ceoBroj(rng, 10, Math.max(10, Math.min(999, a * b)))
    const tacan = plus ? a * b + c : a * b - c
    const naivno = plus ? a * (b + c) : a * (b - c)
    return {
      text: `${a} · ${b} ${plus ? '+' : '−'} ${c}`,
      tacan,
      pogresanRedosled: naivno >= 0 ? naivno : tacan + 10,
      signature: `kombinovane4:t1:${a},${plus ? '+' : '-'}${b},${c}`,
      objasnjenje: `Prvo množenje: ${a} · ${b} = ${a * b}, zatim ${plus ? 'sabiranje' : 'oduzimanje'}: ${a * b} ${plus ? '+' : '−'} ${c} = ${tacan}.`,
    }
  }
  if (tezina === 2) {
    // 50/50: (a ± b) · c, ili a·b ± c·d (dva proizvoda)
    if (rng() < 0.5) {
      const c = ceoBroj(rng, 2, 20)
      const zbir = rng() < 0.5
      if (zbir) {
        const a = ceoBroj(rng, 50, 500)
        const b = ceoBroj(rng, 10, 300)
        return {
          text: `(${a} + ${b}) · ${c}`,
          tacan: (a + b) * c,
          pogresanRedosled: a + b * c,
          signature: `kombinovane4:t2:+:${a},${b},${c}`,
          objasnjenje: `Prvo zagrada: ${a} + ${b} = ${a + b}, zatim množenje: ${a + b} · ${c} = ${(a + b) * c}.`,
        }
      }
      const b = ceoBroj(rng, 10, 300)
      const a = ceoBroj(rng, b + 10, b + 500)
      return {
        text: `(${a} − ${b}) · ${c}`,
        tacan: (a - b) * c,
        pogresanRedosled: a - b * c >= 0 ? a - b * c : (a - b) * c + 10,
        signature: `kombinovane4:t2:-:${a},${b},${c}`,
        objasnjenje: `Prvo zagrada: ${a} − ${b} = ${a - b}, zatim množenje: ${a - b} · ${c} = ${(a - b) * c}.`,
      }
    }
    // a·b ± c·d — dva proizvoda
    const a = ceoBroj(rng, 11, 50)
    const b = ceoBroj(rng, 2, 20)
    const p1 = a * b
    const plus = rng() < 0.5
    const c = ceoBroj(rng, 11, 50)
    const d = plus ? ceoBroj(rng, 2, 20) : ceoBroj(rng, 2, Math.max(2, Math.min(20, Math.floor(p1 / c))))
    const p2 = c * d
    const tacan = plus ? p1 + p2 : p1 - p2
    const naivno = plus ? (a * b + c) * d : (a * b - c) * d // zaboravio da su oba množenja pre sabiranja/oduzimanja
    return {
      text: `${a} · ${b} ${plus ? '+' : '−'} ${c} · ${d}`,
      tacan,
      pogresanRedosled: naivno >= 0 ? naivno : tacan + 10,
      signature: `kombinovane4:t2b:${a},${b},${plus ? '+' : '-'}${c},${d}`,
      objasnjenje: `Prvo oba množenja: ${a} · ${b} = ${p1} i ${c} · ${d} = ${p2}, zatim ${plus ? 'sabiranje' : 'oduzimanje'}: ${p1} ${plus ? '+' : '−'} ${p2} = ${tacan}.`,
    }
  }
  if (tezina === 3) {
    const grana = ceoBroj(rng, 0, 2)
    if (grana === 0) {
      // (a ± b) · c ± d — dva koraka pod zagradom, pa treći korak van nje
      const c = ceoBroj(rng, 2, 20)
      const zbir = rng() < 0.5
      const b = ceoBroj(rng, 10, 300)
      const a = zbir ? ceoBroj(rng, 10, 400) : b + ceoBroj(rng, 10, 400)
      const unutra = zbir ? a + b : a - b
      const proizvod = unutra * c
      const plusD = rng() < 0.5
      const d = plusD ? ceoBroj(rng, 10, 5000) : ceoBroj(rng, 10, Math.max(10, Math.min(5000, proizvod)))
      const tacan = plusD ? proizvod + d : proizvod - d
      const bezZagrade = zbir ? a + b * c + (plusD ? d : -d) : a - b * c + (plusD ? d : -d)
      return {
        text: `(${a} ${zbir ? '+' : '−'} ${b}) · ${c} ${plusD ? '+' : '−'} ${d}`,
        tacan,
        pogresanRedosled: bezZagrade >= 0 ? bezZagrade : tacan + 10,
        signature: `kombinovane4:t3:${zbir ? '+' : '-'}:${a},${b},${c},${plusD ? '+' : '-'}${d}`,
        objasnjenje: `Prvo zagrada: ${a} ${zbir ? '+' : '−'} ${b} = ${unutra}, zatim množenje: ${unutra} · ${c} = ${proizvod}, na kraju ${plusD ? 'sabiranje' : 'oduzimanje'}: ${proizvod} ${plusD ? '+' : '−'} ${d} = ${tacan}.`,
      }
    }
    if (grana === 1) {
      // a · b + c : d — deljenje egzaktno (c = q·d)
      const a = ceoBroj(rng, 2, 20)
      const b = ceoBroj(rng, 2, 20)
      const d = ceoBroj(rng, 2, 20)
      const q = ceoBroj(rng, 2, 200)
      const c = q * d
      const tacan = a * b + q
      const pogresanRedosled = Math.floor((a * b + c) / d) // pogrešno: saberi PRE deljenja
      return {
        text: `${a} · ${b} + ${c} : ${d}`,
        tacan,
        pogresanRedosled,
        signature: `kombinovane4:t3div1:${a},${b},${c},${d}`,
        objasnjenje: `Prvo množenje i deljenje: ${a} · ${b} = ${a * b} i ${c} : ${d} = ${q}, zatim sabiranje: ${a * b} + ${q} = ${tacan}.`,
      }
    }
    // N : (a · b) — deljenje zagradom (proizvodom)
    const a = ceoBroj(rng, 2, 12)
    const b = ceoBroj(rng, 2, 12)
    const k = ceoBroj(rng, 2, 200)
    const N = a * b * k
    const pogresanRedosled = Math.floor(N / a) * b // pogrešno: (N:a)·b umesto N:(a·b)
    return {
      text: `${N} : (${a} · ${b})`,
      tacan: k,
      pogresanRedosled,
      signature: `kombinovane4:t3div2:${N},${a},${b}`,
      objasnjenje: `Prvo zagrada: ${a} · ${b} = ${a * b}, zatim deljenje: ${N} : ${a * b} = ${k}.`,
    }
  }
  if (tezina === 4) {
    // Izraz sa promenljivom: a · x ± b, dato x (veći brojevi nego t1-t3)
    const a = ceoBroj(rng, 2, 80)
    const x = ceoBroj(rng, 2, 5_000)
    const plus = rng() < 0.5
    const b = plus ? ceoBroj(rng, 10, 50_000) : ceoBroj(rng, 10, Math.max(10, Math.min(50_000, a * x)))
    const tacan = plus ? a * x + b : a * x - b
    const naivno = plus ? a * (x + b) : a * (x - b)
    return {
      text: `${a} · x ${plus ? '+' : '−'} ${b}, ako je x = ${x}`,
      tacan,
      pogresanRedosled: naivno >= 0 ? naivno : tacan + 10,
      signature: `kombinovane4:t4var:${a},${plus ? '+' : '-'}${b},${x}`,
      objasnjenje: `Zameni x = ${x}: ${a} · ${x} ${plus ? '+' : '−'} ${b} = ${a * x} ${plus ? '+' : '−'} ${b} = ${tacan}.`,
    }
  }
  // Ekspert: 50/50 — a·(x+b)−c (promenljiva u zagradi), ili a·(x+b):c−d (ugnježdeno sa deljenjem)
  if (rng() < 0.5) {
    const a = ceoBroj(rng, 2, 20)
    const b = ceoBroj(rng, 2, 200)
    const x = ceoBroj(rng, 2, 999)
    const unutra = x + b
    const proizvod = a * unutra
    const c = ceoBroj(rng, 10, Math.max(10, Math.min(5000, proizvod)))
    const tacan = proizvod - c
    const naivno = a * x + b - c // zaboravio da b ide u zagradu pre množenja
    return {
      text: `${a} · (x + ${b}) − ${c}, ako je x = ${x}`,
      tacan,
      pogresanRedosled: naivno >= 0 ? naivno : tacan + 10,
      signature: `kombinovane4:t5var:${a},${b},${c},${x}`,
      objasnjenje: `Zameni x = ${x}: ${a} · (${x} + ${b}) − ${c} = ${a} · ${unutra} − ${c} = ${proizvod} − ${c} = ${tacan}.`,
    }
  }
  // a · (x + b) : c − d — unutra je namerno umnožak c da deljenje bude egzaktno
  const a = ceoBroj(rng, 2, 15)
  const c = ceoBroj(rng, 2, 12)
  const k = ceoBroj(rng, 2, 80) // kvocijent po deljenju sa c
  const unutra = k * c
  const b = ceoBroj(rng, 2, Math.max(2, unutra - 2))
  const x = unutra - b
  const kvocijent = a * k
  const d = ceoBroj(rng, 2, Math.max(2, Math.min(500, kvocijent)))
  const tacan = kvocijent - d
  const naivno = Math.floor((a * unutra) / c) - d + 1 // blaga varijacija greške (van za jedan) kao distraktor
  return {
    text: `${a} · (x + ${b}) : ${c} − ${d}, ako je x = ${x}`,
    tacan,
    pogresanRedosled: naivno >= 0 ? naivno : tacan + 10,
    signature: `kombinovane4:t5div:${a},${b},${c},${d},${x}`,
    objasnjenje: `Zameni x = ${x}: ${a} · (${x} + ${b}) = ${a} · ${unutra} = ${a * unutra}, pa ${a * unutra} : ${c} = ${kvocijent}, na kraju ${kvocijent} − ${d} = ${tacan}.`,
  }
}

// ---------------------------------------------------------------------------
// Struktura izraza (uklopljeno u istu oblast, iz radne sveske: koja se
// operacija prva računa, prost/složen izraz). Uvek single-choice — odgovor
// nije broj, pa se ne javlja kod tipa 'numeric'.

type Operacija = 'sabiranje' | 'oduzimanje' | 'mnozenje' | 'deljenje'
const NAZIVI_OPERACIJA: Record<Operacija, string> = {
  sabiranje: 'Sabiranje', oduzimanje: 'Oduzimanje', mnozenje: 'Množenje', deljenje: 'Deljenje',
}

interface SablonRedosled {
  naziv: string
  izraz: (a: number, b: number, c: number, d: number) => string
  prva: Operacija
}

// Šabloni konstruisani tako da je operacija koja se PRVA računa jednoznačna
// (zagrada, ili jedino prisutno množenje/deljenje) — nezavisno od konkretnih brojeva.
const SABLONI_REDOSLED: SablonRedosled[] = [
  { naziv: 'p1', izraz: (a, b, c, d) => `${a} + ${b} : ${c} − ${d}`, prva: 'deljenje' },
  { naziv: 'p2', izraz: (a, b, c, d) => `${a} · ${b} + ${c} − ${d}`, prva: 'mnozenje' },
  { naziv: 'p3', izraz: (a, b, c, d) => `(${a} + ${b}) · ${c} − ${d}`, prva: 'sabiranje' },
  { naziv: 'p4', izraz: (a, b, c, d) => `${a} − ${b} · ${c} + ${d}`, prva: 'mnozenje' },
  { naziv: 'p5', izraz: (a, b, c, d) => `(${a} − ${b}) : ${c} + ${d}`, prva: 'oduzimanje' },
]

function redosledPitanje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const sablon = izaberi(rng, SABLONI_REDOSLED)
  const a = ceoBroj(rng, 10, 999)
  const b = ceoBroj(rng, 10, 999)
  const c = ceoBroj(rng, 2, 20)
  const d = ceoBroj(rng, 10, 999)
  const izraz = sablon.izraz(a, b, c, d)
  const signature = `kombinovane4:struktura:redosled:${sablon.naziv}:${a},${b},${c},${d}`
  if (taken.has(signature)) return null
  const sve: Operacija[] = ['sabiranje', 'oduzimanje', 'mnozenje', 'deljenje']
  const promesano = promesaj(rng, sve)
  const options = promesano.map((op, i) => ({ id: `o${i + 1}`, text: NAZIVI_OPERACIJA[op] }))
  const correctId = options[promesano.indexOf(sablon.prva)].id
  return {
    type: 'single',
    text: `Koja se računska operacija PRVA izračunava u izrazu: ${izraz}?`,
    options,
    correct: { optionId: correctId },
    explanation: `Prvo se računa: ${NAZIVI_OPERACIJA[sablon.prva]} — zagrade imaju prednost, a od preostalih operacija prvo idu množenje i deljenje.`,
    hint: 'Redosled: prvo zagrade, zatim množenje i deljenje, na kraju sabiranje i oduzimanje.',
    points: poeniZaTezinu(cfg.difficulty),
    topicSlug: cfg.topicSlug,
    difficulty: cfg.difficulty,
    signature,
  }
}

interface Kandidat { izraz: string; id: string }

function napraviProstIzraz(rng: Rng): Kandidat {
  const op = izaberi(rng, ['+', '−', '·', ':'] as const)
  if (op === ':') {
    const delilac = ceoBroj(rng, 2, 20)
    const kolicnik = ceoBroj(rng, 10, 999)
    const deljenik = delilac * kolicnik
    return { izraz: `${deljenik} : ${delilac}`, id: `del:${deljenik},${delilac}` }
  }
  if (op === '−') {
    const a = ceoBroj(rng, 100, 9999)
    const b = ceoBroj(rng, 1, a)
    return { izraz: `${a} − ${b}`, id: `odu:${a},${b}` }
  }
  if (op === '·') {
    const a = ceoBroj(rng, 10, 9999)
    const b = ceoBroj(rng, 2, 20)
    return { izraz: `${a} · ${b}`, id: `mno:${a},${b}` }
  }
  const a = ceoBroj(rng, 10, 9999)
  const b = ceoBroj(rng, 10, 9999)
  return { izraz: `${a} + ${b}`, id: `sab:${a},${b}` }
}

function napraviSlozenIzraz(rng: Rng): Kandidat {
  const ponovljena = rng() < 0.5
  const a = ceoBroj(rng, 10, 999)
  const b = ceoBroj(rng, 10, 999)
  if (ponovljena) {
    const d = ceoBroj(rng, 10, 999)
    return { izraz: `${a} + ${b} + ${d}`, id: `ponovljena:${a},${b},${d}` }
  }
  const c = ceoBroj(rng, 2, 20)
  return { izraz: `${a} · ${c} + ${b}`, id: `razlicite:${a},${c},${b}` }
}

// Ponudi 4 izraza (1 tražene vrste + 3 suprotne) — izbegava binarni izbor
// (za koji je potreban ≥3 opcija u single-choice po celoj bazi generatora).
function prostSlozenPitanje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const trazimoProst = rng() < 0.5
  const tacanKandidat = trazimoProst ? napraviProstIzraz(rng) : napraviSlozenIzraz(rng)
  const svi: Kandidat[] = [
    tacanKandidat,
    trazimoProst ? napraviSlozenIzraz(rng) : napraviProstIzraz(rng),
    trazimoProst ? napraviSlozenIzraz(rng) : napraviProstIzraz(rng),
    trazimoProst ? napraviSlozenIzraz(rng) : napraviProstIzraz(rng),
  ]
  const tekstovi = svi.map((s) => s.izraz)
  if (new Set(tekstovi).size !== tekstovi.length) return null // retka slučajna podudarnost brojeva
  const signature = `kombinovane4:struktura:prostslozen:${trazimoProst ? 'prost' : 'slozen'}:${svi.map((s) => s.id).join('|')}`
  if (taken.has(signature)) return null
  const promesano = promesaj(rng, svi)
  const options = promesano.map((s, i) => ({ id: `o${i + 1}`, text: s.izraz }))
  const correctId = options[promesano.indexOf(tacanKandidat)].id
  return {
    type: 'single',
    text: `Koji od navedenih izraza je ${trazimoProst ? 'PROST' : 'SLOŽEN'} izraz?`,
    options,
    correct: { optionId: correctId },
    explanation: trazimoProst
      ? `${tacanKandidat.izraz} je PROST izraz — sadrži samo jednu računsku operaciju koja se ne ponavlja. Ostali izrazi su složeni.`
      : `${tacanKandidat.izraz} je SLOŽEN izraz — sadrži više različitih operacija, ili istu operaciju koja se ponavlja. Ostali izrazi su prosti.`,
    hint: 'Prost izraz ima tačno jednu operaciju bez ponavljanja. Složen ima dve ili više (ili istu koja se ponavlja).',
    points: poeniZaTezinu(cfg.difficulty),
    topicSlug: cfg.topicSlug,
    difficulty: cfg.difficulty,
    signature,
  }
}

export const kombinovane4: TopicGenerator = {
  slug: 'kombinovane-operacije-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.type !== 'numeric' && rng() < 0.25) {
      const r = rng() < 0.5 ? redosledPitanje(rng, cfg, taken) : prostSlozenPitanje(rng, cfg, taken)
      if (r) return r
    }

    const izraz = napraviIzraz(rng, cfg.difficulty)
    if (taken.has(izraz.signature)) return null

    return upakujRacun(cfg, rng, {
      text: `Izračunaj: ${izraz.text} = ?`,
      tacan: izraz.tacan,
      kandidati: [
        izraz.pogresanRedosled,
        izraz.tacan + 10, izraz.tacan - 10, izraz.tacan + 1,
      ],
      explanation: izraz.objasnjenje,
      hint: 'Zagrade prve, zatim množenje/deljenje, na kraju sabiranje/oduzimanje. Ako je dato x, zameni ga brojem pre računanja.',
      signature: izraz.signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
