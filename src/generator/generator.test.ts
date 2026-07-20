// Testovi generatora pitanja: determinizam, matematička pravila, distraktori, duplikati
import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db'
import { generisi, podrzaneOblasti, REGISTAR } from './index'
import { napraviRng } from './random'
import type { GeneratorConfig, GenerisanoPitanje } from './types'
import { bezPozajmice, bezPrenosa, napraviDistraktore, zamenaCifara } from './distraktori'

const TEZINE = [1, 2, 3] as const

function cfg(delimicno: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    topicSlug: 'sabiranje',
    difficulty: 1,
    count: 10,
    type: 'auto',
    wordProblems: false,
    allowRepeats: false,
    seed: 42,
    ...delimicno,
  }
}

// Izvuci brojčanu vrednost tačnog odgovora (numeric direktno, single preko opcije)
function tacnaVrednost(p: GenerisanoPitanje): number {
  if (p.type === 'numeric') return (p.correct as { value: number }).value
  const opcije = p.options as Opcija[]
  const id = (p.correct as { optionId: string }).optionId
  const tekst = opcije.find((o) => o.id === id)!.text
  return parseInt(tekst, 10)
}

describe('determinizam', () => {
  it('isti seed daje identična pitanja', () => {
    for (const oblast of podrzaneOblasti()) {
      const a = generisi(cfg({ topicSlug: oblast, seed: 7, count: 5 }))
      const b = generisi(cfg({ topicSlug: oblast, seed: 7, count: 5 }))
      expect(a.questions).toEqual(b.questions)
    }
  })

  it('različit seed daje različita pitanja', () => {
    const a = generisi(cfg({ seed: 1, count: 5 }))
    const b = generisi(cfg({ seed: 2, count: 5 }))
    expect(a.questions.map((q) => q.signature)).not.toEqual(b.questions.map((q) => q.signature))
  })
})

describe('matematička pravila po oblastima', () => {
  it('sabiranje težine 1 ostaje do 100 i bez prenosa', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const p of generisi(cfg({ seed, count: 5, type: 'numeric' })).questions) {
        const [a, b] = p.signature.replace('sabiranje:', '').split('+').map(Number)
        expect(a + b).toBeLessThanOrEqual(100)
        expect(bezPrenosa(a, b)).toBe(a + b) // bez prenosa ⇒ „naivno" sabiranje je tačno
      }
    }
  })

  it('sabiranje težine 2 i 3 ima prenos i rezultat do 1000', () => {
    for (const tezina of [2, 3] as const) {
      for (let seed = 0; seed < 30; seed++) {
        const r = generisi(cfg({ seed, difficulty: tezina, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const [a, b] = p.signature.replace('sabiranje:', '').split('+').map(Number)
          expect(a + b).toBeLessThanOrEqual(1000)
          expect(bezPrenosa(a, b)).not.toBe(a + b) // postoji bar jedan prenos
        }
      }
    }
  })

  it('oduzimanje nikad ne daje negativan rezultat', () => {
    for (const tezina of TEZINE) {
      for (let seed = 0; seed < 30; seed++) {
        const r = generisi(cfg({ topicSlug: 'oduzimanje', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('oduzimanje težine 1 nema pozajmicu, težine 2 i 3 imaju', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const p of generisi(cfg({ topicSlug: 'oduzimanje', seed, count: 5, type: 'numeric' })).questions) {
        const [a, b] = p.signature.replace('oduzimanje:', '').split('-').map(Number)
        expect(bezPozajmice(a, b)).toBe(a - b)
      }
      for (const tezina of [2, 3] as const) {
        const r = generisi(cfg({ topicSlug: 'oduzimanje', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const [a, b] = p.signature.replace('oduzimanje:', '').split('-').map(Number)
          expect(a).toBeGreaterThanOrEqual(b)
          expect(bezPozajmice(a, b)).not.toBe(a - b)
        }
      }
    }
  })

  it('deljenje nikad nema ostatak', () => {
    for (const tezina of TEZINE) {
      for (let seed = 0; seed < 30; seed++) {
        const r = generisi(cfg({ topicSlug: 'deljenje', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const [deljenik, delilac] = p.signature.replace('deljenje:', '').split(':').map(Number)
          expect(deljenik % delilac).toBe(0)
          expect(tacnaVrednost(p)).toBe(deljenik / delilac)
        }
      }
    }
  })

  it('svi rezultati su u opsegu 0–1000 (osim mernih jedinica do 10000)', () => {
    for (const oblast of podrzaneOblasti()) {
      if (oblast === 'poredjenje-brojeva') continue // odgovor je znak, ne broj
      const maks = oblast === 'merne-jedinice' ? 10000 : 1000
      for (const tezina of TEZINE) {
        for (let seed = 0; seed < 15; seed++) {
          const r = generisi(cfg({ topicSlug: oblast, difficulty: tezina, seed, count: 5, type: 'numeric' }))
          for (const p of r.questions) {
            const v = tacnaVrednost(p)
            expect(v, `${oblast} t${tezina} seed${seed}: ${p.text}`).toBeGreaterThanOrEqual(0)
            expect(v, `${oblast} t${tezina} seed${seed}: ${p.text}`).toBeLessThanOrEqual(maks)
          }
        }
      }
    }
  })
})

describe('single-choice opcije i distraktori', () => {
  it('svaka single opcija je jedinstvena i tačan odgovor postoji među opcijama', () => {
    for (const oblast of podrzaneOblasti()) {
      for (const tezina of TEZINE) {
        for (let seed = 0; seed < 15; seed++) {
          const r = generisi(cfg({ topicSlug: oblast, difficulty: tezina, seed, count: 4, type: 'single' }))
          for (const p of r.questions) {
            const opcije = p.options as Opcija[]
            expect(opcije.length).toBeGreaterThanOrEqual(3) // poređenje ima 3 znaka, ostali 4
            const tekstovi = opcije.map((o) => o.text)
            expect(new Set(tekstovi).size).toBe(tekstovi.length) // nema duplih ponuđenih
            const correctId = (p.correct as { optionId: string }).optionId
            expect(opcije.some((o) => o.id === correctId)).toBe(true)
          }
        }
      }
    }
  })

  it('napraviDistraktore vraća tačno 3 različita, nijedan jednak tačnom', () => {
    const rng = napraviRng(5)
    for (let tacan = 0; tacan <= 100; tacan += 7) {
      const d = napraviDistraktore(rng, { tacan, kandidati: [tacan, tacan + 1, -5, 2000] })
      expect(d).toHaveLength(3)
      expect(new Set(d).size).toBe(3)
      for (const x of d) {
        expect(x).not.toBe(tacan)
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(1000)
      }
    }
  })
})

describe('duplikati', () => {
  it('bez allowRepeats nema ponovljenih potpisa', () => {
    for (const oblast of podrzaneOblasti()) {
      const r = generisi(cfg({ topicSlug: oblast, count: 15, seed: 11 }))
      const potpisi = r.questions.map((q) => q.signature)
      expect(new Set(potpisi).size).toBe(potpisi.length)
    }
  })

  it('kada je prostor iscrpljen vraća manje pitanja uz upozorenje', () => {
    // Tablica množenja 2–5 sa količnikom 2–10 ima ograničen broj različitih zadataka
    const r = generisi(cfg({ topicSlug: 'mnozenje', count: 100, seed: 3 }))
    expect(r.questions.length).toBeLessThan(100)
    expect(r.warning).toBeTruthy()
  })
})

describe('pomoćne funkcije distraktora', () => {
  it('bezPrenosa modeluje sabiranje bez prenosa', () => {
    expect(bezPrenosa(47, 38)).toBe(75) // umesto 85
    expect(bezPrenosa(23, 45)).toBe(68) // nema prenosa — isto kao tačno
  })
  it('bezPozajmice modeluje okretanje cifara pri oduzimanju', () => {
    expect(bezPozajmice(52, 38)).toBe(26) // umesto 14
    expect(bezPozajmice(58, 32)).toBe(26) // nema pozajmice — isto kao tačno
  })
  it('zamenaCifara menja poslednje dve cifre', () => {
    expect(zamenaCifara(85)).toBe(58)
    expect(zamenaCifara(120)).toBe(102)
    expect(zamenaCifara(7)).toBe(7)
  })
})

describe('tekstualni zadaci', () => {
  it('oblasti sa podrškom daju tekst bez sirovog izraza', () => {
    for (const oblast of ['sabiranje', 'oduzimanje', 'mnozenje', 'deljenje'] as const) {
      const r = generisi(cfg({ topicSlug: oblast, wordProblems: true, count: 8, seed: 9 }))
      for (const p of r.questions) {
        expect(p.text).not.toContain('Izračunaj:')
        expect(p.text.length).toBeGreaterThan(30)
      }
    }
  })

  it('potpis je kanonski račun, bez tekstualnog omotača (dedup radi preko računa)', () => {
    const r = generisi(cfg({ topicSlug: 'sabiranje', wordProblems: true, count: 8, seed: 21 }))
    for (const p of r.questions) {
      // Potpis mora biti oblika 'sabiranje:<a>+<b>' iako je tekst pitanja priča
      expect(p.signature).toMatch(/^sabiranje:\d+\+\d+$/)
      const [a, b] = p.signature.replace('sabiranje:', '').split('+').map(Number)
      expect(p.text).toContain(String(a))
      expect(p.text).toContain(String(b))
    }
  })
})

describe('registar', () => {
  it('svih 10 oblasti ima generator', () => {
    expect(REGISTAR.size).toBe(10)
    expect(podrzaneOblasti()).toContain('sabiranje')
    expect(podrzaneOblasti()).toContain('novac')
  })

  it('nepoznata oblast vraća upozorenje bez pitanja', () => {
    const r = generisi(cfg({ topicSlug: 'geometrija' }))
    expect(r.questions).toHaveLength(0)
    expect(r.warning).toBeTruthy()
  })
})
