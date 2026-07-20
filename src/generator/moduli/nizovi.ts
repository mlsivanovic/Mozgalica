// Generator: nizovi i prepoznavanje obrazaca (nastavi niz)
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

interface Niz {
  clanovi: number[]
  sledeci: number
  opisPravila: string
  signature: string
  // Distraktor: nastavak po pogrešnom pravilu
  pogresni: number[]
}

function napraviNiz(rng: Rng, tezina: 1 | 2 | 3): Niz {
  if (tezina <= 2) {
    // Aritmetički niz; teže težine imaju veće/negativne korake
    const koraci = tezina === 1 ? [2, 5, 10] : [3, 4, 25, 50, -2, -5, -10]
    const korak = izaberi(rng, koraci)
    const start =
      korak > 0 ? ceoBroj(rng, 1, 60) : ceoBroj(rng, Math.abs(korak) * 6, 100)
    const clanovi = [0, 1, 2, 3].map((i) => start + i * korak)
    const sledeci = start + 4 * korak
    return {
      clanovi,
      sledeci,
      opisPravila: korak > 0 ? `svaki sledeći član je veći za ${korak}` : `svaki sledeći član je manji za ${Math.abs(korak)}`,
      signature: `niz:${start},${korak}`,
      pogresni: [sledeci + 1, sledeci - 1, clanovi[3] + (korak > 0 ? korak - 1 : korak + 1)],
    }
  }
  // Teško: naizmenični obrazac (+p, −q, +p, −q…) ili udvostručavanje
  if (rng() < 0.5) {
    const p = ceoBroj(rng, 4, 15)
    const q = ceoBroj(rng, 1, p - 1)
    const start = ceoBroj(rng, 5, 50)
    const clanovi = [start, start + p, start + p - q, start + 2 * p - q, start + 2 * p - 2 * q]
    const sledeci = start + 3 * p - 2 * q
    return {
      clanovi,
      sledeci,
      opisPravila: `naizmenično se dodaje ${p}, pa oduzima ${q}`,
      signature: `niz:naizm:${start},${p},${q}`,
      pogresni: [sledeci - q, clanovi[4] + p - q, sledeci + 1],
    }
  }
  const start = ceoBroj(rng, 2, 12)
  const clanovi = [start, start * 2, start * 4, start * 8]
  const sledeci = start * 16
  return {
    clanovi,
    sledeci,
    opisPravila: 'svaki sledeći član je dva puta veći',
    signature: `niz:x2:${start}`,
    pogresni: [clanovi[3] + start, clanovi[3] + 8, sledeci + start],
  }
}

export const nizovi: TopicGenerator = {
  slug: 'nizovi-i-obrasci',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const niz = napraviNiz(rng, cfg.difficulty)
    if (taken.has(niz.signature)) return null
    if (niz.sledeci > 1000 || niz.sledeci < 0) return null

    return upakujRacun(cfg, rng, {
      text: `Nastavi niz: ${niz.clanovi.join(', ')}, __`,
      tacan: niz.sledeci,
      kandidati: niz.pogresni,
      explanation: `Pravilo niza: ${niz.opisPravila}. Sledeći član je ${niz.sledeci}.`,
      hint: 'Pogledaj za koliko se razlikuju susedni članovi niza.',
      signature: niz.signature,
    })
  },
}
