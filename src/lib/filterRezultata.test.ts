import { describe, expect, it } from 'vitest'
import type { KategorijaKviza } from './api'
import { kvizPripadaKategoriji, pokusajPripadaProfilu } from './filterRezultata'

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

  it('razdvaja predmet i razred istog kviza', () => {
    const pokusaj = { child_profile_id: null, child_name: 'Andrej', quiz_id: 'mat-4' }

    expect(kvizPripadaKategoriji(pokusaj, kategorije, 'matematika', 4)).toBe(true)
    expect(kvizPripadaKategoriji(pokusaj, kategorije, 'matematika', 3)).toBe(false)
    expect(kvizPripadaKategoriji(pokusaj, kategorije, 'srpski', 4)).toBe(false)
  })
})
