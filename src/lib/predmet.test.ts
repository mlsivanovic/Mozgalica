import { describe, expect, it } from 'vitest'
import { KONFIGURACIJA_PREDMETA, PREDMETI } from '../types/db.ts'
import {
  dozvoljeniPredmetiZaKorisnika, dozvoljeniRazrediPredmeta, kombinacijaPristupaJeIspravna,
  normalizujPredmete, normalizujRazrede, predmetImaTezinu, razrediPredmeta, tezinaZaPredmet,
} from './predmet.ts'

describe('centralna konfiguracija predmeta', () => {
  it('matematika pokriva 2.–5, srpski 2.–5, a priroda i društvo 3. i 4. razred', () => {
    expect(razrediPredmeta('matematika')).toEqual([2, 3, 4, 5])
    expect(PREDMETI).toContain('priroda_drustvo')
    expect(razrediPredmeta('priroda_drustvo')).toEqual([3, 4])
    expect(razrediPredmeta('srpski')).toEqual([2, 3, 4, 5])
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

  it('normalizuje i filtrira dozvoljene razrede i predmete po nivou pristupa', () => {
    expect(normalizujRazrede([5, 3, 99])).toEqual([3, 5])
    expect(normalizujRazrede(null)).toEqual([2, 3, 4, 5])
    expect(normalizujPredmete(['srpski', 'nepostoji', 'matematika'])).toEqual(['matematika', 'srpski'])
    expect(normalizujPredmete(undefined)).toEqual(['matematika', 'srpski', 'priroda_drustvo'])

    expect(kombinacijaPristupaJeIspravna([2, 5], ['priroda_drustvo'])).toBe(false)
    expect(kombinacijaPristupaJeIspravna([3], ['priroda_drustvo'])).toBe(true)
    expect(kombinacijaPristupaJeIspravna([2], ['matematika', 'priroda_drustvo'])).toBe(true)

    expect(dozvoljeniRazrediPredmeta('matematika', [2, 4])).toEqual([2, 4])
    expect(dozvoljeniRazrediPredmeta('priroda_drustvo', [2, 3, 5])).toEqual([3])
    expect(dozvoljeniPredmetiZaKorisnika(['matematika', 'priroda_drustvo'], [2, 5])).toEqual(['matematika'])
  })
})
