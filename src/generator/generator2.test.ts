// Testovi generatora matematike za 2. razred: opseg do 100, tablica, determinizam.
import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db.ts'
import { generisi, podrzaneOblasti } from './index.ts'
import { uRimski } from './moduli/rimski.ts'
import { najblizaDesetica } from './moduli2/zajednicko2.ts'
import type { GeneratorConfig } from './types.ts'

const OBLASTI2 = [
  'brojevi-do-100-2', 'sabiranje-2', 'oduzimanje-2', 'mnozenje-2', 'deljenje-2',
  'kombinovane-operacije-2', 'jednacine-2', 'delovi-celine-2', 'novac-2',
  'rimski-brojevi-2', 'nizovi-2', 'tabele-i-dijagrami-2', 'geometrija-2', 'merenje-2',
] as const

function cfg(topicSlug: string, difficulty: 1 | 2 | 3 | 4 | 5, seed: number, type: GeneratorConfig['type'] = 'auto'): GeneratorConfig {
  return { topicSlug, difficulty, count: 6, type, wordProblems: true, allowRepeats: false, seed }
}

function tacnaVrednost(p: { type: string; correct: unknown; options: unknown }): number {
  if (p.type === 'numeric') return (p.correct as { value: number }).value
  const opcije = p.options as Opcija[]
  const id = (p.correct as { optionId: string }).optionId
  const tekst = opcije.find((o) => o.id === id)!.text
  const broj = parseInt(tekst, 10)
  return Number.isFinite(broj) ? broj : Number.NaN
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
    throw new Error(`Neočekivan tip pitanja za matematiku 2: ${p.type}`)
  }
}

describe('matematika 2. razred — registar i opšti ugovor', () => {
  it('registruje tačno svih 14 novih oblasti', () => {
    const podrzane = new Set(podrzaneOblasti())
    expect(OBLASTI2).toHaveLength(14)
    for (const slug of OBLASTI2) expect(podrzane.has(slug)).toBe(true)
  })

  it('svaka oblast generiše validna i jedinstvena pitanja na svih pet nivoa', () => {
    for (const slug of OBLASTI2) {
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
    for (const slug of OBLASTI2) {
      const a = generisi(cfg(slug, 5, 12345))
      const b = generisi(cfg(slug, 5, 12345))
      expect(a).toEqual(b)
    }
  })
})

describe('matematika 2. razred — matematička pravila', () => {
  it('sabiranje-2: zbir 0–100, na nivou 1 do 20', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg('sabiranje-2', tezina, seed, 'numeric'))
        for (const p of r.questions) {
          const zbir = tacnaVrednost(p)
          expect(zbir).toBeGreaterThanOrEqual(0)
          expect(zbir).toBeLessThanOrEqual(100)
          if (tezina === 1) expect(zbir).toBeLessThanOrEqual(20)
          if (p.signature.startsWith('sabiranje2:zamena:')) {
            const [a] = p.signature.replace('sabiranje2:zamena:', '').split('+').map(Number)
            expect(zbir).toBe(a)
            continue
          }
          const operandi = p.signature.replace(/^sabiranje2:(tekst:)?/, '').split('+').map(Number)
          expect(operandi.reduce((s, x) => s + x, 0)).toBe(zbir)
        }
      }
    }
  })

  it('oduzimanje-2: rezultat nikad negativan i do 100', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg('oduzimanje-2', tezina, seed, 'numeric'))
        for (const p of r.questions) {
          const v = tacnaVrednost(p)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(100)
          const delovi = p.signature.replace(/^oduzimanje2:(tekst:)?/, '').split('-').map(Number)
          if (delovi.length >= 2 && delovi.every(Number.isFinite)) {
            expect(delovi.reduce((a, b) => a - b)).toBe(v)
          }
        }
      }
    }
  })

  it('mnozenje-2: činioci 0–10, proizvod ≤ 100', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 12; seed++) {
        const r = generisi(cfg('mnozenje-2', tezina, seed, 'numeric'))
        for (const p of r.questions) {
          if (p.type !== 'numeric' && Number.isNaN(tacnaVrednost(p))) continue
          const v = tacnaVrednost(p)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(100)
          if (p.signature.startsWith('mnozenje2:zbir:')) {
            const m = p.signature.match(/zbir:(\d+)\+(\d+)x(\d+)/)
            expect(m).not.toBeNull()
            expect((Number(m![1]) + Number(m![2])) * Number(m![3])).toBe(v)
            continue
          }
          const m = p.signature.match(/(\d+)x(\d+)/)
          expect(m).not.toBeNull()
          const a = Number(m![1]), b = Number(m![2])
          expect(a).toBeGreaterThanOrEqual(0)
          expect(a).toBeLessThanOrEqual(10)
          expect(b).toBeGreaterThanOrEqual(0)
          expect(b).toBeLessThanOrEqual(10)
          expect(a * b).toBe(v)
        }
      }
    }
  })

  it('deljenje-2: bez ostatka, delilac ≠ 0', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 12; seed++) {
        const r = generisi(cfg('deljenje-2', tezina, seed, 'numeric'))
        for (const p of r.questions) {
          const v = tacnaVrednost(p)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(100)
          if (p.signature.startsWith('deljenje2:nula:')) {
            expect(v).toBe(0)
            expect(Number(p.signature.split(':')[2])).not.toBe(0)
            continue
          }
          const delovi = p.signature.replace(/^deljenje2:(veza:|sadrzalac:|tekst:)?/, '').split(':').map(Number)
          if (delovi.length >= 2 && delovi.every(Number.isFinite)) {
            const [deljenik, delilac] = delovi
            expect(delilac).not.toBe(0)
            expect(deljenik % delilac).toBe(0)
            expect(deljenik / delilac).toBe(v)
          }
        }
      }
    }
  })

  it('jednacine-2: nepoznata je prirodan broj 0–100', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 10; seed++) {
        for (const p of generisi(cfg('jednacine-2', tezina, seed, 'numeric')).questions) {
          const v = tacnaVrednost(p)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(100)
          expect(Number.isInteger(v)).toBe(true)
        }
      }
    }
  })

  it('delovi-celine-2: tačan je uvek ceo broj', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 10; seed++) {
        for (const p of generisi(cfg('delovi-celine-2', tezina, seed)).questions) {
          if (p.type === 'single' && p.signature.startsWith('delovi2:koji:')) continue
          const v = tacnaVrednost(p)
          expect(Number.isInteger(v)).toBe(true)
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('rimski-brojevi-2: samo I, V, X, L, C i vrednost 1–100', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 10; seed++) {
        for (const p of generisi(cfg('rimski-brojevi-2', tezina, seed)).questions) {
          const n = Number(p.signature.split(':')[2])
          expect(n).toBeGreaterThanOrEqual(1)
          expect(n).toBeLessThanOrEqual(100)
          expect(uRimski(n)).toMatch(/^[IVXLC]+$/)
          if (p.type === 'numeric') expect(tacnaVrednost(p)).toBe(n)
        }
      }
    }
  })

  it('merenje-2: samo m/dm/cm i navedene vremenske jedinice', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 8; seed++) {
        for (const p of generisi(cfg('merenje-2', tezina, seed, 'numeric')).questions) {
          expect(p.signature.startsWith('merenje2:')).toBe(true)
          expect(p.text).not.toMatch(/\b(km|mm|kg|g|l)\b/)
          const v = tacnaVrednost(p)
          expect(v).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('brojevi-do-100-2: najbliža desetica se slaže sa pravilom', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const p of generisi(cfg('brojevi-do-100-2', 4, seed, 'numeric')).questions) {
        const n = Number(p.signature.split(':')[2])
        expect(tacnaVrednost(p)).toBe(najblizaDesetica(n))
      }
    }
  })

  it('distraktori u single pitanjima nikad nisu tačan odgovor', () => {
    for (const slug of OBLASTI2) {
      for (const p of generisi(cfg(slug, 3, 7, 'single')).questions) {
        if (p.type !== 'single') continue
        const opcije = p.options as Opcija[]
        const id = (p.correct as { optionId: string }).optionId
        const tacan = opcije.find((o) => o.id === id)!.text
        expect(opcije.filter((o) => o.text === tacan)).toHaveLength(1)
      }
    }
  })
})
