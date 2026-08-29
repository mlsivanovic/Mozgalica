// Testovi svih oblasti matematike za 5. razred.
import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db.ts'
import { generisi, podrzaneOblasti } from './index.ts'
import type { GeneratorConfig } from './types.ts'
import {
  formatirajRazlomak, normalizujRazlomak, nzd, nzs, oduzmiRazlomke,
  podeliRazlomke, pomnoziRazlomke, saberiRazlomke, uporediRazlomke,
} from './moduli5/zajednicko5.ts'

const OBLASTI5 = [
  'prirodni-brojevi-5', 'deljivost-5', 'skupovi-i-logika-5', 'prosti-brojevi-5',
  'nzd-i-nzs-5', 'tacke-prave-i-duzi-5', 'kruznica-i-krug-5',
  'centralna-simetrija-i-translacija-5', 'uglovi-5', 'razlomci-5',
  'decimalni-brojevi-5', 'operacije-sa-razlomcima-5', 'jednacine-i-nejednacine-5',
  'procenti-prosek-i-razmera-5', 'obrada-podataka-5', 'osna-simetrija-5',
] as const

function cfg(topicSlug: string, difficulty: 1 | 2 | 3 | 4 | 5, seed: number, type: GeneratorConfig['type'] = 'auto'): GeneratorConfig {
  return { topicSlug, difficulty, count: 6, type, wordProblems: true, allowRepeats: false, seed }
}

function prost(n: number): boolean {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}

function proveriPitanje(p: ReturnType<typeof generisi>['questions'][number]) {
  expect(p.text.length).toBeGreaterThan(0)
  expect(p.explanation.length).toBeGreaterThan(0)
  expect(p.hint?.length ?? 0).toBeGreaterThan(0)
  expect(p.points).toBe(p.difficulty)
  if (p.type === 'numeric') {
    expect(Number.isFinite((p.correct as { value: number }).value)).toBe(true)
    expect(p.options).toBeNull()
  } else if (p.type === 'single') {
    const opcije = p.options as Opcija[]
    expect(opcije).toHaveLength(4)
    expect(new Set(opcije.map((o) => o.text)).size).toBe(4)
    const id = (p.correct as { optionId: string }).optionId
    expect(opcije.filter((o) => o.id === id)).toHaveLength(1)
  } else if (p.type === 'truefalse') {
    expect(typeof (p.correct as { value: boolean }).value).toBe('boolean')
    expect(p.options).toBeNull()
  } else {
    throw new Error(`Neočekivan tip pitanja za matematiku 5: ${p.type}`)
  }
}

describe('matematika 5. razred — registar i opšti ugovor', () => {
  it('registruje tačno svih 16 novih oblasti', () => {
    const podrzane = new Set(podrzaneOblasti())
    expect(OBLASTI5).toHaveLength(16)
    for (const slug of OBLASTI5) expect(podrzane.has(slug)).toBe(true)
  })

  it('svaka oblast generiše validna i jedinstvena pitanja na svih pet nivoa', () => {
    for (const slug of OBLASTI5) {
      for (const difficulty of [1, 2, 3, 4, 5] as const) {
        for (let seed = 0; seed < 6; seed++) {
          const rezultat = generisi(cfg(slug, difficulty, seed))
          expect(rezultat.questions.length, `${slug}, nivo ${difficulty}, seed ${seed}`).toBeGreaterThan(0)
          expect(new Set(rezultat.questions.map((p) => p.signature)).size).toBe(rezultat.questions.length)
          for (const p of rezultat.questions) {
            expect(p.topicSlug).toBe(slug)
            expect(p.difficulty).toBe(difficulty)
            proveriPitanje(p)
          }
        }
      }
    }
  })

  it('isti seed daje potpuno isti rezultat', () => {
    for (const slug of OBLASTI5) {
      const a = generisi(cfg(slug, 5, 12345))
      const b = generisi(cfg(slug, 5, 12345))
      expect(a).toEqual(b)
    }
  })

  it('eksplicitni numeric zahtev bez brojčanog odgovora bezbedno prelazi na single', () => {
    const pojmovne = ['skupovi-i-logika-5', 'prosti-brojevi-5', 'kruznica-i-krug-5', 'razlomci-5', 'osna-simetrija-5']
    for (const slug of pojmovne) {
      for (const difficulty of [1, 2, 3, 4, 5] as const) {
        const rezultat = generisi(cfg(slug, difficulty, 77, 'numeric'))
        for (const p of rezultat.questions) expect(['numeric', 'single']).toContain(p.type)
      }
    }
  })
})

describe('matematika 5. razred — matematičke invarijante', () => {
  it('deljenje sa ostatkom uvek poštuje a = bq + r i 0 ≤ r < b', () => {
    for (let seed = 0; seed < 100; seed++) {
      const p = generisi(cfg('prirodni-brojevi-5', 2, seed)).questions[0]
      const [, , a, b, q, r] = p.signature.split(':')
      expect(Number(a)).toBe(Number(b) * Number(q) + Number(r))
      expect(Number(r)).toBeGreaterThanOrEqual(0)
      expect(Number(r)).toBeLessThan(Number(b))
    }
  })

  it('NZD i NZS zadovoljavaju osnovne identitete', () => {
    for (let a = 1; a <= 80; a++) {
      for (let b = 1; b <= 80; b++) {
        expect(a % nzd(a, b)).toBe(0)
        expect(b % nzd(a, b)).toBe(0)
        expect(nzs(a, b) % a).toBe(0)
        expect(nzs(a, b) % b).toBe(0)
        expect(nzd(a, b) * nzs(a, b)).toBe(a * b)
      }
    }
  })

  it('razlomci se normalizuju i računaju bez greške pokretnog zareza', () => {
    expect(normalizujRazlomak(6, -8)).toEqual({ b: -3, i: 4 })
    expect(formatirajRazlomak(saberiRazlomke({ b: 1, i: 3 }, { b: 1, i: 6 }))).toBe('1/2')
    expect(formatirajRazlomak(oduzmiRazlomke({ b: 5, i: 6 }, { b: 1, i: 4 }))).toBe('7/12')
    expect(formatirajRazlomak(pomnoziRazlomke({ b: 2, i: 3 }, { b: 9, i: 10 }))).toBe('3/5')
    expect(formatirajRazlomak(podeliRazlomke({ b: 2, i: 3 }, { b: 4, i: 5 }))).toBe('5/6')
    expect(uporediRazlomke({ b: 7, i: 12 }, { b: 3, i: 5 })).toBeLessThan(0)
    expect(() => podeliRazlomke({ b: 1, i: 2 }, { b: 0, i: 3 })).toThrow('deljenje nulom')
  })

  it('prosti činioci u generisanim objašnjenjima daju početni broj', () => {
    for (let seed = 0; seed < 50; seed++) {
      const p = generisi(cfg('prosti-brojevi-5', 4, seed)).questions[0]
      const n = Number(p.signature.split(':')[3])
      const opcije = p.options as Opcija[]
      const tacanId = (p.correct as { optionId: string }).optionId
      const faktori = opcije.find((o) => o.id === tacanId)!.text.split(' · ').map(Number)
      expect(faktori.reduce((a, b) => a * b, 1)).toBe(n)
      for (const faktor of faktori) expect(prost(faktor)).toBe(true)
    }
  })
})
