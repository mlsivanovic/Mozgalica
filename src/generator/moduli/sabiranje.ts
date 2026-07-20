// Generator: sabiranje (do 1000, kontrolisani prenosi po težini)
import { bezPrenosa, zamenaCifara } from '../distraktori'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { dvaImena, genMn, izaberiPredmet, kolicina, upakujRacun } from './zajednicko'

// Konstruktivno pravljenje sabiraka sa tačno kontrolisanim brojem prenosa
function napraviSabirke(rng: Rng, tezina: 1 | 2 | 3): [number, number] {
  if (tezina === 1) {
    // Do 100, bez prenosa
    const aj = ceoBroj(rng, 0, 9)
    const bj = ceoBroj(rng, 0, 9 - aj)
    const ad = ceoBroj(rng, 1, 8)
    const bd = ceoBroj(rng, 1, 9 - ad)
    return [ad * 10 + aj, bd * 10 + bj]
  }
  if (tezina === 2) {
    // Trocifreni, tačno jedan prenos (na jedinicama ili deseticama)
    const prenosNaJedinicama = rng() < 0.5
    if (prenosNaJedinicama) {
      const aj = ceoBroj(rng, 1, 9)
      const bj = ceoBroj(rng, 10 - aj, 9) // aj + bj ≥ 10
      const ad = ceoBroj(rng, 0, 8)
      const bd = ceoBroj(rng, 0, 8 - ad) // + prenos ostaje ≤ 9
      const as = ceoBroj(rng, 1, 8)
      const bs = ceoBroj(rng, 1, 9 - as)
      return [as * 100 + ad * 10 + aj, bs * 100 + bd * 10 + bj]
    }
    const aj = ceoBroj(rng, 0, 9)
    const bj = ceoBroj(rng, 0, 9 - aj)
    const ad = ceoBroj(rng, 1, 9)
    const bd = ceoBroj(rng, 10 - ad, 9) // prenos na deseticama
    const as = ceoBroj(rng, 1, 7) // stotine primaju prenos, pa as + bs + 1 ≤ 9
    const bs = ceoBroj(rng, 1, 8 - as)
    return [as * 100 + ad * 10 + aj, bs * 100 + bd * 10 + bj]
  }
  // Teško: prenos i na jedinicama i na deseticama
  const aj = ceoBroj(rng, 1, 9)
  const bj = ceoBroj(rng, 10 - aj, 9)
  const ad = ceoBroj(rng, 1, 9)
  const bd = ceoBroj(rng, Math.max(0, 9 - ad), 9) // ad + bd + 1 ≥ 10
  const as = ceoBroj(rng, 1, 7)
  const bs = ceoBroj(rng, 1, 8 - as)
  return [as * 100 + ad * 10 + aj, bs * 100 + bd * 10 + bj]
}

export const sabiranje: TopicGenerator = {
  slug: 'sabiranje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const [a, b] = napraviSabirke(rng, cfg.difficulty)
    const tacan = a + b
    const signature = `sabiranje:${Math.min(a, b)}+${Math.max(a, b)}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${a} + ${b} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1, ime2] = dvaImena(rng)
      const sabloni = [
        `${ime1} ima ${kolicina(a, predmet, 'akuz')}, a ${ime2} ima ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} imaju zajedno?`,
        `U prvoj kutiji nalazi se ${kolicina(a, predmet)}, a u drugoj ${kolicina(b, predmet)}. Koliko je ukupno ${genMn(predmet)}?`,
        `${ime1} sakupi ${kolicina(a, predmet, 'akuz')}, a zatim dobije još ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} sada ima?`,
      ]
      text = izaberi(rng, sabloni)
    }

    return upakujRacun(cfg, rng, {
      text,
      tacan,
      kandidati: [
        bezPrenosa(a, b), // sabiranje bez prenosa
        tacan + 10,
        tacan - 10, // greška u prenosu za jedno mesto
        zamenaCifara(tacan), // zamena cifara rezultata
        a - b >= 0 ? a - b : tacan + 1, // pogrešna operacija
      ],
      explanation: `${a} + ${b} = ${tacan}`,
      hint: cfg.difficulty >= 2 ? 'Saberi prvo jedinice, pa desetice, pa stotine. Ne zaboravi prenos!' : 'Saberi jedinice, pa desetice.',
      signature,
    })
  },
}
