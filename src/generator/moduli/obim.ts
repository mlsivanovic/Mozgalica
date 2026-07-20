// Generator: obim figura i merenje dužine
import { ceoBroj, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

export const obim: TopicGenerator = {
  slug: 'obim-i-merenje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      // Obim kvadrata
      const a = ceoBroj(rng, 2, 25)
      const signature = `obim:kvadrat:${a}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Stranica kvadrata je ${a} cm. Koliki je obim kvadrata u centimetrima?`,
        tacan: 4 * a,
        kandidati: [2 * a, 3 * a, a * a <= 1000 ? a * a : 4 * a + 4, 4 * a + 4],
        explanation: `Obim kvadrata je zbir sve četiri jednake stranice: O = 4 · ${a} = ${4 * a} cm.`,
        hint: 'Kvadrat ima četiri jednake stranice.',
        signature,
        sufiks: 'cm',
      })
    }
    if (cfg.difficulty === 2) {
      // Obim pravougaonika
      const a = ceoBroj(rng, 5, 50)
      let b = ceoBroj(rng, 2, 40)
      if (b === a) b = a + 2
      const signature = `obim:pravougaonik:${Math.max(a, b)}x${Math.min(a, b)}`
      if (taken.has(signature)) return null
      const tacan = 2 * (a + b)
      return upakujRacun(cfg, rng, {
        text: `Pravougaonik ima stranice ${a} cm i ${b} cm. Koliki je njegov obim u centimetrima?`,
        tacan,
        kandidati: [a + b, 2 * a + b, a + 2 * b, tacan + 2],
        explanation: `Obim pravougaonika: O = 2 · (${a} + ${b}) = 2 · ${a + b} = ${tacan} cm.`,
        hint: 'Pravougaonik ima po dve jednake stranice: O = 2 · (a + b).',
        signature,
        sufiks: 'cm',
      })
    }
    // Teško: obrnut zadatak — poznat obim kvadrata, traži se stranica
    if (rng() < 0.5) {
      const a = ceoBroj(rng, 3, 25)
      const obimK = 4 * a
      const signature = `obim:stranica:${obimK}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Obim kvadrata je ${obimK} cm. Kolika je njegova stranica u centimetrima?`,
        tacan: a,
        kandidati: [a + 1, a - 1, obimK / 2, a * 2],
        explanation: `Stranica kvadrata: a = O : 4 = ${obimK} : 4 = ${a} cm.`,
        hint: 'Obim podeli sa brojem stranica kvadrata.',
        signature,
        sufiks: 'cm',
      })
    }
    // Obim trougla sa tri različite stranice
    const s1 = ceoBroj(rng, 5, 60)
    const s2 = ceoBroj(rng, 5, 60)
    const s3 = ceoBroj(rng, Math.abs(s1 - s2) + 1, s1 + s2 - 1) // nejednakost trougla
    const signature = `obim:trougao:${[s1, s2, s3].sort((x, y) => x - y).join('-')}`
    if (taken.has(signature)) return null
    const tacan = s1 + s2 + s3
    return upakujRacun(cfg, rng, {
      text: `Trougao ima stranice ${s1} cm, ${s2} cm i ${s3} cm. Koliki je njegov obim u centimetrima?`,
      tacan,
      kandidati: [s1 + s2, tacan + 1, tacan - 1, tacan + 10],
      explanation: `Obim trougla je zbir svih stranica: O = ${s1} + ${s2} + ${s3} = ${tacan} cm.`,
      hint: 'Saberi dužine sve tri stranice.',
      signature,
      sufiks: 'cm',
    })
  },
}
