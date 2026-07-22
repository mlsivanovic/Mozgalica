// Generator: množenje (4. razred) — višecifreni × višecifreni, do 1 000 000.
// Isti "budžetiraj preostali činilac" trik kao src/generator/moduli/mnozenje.ts,
// samo veći opseg i naglasak na množenju decadnom jedinicom (10/100/1000/...).
import type { Tezina } from '../../types/db'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from '../moduli/zajednicko'

const MAX_DISTRAKTOR = 12_000_000
const DECADNE = [10, 100, 1_000] as const

function napraviCinioce(rng: Rng, tezina: Tezina): number[] {
  if (tezina === 1) return [ceoBroj(rng, 11, 99), ceoBroj(rng, 11, 99)]
  if (tezina === 2) {
    // Mešano: 3-cifreni × 1-cifreni, ili množenje decadnom jedinicom
    if (rng() < 0.5) return [ceoBroj(rng, 100, 999), ceoBroj(rng, 2, 9)]
    const decadna = izaberi(rng, DECADNE)
    const budzetBaza = Math.max(2, Math.floor(100_000 / decadna))
    return [ceoBroj(rng, 2, budzetBaza), decadna]
  }
  if (tezina === 3) {
    // 3-cifreni × 2-cifreni
    const a = ceoBroj(rng, 100, 999)
    const budzetB = Math.max(11, Math.floor(500_000 / a))
    return [a, ceoBroj(rng, 11, Math.min(99, budzetB))]
  }
  if (tezina === 4) {
    // Mešano: 4-cifreni × 2-cifreni, ili 3-cifreni × 3-cifreni
    if (rng() < 0.5) {
      const a = ceoBroj(rng, 1_000, 9_999)
      const budzetB = Math.max(11, Math.floor(2_000_000 / a))
      return [a, ceoBroj(rng, 11, Math.min(99, budzetB))]
    }
    const a = ceoBroj(rng, 100, 999)
    const budzetB = Math.max(100, Math.floor(2_000_000 / a))
    return [a, ceoBroj(rng, 100, Math.min(999, budzetB))]
  }
  // Ekspert: 4-cifreni × 3-cifreni (proizvod do ~10M), ili 5-cifreni × 2-cifreni
  if (rng() < 0.5) {
    const a = ceoBroj(rng, 1_000, 9_999)
    const budzetB = Math.max(100, Math.floor(10_000_000 / a))
    return [a, ceoBroj(rng, 100, Math.min(999, budzetB))]
  }
  const a = ceoBroj(rng, 10_000, 99_999)
  const budzetB = Math.max(11, Math.floor(10_000_000 / a))
  return [a, ceoBroj(rng, 11, Math.min(99, budzetB))]
}

// ---------------------------------------------------------------------------
// Svojstva množenja + dekadne jedinice (uklopljeno u istu oblast, iz radne
// sveske: zavisnost/stalnost proizvoda, distributivnost, komutativnost/
// asocijativnost bez računanja, nepoznati činilac i rastavljanje dekadnih).

// Dekadne jedinice: nepoznati činilac ("240 · __ = 240000") ili rastavljanje ("40000 = 4 · __")
function dekadneNepoznatiCinilac(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const d = izaberi(rng, [10, 100, 1_000, 10_000] as const)
  const rastavi = rng() < 0.5
  if (rastavi) {
    const a = ceoBroj(rng, 2, 9)
    const n = a * d
    const signature = `mnozenje4:dek:rastavi:${n},${a}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Dopuni: ${n} = ${a} · __`,
      tacan: d,
      kandidati: [n, a, d * 10, Math.max(1, d / 10)],
      explanation: `${n} : ${a} = ${d}, pa je ${n} = ${a} · ${d}.`,
      hint: 'Podeli dati broj sa poznatim činiocem da nađeš drugi.',
      signature,
      maxDistraktor: 200_000,
    })
  }
  const baza = ceoBroj(rng, 12, 999)
  const tacan = baza * d
  const signature = `mnozenje4:dek:cinilac:${baza},${d}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Dopuni: ${baza} · __ = ${tacan}`,
    tacan: d,
    kandidati: [baza, tacan, d * 10, Math.max(1, d / 10)],
    explanation: `${tacan} : ${baza} = ${d}, pa je ${baza} · ${d} = ${tacan}.`,
    hint: 'Podeli proizvod poznatim činiocem da nađeš dekadnu jedinicu.',
    signature,
    maxDistraktor: 200_000,
  })
}

// Zavisnost proizvoda od promene činioca — proizvod se menja u ISTOM smeru, isto toliko puta
function zavisnostProizvoda(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const P = ceoBroj(rng, 100, 500_000)
  const k = ceoBroj(rng, 2, 12)
  const pov = rng() < 0.5
  let tacan: number
  if (pov) {
    tacan = P * k
  } else {
    if (P % k !== 0) return null
    tacan = P / k
  }
  const signature = `mnozenje4:sv:zav:${P},${k},${pov ? 'pov' : 'sman'}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Proizvod dva broja je ${P}. Koliki će biti proizvod ako se jedan činilac ${pov ? 'poveća' : 'smanji'} ${k} puta?`,
    tacan,
    kandidati: [P, P * k, P + k, tacan + 10],
    explanation: `Kad se jedan činilac ${pov ? 'poveća' : 'smanji'} ${k} puta, proizvod se ${pov ? 'povećava' : 'smanjuje'} isto toliko puta: ${P} ${pov ? '·' : ':'} ${k} = ${tacan}.`,
    hint: 'Kad promeniš jedan činilac X puta, proizvod se menja isto toliko puta, u istom smeru.',
    signature,
    maxDistraktor: 6_000_000,
  })
}

// Distributivnost: broj k puta veći od zbira/razlike a i b → (a±b)·k
function distributivnostMnozenje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const a = ceoBroj(rng, 10, 500)
  const b = ceoBroj(rng, 10, 500)
  const k = ceoBroj(rng, 2, 20)
  const zbir = rng() < 0.5
  const unutra = zbir ? a + b : Math.abs(a - b)
  if (unutra === 0) return null
  const tacan = unutra * k
  const signature = `mnozenje4:sv:distrib:${a},${b},${k},${zbir ? 'zbir' : 'razlika'}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Koliki je broj koji je ${k} puta veći od ${zbir ? 'zbira' : 'razlike'} brojeva ${a} i ${b}?`,
    tacan,
    kandidati: [unutra, a * k + b, unutra + k, tacan + 10],
    explanation: `${zbir ? 'Zbir' : 'Razlika'}: ${a} ${zbir ? '+' : '−'} ${b} = ${unutra}, pa ${unutra} · ${k} = ${tacan}.`,
    hint: 'Prvo izračunaj zbir/razliku u zagradi, pa tek onda pomnoži.',
    signature,
    maxDistraktor: 20_000,
  })
}

// Komutativnost/asocijativnost bez računanja: __ · b · c = a · b · c
function komutativnostMnozenje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const a = ceoBroj(rng, 2, 999)
  const b = ceoBroj(rng, 2, 99)
  const c = ceoBroj(rng, 2, 99)
  const P = a * b * c
  const signature = `mnozenje4:sv:kom:${a},${b},${c}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Bez računanja, upiši broj: __ · ${b} · ${c} = ${P}, ako znaš da je ${a} · ${b} · ${c} = ${P}`,
    tacan: a,
    kandidati: [b, c, P, a + 1],
    explanation: `Činioci mogu zameniti mesta i grupisati se na razne načine, a proizvod ostaje isti — pa je __ = ${a}.`,
    hint: 'Redosled i grupisanje činilaca ne menja proizvod.',
    signature,
    maxDistraktor: 10_000_000,
  })
}

// Stalnost proizvoda (dopuna): a · b = (a : k) · (b · __)
function stalnostProizvoda(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const k = izaberi(rng, [2, 3, 4, 5, 6, 10] as const)
  const aBaza = ceoBroj(rng, 2, 9_999)
  const a = aBaza * k
  const b = ceoBroj(rng, 2, 999)
  const signature = `mnozenje4:sv:stal:${a},${b},${k}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Bez računanja, upiši broj: ${a} · ${b} = (${a} : ${k}) · (${b} · __)`,
    tacan: k,
    kandidati: [a, b, aBaza, k + 1],
    explanation: `Proizvod ostaje isti ako jedan činilac podelimo, a drugi pomnožimo istim brojem: pošto je prvi činilac podeljen sa ${k}, drugi mora biti pomnožen sa ${k} da proizvod ostane isti — pa je __ = ${k}.`,
    hint: 'Proizvod se ne menja ako jedan činilac podeliš, a drugi pomnožiš ISTIM brojem.',
    signature,
    maxDistraktor: 200_000,
  })
}

// Ekspert identitet: ako je a · x = P, koliko je (a · k) · (x · m)
function identitetMnozenje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const P = ceoBroj(rng, 100, 50_000)
  const k = ceoBroj(rng, 2, 12)
  const m = ceoBroj(rng, 2, 12)
  const tacan = P * k * m
  const signature = `mnozenje4:sv:ident:${P},${k},${m}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Ako je a · x = ${P}, koliko je (a · ${k}) · (x · ${m})?`,
    tacan,
    kandidati: [P, P * k, P * m, tacan + 10],
    explanation: `(a · ${k}) · (x · ${m}) = (a · x) · ${k} · ${m} = ${P} · ${k} · ${m} = ${tacan}.`,
    hint: 'Grupiši i sredi: (a·k)·(x·m) = (a·x)·k·m — iskoristi da već znaš a·x.',
    signature,
    maxDistraktor: 10_000_000,
  })
}

export const mnozenje4: TopicGenerator = {
  slug: 'mnozenje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1 && rng() < 0.3) {
      const r = dekadneNepoznatiCinilac(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 2 && rng() < 0.3) {
      const r = zavisnostProizvoda(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 3 && rng() < 0.3) {
      const r = rng() < 0.5 ? distributivnostMnozenje(rng, cfg, taken) : komutativnostMnozenje(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 4 && rng() < 0.3) {
      const r = stalnostProizvoda(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 5 && rng() < 0.3) {
      const r = identitetMnozenje(rng, cfg, taken)
      if (r) return r
    }

    const cinioci = napraviCinioce(rng, cfg.difficulty)
    const tacan = cinioci.reduce((p, x) => p * x, 1)
    const signature = `mnozenje4:${[...cinioci].sort((a, b) => a - b).join('x')}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${cinioci.join(' · ')} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1] = dvaImena(rng)
      if (cinioci.length === 2 && cinioci[1] < 1000) {
        const [a, b] = cinioci
        text = `${ime1} u svakoj od ${b} kutija pakuje po ${kolicina(a, predmet, 'akuz')}. Koliko je ukupno ${genMn(predmet)}?`
      } else {
        const poslednji = cinioci[cinioci.length - 1]
        text = `Pomnoži brojeve ${cinioci.slice(0, -1).join(', ')} i ${poslednji} — koliki je proizvod?`
      }
    }

    const kandidati = cinioci.length === 2
      ? [
          (cinioci[0] + 1) * cinioci[1], (cinioci[0] - 1) * cinioci[1],
          cinioci[0] * (cinioci[1] + 1), cinioci[0] * (cinioci[1] - 1),
          cinioci[0] + cinioci[1],
        ]
      : [
          cinioci.slice(0, -1).reduce((p, x) => p * x, 1), // stao pre poslednjeg činioca
          tacan + 10, tacan - 10,
        ]

    return upakujRacun(cfg, rng, {
      text, tacan, kandidati,
      explanation: `${cinioci.join(' · ')} = ${tacan}`,
      hint: 'Množi pismeno: prvo jedinicama, pa desecima, pa stotinama drugog činioca, pa saberi delimične proizvode.',
      signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
