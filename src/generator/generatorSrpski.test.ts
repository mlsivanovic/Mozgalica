// Testovi generatora srpskog jezika: jednoznačni odgovori, nivoi i determinizam.
import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db.ts'
import { generisi } from './index.ts'
import type { GeneratorConfig, GenerisanoPitanje } from './types.ts'

const OBLASTI = [
  'srpski-vrste-reci',
  'srpski-gramatika',
  'srpski-pravopis',
  'srpski-citanje',
  'srpski-recnik',
] as const

function cfg(delimicno: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    topicSlug: 'srpski-gramatika',
    difficulty: 1,
    count: 8,
    type: 'single',
    wordProblems: false,
    allowRepeats: false,
    seed: 42,
    ...delimicno,
  }
}

function tekstTacnogOdgovora(pitanje: GenerisanoPitanje): string {
  const options = pitanje.options as Opcija[]
  const id = (pitanje.correct as { optionId: string }).optionId
  return options.find((opcija) => opcija.id === id)!.text
}

describe('generatori srpskog jezika', () => {
  it('svaka oblast na svakom nivou pravi automatski ocenljiva pitanja', () => {
    for (const oblast of OBLASTI) {
      for (const difficulty of [1, 2, 3, 4, 5] as const) {
        const rezultat = generisi(cfg({ topicSlug: oblast, difficulty, count: 6, seed: 100 + difficulty }))
        expect(rezultat.questions, `${oblast}, nivo ${difficulty}`).toHaveLength(6)
        for (const pitanje of rezultat.questions) {
          expect(pitanje.topicSlug).toBe(oblast)
          expect(pitanje.difficulty).toBe(difficulty)
          expect(pitanje.type).toBe('single')
          expect(pitanje.text.length).toBeGreaterThan(10)
          expect(pitanje.explanation.length).toBeGreaterThan(5)
        }
      }
    }
  })

  it('ponuđeni odgovori su jedinstveni, a tačan odgovor postoji među njima', () => {
    for (const oblast of OBLASTI) {
      const pitanja = generisi(cfg({ topicSlug: oblast, difficulty: 5, count: 10, seed: 17 })).questions
      for (const pitanje of pitanja) {
        const options = pitanje.options as Opcija[]
        expect(options).toHaveLength(4)
        expect(new Set(options.map((opcija) => opcija.text)).size).toBe(4)
        expect(options.map((opcija) => opcija.text)).toContain(tekstTacnogOdgovora(pitanje))
      }
    }
  })

  it('izričit izbor tačno/netačno poštuje se u svim oblastima', () => {
    for (const oblast of OBLASTI) {
      const pitanja = generisi(cfg({ topicSlug: oblast, difficulty: 3, count: 8, type: 'truefalse', seed: 91 })).questions
      expect(pitanja).toHaveLength(8)
      for (const pitanje of pitanja) {
        expect(pitanje.type).toBe('truefalse')
        expect(pitanje.options).toBeNull()
        expect(typeof (pitanje.correct as { value: boolean }).value).toBe('boolean')
      }
    }
  })

  it('nivoi menjaju vrstu zadatka kod vrsta reči, gramatike i rečnika', () => {
    expect(generisi(cfg({ topicSlug: 'srpski-vrste-reci', difficulty: 1, count: 1 })).questions[0].signature).toContain(':rec:')
    expect(generisi(cfg({ topicSlug: 'srpski-vrste-reci', difficulty: 4, count: 1 })).questions[0].signature).toContain(':broj:')
    expect(generisi(cfg({ topicSlug: 'srpski-vrste-reci', difficulty: 5, count: 1 })).questions[0].signature).toContain(':redosled:')

    expect(generisi(cfg({ topicSlug: 'srpski-gramatika', difficulty: 1, count: 1 })).questions[0].signature).toContain(':rod:')
    expect(generisi(cfg({ topicSlug: 'srpski-gramatika', difficulty: 2, count: 1 })).questions[0].signature).toContain(':broj:')
    expect(generisi(cfg({ topicSlug: 'srpski-gramatika', difficulty: 5, count: 1 })).questions[0].signature).toContain(':subjekat-predikat:')

    expect(generisi(cfg({ topicSlug: 'srpski-recnik', difficulty: 1, count: 1 })).questions[0].signature).toContain(':antonim:')
    expect(generisi(cfg({ topicSlug: 'srpski-recnik', difficulty: 3, count: 1 })).questions[0].signature).toContain(':porodica:')
    expect(generisi(cfg({ topicSlug: 'srpski-recnik', difficulty: 5, count: 1 })).questions[0].signature).toContain(':izraz:')
  })

  it('isti seed daje potpuno isti skup pitanja', () => {
    for (const oblast of OBLASTI) {
      const prvi = generisi(cfg({ topicSlug: oblast, difficulty: 4, seed: 123 }))
      const drugi = generisi(cfg({ topicSlug: oblast, difficulty: 4, seed: 123 }))
      expect(prvi).toEqual(drugi)
    }
  })

  it('pitanja čitanja uvek sadrže tekst i različite potpise', () => {
    const pitanja = generisi(cfg({ topicSlug: 'srpski-citanje', difficulty: 4, count: 12, seed: 77 })).questions
    expect(pitanja).toHaveLength(12)
    expect(new Set(pitanja.map((pitanje) => pitanje.signature)).size).toBe(12)
    for (const pitanje of pitanja) expect(pitanje.text).toContain('Pročitaj tekst:')
  })
})
