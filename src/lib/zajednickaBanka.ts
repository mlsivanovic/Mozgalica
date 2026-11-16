// Zajednička banka pitanja: ko vidi, a ko sme da menja pitanje.
// RLS već ograničava upise; ovde se samo prikazuje i filtrira ono što je dozvoljeno.
import type { Pitanje } from '../types/db'

export type FilterVlasnistva = 'sva' | 'moja' | 'zajednicka'

// Pitanje koje nije moje dolazi iz zajedničke banke (RLS ga vraća samo ako je is_shared).
export function jeZajednicko(pitanje: Pitanje, userId: string | null): boolean {
  return pitanje.owner_id !== userId
}

export function mozeDaMenja(pitanje: Pitanje, userId: string | null): boolean {
  return pitanje.owner_id === userId
}

export function filtrirajPoVlasnistvu(
  pitanja: Pitanje[],
  filter: FilterVlasnistva,
  userId: string | null,
): Pitanje[] {
  if (filter === 'sva') return pitanja
  if (filter === 'moja') return pitanja.filter((p) => mozeDaMenja(p, userId))
  return pitanja.filter((p) => jeZajednicko(p, userId))
}

// Izabrana pitanja koja korisnik sme da obriše. Zajednička se nikad ne brišu iz UI-ja.
export function idsZaBrisanje(pitanja: Pitanje[], izabrana: string[], userId: string | null): string[] {
  const mapa = new Map(pitanja.map((p) => [p.id, p]))
  return izabrana.filter((id) => {
    const pitanje = mapa.get(id)
    return pitanje !== undefined && mozeDaMenja(pitanje, userId)
  })
}
