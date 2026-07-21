// Generator: novac (cene i kusur u dinarima) — zadaci su po prirodi tekstualni
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, upakujRacun } from './zajednicko'

const ARTIKLI = [
  'sveska', 'čokolada', 'sok', 'sladoled', 'olovka', 'lopta', 'bojanka', 'sendvič',
] as const

export const novac: TopicGenerator = {
  slug: 'novac',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const [ime] = dvaImena(rng)
    if (cfg.difficulty === 1) {
      // Zbir dve cene
      const c1 = ceoBroj(rng, 3, 25) * 10
      const c2 = ceoBroj(rng, 3, 25) * 10
      const tacan = c1 + c2
      const a1 = izaberi(rng, ARTIKLI)
      let a2 = izaberi(rng, ARTIKLI)
      while (a2 === a1) a2 = izaberi(rng, ARTIKLI)
      const signature = `novac:zbir:${Math.min(c1, c2)}+${Math.max(c1, c2)}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `${ime} kupuje artikal „${a1}" za ${c1} dinara i artikal „${a2}" za ${c2} dinara. Koliko dinara ukupno plaća?`,
        tacan,
        kandidati: [tacan + 10, tacan - 10, Math.abs(c1 - c2), tacan + 100],
        explanation: `${c1} + ${c2} = ${tacan} dinara.`,
        hint: 'Saberi obe cene.',
        signature,
        sufiks: 'dinara',
      })
    }
    if (cfg.difficulty === 2) {
      // Kusur od 500 dinara
      const cena = ceoBroj(rng, 12, 48) * 10 + izaberi(rng, [0, 5])
      const tacan = 500 - cena
      const signature = `novac:kusur500:${cena}`
      if (taken.has(signature)) return null
      const artikal = izaberi(rng, ARTIKLI)
      return upakujRacun(cfg, rng, {
        text: `${ime} plaća artikal „${artikal}" od ${cena} dinara novčanicom od 500 dinara. Koliko dinara kusura dobija?`,
        tacan,
        kandidati: [tacan + 10, tacan - 10, 500 - Math.round(cena / 10) * 10, tacan + 100],
        explanation: `500 − ${cena} = ${tacan} dinara kusura.`,
        hint: 'Od 500 oduzmi cenu.',
        signature,
        sufiks: 'dinara',
      })
    }
    if (cfg.difficulty === 3) {
      // Dve kupovine + kusur od 1000
      const c1 = ceoBroj(rng, 15, 45) * 10 + izaberi(rng, [0, 5])
      const c2 = ceoBroj(rng, 12, 40) * 10 + izaberi(rng, [0, 5])
      const ukupno = c1 + c2
      const tacan = 1000 - ukupno
      const signature = `novac:kusur1000:${Math.min(c1, c2)}+${Math.max(c1, c2)}`
      if (taken.has(signature)) return null
      const a1 = izaberi(rng, ARTIKLI)
      let a2 = izaberi(rng, ARTIKLI)
      while (a2 === a1) a2 = izaberi(rng, ARTIKLI)
      return upakujRacun(cfg, rng, {
        text: `${ime} kupuje artikal „${a1}" za ${c1} dinara i artikal „${a2}" za ${c2} dinara, pa plaća novčanicom od 1000 dinara. Koliko dinara kusura dobija?`,
        tacan,
        kandidati: [1000 - c1, 1000 - c2, tacan + 10, tacan - 10],
        explanation: `Ukupno: ${c1} + ${c2} = ${ukupno} dinara. Kusur: 1000 − ${ukupno} = ${tacan} dinara.`,
        hint: 'Prvo saberi obe cene, pa zbir oduzmi od 1000.',
        signature,
        sufiks: 'dinara',
      })
    }
    if (cfg.difficulty === 4) {
      // Tri kupovine + kusur od 1000
      const c1 = ceoBroj(rng, 8, 25) * 10 + izaberi(rng, [0, 5])
      const c2 = ceoBroj(rng, 8, 25) * 10 + izaberi(rng, [0, 5])
      const c3 = ceoBroj(rng, 8, 25) * 10 + izaberi(rng, [0, 5])
      const ukupno = c1 + c2 + c3
      const tacan = 1000 - ukupno
      const signature = `novac:tri:${[c1, c2, c3].sort((x, y) => x - y).join('+')}`
      if (taken.has(signature)) return null
      const a1 = izaberi(rng, ARTIKLI)
      let a2 = izaberi(rng, ARTIKLI)
      while (a2 === a1) a2 = izaberi(rng, ARTIKLI)
      let a3 = izaberi(rng, ARTIKLI)
      while (a3 === a1 || a3 === a2) a3 = izaberi(rng, ARTIKLI)
      return upakujRacun(cfg, rng, {
        text: `${ime} kupuje artikal „${a1}" za ${c1} dinara, „${a2}" za ${c2} dinara i „${a3}" za ${c3} dinara, pa plaća novčanicom od 1000 dinara. Koliko dinara kusura dobija?`,
        tacan,
        kandidati: [1000 - c1 - c2, 1000 - c2 - c3, tacan + 10, tacan - 10],
        explanation: `Ukupno: ${c1} + ${c2} + ${c3} = ${ukupno} dinara. Kusur: 1000 − ${ukupno} = ${tacan} dinara.`,
        hint: 'Saberi sve tri cene, pa zbir oduzmi od 1000.',
        signature,
        sufiks: 'dinara',
      })
    }
    // Ekspert: N komada iste cene + kusur od 1000
    const cena = ceoBroj(rng, 3, 18) * 10 + izaberi(rng, [0, 5])
    const budzetKom = Math.max(3, Math.min(8, Math.floor(950 / cena)))
    const kom = ceoBroj(rng, 3, budzetKom)
    const ukupno = cena * kom
    const tacan = 1000 - ukupno
    const signature = `novac:komada:${cena}x${kom}`
    if (taken.has(signature)) return null
    const artikal = izaberi(rng, ARTIKLI)
    return upakujRacun(cfg, rng, {
      text: `${ime} kupuje ${kom} artikla „${artikal}" po ceni od ${cena} dinara za jedan, pa plaća novčanicom od 1000 dinara. Koliko dinara kusura dobija?`,
      tacan,
      kandidati: [1000 - cena, ukupno, tacan + 10, tacan - 10],
      explanation: `Ukupno: ${kom} · ${cena} = ${ukupno} dinara. Kusur: 1000 − ${ukupno} = ${tacan} dinara.`,
      hint: 'Prvo pomnoži cenu sa brojem komada, pa oduzmi od 1000.',
      signature,
      sufiks: 'dinara',
    })
  },
}
