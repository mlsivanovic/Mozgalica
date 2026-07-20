// Generator: množenje (tablica množenja, pa dvocifren × jednocifren)
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from './zajednicko'

// Dani za tekstualne zadatke: oblici su bezbedni uz sve brojeve
const DAN: [string, string, string, string] = ['dan', 'dana', 'dana', 'dan']

function napraviCinioce(rng: Rng, tezina: 1 | 2 | 3): [number, number] {
  if (tezina === 1) return [ceoBroj(rng, 2, 5), ceoBroj(rng, 2, 10)]
  if (tezina === 2) return [ceoBroj(rng, 6, 9), ceoBroj(rng, 2, 10)]
  // Teško: dvocifren × jednocifren, proizvod ≤ 1000
  const b = ceoBroj(rng, 2, 9)
  const a = ceoBroj(rng, 11, Math.floor(1000 / b))
  return [a, b]
}

export const mnozenje: TopicGenerator = {
  slug: 'mnozenje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const [a, b] = napraviCinioce(rng, cfg.difficulty)
    const tacan = a * b
    const signature = `mnozenje:${Math.min(a, b)}x${Math.max(a, b)}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${a} · ${b} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1] = dvaImena(rng)
      // Manji činilac ide uz „svaki dan" da rečenica ostane prirodna
      const dana = Math.min(a, b)
      const poDanu = Math.max(a, b)
      const sabloni = [
        `${ime1} svakog dana sakupi po ${kolicina(poDanu, predmet, 'akuz')}. Koliko ${genMn(predmet)} sakupi za ${kolicina(dana, DAN, 'akuz')}?`,
        `U svakom redu ${jeSuRed(poDanu)} po ${kolicina(poDanu, predmet)}. Koliko je ukupno ${genMn(predmet)} u ${dana} ${dana < 5 ? 'reda' : 'redova'}?`,
      ]
      text = izaberi(rng, sabloni)
    }

    return upakujRacun(cfg, rng, {
      text,
      tacan,
      kandidati: [
        (a + 1) * b, // greška u tablici za jedan red
        (a - 1) * b,
        a * (b + 1),
        a * (b - 1),
        a + b, // pogrešna operacija
      ],
      explanation: `${a} · ${b} = ${tacan}`,
      hint: cfg.difficulty === 3 ? 'Rastavi dvocifreni broj: pomnoži desetice, pa jedinice, pa saberi.' : 'Seti se tablice množenja.',
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
