import { describe, expect, it } from 'vitest'
import type { Pitanje } from '../types/db.ts'
import { filtrirajPoVlasnistvu, idsZaBrisanje, jeZajednicko, mozeDaMenja } from './zajednickaBanka.ts'

const JA = 'roditelj-1'
const VLASNIK = 'vlasnik-platforme'

function pitanje(id: string, owner_id: string, is_shared = false): Pitanje {
  return { id, owner_id, is_shared } as Pitanje
}

const pitanja = [
  pitanje('moje', JA),
  pitanje('zajednicko-1', VLASNIK, true),
  pitanje('zajednicko-2', VLASNIK, true),
]

describe('zajednička banka pitanja', () => {
  it('pitanje drugog vlasnika je zajedničko i ne sme se menjati', () => {
    expect(jeZajednicko(pitanja[1], JA)).toBe(true)
    expect(mozeDaMenja(pitanja[1], JA)).toBe(false)
  })

  it('sopstveno pitanje nije zajedničko i sme se menjati', () => {
    expect(jeZajednicko(pitanja[0], JA)).toBe(false)
    expect(mozeDaMenja(pitanja[0], JA)).toBe(true)
  })

  it('vlasnik platforme menja svoja zajednička pitanja i vidi ih pod filterom Zajednička', () => {
    expect(mozeDaMenja(pitanja[1], VLASNIK)).toBe(true)
    expect(jeZajednicko(pitanja[1], VLASNIK)).toBe(true)
    expect(filtrirajPoVlasnistvu(pitanja, 'zajednicka', VLASNIK).map((p) => p.id)).toEqual(['zajednicko-1', 'zajednicko-2'])
    expect(filtrirajPoVlasnistvu(pitanja, 'moja', VLASNIK).map((p) => p.id)).toEqual(['zajednicko-1', 'zajednicko-2'])
  })

  it('filter Sva / Moja / Zajednička', () => {
    expect(filtrirajPoVlasnistvu(pitanja, 'sva', JA).map((p) => p.id)).toEqual(['moje', 'zajednicko-1', 'zajednicko-2'])
    expect(filtrirajPoVlasnistvu(pitanja, 'moja', JA).map((p) => p.id)).toEqual(['moje'])
    expect(filtrirajPoVlasnistvu(pitanja, 'zajednicka', JA).map((p) => p.id)).toEqual(['zajednicko-1', 'zajednicko-2'])
  })

  it('za brisanje ostaju samo sopstvena izabrana pitanja', () => {
    expect(idsZaBrisanje(pitanja, ['moje', 'zajednicko-1'], JA)).toEqual(['moje'])
    expect(idsZaBrisanje(pitanja, ['zajednicko-1'], JA)).toEqual([])
  })

  it('nepoznat id se ne briše', () => {
    expect(idsZaBrisanje(pitanja, ['nepoznat'], JA)).toEqual([])
  })

  it('bez prijavljenog korisnika ništa nije sopstveno', () => {
    expect(mozeDaMenja(pitanja[0], null)).toBe(false)
    expect(jeZajednicko(pitanja[0], null)).toBe(true)
  })
})
