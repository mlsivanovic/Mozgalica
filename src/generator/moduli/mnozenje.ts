// Generator: množenje. Nivo 1: dva činioca (tablica). Nivoi 2/3: VIŠE činilaca
// (3, pa 4, ili 3 sa jednim dvocifrenim). Nivoi 4/5: dvocifreno množenje —
// obuhvatnost umesto samo većih brojeva.
import type { Tezina } from '../../types/db.ts'
import { ceoBroj, izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from './zajednicko.ts'

// Dani za tekstualne zadatke: oblici su bezbedni uz sve brojeve
const DAN: [string, string, string, string] = ['dan', 'dana', 'dana', 'dan']

function napraviCinioce(rng: Rng, tezina: Tezina): number[] {
  if (tezina === 1) return [ceoBroj(rng, 2, 5), ceoBroj(rng, 2, 10)]
  if (tezina === 2) {
    const a = ceoBroj(rng, 2, 9)
    const b = ceoBroj(rng, 2, 9)
    const budzetC = Math.max(2, Math.floor(1000 / (a * b)))
    return [a, b, ceoBroj(rng, 2, budzetC)]
  }
  if (tezina === 3) {
    // 50/50 — četiri mala činioca, ili tri činioca od kojih je jedan dvocifren
    if (rng() < 0.5) {
      const a = ceoBroj(rng, 2, 9)
      const b = ceoBroj(rng, 2, 9)
      const c = ceoBroj(rng, 2, 6)
      const budzetD = Math.max(2, Math.floor(1000 / (a * b * c)))
      return [a, b, c, ceoBroj(rng, 2, budzetD)]
    }
    const a = ceoBroj(rng, 2, 9)
    const b = ceoBroj(rng, 2, 9)
    const budzetC = Math.max(11, Math.floor(1000 / (a * b)))
    return [a, b, ceoBroj(rng, 11, budzetC)]
  }
  if (tezina === 4) {
    // Dva dvocifrena činioca (pismeno množenje), proizvod ≤ 1000
    const a = ceoBroj(rng, 11, 31)
    const budzetB = Math.max(11, Math.floor(1000 / a))
    const b = ceoBroj(rng, 11, budzetB)
    return [a, b]
  }
  // Ekspert: tri činioca, dva od njih dvocifrena, proizvod ≤ 1000
  const a = ceoBroj(rng, 11, 19)
  const b = ceoBroj(rng, 11, 19)
  const budzetC = Math.max(2, Math.floor(1000 / (a * b)))
  return [a, b, ceoBroj(rng, 2, budzetC)]
}

export const mnozenje: TopicGenerator = {
  slug: 'mnozenje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const cinioci = napraviCinioce(rng, cfg.difficulty)
    const tacan = cinioci.reduce((p, x) => p * x, 1)
    const signature = `mnozenje:${[...cinioci].sort((a, b) => a - b).join('x')}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${cinioci.join(' · ')} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1] = dvaImena(rng)
      if (cinioci.length === 2) {
        const [a, b] = cinioci
        const dana = Math.min(a, b)
        const poDanu = Math.max(a, b)
        const sabloni = [
          `${ime1} svakog dana sakupi po ${kolicina(poDanu, predmet, 'akuz')}. Koliko ${genMn(predmet)} sakupi za ${kolicina(dana, DAN, 'akuz')}?`,
          `U svakom redu ${jeSuRed(poDanu)} po ${kolicina(poDanu, predmet)}. Koliko je ukupno ${genMn(predmet)} u ${dana} ${dana < 5 ? 'reda' : 'redova'}?`,
        ]
        text = izaberi(rng, sabloni)
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
      hint: cfg.difficulty >= 4
        ? 'Množi po ceo desetici pa dodaj ostatak — ili napiši množenje ispod crte, kolonu po kolonu.'
        : cfg.difficulty === 3 ? 'Množi po dva činioca redom, sleva nadesno.' : 'Seti se tablice množenja.',
      signature,
    })
  },
}

// Pomoćni glagol za red („u svakom redu je / su")
function jeSuRed(n: number): string {
  const j = n % 10
  const d = n % 100
  return j >= 2 && j <= 4 && (d < 12 || d > 14) ? 'su' : 'je'
}
