// Generator: oduzimanje (4. razred) — višecifreni brojevi, do 1 000 000.
// Isti pattern kao src/generator/moduli/oduzimanje.ts (reuse-uje lanacOduzimanja),
// samo veći opseg po nivou težine.
import { bezPozajmice, zamenaCifara } from '../distraktori'
import { lanacOduzimanja } from '../moduli/oduzimanje'
import type { Tezina } from '../../types/db'
import { izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from '../moduli/zajednicko'

const MAX_DISTRAKTOR = 6_000_000

function napraviBrojeve(rng: Rng, tezina: Tezina): number[] {
  if (tezina === 1) return lanacOduzimanja(rng, 1, 0, 50_000, 1_000, 50_000)
  if (tezina === 2) return lanacOduzimanja(rng, 1, 0, 500_000, 10_000, 500_000)
  if (tezina === 3) return lanacOduzimanja(rng, 2, 0, 400_000, 10_000, 300_000)
  if (tezina === 4) return lanacOduzimanja(rng, 2, 0, 2_000_000, 50_000, 1_500_000)
  return lanacOduzimanja(rng, 3, 0, 1_000_000, 50_000, 1_300_000)
}

export const oduzimanje4: TopicGenerator = {
  slug: 'oduzimanje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const operandi = napraviBrojeve(rng, cfg.difficulty)
    const tacan = operandi.slice(1).reduce((r, x) => r - x, operandi[0])
    const signature = `oduzimanje4:${operandi.join('-')}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${operandi.join(' − ')} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1, ime2] = dvaImena(rng)
      if (operandi.length === 2) {
        const [a, b] = operandi
        const sabloni = [
          `${ime1} ima ${kolicina(a, predmet, 'akuz')} i pokloni ${ime2} ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} ostaje?`,
          `U skladištu se nalazi ${kolicina(a, predmet)}. Ako iz njega izvezemo ${kolicina(b, predmet, 'akuz')}, koliko ${genMn(predmet)} ostaje?`,
          `${ime1} treba da sakupi ${kolicina(a, predmet, 'akuz')}, a već ima ${kolicina(b, predmet, 'akuz')}. Koliko mu još nedostaje?`,
        ]
        text = izaberi(rng, sabloni)
      } else {
        const [a, ...koraci] = operandi
        const spisak = koraci.map((k) => kolicina(k, predmet, 'akuz'))
        text = `${ime1} ima ${kolicina(a, predmet)}. Prvo potroši ${spisak[0]}, ${spisak.length > 1 ? `zatim još ${spisak.slice(1).join(', ')}` : ''}. Koliko ${genMn(predmet)} mu/joj ostaje?`
      }
    }

    const kandidati = operandi.length === 2
      ? [
          bezPozajmice(operandi[0], operandi[1]),
          tacan + 10, tacan - 10, zamenaCifara(tacan), tacan + 1,
        ]
      : [
          tacan + operandi[operandi.length - 1], // stao pre poslednjeg oduzimanja
          tacan + 10, tacan - 10, zamenaCifara(tacan),
        ]

    return upakujRacun(cfg, rng, {
      text, tacan, kandidati,
      explanation: `${operandi.join(' − ')} = ${tacan}`,
      hint: 'Oduzimaj pismeno: jedinice, desetice, stotine, hiljade — redom sa desna na levo.',
      signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
