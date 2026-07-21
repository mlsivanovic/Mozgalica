// Generator: konvertovanje arapskih brojeva u rimske i obrnuto
import type { Opcija, Tezina } from '../../types/db'
import { ceoBroj, izaberi, promesaj, type Rng } from '../random'
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

function opsegZaTezinu(t: Tezina): [number, number] {
  if (t === 1) return [1, 20]
  if (t === 2) return [1, 100]
  if (t === 4) return [100, 999]
  return [1, 1000]
}

// Nivo 4: broj čije cifre desetica/jedinica su pretežno oduzimajuće (4 ili 9) — više pravila odjednom
function brojSaSuptraktivnim(rng: Rng): number {
  const opcijeCifre = [4, 9, 4, 9, 3, 8] as const
  const s = ceoBroj(rng, 1, 9)
  const d = izaberi(rng, opcijeCifre)
  const j = izaberi(rng, opcijeCifre)
  return s * 100 + d * 10 + j
}

export const rimski: TopicGenerator = {
  slug: 'rimski-brojevi',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 5) {
      // Ekspert: rimska aritmetika — izračunaj zbir/razliku dva rimska broja
      const a = ceoBroj(rng, 1, 300)
      const b = ceoBroj(rng, 1, 300)
      const minus = rng() < 0.5 && a !== b
      const x = minus ? Math.max(a, b) : a
      const y = minus ? Math.min(a, b) : b
      if (minus && x === y) return null
      const tacan = minus ? x - y : x + y
      if (tacan < 1 || tacan > 1000) return null
      const signature = `rimski:aritmetika:${minus ? '-' : '+'}:${x},${y}`
      if (taken.has(signature)) return null
      const rimskiX = uRimski(x)
      const rimskiY = uRimski(y)
      return upakujRacun(cfg, rng, {
        text: `Izračunaj i upiši rezultat kao običan broj: ${rimskiX} ${minus ? '−' : '+'} ${rimskiY} = ?`,
        tacan,
        kandidati: [naivnoIzRimskog(rimskiX) + (minus ? -y : y), tacan + 1, tacan - 1, tacan + 10],
        explanation: `${rimskiX} = ${x}, ${rimskiY} = ${y}. ${x} ${minus ? '−' : '+'} ${y} = ${tacan}.`,
        hint: 'Prvo svaki rimski broj pretvori u običan, pa ih saberi ili oduzmi.',
        signature,
      })
    }

    const [min, max] = opsegZaTezinu(cfg.difficulty)
    const n = cfg.difficulty === 4 ? brojSaSuptraktivnim(rng) : ceoBroj(rng, min, max)
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
