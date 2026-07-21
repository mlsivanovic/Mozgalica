// Generator: sabiranje (do 1000). Nivo 1: dva sabirka uz kontrolisan prenos.
// Nivoi 2–5: VIŠE sabiraka (3, 4, 5, pa 6) — obuhvatnost umesto samo većih brojeva.
import type { Tezina } from '../../types/db'
import { bezPrenosa, zamenaCifara } from '../distraktori'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from './zajednicko'

// Nivo 1: tačno dva sabirka sa kontrolisanim prenosom (nepromenjeno)
function dvaSabirkaNivo1(rng: Rng): number[] {
  const aj = ceoBroj(rng, 0, 9)
  const bj = ceoBroj(rng, 0, 9 - aj)
  const ad = ceoBroj(rng, 1, 8)
  const bd = ceoBroj(rng, 1, 9 - ad)
  return [ad * 10 + aj, bd * 10 + bj]
}

// Nivo 2/3: N sabiraka — izaberi ciljnu sumu pa je razbij na N pozitivnih delova
// preko N-1 različitih tačaka preseka (composition), pa je zbir uvek tačno suma.
// Magnitude-agnostic — reuse-uje se i za 4. razred (moduli4/sabiranje4.ts).
export function viseSabiraka(rng: Rng, brojSabiraka: number, minSuma: number, maxSuma: number): number[] {
  const suma = ceoBroj(rng, minSuma, maxSuma)
  const preseci = new Set<number>()
  while (preseci.size < brojSabiraka - 1) preseci.add(ceoBroj(rng, 1, suma - 1))
  const granice = [0, ...[...preseci].sort((a, b) => a - b), suma]
  const delovi: number[] = []
  for (let i = 0; i < granice.length - 1; i++) delovi.push(granice[i + 1] - granice[i])
  return delovi
}

function napraviSabirke(rng: Rng, tezina: Tezina): number[] {
  if (tezina === 1) return dvaSabirkaNivo1(rng)
  if (tezina === 2) return viseSabiraka(rng, 3, 100, 1000)
  if (tezina === 3) return viseSabiraka(rng, 4, 300, 1000)
  if (tezina === 4) return viseSabiraka(rng, 5, 500, 1000)
  return viseSabiraka(rng, 6, 700, 1000)
}

export const sabiranje: TopicGenerator = {
  slug: 'sabiranje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const operandi = napraviSabirke(rng, cfg.difficulty)
    const tacan = operandi.reduce((s, x) => s + x, 0)
    const signature = `sabiranje:${[...operandi].sort((a, b) => a - b).join('+')}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${operandi.join(' + ')} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1, ime2] = dvaImena(rng)
      if (operandi.length === 2) {
        const [a, b] = operandi
        const sabloni = [
          `${ime1} ima ${kolicina(a, predmet, 'akuz')}, a ${ime2} ima ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} imaju zajedno?`,
          `U prvoj kutiji nalazi se ${kolicina(a, predmet)}, a u drugoj ${kolicina(b, predmet)}. Koliko je ukupno ${genMn(predmet)}?`,
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
      hint: cfg.difficulty >= 2 ? 'Saberi brojeve jedan po jedan, sleva nadesno.' : 'Saberi jedinice, pa desetice.',
      signature,
    })
  },
}
