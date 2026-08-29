// Pomoćne funkcije za grupisanje/filtriranje tema po predmetu.
import { KONFIGURACIJA_PREDMETA, PREDMETI, type Oblast, type Predmet, type Razred, type Tezina } from '../types/db'

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
