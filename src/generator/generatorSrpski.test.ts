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
  'srpski-gramatika-4',
  'srpski-pravopis-4',
  'srpski-recnik-4',
  'srpski-citanje-4',
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

  it('svaka težina daje tačno 4 međusobno različite opcije', () => {
    for (const oblast of OBLASTI) {
      for (const difficulty of [1, 2, 3, 4, 5] as const) {
        const pitanja = generisi(cfg({ topicSlug: oblast, difficulty, count: 8, seed: 200 + difficulty })).questions
        expect(pitanja, `${oblast}, nivo ${difficulty}`).toHaveLength(8)
        // Rod imenice ima samo tri moguća odgovora — prirodan izuzetak
        const ocekivano = oblast === 'srpski-gramatika' && difficulty === 1 ? 3 : 4
        for (const pitanje of pitanja) {
          const options = pitanje.options as Opcija[]
          expect(options, `${oblast}, nivo ${difficulty}: ${pitanje.signature}`).toHaveLength(ocekivano)
          expect(new Set(options.map((opcija) => opcija.text)).size).toBe(ocekivano)
          expect(options.map((opcija) => opcija.text)).toContain(tekstTacnogOdgovora(pitanje))
        }
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
        expect(pitanje.text.length).toBeGreaterThan(10)
        expect(pitanje.text).not.toContain('undefined')
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

    expect(generisi(cfg({ topicSlug: 'srpski-gramatika-4', difficulty: 3, count: 1 })).questions[0].signature).toContain(':glagol-vreme-lice-broj:')
  })

  it('zamenica „ona“ daje različite potpise za ženski rod jednine i srednji rod množine', () => {
    const potpisi = new Set<string>()
    for (let seed = 1; seed <= 30; seed++) {
      const pitanja = generisi(cfg({ topicSlug: 'srpski-gramatika-4', difficulty: 2, count: 10, seed })).questions
      for (const pitanje of pitanja) potpisi.add(pitanje.signature)
    }
    const one = [...potpisi].filter((potpis) => potpis.includes(':ona:'))
    expect(one.length).toBe(2)
    expect(one[0]).not.toBe(one[1])
  })

  it('distraktori pitanja čitanja nisu potkrepljeni tekstom priče', () => {
    for (const oblast of ['srpski-citanje', 'srpski-citanje-4'] as const) {
      for (const difficulty of [1, 2, 3, 4, 5] as const) {
        const pitanja = generisi(cfg({ topicSlug: oblast, difficulty, count: 12, seed: 31 + difficulty })).questions
        for (const pitanje of pitanja) {
          const delovi = pitanje.text.split('\n\n')
          const telo = delovi[1] ?? ''
          const tacan = tekstTacnogOdgovora(pitanje)
          const netacni = (pitanje.options as Opcija[]).map((opcija) => opcija.text).filter((tekst) => tekst !== tacan)
          for (const netacan of netacni) {
            expect(telo.includes(netacan), `${oblast} ${pitanje.signature}: „${netacan}“ se nalazi u tekstu priče`).toBe(false)
          }
        }
      }
    }
  })

  it('distraktori se razlikuju od pitanja do pitanja iste vrste', () => {
    const trojke = new Set<string>()
    for (let seed = 1; seed <= 15; seed++) {
      const pitanja = generisi(cfg({ topicSlug: 'srpski-citanje', difficulty: 1, count: 5, seed })).questions
      for (const pitanje of pitanja) {
        if (!pitanje.text.endsWith('Ko je glavni lik u tekstu?')) continue
        const tacan = tekstTacnogOdgovora(pitanje)
        const netacni = (pitanje.options as Opcija[])
          .map((opcija) => opcija.text)
          .filter((tekst) => tekst !== tacan)
          .sort()
        trojke.add(netacni.join('|'))
      }
    }
    // Sa fiksnim distraktorima iz početka liste bilo bi svega dva-tri različita tripleta
    expect(trojke.size).toBeGreaterThanOrEqual(5)
  })

  it('bez ponavljanja vraća najviše onoliko pitanja koliko ima različitih zadataka', () => {
    // Izvedene reči u 4. razredu: 14 različitih osnova
    const rezultat = generisi(cfg({ topicSlug: 'srpski-recnik-4', difficulty: 3, count: 20, seed: 7 }))
    expect(rezultat.questions).toHaveLength(14)
    expect(rezultat.warning).not.toBeNull()
    expect(new Set(rezultat.questions.map((pitanje) => pitanje.signature)).size).toBe(14)
  })

  it('isti seed daje potpuno isti skup pitanja', () => {
    for (const oblast of OBLASTI) {
      const prvi = generisi(cfg({ topicSlug: oblast, difficulty: 4, seed: 123 }))
      const drugi = generisi(cfg({ topicSlug: oblast, difficulty: 4, seed: 123 }))
      expect(prvi).toEqual(drugi)
    }
  })

  it('pitanja čitanja uvek sadrže tekst i različite potpise', () => {
    for (const oblast of ['srpski-citanje', 'srpski-citanje-4'] as const) {
      const pitanja = generisi(cfg({ topicSlug: oblast, difficulty: 4, count: 12, seed: 77 })).questions
      expect(pitanja).toHaveLength(12)
      expect(new Set(pitanja.map((pitanje) => pitanje.signature)).size).toBe(12)
      for (const pitanje of pitanja) expect(pitanje.text).toContain('Pročitaj tekst:')
    }
  })
})
