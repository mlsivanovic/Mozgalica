// Generator: konvertovanje arapskih brojeva u rimske i obrnuto
import type { Opcija } from '../../types/db'
import { ceoBroj, promesaj, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { poeniZaTezinu, upakujRacun } from './zajednicko'

const VREDNOSTI: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

// Isključivo aditivne vrednosti (bez pravila oduzimanja) — za pravljenje "naivnog" pogrešnog zapisa
const VREDNOSTI_ADITIVNO: [number, string][] = [
  [1000, 'M'], [500, 'D'], [100, 'C'], [50, 'L'], [10, 'X'], [5, 'V'], [1, 'I'],
]

const VREDNOST_ZNAKA: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }

export function uRimski(n: number): string {
  let ostatak = n
  let rezultat = ''
  for (const [vrednost, simbol] of VREDNOSTI) {
    while (ostatak >= vrednost) {
      rezultat += simbol
      ostatak -= vrednost
    }
  }
  return rezultat
}

export function izRimskog(s: string): number {
  let zbir = 0
  for (let i = 0; i < s.length; i++) {
    const trenutni = VREDNOST_ZNAKA[s[i]] ?? 0
    const sledeci = VREDNOST_ZNAKA[s[i + 1]] ?? 0
    zbir += trenutni < sledeci ? -trenutni : trenutni
  }
  return zbir
}

// Naivno (pogrešno) sabiranje svih znakova bez pravila oduzimanja — česta dečja greška
function naivnoIzRimskog(s: string): number {
  let zbir = 0
  for (const znak of s) zbir += VREDNOST_ZNAKA[znak] ?? 0
  return zbir
}

function naivnoURimski(n: number): string {
  let ostatak = n
  let rezultat = ''
  for (const [vrednost, simbol] of VREDNOSTI_ADITIVNO) {
    while (ostatak >= vrednost) {
      rezultat += simbol
      ostatak -= vrednost
    }
  }
  return rezultat
}

function opsegZaTezinu(t: 1 | 2 | 3): [number, number] {
  if (t === 1) return [1, 20]
  if (t === 2) return [1, 100]
  return [1, 1000]
}

export const rimski: TopicGenerator = {
  slug: 'rimski-brojevi',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const [min, max] = opsegZaTezinu(cfg.difficulty)
    const n = ceoBroj(rng, min, max)
    const rimskiUArapski = rng() < 0.5
    const signature = `rimski:${rimskiUArapski ? 'r2a' : 'a2r'}:${n}`
    if (taken.has(signature)) return null

    const rimskiOblik = uRimski(n)

    if (rimskiUArapski) {
      return upakujRacun(cfg, rng, {
        text: `Koji je arapski broj zapisan rimskim brojem ${rimskiOblik}?`,
        tacan: n,
        kandidati: [naivnoIzRimskog(rimskiOblik), n + 1, n - 1],
        explanation: `${rimskiOblik} = ${n}`,
        hint: 'Ako je manji znak ispred većeg, oduzima se; inače se sabira.',
        signature,
      })
    }

    // Arapski → rimski: odgovor je STRING, ne broj — ručno single-choice (kao poredjenje.ts),
    // jer upakujRacun/napraviDistraktore rade samo sa brojevima
    const kandidatiRimski = new Set<string>()
    const dodaj = (s: string) => { if (s !== rimskiOblik) kandidatiRimski.add(s) }
    dodaj(naivnoURimski(n))
    for (const delta of [1, -1, 2, -2, 10, -10]) {
      if (kandidatiRimski.size >= 5) break
      const kandidatN = n + delta
      if (kandidatN >= min && kandidatN <= max) dodaj(uRimski(kandidatN))
    }
    if (rimskiOblik.length >= 2) {
      dodaj(rimskiOblik.slice(0, -2) + rimskiOblik.slice(-1) + rimskiOblik.slice(-2, -1))
    }

    const distraktoriRimski = [...kandidatiRimski].slice(0, 3)
    const opcijeVrednosti = promesaj(rng, [rimskiOblik, ...distraktoriRimski])
    const options: Opcija[] = opcijeVrednosti.map((v, i) => ({ id: `o${i + 1}`, text: v }))
    const correctId = options[opcijeVrednosti.indexOf(rimskiOblik)].id

    return {
      type: 'single',
      text: `Kako se broj ${n} zapisuje rimskim brojevima?`,
      options,
      correct: { optionId: correctId },
      explanation: `${n} = ${rimskiOblik}`,
      hint: 'Veći znakovi idu prvi; manji znak ispred većeg se oduzima.',
      points: poeniZaTezinu(cfg.difficulty),
      topicSlug: cfg.topicSlug,
      difficulty: cfg.difficulty,
      signature,
    }
  },
}
