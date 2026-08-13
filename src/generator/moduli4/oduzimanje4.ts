// Generator: oduzimanje (4. razred) — višecifreni brojevi, do 1 000 000.
// Isti pattern kao src/generator/moduli/oduzimanje.ts (reuse-uje lanacOduzimanja),
// samo veći opseg po nivou težine.
import { bezPozajmice, zamenaCifara } from '../distraktori.ts'
import { lanacOduzimanja } from '../moduli/oduzimanje.ts'
import type { Tezina } from '../../types/db.ts'
import { ceoBroj, izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from '../moduli/zajednicko.ts'

const MAX_DISTRAKTOR = 6_000_000

function napraviBrojeve(rng: Rng, tezina: Tezina): number[] {
  if (tezina === 1) return lanacOduzimanja(rng, 1, 0, 50_000, 1_000, 50_000)
  if (tezina === 2) return lanacOduzimanja(rng, 1, 0, 500_000, 10_000, 500_000)
  if (tezina === 3) return lanacOduzimanja(rng, 2, 0, 400_000, 10_000, 300_000)
  if (tezina === 4) return lanacOduzimanja(rng, 2, 0, 2_000_000, 50_000, 1_500_000)
  return lanacOduzimanja(rng, 3, 0, 1_000_000, 50_000, 1_300_000)
}

// ---------------------------------------------------------------------------
// Svojstva oduzimanja (uklopljeno u istu oblast, iz radne sveske: nula kod
// oduzimanja, zavisnost/stalnost razlike od umanjenika i umanjioca).

// Nula kod oduzimanja — n−0, n−n, n−(a−a) (str. 36 radne sveske)
function nulaOduzimanje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const n = ceoBroj(rng, 100, 999_999)
  const oblik = izaberi(rng, ['n0', 'nn', 'nAA'] as const)
  if (oblik === 'nn') {
    const signature = `oduzimanje4:sv:nula:nn:${n}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Izračunaj: ${n} − ${n} = ?`,
      tacan: 0,
      kandidati: [n, 1, n - 1],
      explanation: `Razlika dva jednaka broja uvek je nula: ${n} − ${n} = 0.`,
      hint: 'Kada oduzmeš broj od samog sebe, uvek dobiješ nulu.',
      signature,
      maxDistraktor: 2_000_000,
    })
  }
  if (oblik === 'nAA') {
    const a = ceoBroj(rng, 2, 999)
    const signature = `oduzimanje4:sv:nula:nAA:${n}:${a}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Izračunaj: ${n} − (${a} − ${a}) = ?`,
      tacan: n,
      kandidati: [n - a, n + a, n + 1, n - 1],
      explanation: `Prvo zagrada: ${a} − ${a} = 0. Kada od broja oduzmeš nulu, on ostaje isti: ${n} − 0 = ${n}.`,
      hint: 'Prvo izračunaj zagradu — možda je rezultat nula.',
      signature,
      maxDistraktor: 2_000_000,
    })
  }
  const signature = `oduzimanje4:sv:nula:n0:${n}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Izračunaj: ${n} − 0 = ?`,
    tacan: n,
    kandidati: [0, n + 1, n - 1],
    explanation: `Kada od broja oduzmeš nulu, on ostaje nepromenjen: ${n} − 0 = ${n}.`,
    hint: 'Oduzimanje nule ne menja broj.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Zavisnost razlike od promene UMANJENIKA — razlika se menja u ISTOM smeru
function zavisnostRazlikeUmanjenik(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const R = ceoBroj(rng, 1_000, 999_999)
  const k = ceoBroj(rng, 10, 50_000)
  const pov = rng() < 0.5
  const tacan = pov ? R + k : R - k
  if (tacan < 0) return null
  const signature = `oduzimanje4:sv:zav:${R},${k},umanjenik,${pov ? 'pov' : 'sman'}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Razlika dva broja je ${R}. Kolika će biti razlika ako se umanjenik ${pov ? 'poveća' : 'smanji'} za ${k}?`,
    tacan,
    kandidati: [R, R + k, R - k, tacan + 10],
    explanation: `Kad se umanjenik ${pov ? 'poveća' : 'smanji'} za ${k}, razlika se menja za isto toliko, u ISTOM smeru: ${R} ${pov ? '+' : '−'} ${k} = ${tacan}.`,
    hint: 'Ako se umanjenik promeni, razlika se menja za istu vrednost i u istom smeru.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Zavisnost razlike od promene UMANJIOCA — razlika se menja u SUPROTNOM smeru
function zavisnostRazlikeUmanjilac(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const R = ceoBroj(rng, 1_000, 999_999)
  const k = ceoBroj(rng, 10, 50_000)
  const pov = rng() < 0.5
  const tacan = pov ? R - k : R + k
  if (tacan < 0) return null
  const signature = `oduzimanje4:sv:zav:${R},${k},umanjilac,${pov ? 'pov' : 'sman'}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Razlika dva broja je ${R}. Kolika će biti razlika ako se umanjilac ${pov ? 'poveća' : 'smanji'} za ${k}?`,
    tacan,
    kandidati: [R, R + k, R - k, tacan + 10],
    explanation: `Kad se umanjilac ${pov ? 'poveća' : 'smanji'} za ${k}, razlika se menja za isto toliko, u SUPROTNOM smeru: ${R} ${pov ? '−' : '+'} ${k} = ${tacan}.`,
    hint: 'Pažljivo: ako se umanjilac poveća, razlika se SMANJUJE (i obrnuto) — suprotan smer od umanjenika.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Stalnost razlike (dopuna): a − b = (a + d) − (b + __)
function stalnostRazlike(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const b = ceoBroj(rng, 1_000, 999_999)
  const a = b + ceoBroj(rng, 1_000, 999_999)
  const d = ceoBroj(rng, 10, 500)
  const signature = `oduzimanje4:sv:stal:${a},${b},${d}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Bez računanja, upiši broj: ${a} − ${b} = (${a} + ${d}) − (${b} + __)`,
    tacan: d,
    kandidati: [a, b, d + 1, d - 1],
    explanation: `Razlika ostaje ista ako umanjeniku i umanjiocu dodamo isti broj: pošto je umanjenik uvećan za ${d}, i umanjilac mora biti uvećan za ${d} da razlika ostane ${a - b}.`,
    hint: 'Razlika se ne menja ako umanjenik i umanjilac promeniš za ISTI broj u ISTOM smeru.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Ekspert identitet: ako je a − b = D, koliko je a − (b + c) / a − (b − c)
function identitetOduzimanje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const D = ceoBroj(rng, 100_000, 4_000_000)
  const c = ceoBroj(rng, 100, Math.min(500_000, D))
  const plus = rng() < 0.5
  const tacan = plus ? D - c : D + c
  if (tacan < 0) return null
  const signature = `oduzimanje4:sv:ident:${D},${c},${plus ? 'plus' : 'minus'}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: plus
      ? `Ako je a − b = ${D}, koliko je a − (b + ${c})?`
      : `Ako je a − b = ${D}, koliko je a − (b − ${c})?`,
    tacan,
    kandidati: [D, D + c, D - c, tacan + 10],
    explanation: plus
      ? `a − (b + ${c}) = (a − b) − ${c} = ${D} − ${c} = ${tacan}.`
      : `a − (b − ${c}) = (a − b) + ${c} = ${D} + ${c} = ${tacan}.`,
    hint: 'Ako se umanjilac (b) poveća, razlika se smanjuje; ako se umanjilac smanji, razlika se povećava.',
    signature,
    maxDistraktor: 6_000_000,
  })
}

export const oduzimanje4: TopicGenerator = {
  slug: 'oduzimanje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1 && rng() < 0.3) {
      const r = nulaOduzimanje(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 2 && rng() < 0.3) {
      const r = zavisnostRazlikeUmanjenik(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 3 && rng() < 0.3) {
      const r = zavisnostRazlikeUmanjilac(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 4 && rng() < 0.3) {
      const r = stalnostRazlike(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 5 && rng() < 0.3) {
      const r = identitetOduzimanje(rng, cfg, taken)
      if (r) return r
    }

    const operandi = napraviBrojeve(rng, cfg.difficulty)
    const tacan = operandi.slice(1).reduce((r, x) => r - x, operandi[0])
    const signature = `oduzimanje4:${operandi.join('-')}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${operandi.join(' − ')} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1, ime2] = dvaImena(rng)
      if (operandi.length === 2) {
        const [a, b] = operandi
        const sabloni = [
          `${ime1} ima ${kolicina(a, predmet, 'akuz')} i pokloni ${ime2} ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} ostaje?`,
          `U skladištu se nalazi ${kolicina(a, predmet)}. Ako iz njega izvezemo ${kolicina(b, predmet, 'akuz')}, koliko ${genMn(predmet)} ostaje?`,
          `${ime1} treba da sakupi ${kolicina(a, predmet, 'akuz')}, a već ima ${kolicina(b, predmet, 'akuz')}. Koliko mu još nedostaje?`,
        ]
        text = izaberi(rng, sabloni)
      } else {
        const [a, ...koraci] = operandi
        const spisak = koraci.map((k) => kolicina(k, predmet, 'akuz'))
        text = `${ime1} ima ${kolicina(a, predmet)}. Prvo potroši ${spisak[0]}, ${spisak.length > 1 ? `zatim još ${spisak.slice(1).join(', ')}` : ''}. Koliko ${genMn(predmet)} mu/joj ostaje?`
      }
    }

    const kandidati = operandi.length === 2
      ? [
          bezPozajmice(operandi[0], operandi[1]),
          tacan + 10, tacan - 10, zamenaCifara(tacan), tacan + 1,
        ]
      : [
          tacan + operandi[operandi.length - 1], // stao pre poslednjeg oduzimanja
          tacan + 10, tacan - 10, zamenaCifara(tacan),
        ]

    return upakujRacun(cfg, rng, {
      text, tacan, kandidati,
      explanation: `${operandi.join(' − ')} = ${tacan}`,
      hint: 'Oduzimaj pismeno: jedinice, desetice, stotine, hiljade — redom sa desna na levo.',
      signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
