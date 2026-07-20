// Generator: oduzimanje. Nivo 1: dva broja uz kontrolisanu pozajmicu.
// Nivoi 2/3: LANAC oduzimanja (a − b − c...) — konstruisan iznutra-napolje
// (od konačnog rezultata unazad) tako da nijedan međurezultat nikad ne postane negativan.
import { bezPozajmice, zamenaCifara } from '../distraktori'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from './zajednicko'

// Nivo 1: tačno dva broja sa kontrolisanom pozajmicom (nepromenjeno)
function dvaBrojaNivo1(rng: Rng): number[] {
  const bj = ceoBroj(rng, 0, 9)
  const aj = ceoBroj(rng, bj, 9)
  const bd = ceoBroj(rng, 1, 8)
  const ad = ceoBroj(rng, bd + 1, 9)
  return [ad * 10 + aj, bd * 10 + bj]
}

// Lanac a − b1 − b2 − ... = rezultat, konstruisan od rezultata unazad:
// a = rezultat + zbir svih koraka, pa je svaki međurezultat ≥ rezultat ≥ 0.
function lanacOduzimanja(rng: Rng, brojKoraka: number, minRez: number, maxRez: number, minKorak: number, maxKorak: number): number[] {
  const rezultat = ceoBroj(rng, minRez, maxRez)
  const koraci: number[] = []
  for (let i = 0; i < brojKoraka; i++) koraci.push(ceoBroj(rng, minKorak, maxKorak))
  const a = rezultat + koraci.reduce((s, x) => s + x, 0)
  return [a, ...koraci]
}

function napraviBrojeve(rng: Rng, tezina: 1 | 2 | 3): number[] {
  if (tezina === 1) return dvaBrojaNivo1(rng)
  if (tezina === 2) return lanacOduzimanja(rng, 2, 0, 300, 10, 200)
  return lanacOduzimanja(rng, 3, 0, 200, 10, 150)
}

export const oduzimanje: TopicGenerator = {
  slug: 'oduzimanje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const operandi = napraviBrojeve(rng, cfg.difficulty)
    const tacan = operandi.slice(1).reduce((r, x) => r - x, operandi[0])
    const signature = `oduzimanje:${operandi.join('-')}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${operandi.join(' − ')} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1, ime2] = dvaImena(rng)
      if (operandi.length === 2) {
        const [a, b] = operandi
        const sabloni = [
          `${ime1} ima ${kolicina(a, predmet, 'akuz')} i pokloni ${ime2} ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} ostaje?`,
          `U kutiji se nalazi ${kolicina(a, predmet)}. Ako iz nje uzmemo ${kolicina(b, predmet, 'akuz')}, koliko ${genMn(predmet)} ostaje?`,
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
      hint: cfg.difficulty >= 2 ? 'Oduzimaj korak po korak, sleva nadesno.' : 'Oduzmi jedinice, pa desetice.',
      signature,
    })
  },
}
