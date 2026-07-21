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

export const mnozenje4: TopicGenerator = {
  slug: 'mnozenje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
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
