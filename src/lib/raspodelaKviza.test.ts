import { describe, expect, it } from 'vitest'
import { napraviPlanOblastiKviza } from './raspodelaKviza.ts'

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
