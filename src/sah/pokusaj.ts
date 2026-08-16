import { SAH_ELO_NIVOI } from './podesavanja'

export type SahEloNivo = (typeof SAH_ELO_NIVOI)[number]

// Ukupan broj ponovnih pokušaja po lancu partija (čuva se i server-side).
export const MAX_PONOVNIH_POKUSAJA = 3

// ELO nivoi dozvoljeni za ponovni pokušaj: isti ili slabiji od poraženog
// protivnika, od najjačeg ka najslabijem.
export function dozvoljeniEloZaPokusaj(porazeniElo: number): SahEloNivo[] {
  return [...SAH_ELO_NIVOI].filter((nivo) => nivo <= porazeniElo).sort((a, b) => b - a)
}

export function preostaloPokusaja(retriesUsed: number | null | undefined): number {
  return Math.max(0, MAX_PONOVNIH_POKUSAJA - (retriesUsed ?? 0))
}
