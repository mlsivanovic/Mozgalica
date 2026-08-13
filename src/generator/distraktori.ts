// Pravljenje realističnih pogrešnih odgovora (distraktora) za pitanja sa izborom.
// Distraktori modeluju česte dečje greške u računanju.
import type { Opcija } from '../types/db.ts'
import { ceoBroj, promesaj, type Rng } from './random.ts'

// Sabiranje cifara po mestima BEZ prenosa (česta greška: 47+38 = 75 umesto 85)
export function bezPrenosa(a: number, b: number): number {
  let rezultat = 0
  let mesto = 1
  while (a > 0 || b > 0) {
    const cifra = ((a % 10) + (b % 10)) % 10
    rezultat += cifra * mesto
    mesto *= 10
    a = Math.floor(a / 10)
    b = Math.floor(b / 10)
  }
  return rezultat
}

// Oduzimanje po mestima BEZ pozajmice: za svako mesto |cifraA - cifraB|
// (česta greška: 52-38 = 26 umesto 14, dete okrene 2-8 u 8-2)
export function bezPozajmice(a: number, b: number): number {
  let rezultat = 0
  let mesto = 1
  while (a > 0 || b > 0) {
    const cifra = Math.abs((a % 10) - (b % 10))
    rezultat += cifra * mesto
    mesto *= 10
    a = Math.floor(a / 10)
    b = Math.floor(b / 10)
  }
  return rezultat
}

// Zamena poslednje dve cifre (85 → 58)
export function zamenaCifara(n: number): number {
  if (n < 10) return n
  const desetice = Math.floor(n / 10) % 10
  const jedinice = n % 10
  const ostatak = Math.floor(n / 100) * 100
  return ostatak + jedinice * 10 + desetice
}

interface DistraktorCfg {
  tacan: number
  kandidati: number[] // predlozi zasnovani na tipičnim greškama, redom prioriteta
  min?: number // podrazumevano 0
  max?: number // podrazumevano 1000
  // Broj decimala (npr. 1 za korak 0,1) — podrazumevano 0 (celi brojevi).
  // Interno se sve skalira na cele brojeve (10^decimals) da ostane kompatibilno
  // sa postojećom celobrojnom logikom, pa se rezultat skalira nazad.
  decimals?: number
}

// Vrati tačno 3 različita distraktora: ≥ min, ≤ max, ≠ tačan, međusobno različiti.
// Ako kandidati ne popune kvotu, dopunjava sa tačan ± 1, ± 10, ± 2, ± 20...
export function napraviDistraktore(rng: Rng, cfg: DistraktorCfg): number[] {
  const decimals = cfg.decimals ?? 0
  const skala = 10 ** decimals
  const tacan = Math.round(cfg.tacan * skala)
  const min = Math.round((cfg.min ?? 0) * skala)
  const max = Math.round((cfg.max ?? 1000) * skala)
  const rezultat: number[] = []
  const zauzeto = new Set<number>([tacan])

  const dodaj = (n: number) => {
    if (rezultat.length >= 3) return
    if (!Number.isInteger(n) || n < min || n > max || zauzeto.has(n)) return
    zauzeto.add(n)
    rezultat.push(n)
  }

  for (const k of cfg.kandidati) dodaj(Math.round(k * skala))

  // Dopuna standardnim odstupanjima (u skaliranom celobrojnom prostoru)
  const dopune = [1, -1, 10, -10, 2, -2, 20, -20, 100, -100, 5, -5]
  for (const d of dopune) dodaj(tacan + d)

  // Krajnja linija odbrane — nasumične vrednosti u opsegu
  let osigurac = 0
  while (rezultat.length < 3 && osigurac++ < 200) {
    dodaj(ceoBroj(rng, Math.max(min, tacan - 30), Math.min(max, tacan + 30)))
  }

  return rezultat.map((n) => n / skala)
}

function formatirajBroj(v: number, decimals: number): string {
  return decimals > 0 ? v.toFixed(decimals).replace('.', ',') : String(v)
}

// Upakuj tačan odgovor + distraktore u izmešane opcije za single-choice pitanje
export function napraviOpcije(
  rng: Rng,
  tacan: number,
  distraktori: number[],
  sufiks = '',
  decimals = 0,
): { options: Opcija[]; correctId: string } {
  const vrednosti = promesaj(rng, [tacan, ...distraktori])
  const options = vrednosti.map((v, i) => ({
    id: `o${i + 1}`,
    text: sufiks ? `${formatirajBroj(v, decimals)} ${sufiks}` : formatirajBroj(v, decimals),
  }))
  const correctId = options[vrednosti.indexOf(tacan)].id
  return { options, correctId }
}
