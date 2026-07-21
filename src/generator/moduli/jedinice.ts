// Generator: merne jedinice (dužina, masa, zapremina)
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

interface Konverzija {
  iz: string
  u: string
  faktor: number
}

const LAKE: Konverzija[] = [
  { iz: 'm', u: 'cm', faktor: 100 },
  { iz: 'dm', u: 'cm', faktor: 10 },
  { iz: 'm', u: 'dm', faktor: 10 },
  { iz: 'kg', u: 'g', faktor: 1000 },
]

const SREDNJE: Konverzija[] = [
  { iz: 'km', u: 'm', faktor: 1000 },
  { iz: 'l', u: 'dl', faktor: 10 },
  { iz: 'l', u: 'cl', faktor: 100 },
  { iz: 'l', u: 'ml', faktor: 1000 },
  { iz: 'dl', u: 'cl', faktor: 10 },
  { iz: 'dl', u: 'ml', faktor: 100 },
  { iz: 'cl', u: 'ml', faktor: 10 },
  { iz: 'cm', u: 'mm', faktor: 10 },
]

export const jedinice: TopicGenerator = {
  slug: 'merne-jedinice',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty <= 2) {
      const k = izaberi(rng, cfg.difficulty === 1 ? LAKE : SREDNJE)
      // Vrednost ograničena da rezultat stane do 1000 (izuzetak: kg→g i km→m idu do 9000)
      const maks = k.faktor >= 1000 ? 9 : Math.floor(1000 / k.faktor)
      const n = ceoBroj(rng, 2, Math.max(2, maks))
      const tacan = n * k.faktor
      const signature = `jedinice:${k.iz}-${k.u}:${n}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko je ${n} ${k.iz} izraženo u jedinici ${k.u}?`,
        tacan,
        kandidati: [n * (k.faktor / 10), n * k.faktor * 10, n + k.faktor, tacan + 10],
        explanation: `1 ${k.iz} = ${k.faktor} ${k.u}, pa je ${n} ${k.iz} = ${n} · ${k.faktor} = ${tacan} ${k.u}.`,
        hint: `Seti se: 1 ${k.iz} = ${k.faktor} ${k.u}.`,
        signature,
        sufiks: k.u,
        maxDistraktor: 10000,
      })
    }
    if (cfg.difficulty === 3) {
      // Mešovit zapis, npr. 2 m 35 cm = ? cm
      const m = ceoBroj(rng, 1, 9)
      const cm = ceoBroj(rng, 1, 99)
      const tacan = m * 100 + cm
      const signature = `jedinice:mesovito:${m}m${cm}cm`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko je ${m} m ${cm} cm izraženo u centimetrima?`,
        tacan,
        kandidati: [m + cm, m * 10 + cm, m * 1000 + cm, tacan + 100],
        explanation: `${m} m = ${m * 100} cm, pa je ${m} m ${cm} cm = ${m * 100} + ${cm} = ${tacan} cm.`,
        hint: 'Prvo metre pretvori u centimetre (1 m = 100 cm), pa dodaj ostatak.',
        signature,
        sufiks: 'cm',
        maxDistraktor: 10000,
      })
    }
    if (cfg.difficulty === 4) {
      // Mešoviti zapis mase/zapremine, npr. 3 kg 250 g = ? g
      const par = izaberi(rng, [
        { iz1: 'kg', iz2: 'g', u: 'g', faktor: 1000, maks2: 999 },
        { iz1: 'l', iz2: 'dl', u: 'dl', faktor: 10, maks2: 9 },
        { iz1: 'l', iz2: 'cl', u: 'cl', faktor: 100, maks2: 99 },
        { iz1: 'l', iz2: 'ml', u: 'ml', faktor: 1000, maks2: 999 },
        { iz1: 'dl', iz2: 'ml', u: 'ml', faktor: 100, maks2: 99 },
      ] as const)
      const v1 = ceoBroj(rng, 1, 9)
      const v2 = ceoBroj(rng, 1, par.maks2)
      const tacan = v1 * par.faktor + v2
      const signature = `jedinice:mesovito2:${v1}${par.iz1}${v2}${par.iz2}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko je ${v1} ${par.iz1} ${v2} ${par.iz2} izraženo u jedinici ${par.u}?`,
        tacan,
        kandidati: [v1 + v2, v1 * 10 + v2, v1 * par.faktor * 10 + v2, tacan + par.faktor],
        explanation: `${v1} ${par.iz1} = ${v1 * par.faktor} ${par.u}, pa je ${v1} ${par.iz1} ${v2} ${par.iz2} = ${v1 * par.faktor} + ${v2} = ${tacan} ${par.u}.`,
        hint: `Prvo ${par.iz1} pretvori u ${par.u} (1 ${par.iz1} = ${par.faktor} ${par.u}), pa dodaj ostatak.`,
        signature,
        sufiks: par.u,
        maxDistraktor: 10000,
      })
    }
    // Ekspert: sabiranje dve mešovite veličine (dužina ili zapremina), npr.
    // 2 m 35 cm + 1 m 80 cm = ? cm ili 3 l 495 ml + 2 l 800 ml = ? ml.
    // maks1 je posebno stegnut za l→ml (faktor 1000) da zbir dva člana ne pređe
    // opšti limit od 10000 za merne jedinice (test „svi rezultati u opsegu…").
    const par = izaberi(rng, [
      { iz1: 'm', iz2: 'cm', u: 'cm', faktor: 100, maks1: 9, maks2: 99 },
      { iz1: 'l', iz2: 'dl', u: 'dl', faktor: 10, maks1: 9, maks2: 9 },
      { iz1: 'l', iz2: 'cl', u: 'cl', faktor: 100, maks1: 9, maks2: 99 },
      { iz1: 'l', iz2: 'ml', u: 'ml', faktor: 1000, maks1: 4, maks2: 999 },
      { iz1: 'dl', iz2: 'ml', u: 'ml', faktor: 100, maks1: 9, maks2: 99 },
    ] as const)
    const v1a = ceoBroj(rng, 1, par.maks1)
    const v2a = ceoBroj(rng, 1, par.maks2)
    const v1b = ceoBroj(rng, 1, par.maks1)
    const v2b = ceoBroj(rng, 1, par.maks2)
    const zbir1 = v1a * par.faktor + v2a
    const zbir2 = v1b * par.faktor + v2b
    const tacan = zbir1 + zbir2
    const signature = `jedinice:zbirmesovito:${v1a}${par.iz1}${v2a}${par.iz2}+${v1b}${par.iz1}${v2b}${par.iz2}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Koliko je ${v1a} ${par.iz1} ${v2a} ${par.iz2} + ${v1b} ${par.iz1} ${v2b} ${par.iz2} izraženo u jedinici ${par.u}?`,
      tacan,
      kandidati: [(v1a + v1b) * 10 + (v2a + v2b), zbir1 + v1b + v2b, tacan + par.faktor, tacan - par.faktor],
      explanation: `${v1a} ${par.iz1} ${v2a} ${par.iz2} = ${zbir1} ${par.u}, ${v1b} ${par.iz1} ${v2b} ${par.iz2} = ${zbir2} ${par.u}. Zbir: ${zbir1} + ${zbir2} = ${tacan} ${par.u}.`,
      hint: `Prvo svaku veličinu pretvori u ${par.u}, pa ih saberi.`,
      signature,
      sufiks: par.u,
      maxDistraktor: 10000,
    })
  },
}
