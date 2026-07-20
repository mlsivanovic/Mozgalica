// Pravljenje realističnih pogrešnih odgovora (distraktora) za pitanja sa izborom.
// Distraktori modeluju česte dečje greške u računanju.
import type { Opcija } from '../types/db'
import { ceoBroj, promesaj, type Rng } from './random'

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
}

// Vrati tačno 3 različita distraktora: ≥ min, ≤ max, ≠ tačan, međusobno različiti.
// Ako kandidati ne popune kvotu, dopunjava sa tačan ± 1, ± 10, ± 2, ± 20...
export function napraviDistraktore(rng: Rng, cfg: DistraktorCfg): number[] {
  const { tacan } = cfg
  const min = cfg.min ?? 0
  const max = cfg.max ?? 1000
  const rezultat: number[] = []
  const zauzeto = new Set<number>([tacan])

  const dodaj = (n: number) => {
    if (rezultat.length >= 3) return
    if (!Number.isInteger(n) || n < min || n > max || zauzeto.has(n)) return
    zauzeto.add(n)
    rezultat.push(n)
  }

  for (const k of cfg.kandidati) dodaj(k)

  // Dopuna standardnim odstupanjima
  const dopune = [1, -1, 10, -10, 2, -2, 20, -20, 100, -100, 5, -5]
  for (const d of dopune) dodaj(tacan + d)

  // Krajnja linija odbrane — nasumične vrednosti u opsegu
  let osigurac = 0
  while (rezultat.length < 3 && osigurac++ < 200) {
    dodaj(ceoBroj(rng, Math.max(min, tacan - 30), Math.min(max, tacan + 30)))
  }

  return rezultat
}

// Upakuj tačan odgovor + distraktore u izmešane opcije za single-choice pitanje
export function napraviOpcije(
  rng: Rng,
  tacan: number,
  distraktori: number[],
  sufiks = '',
): { options: Opcija[]; correctId: string } {
  const vrednosti = promesaj(rng, [tacan, ...distraktori])
  const options = vrednosti.map((v, i) => ({
    id: `o${i + 1}`,
    text: sufiks ? `${v} ${sufiks}` : String(v),
  }))
  const correctId = options[vrednosti.indexOf(tacan)].id
  return { options, correctId }
}
