// Generator: sabiranje (4. razred) — višecifreni brojevi, do 1 000 000.
// Isti pattern kao src/generator/moduli/sabiranje.ts (reuse-uje viseSabiraka),
// samo veći opseg po nivou težine.
import { bezPrenosa, zamenaCifara } from '../distraktori'
import { viseSabiraka } from '../moduli/sabiranje'
import type { Tezina } from '../../types/db'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from '../moduli/zajednicko'

// Gornja granica distraktora — jedna zajednička konstanta za sve nivoe (samo
// gornji limit, ne mora biti tesna) da napraviDistraktore ne odbaci kandidate.
const MAX_DISTRAKTOR = 6_000_000

function napraviSabirke(rng: Rng, tezina: Tezina): number[] {
  if (tezina === 1) return viseSabiraka(rng, 2, 10_000, 100_000)
  if (tezina === 2) return viseSabiraka(rng, 3, 10_000, 100_000)
  if (tezina === 3) return viseSabiraka(rng, 3, 100_000, 1_000_000)
  if (tezina === 4) return viseSabiraka(rng, 4, 100_000, 1_000_000)
  return viseSabiraka(rng, 4, 1_000_000, 5_000_000)
}

// ---------------------------------------------------------------------------
// Svojstva sabiranja (uklopljeno u istu oblast, iz radne sveske: nula kod
// sabiranja, zavisnost/stalnost zbira, komutativnost bez računanja).

// Nula kod sabiranja — nekoliko oblika (str. 36 radne sveske)
function nulaSabiranje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const n = ceoBroj(rng, 100, 999_999)
  const oblik = izaberi(rng, ['n0', '0n', 'n00', 'nAA'] as const)
  if (oblik === 'nAA') {
    const a = ceoBroj(rng, 2, 999)
    const signature = `sabiranje4:sv:nula:nAA:${n}:${a}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Izračunaj: ${n} + (${a} − ${a}) = ?`,
      tacan: n,
      kandidati: [n + a, n - a, n + 1, n - 1],
      explanation: `Prvo zagrada: ${a} − ${a} = 0. Zbir bilo kog broja i nule je taj isti broj, pa je ${n} + 0 = ${n}.`,
      hint: 'Prvo izračunaj zagradu — možda je rezultat nula.',
      signature,
      maxDistraktor: 2_000_000,
    })
  }
  const signature = `sabiranje4:sv:nula:${oblik}:${n}`
  if (taken.has(signature)) return null
  const text = oblik === 'n0' ? `Izračunaj: ${n} + 0 = ?`
    : oblik === '0n' ? `Izračunaj: 0 + ${n} = ?`
    : `Izračunaj: ${n} + 0 + 0 = ?`
  return upakujRacun(cfg, rng, {
    text,
    tacan: n,
    kandidati: [n + 1, n - 1, 0, n * 2],
    explanation: `Zbir bilo kog broja i nule jednak je tom istom broju: ${n}.`,
    hint: 'Sabiranje sa nulom ne menja broj.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Zavisnost zbira od promene sabirka — zbir se menja u ISTOM smeru i za isto toliko
function zavisnostZbira(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const S = ceoBroj(rng, 1_000, 999_999)
  const k = ceoBroj(rng, 10, Math.min(50_000, S))
  const pov = rng() < 0.5
  const tacan = pov ? S + k : S - k
  if (tacan < 0) return null
  const signature = `sabiranje4:sv:zav:${S},${k},${pov ? 'pov' : 'sman'}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Zbir dva broja je ${S}. Koliki će biti zbir ako se jedan sabirak ${pov ? 'poveća' : 'smanji'} za ${k}?`,
    tacan,
    kandidati: [S, S + k, S - k, tacan + 10],
    explanation: `Ako se sabirak ${pov ? 'poveća' : 'smanji'} za ${k}, zbir se ${pov ? 'povećava' : 'smanjuje'} za isto toliko: ${S} ${pov ? '+' : '−'} ${k} = ${tacan}.`,
    hint: 'Kad promeniš jedan sabirak, zbir se menja za istu tu vrednost, u istom smeru.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Komutativnost sabiranja bez računanja: __ + p = p + q
function komutativnostSabiranje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const p = ceoBroj(rng, 1_000, 999_999)
  const q = ceoBroj(rng, 1_000, 999_999)
  const signature = `sabiranje4:sv:kom:${p},${q}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Bez računanja, upiši broj: __ + ${p} = ${p} + ${q}`,
    tacan: q,
    kandidati: [p, p + q, q + 1, q - 1],
    explanation: `Sabirci mogu zameniti mesta, a zbir ostaje isti: __ + ${p} = ${p} + ${q} znači da je __ = ${q}.`,
    hint: 'Zamena mesta sabiraka ne menja zbir — uporedi obe strane broj po broj.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Stalnost zbira (dopuna): a + b = (a − d) + (b + __)
function stalnostZbira(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const a = ceoBroj(rng, 1_000, 999_999)
  const b = ceoBroj(rng, 1_000, 999_999)
  const d = ceoBroj(rng, 10, Math.min(500, a))
  const signature = `sabiranje4:sv:stal:${a},${b},${d}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Bez računanja, upiši broj: ${a} + ${b} = (${a} − ${d}) + (${b} + __)`,
    tacan: d,
    kandidati: [a, b, d + 1, d - 1],
    explanation: `Zbir ostaje isti ako jednom sabirku oduzmemo, a drugom dodamo isti broj: pošto je prvi sabirak umanjen za ${d}, drugi mora biti uvećan za ${d} da zbir ostane ${a + b}.`,
    hint: 'Zbir se ne menja ako od jednog sabirka oduzmeš, a drugom dodaš isti broj.',
    signature,
    maxDistraktor: 2_000_000,
  })
}

// Ekspert identitet: ako je a + b = S, koliko je (a + c) + (b + d)
function identitetSabiranje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const S = ceoBroj(rng, 10_000, 4_000_000)
  const c = ceoBroj(rng, 100, 500_000)
  const d = ceoBroj(rng, 100, 500_000)
  const tacan = S + c + d
  const signature = `sabiranje4:sv:ident:${S},${c},${d}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Ako je zbir dva broja a i b jednak ${S} (a + b = ${S}), koliko je (a + ${c}) + (b + ${d})?`,
    tacan,
    kandidati: [S, S + c, S + d, tacan + 10],
    explanation: `(a + ${c}) + (b + ${d}) = (a + b) + ${c} + ${d} = ${S} + ${c} + ${d} = ${tacan}.`,
    hint: 'Rasporedi sabirke: (a+c)+(b+d) = (a+b)+c+d — iskoristi da već znaš a+b.',
    signature,
    maxDistraktor: 6_000_000,
  })
}

export const sabiranje4: TopicGenerator = {
  slug: 'sabiranje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1 && rng() < 0.3) {
      const r = nulaSabiranje(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 2 && rng() < 0.3) {
      const r = zavisnostZbira(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 3 && rng() < 0.3) {
      const r = komutativnostSabiranje(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 4 && rng() < 0.3) {
      const r = stalnostZbira(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 5 && rng() < 0.3) {
      const r = identitetSabiranje(rng, cfg, taken)
      if (r) return r
    }

    const operandi = napraviSabirke(rng, cfg.difficulty)
    const tacan = operandi.reduce((s, x) => s + x, 0)
    const signature = `sabiranje4:${[...operandi].sort((a, b) => a - b).join('+')}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${operandi.join(' + ')} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1, ime2] = dvaImena(rng)
      if (operandi.length === 2) {
        const [a, b] = operandi
        const sabloni = [
          `${ime1} ima ${kolicina(a, predmet, 'akuz')}, a ${ime2} ima ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} imaju zajedno?`,
          `U prvom skladištu se nalazi ${kolicina(a, predmet)}, a u drugom ${kolicina(b, predmet)}. Koliko je ukupno ${genMn(predmet)}?`,
          `${ime1} sakupi ${kolicina(a, predmet, 'akuz')}, a zatim dobije još ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} sada ima?`,
        ]
        text = izaberi(rng, sabloni)
      } else {
        const spisak = operandi.map((o) => kolicina(o, predmet, 'akuz'))
        const poslednji = spisak[spisak.length - 1]
        text = `${ime1} sakupi redom: ${spisak.slice(0, -1).join(', ')} i na kraju još ${poslednji}. Koliko je to ukupno ${genMn(predmet)}?`
      }
    }

    const kandidati = operandi.length === 2
      ? [
          bezPrenosa(operandi[0], operandi[1]),
          tacan + 10, tacan - 10,
          zamenaCifara(tacan),
          operandi[0] - operandi[1] >= 0 ? operandi[0] - operandi[1] : tacan + 1,
        ]
      : [
          operandi.slice(0, -1).reduce((s, x) => s + x, 0), // stao pre poslednjeg sabirka
          tacan + 10, tacan - 10, zamenaCifara(tacan),
        ]

    return upakujRacun(cfg, rng, {
      text, tacan, kandidati,
      explanation: `${operandi.join(' + ')} = ${tacan}`,
      hint: 'Saberi pismeno: jedinice, desetice, stotine, hiljade — redom sa desna na levo.',
      signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
