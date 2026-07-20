// Generator: nejednačine — traži se granični ceo broj (jedinstven, proverljiv odgovor),
// umesto "koji broj zadovoljava x < 15" što ima beskonačno mnogo tačnih odgovora
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

export const nejednacine: TopicGenerator = {
  slug: 'nejednacine',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty < 3) {
      const maks = cfg.difficulty === 1 ? 50 : 500
      const N = ceoBroj(rng, 2, maks)
      const smer = izaberi(rng, ['lt', 'gt'] as const)
      const signature = `nejednacine:${smer}:${N}`
      if (taken.has(signature)) return null

      if (smer === 'lt') {
        return upakujRacun(cfg, rng, {
          text: `Koji je najveći ceo broj koji je manji od ${N}?`,
          tacan: N - 1,
          kandidati: [N, N + 1, N - 2],
          explanation: `Najveći ceo broj manji od ${N} je ${N - 1}.`,
          hint: 'Broj mora biti strogo manji od granice, dakle jedan manji.',
          signature,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Koji je najmanji ceo broj koji je veći od ${N}?`,
        tacan: N + 1,
        kandidati: [N, N - 1, N + 2],
        explanation: `Najmanji ceo broj veći od ${N} je ${N + 1}.`,
        hint: 'Broj mora biti strogo veći od granice, dakle jedan veći.',
        signature,
      })
    }

    // Teško: dve granice — x je između L i U
    const L = ceoBroj(rng, 2, 500)
    const U = L + ceoBroj(rng, 2, 60)
    const trazi = izaberi(rng, ['max', 'min'] as const)
    const signature = `nejednacine:dva:${L},${U},${trazi}`
    if (taken.has(signature)) return null

    if (trazi === 'max') {
      return upakujRacun(cfg, rng, {
        text: `Važi: x > ${L} i x < ${U}. Koji je najveći mogući ceo broj x?`,
        tacan: U - 1,
        kandidati: [U, L, L + 1],
        explanation: `Najveći ceo broj manji od ${U} (a veći od ${L}) je ${U - 1}.`,
        hint: 'Traži broj tik ispod gornje granice.',
        signature,
      })
    }
    return upakujRacun(cfg, rng, {
      text: `Važi: x > ${L} i x < ${U}. Koji je najmanji mogući ceo broj x?`,
      tacan: L + 1,
      kandidati: [L, U, U - 1],
      explanation: `Najmanji ceo broj veći od ${L} (a manji od ${U}) je ${L + 1}.`,
      hint: 'Traži broj tik iznad donje granice.',
      signature,
    })
  },
}
