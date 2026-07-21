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
    if (cfg.difficulty === 3) {
      // Obrnut zadatak — poznat obim kvadrata, traži se stranica; ili trougao sa tri stranice
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
    }
    if (cfg.difficulty === 4) {
      // Obrnut zadatak — poznat obim I jedna stranica pravougaonika, traži se druga
      const b = ceoBroj(rng, 3, 60)
      const a = ceoBroj(rng, b + 2, b + 80)
      const obimP = 2 * (a + b)
      const signature = `obim:pravougaonik-stranica:${obimP}-${b}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Obim pravougaonika je ${obimP} cm, a jedna njegova stranica je ${b} cm. Kolika je druga stranica u centimetrima?`,
        tacan: a,
        kandidati: [obimP / 2 - b, obimP - b, a + 2, a - 2],
        explanation: `Zbir dve susedne stranice: O : 2 = ${obimP} : 2 = ${obimP / 2} cm. Druga stranica: ${obimP / 2} − ${b} = ${a} cm.`,
        hint: 'Obim podeli sa 2 da dobiješ zbir dve susedne stranice, pa oduzmi poznatu.',
        signature,
        sufiks: 'cm',
      })
    }
    // Ekspert: pravougaonik gde je jedna stranica za n veća od druge, poznat obim — sistem sa dve nepoznate
    const b = ceoBroj(rng, 5, 100)
    const n = ceoBroj(rng, 2, 40)
    const a = b + n
    const obimP = 2 * (a + b)
    const signature = `obim:sistem:${obimP}-${n}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Pravougaonik ima obim ${obimP} cm. Duža stranica je za ${n} cm veća od kraće. Kolika je kraća stranica u centimetrima?`,
      tacan: b,
      kandidati: [obimP / 2 - n, obimP / 4, b + n, b - n > 0 ? b - n : b + 2],
      explanation: `Zbir dve susedne stranice: O : 2 = ${obimP} : 2 = ${a + b} cm. Kad se od zbira oduzme razlika i podeli sa 2: (${a + b} − ${n}) : 2 = ${b} cm.`,
      hint: 'Zbir dve susedne stranice je O : 2. Oduzmi razliku pa podeli sa 2 da dobiješ kraću.',
      signature,
      sufiks: 'cm',
    })
  },
}
