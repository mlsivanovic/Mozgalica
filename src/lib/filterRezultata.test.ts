import { describe, expect, it } from 'vitest'
import type { KategorijaKviza } from './api'
import type { Razred } from '../types/db'
import { kvizImaPredmet, kvizImaRazred, pokusajPripadaProfilu } from './filterRezultata'

const kategorije: KategorijaKviza[] = [
  { quiz_id: 'mat-3', subject: 'matematika', grade: 3 },
  { quiz_id: 'mat-4', subject: 'matematika', grade: 4 },
  { quiz_id: 'srp-3', subject: 'srpski', grade: 3 },
]

describe('filteri rezultata', () => {
  it('filtrira profil po id-u i povezuje stari pokušaj po imenu', () => {
    const profil = { id: 'andrej', name: 'Andrej' }

    expect(pokusajPripadaProfilu({
      child_profile_id: 'andrej', child_name: 'Staro ime', quiz_id: 'mat-3',
    }, profil)).toBe(true)
    expect(pokusajPripadaProfilu({
      child_profile_id: null, child_name: 'ANDREJ', quiz_id: 'mat-3',
    }, profil)).toBe(true)
    expect(pokusajPripadaProfilu({
      child_profile_id: 'filip', child_name: 'Andrej', quiz_id: 'mat-3',
    }, profil)).toBe(false)
  })

  it('kvizImaPredmet: podudara subject iz kategorija', () => {
    const pokusaj = { child_profile_id: null, child_name: 'Andrej', quiz_id: 'mat-4' }

    // Bez filtera prolazi sve
    expect(kvizImaPredmet(pokusaj, kategorije, '')).toBe(true)
    // Tačan predmet
    expect(kvizImaPredmet(pokusaj, kategorije, 'matematika')).toBe(true)
    // Pogrešan predmet
    expect(kvizImaPredmet(pokusaj, kategorije, 'srpski')).toBe(false)
    // Kviz bez kategorije ne pripada nijednom predmetu
    expect(kvizImaPredmet({ ...pokusaj, quiz_id: 'nepoznat' }, kategorije, 'matematika')).toBe(false)
  })

  it('kvizImaRazred: čita razred iz mape kvizova', () => {
    const razredi = new Map<string, Razred>([
      ['mat-3', 3],
      ['mat-4', 4],
      ['srp-3', 3],
    ])

    // Bez filtera prolazi sve
    expect(kvizImaRazred('mat-4', razredi, '')).toBe(true)
    // Tačan razred
    expect(kvizImaRazred('mat-4', razredi, 4)).toBe(true)
    expect(kvizImaRazred('mat-3', razredi, 3)).toBe(true)
    // Pogrešan razred
    expect(kvizImaRazred('mat-4', razredi, 3)).toBe(false)
    // Kviz sa grade=null (nije u mapi) ne pripada nijednom razredu
    expect(kvizImaRazred('nepoznat', razredi, 3)).toBe(false)
    expect(kvizImaRazred('nepoznat', razredi, 4)).toBe(false)
    // Ali prolazi kad filter nije aktivan
    expect(kvizImaRazred('nepoznat', razredi, '')).toBe(true)
  })
})
