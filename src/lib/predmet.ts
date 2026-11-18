// Pomoćne funkcije za grupisanje/filtriranje tema po predmetu i nivou pristupa.
import { KONFIGURACIJA_PREDMETA, PREDMETI, RAZREDI, type Oblast, type Predmet, type Razred, type Tezina } from '../types/db'

export interface GrupaOblasti {
  predmet: Predmet
  oblasti: Oblast[]
}

// Teme grupisane po predmetu, prazne grupe se izostavljaju.
export function grupisiOblastiPoPredmetu(oblasti: Oblast[]): GrupaOblasti[] {
  return PREDMETI
    .map((predmet) => ({ predmet, oblasti: oblasti.filter((o) => o.subject === predmet) }))
    .filter((g) => g.oblasti.length > 0)
}

export function razrediPredmeta(predmet: Predmet): readonly Razred[] {
  return KONFIGURACIJA_PREDMETA[predmet].razredi
}

export function normalizujRazrede(ulaz?: readonly number[] | null): Razred[] {
  if (!ulaz) return [...RAZREDI]
  const filtrirani = RAZREDI.filter((r) => ulaz.includes(r))
  return filtrirani.length > 0 ? filtrirani : [...RAZREDI]
}

export function normalizujPredmete(ulaz?: readonly string[] | null): Predmet[] {
  if (!ulaz) return [...PREDMETI]
  const filtrirani = PREDMETI.filter((p) => ulaz.includes(p))
  return filtrirani.length > 0 ? filtrirani : [...PREDMETI]
}

export function kombinacijaPristupaJeIspravna(
  razredi: readonly Razred[],
  predmeti: readonly Predmet[],
): boolean {
  return predmeti.some((p) => KONFIGURACIJA_PREDMETA[p].razredi.some((r) => razredi.includes(r)))
}

export function dozvoljeniRazrediPredmeta(
  predmet: Predmet,
  dozvoljeniRazredi: readonly Razred[],
): Razred[] {
  return KONFIGURACIJA_PREDMETA[predmet].razredi.filter((r) => dozvoljeniRazredi.includes(r))
}

export function dostupniPredmetiZaRazrede(razredi: readonly Razred[]): Predmet[] {
  if (razredi.length === 0) return []
  return PREDMETI.filter((p) =>
    KONFIGURACIJA_PREDMETA[p].razredi.some((r) => razredi.includes(r)),
  )
}

export function filtrirajPredmeteZaRazrede(
  predmeti: readonly Predmet[],
  razredi: readonly Razred[],
): Predmet[] {
  const dostupni = dostupniPredmetiZaRazrede(razredi)
  return PREDMETI.filter((p) => predmeti.includes(p) && dostupni.includes(p))
}

export function dozvoljeniPredmetiZaKorisnika(
  dozvoljeniPredmeti: readonly Predmet[],
  dozvoljeniRazredi: readonly Razred[],
): Predmet[] {
  const vazeci = PREDMETI.filter(
    (p) => dozvoljeniPredmeti.includes(p) && dozvoljeniRazrediPredmeta(p, dozvoljeniRazredi).length > 0,
  )
  return vazeci.length > 0 ? vazeci : normalizujPredmete(dozvoljeniPredmeti)
}

export function predmetImaTezinu(predmet: Predmet): boolean {
  return KONFIGURACIJA_PREDMETA[predmet].imaTezinu
}

export function tezinaZaPredmet(predmet: Predmet, izabrana?: Tezina | null): Tezina {
  const cfg = KONFIGURACIJA_PREDMETA[predmet]
  return cfg.imaTezinu && izabrana != null ? izabrana : cfg.fiksnaTezina
}

// topic_id → predmet, za brzo filtriranje pitanja po aktivnom tabu bez ponovnog upita baze.
export function mapaPredmetaPoTemi(oblasti: Oblast[]): Map<string, Predmet> {
  return new Map(oblasti.map((o) => [o.id, o.subject]))
}
