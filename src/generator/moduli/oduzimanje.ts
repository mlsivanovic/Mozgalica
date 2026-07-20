// Generator: oduzimanje (uvek a ≥ b, kontrolisane pozajmice po težini)
import { bezPozajmice, zamenaCifara } from '../distraktori'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from './zajednicko'

// Konstruktivno pravljenje umanjenika i umanjioca sa kontrolisanim pozajmicama
function napraviBrojeve(rng: Rng, tezina: 1 | 2 | 3): [number, number] {
  if (tezina === 1) {
    // Do 100, bez pozajmice
    const bj = ceoBroj(rng, 0, 9)
    const aj = ceoBroj(rng, bj, 9)
    const bd = ceoBroj(rng, 1, 8)
    const ad = ceoBroj(rng, bd + 1, 9)
    return [ad * 10 + aj, bd * 10 + bj]
  }
  if (tezina === 2) {
    // Trocifreni, pozajmica samo na jedinicama
    const aj = ceoBroj(rng, 0, 8)
    const bj = ceoBroj(rng, aj + 1, 9) // aj < bj → pozajmica
    const bd = ceoBroj(rng, 0, 8)
    const ad = ceoBroj(rng, bd + 1, 9) // posle pozajmice i dalje bez nove pozajmice
    const bs = ceoBroj(rng, 1, 8)
    const as = ceoBroj(rng, bs, 9)
    return [as * 100 + ad * 10 + aj, bs * 100 + bd * 10 + bj]
  }
  // Teško: pozajmica na jedinicama i deseticama
  const aj = ceoBroj(rng, 0, 8)
  const bj = ceoBroj(rng, aj + 1, 9)
  const ad = ceoBroj(rng, 0, 9)
  const bd = ceoBroj(rng, ad, 9) // ad - 1 < bd → nova pozajmica
  const bs = ceoBroj(rng, 1, 8)
  const as = ceoBroj(rng, bs + 1, 9)
  return [as * 100 + ad * 10 + aj, bs * 100 + bd * 10 + bj]
}

export const oduzimanje: TopicGenerator = {
  slug: 'oduzimanje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const [a, b] = napraviBrojeve(rng, cfg.difficulty)
    const tacan = a - b
    const signature = `oduzimanje:${a}-${b}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${a} − ${b} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1, ime2] = dvaImena(rng)
      const sabloni = [
        `${ime1} ima ${kolicina(a, predmet, 'akuz')} i pokloni ${ime2} ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} ostaje?`,
        `U kutiji se nalazi ${kolicina(a, predmet)}. Ako iz nje uzmemo ${kolicina(b, predmet, 'akuz')}, koliko ${genMn(predmet)} ostaje?`,
        `${ime1} treba da sakupi ${kolicina(a, predmet, 'akuz')}, a već ima ${kolicina(b, predmet, 'akuz')}. Koliko mu još nedostaje?`,
      ]
      text = izaberi(rng, sabloni)
    }

    return upakujRacun(cfg, rng, {
      text,
      tacan,
      kandidati: [
        bezPozajmice(a, b), // oduzimanje „manja od veće" po mestima
        tacan + 10,
        tacan - 10, // greška u pozajmici
        zamenaCifara(tacan),
        tacan + 1,
      ],
      explanation: `${a} − ${b} = ${tacan}`,
      hint: cfg.difficulty >= 2 ? 'Oduzimaj mesto po mesto. Kada je gornja cifra manja, pozajmi deseticu.' : 'Oduzmi jedinice, pa desetice.',
      signature,
    })
  },
}
