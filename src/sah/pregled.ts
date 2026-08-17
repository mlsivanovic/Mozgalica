export const POCETNI_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export interface PotezZaPregled {
  uci: string
  san: string
  fenAfter: string
}

export interface PozicijaPregleda {
  fen: string
  lastMove: { from: string; to: string } | null
  san: string | null
}

export function ogranicenPlyPregleda(ply: number, brojPoteza: number): number {
  if (brojPoteza <= 0 || !Number.isFinite(ply)) return 0
  return Math.max(0, Math.min(Math.trunc(ply), brojPoteza))
}

/** `0` je početna tabla, `n` je pozicija posle n-tog polupoteza. */
export function pozicijaPregleda(potezi: PotezZaPregled[], ply: number): PozicijaPregleda {
  const n = ogranicenPlyPregleda(ply, potezi.length)
  if (n === 0) return { fen: POCETNI_FEN, lastMove: null, san: null }
  const potez = potezi[n - 1]
  return {
    fen: potez.fenAfter,
    lastMove: { from: potez.uci.slice(0, 2), to: potez.uci.slice(2, 4) },
    san: potez.san,
  }
}

/** Klik na broj punog poteza ide na kraj tog poteza (crni ako postoji). */
export function plyZaBrojPoteza(broj: number, brojPoteza: number): number {
  const beli = broj * 2 - 1
  const crni = broj * 2
  if (crni <= brojPoteza) return crni
  return ogranicenPlyPregleda(beli, brojPoteza)
}
