import { describe, expect, it } from 'vitest'
import { KONFIGURACIJA_PREDMETA, PREDMETI } from '../types/db.ts'
import { predmetImaTezinu, razrediPredmeta, tezinaZaPredmet } from './predmet.ts'

describe('centralna konfiguracija predmeta', () => {
  it('uključuje Prirodu i društvo samo za 3. i 4. razred', () => {
    expect(PREDMETI).toContain('priroda_drustvo')
    expect(razrediPredmeta('priroda_drustvo')).toEqual([3, 4])
    expect(KONFIGURACIJA_PREDMETA.priroda_drustvo.tipoviGeneratora).toEqual([
      'single', 'truefalse', 'matching',
    ])
  })

  it('predmeti bez izbora težine uvek dobijaju fiksnu peticu', () => {
    expect(predmetImaTezinu('priroda_drustvo')).toBe(false)
    expect(tezinaZaPredmet('priroda_drustvo', 1)).toBe(5)
    expect(tezinaZaPredmet('srpski', 2)).toBe(5)
    expect(tezinaZaPredmet('matematika', 2)).toBe(2)
  })
})
