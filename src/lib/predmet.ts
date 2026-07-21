// Pomoćne funkcije za grupisanje/filtriranje tema po predmetu (matematika/srpski).
import type { Oblast, Predmet } from '../types/db'

export interface GrupaOblasti {
  predmet: Predmet
  oblasti: Oblast[]
}

const REDOSLED_PREDMETA: Predmet[] = ['matematika', 'srpski']

// Teme grupisane po predmetu, redosled Matematika pa Srpski, prazne grupe izostavljene.
export function grupisiOblastiPoPredmetu(oblasti: Oblast[]): GrupaOblasti[] {
  return REDOSLED_PREDMETA
    .map((predmet) => ({ predmet, oblasti: oblasti.filter((o) => o.subject === predmet) }))
    .filter((g) => g.oblasti.length > 0)
}

// topic_id → predmet, za brzo filtriranje pitanja po aktivnom tabu bez ponovnog upita baze.
export function mapaPredmetaPoTemi(oblasti: Oblast[]): Map<string, Predmet> {
  return new Map(oblasti.map((o) => [o.id, o.subject]))
}
