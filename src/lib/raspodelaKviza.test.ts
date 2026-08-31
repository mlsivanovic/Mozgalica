import { describe, expect, it } from 'vitest'
import type { Oblast } from '../types/db.ts'
import { izaberiOblastiZaKviz, napraviPlanOblastiKviza, dostupanKombinovaniIzvor } from './raspodelaKviza.ts'

const PODRZANI = new Set(['gramatika', 'pravopis'])

describe('raspodela kombinovanog kviza', () => {
  it('ravnomerno deli pitanja i bira izvor posebno za svaku oblast', () => {
    expect(napraviPlanOblastiKviza(
      ['gramatika', 'pravopis', 'knjizevnost', 'jezicka-kultura'], 10, PODRZANI, 'combined',
    )).toEqual([
      { topicSlug: 'gramatika', questionCount: 3, source: 'generator' },
      { topicSlug: 'pravopis', questionCount: 3, source: 'generator' },
      { topicSlug: 'knjizevnost', questionCount: 2, source: 'bank' },
      { topicSlug: 'jezicka-kultura', questionCount: 2, source: 'bank' },
    ])
  })

  it('čisti generator izostavlja oblasti bez generatora', () => {
    expect(napraviPlanOblastiKviza(
      ['gramatika', 'knjizevnost', 'pravopis'], 5, PODRZANI, 'generator',
    )).toEqual([
      { topicSlug: 'gramatika', questionCount: 3, source: 'generator' },
      { topicSlug: 'pravopis', questionCount: 2, source: 'generator' },
    ])
  })

  it('ne pravi duplikate i preskače oblasti kojima nije pripalo pitanje', () => {
    expect(napraviPlanOblastiKviza(
      ['gramatika', 'gramatika', 'knjizevnost'], 1, PODRZANI, 'combined',
    )).toEqual([
      { topicSlug: 'gramatika', questionCount: 1, source: 'generator' },
    ])
  })
})

describe('izbor oblasti standardnog kviza', () => {
  const oblasti: Oblast[] = [
    { id: 's3', slug: 'srpski-gramatika', name: 'Gramatika', sort_order: 1, subject: 'srpski', grade: 3 },
    { id: 's4', slug: 'srpski-gramatika-4', name: 'Gramatika', sort_order: 2, subject: 'srpski', grade: 4 },
    { id: 'm3', slug: 'sabiranje', name: 'Sabiranje', sort_order: 3, subject: 'matematika', grade: 3 },
    { id: 'p4', slug: 'pid-covek-4', name: 'Čovek', sort_order: 4, subject: 'priroda_drustvo', grade: 4 },
  ]

  it('izbacuje zaostale oblasti drugog razreda i predmeta', () => {
    expect(izaberiOblastiZaKviz(
      oblasti,
      'srpski',
      3,
      ['srpski-gramatika-4', 'sabiranje', 'srpski-gramatika'],
    )).toEqual([oblasti[0]])
  })

  it('posle promene sa četvrtog na treći razred ne vraća oblast četvrtog', () => {
    expect(izaberiOblastiZaKviz(oblasti, 'srpski', 3, ['srpski-gramatika-4'])).toEqual([])
  })

  it('izdvaja oblast Prirode i društva bez mešanja sa drugim predmetima', () => {
    expect(izaberiOblastiZaKviz(oblasti, 'priroda_drustvo', 4, ['sabiranje', 'pid-covek-4']))
      .toEqual([oblasti[3]])
  })
})


describe('dostupnost kombinovanog izvora u formama', () => {
  const oblasti = [{ slug: 'gramatika' }, { slug: 'pravopis' }]
  it('priroda i društvo nudi kombinovani izvor i kada sve oblasti imaju generator', () => {
    expect(dostupanKombinovaniIzvor('priroda_drustvo', oblasti, PODRZANI)).toBe(true)
    expect(dostupanKombinovaniIzvor('priroda_drustvo', [], PODRZANI)).toBe(false)
  })
  it('srpski i matematika zadržavaju potrebu za oblastima bez generatora', () => {
    for (const predmet of ['srpski', 'matematika'] as const) {
      expect(dostupanKombinovaniIzvor(predmet, oblasti, PODRZANI)).toBe(false)
      expect(dostupanKombinovaniIzvor(predmet, [...oblasti, { slug: 'samo-banka' }], PODRZANI)).toBe(true)
    }
  })
})
