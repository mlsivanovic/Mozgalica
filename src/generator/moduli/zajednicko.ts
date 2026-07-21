// Zajednički pomoćnici za module generatora: pakovanje pitanja,
// srpski oblici imenica uz brojeve i imena za tekstualne zadatke.
import type { TipPitanja, Tezina } from '../../types/db'
import { napraviDistraktore, napraviOpcije } from '../distraktori'
import { izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje } from '../types'

export const IMENA = [
  'Lena', 'Marko', 'Ana', 'Miloš', 'Sara', 'Vuk', 'Mina', 'Luka', 'Iva', 'Filip',
  'Nina', 'Petar', 'Maša', 'Ognjen', 'Dunja', 'Stefan',
] as const

// Dva različita imena iz banke
export function dvaImena(rng: Rng): [string, string] {
  const prvo = izaberi(rng, IMENA)
  let drugo = izaberi(rng, IMENA)
  while (drugo === prvo) drugo = izaberi(rng, IMENA)
  return [prvo, drugo]
}

// Imenica sa oblicima: [jednina nominativ, paukal (2–4), genitiv množine (5+), akuzativ jednine]
export type Imenica = [string, string, string, string]

export const PREDMETI: Imenica[] = [
  ['sličica', 'sličice', 'sličica', 'sličicu'],
  ['kliker', 'klikera', 'klikera', 'kliker'],
  ['bombona', 'bombone', 'bombona', 'bombonu'],
  ['jabuka', 'jabuke', 'jabuka', 'jabuku'],
  ['knjiga', 'knjige', 'knjiga', 'knjigu'],
  ['balon', 'balona', 'balona', 'balon'],
  ['autić', 'autića', 'autića', 'autić'],
  ['olovka', 'olovke', 'olovaka', 'olovku'],
]

export function izaberiPredmet(rng: Rng): Imenica {
  return izaberi(rng, PREDMETI)
}

// Gramatički oblik imenice uz broj: 0 = jednina, 1 = paukal, 2 = genitiv množine
function oblikBroja(n: number): 0 | 1 | 2 {
  const jedinice = n % 10
  const dve = n % 100
  if (jedinice === 1 && dve !== 11) return 0
  if (jedinice >= 2 && jedinice <= 4 && (dve < 12 || dve > 14)) return 1
  return 2
}

// "21 sličica" / "3 sličice" / "5 sličica"; padež 'akuz' za objekatsku poziciju ("ima 21 sličicu")
export function kolicina(n: number, im: Imenica, padez: 'nom' | 'akuz' = 'nom'): string {
  const oblik = oblikBroja(n)
  if (oblik === 0) return `${n} ${padez === 'akuz' ? im[3] : im[0]}`
  if (oblik === 1) return `${n} ${im[1]}`
  return `${n} ${im[2]}`
}

// Genitiv množine bez broja ("Koliko sličica…")
export function genMn(im: Imenica): string {
  return im[2]
}

// Pomoćni glagol uz broj u subjekatskoj poziciji ("je 5 sličica" / "su 3 sličice")
export function jeSu(n: number): string {
  return oblikBroja(n) === 1 ? 'su' : 'je'
}

// Poeni prate težinu: lako 1, srednje 2, teško 3, vrlo teško 4, ekspert 5
export function poeniZaTezinu(tezina: Tezina): number {
  return tezina
}

interface RacunUlaz {
  text: string
  tacan: number
  // Kandidati za distraktore zasnovani na tipičnim greškama (za single tip)
  kandidati: number[]
  explanation: string
  hint: string | null
  signature: string
  // Sufiks jedinice u ponuđenim odgovorima (npr. 'cm', 'dinara')
  sufiks?: string
  maxDistraktor?: number
  // Broj decimala tačnog odgovora (npr. 2 za decimalne brojeve sa dve decimale).
  // Podrazumevano 0 — ponašanje ostaje identično postojećim (celobrojnim) modulima.
  decimals?: number
}

// Upakuj račun u numeric ili single pitanje po traženom tipu.
// Za 'auto' naizmenično bira: ~polovina unos broja, polovina ponuđeni odgovori.
export function upakujRacun(
  cfg: GeneratorConfig,
  rng: Rng,
  ulaz: RacunUlaz,
): GenerisanoPitanje {
  const zeljeni: TipPitanja = cfg.type === 'auto' ? (rng() < 0.5 ? 'numeric' : 'single') : cfg.type
  const osnova = {
    text: ulaz.text,
    explanation: ulaz.explanation,
    hint: ulaz.hint,
    points: poeniZaTezinu(cfg.difficulty),
    topicSlug: cfg.topicSlug,
    difficulty: cfg.difficulty,
    signature: ulaz.signature,
  }

  if (zeljeni === 'single') {
    const decimals = ulaz.decimals ?? 0
    const distraktori = napraviDistraktore(rng, {
      tacan: ulaz.tacan,
      kandidati: ulaz.kandidati,
      max: ulaz.maxDistraktor ?? 1000,
      decimals,
    })
    const { options, correctId } = napraviOpcije(rng, ulaz.tacan, distraktori, ulaz.sufiks ?? '', decimals)
    return { ...osnova, type: 'single', options, correct: { optionId: correctId } }
  }

  // Podrazumevano: unos broja
  return { ...osnova, type: 'numeric', options: null, correct: { value: ulaz.tacan } }
}
