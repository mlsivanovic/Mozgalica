// Generator: sabiranje (4. razred) — višecifreni brojevi, do 1 000 000.
// Isti pattern kao src/generator/moduli/sabiranje.ts (reuse-uje viseSabiraka),
// samo veći opseg po nivou težine.
import { bezPrenosa, zamenaCifara } from '../distraktori'
import { viseSabiraka } from '../moduli/sabiranje'
import type { Tezina } from '../../types/db'
import { izaberi, type Rng } from '../random'
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

export const sabiranje4: TopicGenerator = {
  slug: 'sabiranje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
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
