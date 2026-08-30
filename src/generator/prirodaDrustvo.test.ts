import { describe, expect, it } from 'vitest'
import type { MatchingOpcije, Opcija, TipPitanja } from '../types/db.ts'
import { generisi, podrzaneOblasti } from './index.ts'
import { PID_PROGRAMSKA_POKRIVENOST } from './moduliPid/index.ts'
import type { GeneratorConfig, GenerisanoPitanje } from './types.ts'

const OBLASTI = Object.keys(PID_PROGRAMSKA_POKRIVENOST)
const TIPOVI = ['single', 'truefalse', 'matching'] as const

function konfiguracija(topicSlug: string, type: TipPitanja | 'auto', seed = 42, count = 8): GeneratorConfig {
  return {
    topicSlug, type, seed, count, difficulty: 1,
    wordProblems: false, allowRepeats: false,
  }
}

function proveriStrukturu(pitanje: GenerisanoPitanje) {
  expect(pitanje.difficulty).toBe(5)
  expect(pitanje.points).toBe(5)
  expect(pitanje.explanation.trim().length).toBeGreaterThan(10)

  if (pitanje.type === 'single') {
    const opcije = pitanje.options as Opcija[]
    expect(opcije).toHaveLength(4)
    expect(new Set(opcije.map((opcija) => opcija.id)).size).toBe(opcije.length)
    expect(new Set(opcije.map((opcija) => opcija.text)).size).toBe(opcije.length)
    const tacanId = (pitanje.correct as { optionId: string }).optionId
    expect(opcije.some((opcija) => opcija.id === tacanId)).toBe(true)
  } else if (pitanje.type === 'truefalse') {
    expect(typeof (pitanje.correct as { value: unknown }).value).toBe('boolean')
    expect(pitanje.options).toBeNull()
  } else if (pitanje.type === 'matching') {
    const opcije = pitanje.options as MatchingOpcije
    const parovi = (pitanje.correct as { pairs: Record<string, string> }).pairs
    expect(opcije.left).toHaveLength(4)
    expect(opcije.right).toHaveLength(4)
    expect(new Set(opcije.left.map((opcija) => opcija.id)).size).toBe(4)
    expect(new Set(opcije.right.map((opcija) => opcija.id)).size).toBe(4)
    expect(new Set(opcije.left.map((opcija) => opcija.text)).size).toBe(4)
    expect(new Set(opcije.right.map((opcija) => opcija.text)).size).toBe(4)
    expect(Object.keys(parovi).sort()).toEqual(opcije.left.map((opcija) => opcija.id).sort())
    expect(new Set(Object.values(parovi))).toEqual(new Set(opcije.right.map((opcija) => opcija.id)))
  }
}

describe('generatori Prirode i društva', () => {
  it('registruje svih deset oblasti', () => {
    expect(OBLASTI).toHaveLength(10)
    expect(OBLASTI.every((oblast) => podrzaneOblasti().includes(oblast))).toBe(true)
  })

  it('isti seed daje potpuno isti rezultat', () => {
    for (const oblast of OBLASTI) {
      expect(generisi(konfiguracija(oblast, 'auto', 17))).toEqual(
        generisi(konfiguracija(oblast, 'auto', 17)),
      )
    }
  })

  it('svaka oblast poštuje eksplicitni tip i daje najmanje osam različitih pitanja', () => {
    for (const oblast of OBLASTI) {
      for (const tip of TIPOVI) {
        const rezultat = generisi(konfiguracija(oblast, tip))
        expect(rezultat.questions, `${oblast}:${tip}`).toHaveLength(8)
        expect(new Set(rezultat.questions.map((pitanje) => pitanje.signature)).size).toBe(8)
        for (const pitanje of rezultat.questions) {
          expect(pitanje.type).toBe(tip)
          proveriStrukturu(pitanje)
        }
      }
    }
  })

  it('automatski tip približno prati raspodelu 60/25/15', () => {
    const pitanja = generisi({
      ...konfiguracija(OBLASTI[0], 'auto', 123, 2000), allowRepeats: true,
    }).questions
    const broj = (tip: TipPitanja) => pitanja.filter((pitanje) => pitanje.type === tip).length / pitanja.length
    expect(broj('single')).toBeGreaterThan(0.56)
    expect(broj('single')).toBeLessThan(0.64)
    expect(broj('truefalse')).toBeGreaterThan(0.21)
    expect(broj('truefalse')).toBeLessThan(0.29)
    expect(broj('matching')).toBeGreaterThan(0.11)
    expect(broj('matching')).toBeLessThan(0.19)
  })

  it('manifest dokazuje pokrivenost svake programske porodice', () => {
    for (const [oblast, ocekivanePorodice] of Object.entries(PID_PROGRAMSKA_POKRIVENOST)) {
      const pronadjene = new Set<string>()
      for (let seed = 0; seed < 500; seed++) {
        const pitanje = generisi({
          ...konfiguracija(oblast, 'single', seed, 1), allowRepeats: true,
        }).questions[0]
        if (pitanje) pronadjene.add(pitanje.signature.split(':')[2])
      }
      expect([...ocekivanePorodice].filter((porodica) => !pronadjene.has(porodica)), oblast).toEqual([])
    }
  })

  it('ne traži nepoznato mesto, sliku ili kartu koja nije prikazana', () => {
    const zabranjeno = /u (tvom|vašem) (mestu|kraju|opštini)|na (prikazanoj|datoj) (slici|karti)|pogledaj (sliku|kartu)/i
    for (const oblast of OBLASTI) {
      for (const tip of TIPOVI) {
        const pitanja = generisi({
          ...konfiguracija(oblast, tip, 91, 30), allowRepeats: true,
        }).questions
        for (const pitanje of pitanja) {
          expect(`${pitanje.text} ${pitanje.hint} ${pitanje.explanation}`).not.toMatch(zabranjeno)
        }
      }
    }
  })
})
