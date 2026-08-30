import { describe, expect, it } from 'vitest'
import { generisi, podrzaneOblasti, regenerisiJedno } from './index.ts'
import { NAZIVI_GENERISANIH_OBLASTI, IKONE_GENERISANIH_OBLASTI } from './oblasti.ts'
import { razrediPredmeta, tezinaZaPredmet } from '../lib/predmet.ts'
import { izaberiOblastiZaKviz, napraviPlanOblastiKviza } from '../lib/raspodelaKviza.ts'
import type { GeneratorConfig, GenerisanoPitanje } from './types.ts'
import type { Oblast } from '../types/db.ts'

const MODULI = ['srpski-vrste-reci-2', 'srpski-gramatika-2', 'srpski-citanje-2', 'srpski-recnik-2'] as const
const SVE = [...MODULI, 'srpski-pravopis-2', 'srpski-knjizevnost-2', 'srpski-jezicka-kultura-2']
const TIPOVI = ['text', 'truefalse', 'numeric'] as const

function cfg(delimicno: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    topicSlug: 'srpski-gramatika-2',
    difficulty: 3,
    count: 8,
    type: 'auto',
    wordProblems: false,
    allowRepeats: false,
    seed: 42,
    ...delimicno,
  }
}

function accept(pitanje: GenerisanoPitanje): string[] {
  return (pitanje.correct as { accept: string[] }).accept
}

const norm = (s: string) => s.toLowerCase().replace(/[čć]/g, 'c').replaceAll('đ', 'd')
  .replaceAll('š', 's').replaceAll('ž', 'z').replace(/\s+/g, ' ').trim()

describe('srpski za 2. razred', () => {
  it('registruje četiri generatora i omogućava razred bez promene težine', () => {
    expect(razrediPredmeta('srpski')).toEqual([2, 3, 4, 5])
    expect(tezinaZaPredmet('srpski', 1)).toBe(5)
    for (const slug of MODULI) {
      expect(podrzaneOblasti()).toContain(slug)
      expect(NAZIVI_GENERISANIH_OBLASTI[slug]).toBeTruthy()
      expect(IKONE_GENERISANIH_OBLASTI[slug]).toBeTruthy()
    }
    expect(podrzaneOblasti().filter((s) => s.startsWith('srpski-') && s.endsWith('-2'))).toHaveLength(4)
    expect(podrzaneOblasti()).not.toContain('srpski-pravopis-2')
  })

  it('svaka oblast pravi pitanja isključivo dozvoljenih tipova, bez obzira na težinu', () => {
    for (const oblast of MODULI) {
      for (const difficulty of [1, 3, 5] as const) {
        const rezultat = generisi(cfg({ topicSlug: oblast, difficulty, count: 6, seed: 100 + difficulty }))
        expect(rezultat.questions, `${oblast}, nivo ${difficulty}`).toHaveLength(6)
        for (const pitanje of rezultat.questions) {
          expect(pitanje.topicSlug).toBe(oblast)
          expect(TIPOVI).toContain(pitanje.type)
          expect(pitanje.type).not.toBe('single')
          expect(pitanje.difficulty).toBe(5)
          expect(pitanje.points).toBe(5)
          expect(pitanje.text.length).toBeGreaterThan(10)
          expect(pitanje.explanation.length).toBeGreaterThan(5)
          expect(pitanje.text).not.toContain('undefined')
          expect(`${pitanje.text} ${pitanje.explanation}`).not.toMatch(/\p{Script=Cyrillic}/u)
        }
      }
    }
  })

  it('tekstualna pitanja imaju listu prihvaćenih odgovora bez duplikata', () => {
    for (const oblast of MODULI) {
      const pitanja = generisi(cfg({ topicSlug: oblast, count: 15, seed: 11 })).questions
      for (const pitanje of pitanja.filter((p) => p.type === 'text')) {
        expect(pitanje.options).toBeNull()
        const lista = accept(pitanje)
        expect(lista.length).toBeGreaterThan(0)
        for (const odgovor of lista) expect(odgovor.trim().length).toBeGreaterThan(0)
        const normalizovano = lista.map(norm)
        expect(new Set(normalizovano).size).toBe(normalizovano.length)
      }
    }
  })

  it('tačno/netačno tvrdnje su samostalne i jednoznačne', () => {
    for (const oblast of ['srpski-vrste-reci-2', 'srpski-gramatika-2', 'srpski-recnik-2'] as const) {
      const pitanja = generisi(cfg({ topicSlug: oblast, count: 12, type: 'truefalse', seed: 91 })).questions
      expect(pitanja.length).toBeGreaterThan(0)
      expect(pitanja.some((p) => p.type === 'truefalse')).toBe(true)
      for (const pitanje of pitanja) {
        if (pitanje.type !== 'truefalse') continue
        expect(pitanje.options).toBeNull()
        expect(pitanje.text.length).toBeGreaterThan(15)
        expect(typeof (pitanje.correct as { value: boolean }).value).toBe('boolean')
        expect(pitanje.text).toContain('„')
        expect(pitanje.text).not.toContain('undefined')
      }
    }
  })

  it('čitanje uvek traži ukucani odgovor iz kratkog teksta', () => {
    const pitanja = generisi(cfg({ topicSlug: 'srpski-citanje-2', count: 16, type: 'truefalse', seed: 7 })).questions
    expect(pitanja).toHaveLength(16)
    for (const p of pitanja) {
      expect(p.type).toBe('text')
      expect(p.text).toContain('Pročitaj tekst:')
    }
  })

  it('pokriva dogovorene porodice zadataka, bez sadržaja 3. razreda', () => {
    const potpisi = new Set<string>()
    for (const oblast of MODULI) {
      for (let seed = 1; seed <= 80; seed++) {
        for (const pitanje of generisi(cfg({ topicSlug: oblast, count: 8, seed })).questions) {
          potpisi.add(pitanje.signature)
        }
      }
    }
    for (const prefiks of [
      'srpski-vrste-reci-2:vrsta:', 'srpski-vrste-reci-2:imenica:', 'srpski-vrste-reci-2:broj:',
      'srpski-vrste-reci-2:brojanje:',
      'srpski-gramatika-2:imenica-rod:', 'srpski-gramatika-2:imenica-broj:',
      'srpski-gramatika-2:vreme:', 'srpski-gramatika-2:glagol-oblik:',
      'srpski-gramatika-2:recenica-vrsta:', 'srpski-gramatika-2:recenica-oblik:',
      'srpski-gramatika-2:glas:', 'srpski-gramatika-2:slogovi:',
      'srpski-recnik-2:suprotno:', 'srpski-recnik-2:porodica:',
    ]) {
      expect([...potpisi].some((potpis) => potpis.startsWith(prefiks)), prefiks).toBe(true)
    }
    expect([...potpisi].some((p) => p.includes(':kraj'))).toBe(true)
    expect([...potpisi].join('\n')).not.toMatch(/zbirna|gradivn|lična zamenica|prisvojni pridev|umanjenica|uvećanica/)
  })

  it('isti seed daje potpuno isti skup pitanja', () => {
    for (const oblast of MODULI) {
      const prvi = generisi(cfg({ topicSlug: oblast, seed: 123 }))
      const drugi = generisi(cfg({ topicSlug: oblast, seed: 123 }))
      expect(prvi).toEqual(drugi)
    }
  })

  it('kombinovani kviz koristi četiri generatora i tri banke bez mešanja razreda', () => {
    const oblasti: Oblast[] = SVE.map((slug, i) => ({
      id: String(i), slug, name: slug, subject: 'srpski', grade: 2, sort_order: i,
    }))
    oblasti.push({ id: 'stara', slug: 'srpski-gramatika', name: 'Gramatika', subject: 'srpski', grade: 3, sort_order: 1 })
    const izabrane = izaberiOblastiZaKviz(oblasti, 'srpski', 2, oblasti.map((o) => o.slug))
    expect(izabrane.map((o) => o.slug)).toEqual(SVE)
    const plan = napraviPlanOblastiKviza(SVE, 20, new Set(podrzaneOblasti()), 'combined')
    expect(plan.reduce((n, p) => n + p.questionCount, 0)).toBe(20)
    expect(plan.filter((p) => p.source === 'generator').map((p) => p.topicSlug)).toEqual([...MODULI])
    expect(plan.filter((p) => p.source === 'bank').map((p) => p.topicSlug)).toEqual(SVE.slice(4))
    expect(regenerisiJedno(cfg({ topicSlug: 'srpski-gramatika-2' }), new Set())).not.toBeNull()
  })
})
