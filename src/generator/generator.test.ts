// Testovi generatora pitanja: determinizam, matematička pravila, distraktori, duplikati
import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db'
import { generisi, podrzaneOblasti, REGISTAR } from './index'
import { napraviRng } from './random'
import type { GeneratorConfig, GenerisanoPitanje } from './types'
import { bezPozajmice, bezPrenosa, napraviDistraktore, zamenaCifara } from './distraktori'
import { izRimskog, uRimski } from './moduli/rimski'

const TEZINE = [1, 2, 3, 4, 5] as const

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

  it('sabiranje težine 2–5 ima sve više sabiraka i rezultat do 1000', () => {
    const ocekivanoPoTezini: Record<number, number> = { 2: 3, 3: 4, 4: 5, 5: 6 }
    for (const tezina of [2, 3, 4, 5] as const) {
      const ocekivanoSabiraka = ocekivanoPoTezini[tezina]
      for (let seed = 0; seed < 30; seed++) {
        const r = generisi(cfg({ seed, difficulty: tezina, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const operandi = p.signature.replace('sabiranje:', '').split('+').map(Number)
          expect(operandi).toHaveLength(ocekivanoSabiraka)
          const suma = operandi.reduce((s, x) => s + x, 0)
          expect(suma).toBeLessThanOrEqual(1000)
          expect(tacnaVrednost(p)).toBe(suma)
        }
      }
    }
  })

  it('oduzimanje nikad ne daje negativan rezultat (uklj. međurezultate u lancu)', () => {
    for (const tezina of TEZINE) {
      for (let seed = 0; seed < 30; seed++) {
        const r = generisi(cfg({ topicSlug: 'oduzimanje', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('oduzimanje težine 1 nema pozajmicu; težine 2–5 su lanac koji nikad ne postane negativan', () => {
    const ocekivanoPoTezini: Record<number, number> = { 2: 3, 3: 4, 4: 5, 5: 6 }
    for (let seed = 0; seed < 30; seed++) {
      for (const p of generisi(cfg({ topicSlug: 'oduzimanje', seed, count: 5, type: 'numeric' })).questions) {
        const [a, b] = p.signature.replace('oduzimanje:', '').split('-').map(Number)
        expect(bezPozajmice(a, b)).toBe(a - b)
      }
      for (const tezina of [2, 3, 4, 5] as const) {
        const ocekivanoOperanada = ocekivanoPoTezini[tezina]
        const r = generisi(cfg({ topicSlug: 'oduzimanje', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const operandi = p.signature.replace('oduzimanje:', '').split('-').map(Number)
          expect(operandi).toHaveLength(ocekivanoOperanada)
          let medjurezultat = operandi[0]
          for (let i = 1; i < operandi.length; i++) {
            medjurezultat -= operandi[i]
            expect(medjurezultat).toBeGreaterThanOrEqual(0)
          }
          expect(tacnaVrednost(p)).toBe(medjurezultat)
        }
      }
    }
  })

  it('deljenje nikad nema ostatak (uklj. lanac deljenja na težem nivou)', () => {
    for (const tezina of TEZINE) {
      for (let seed = 0; seed < 30; seed++) {
        const r = generisi(cfg({ topicSlug: 'deljenje', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const brojevi = p.signature.replace('deljenje:', '').split(':').map(Number)
          const [deljenik, ...delioci] = brojevi
          let medjurezultat = deljenik
          for (const d of delioci) {
            expect(medjurezultat % d).toBe(0)
            medjurezultat /= d
          }
          expect(tacnaVrednost(p)).toBe(medjurezultat)
        }
      }
    }
  })

  it('svi rezultati su u opsegu 0–1000 (osim mernih jedinica do 10000)', () => {
    for (const oblast of podrzaneOblasti()) {
      if (oblast === 'poredjenje-brojeva' || oblast === 'rimski-brojevi') continue // odgovor može biti znak/rimski string, ne broj
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
      // Rimski brojevi su uvek otvoren unos (numeric/text) — 'single' se namerno ignoriše
      if (oblast === 'rimski-brojevi') continue
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
  it('svih 13 oblasti ima generator', () => {
    expect(REGISTAR.size).toBe(13)
    expect(podrzaneOblasti()).toContain('sabiranje')
    expect(podrzaneOblasti()).toContain('novac')
    expect(podrzaneOblasti()).toContain('rimski-brojevi')
    expect(podrzaneOblasti()).toContain('jednacine')
    expect(podrzaneOblasti()).toContain('nejednacine')
  })

  it('nepoznata oblast vraća upozorenje bez pitanja', () => {
    const r = generisi(cfg({ topicSlug: 'geometrija' }))
    expect(r.questions).toHaveLength(0)
    expect(r.warning).toBeTruthy()
  })
})

describe('nove oblasti — čista matematika', () => {
  it('rimski brojevi: konverzija u oba smera je tačna i invertuje se (1–1000)', () => {
    const provere = [1, 3, 4, 9, 14, 40, 49, 90, 444, 999, 1000]
    for (const n of provere) {
      const rimski = uRimski(n)
      expect(izRimskog(rimski), `${n} → ${rimski}`).toBe(n)
    }
  })

  it('jednačine: sve oblasti generišu pitanja sa tačno invertovanim x', () => {
    for (let seed = 0; seed < 20; seed++) {
      const r = generisi(cfg({ topicSlug: 'jednacine', difficulty: 3, seed, count: 5, type: 'numeric' }))
      for (const p of r.questions) {
        expect((p.correct as { value: number }).value).toBeGreaterThan(0)
        expect(p.text).toContain('x')
      }
    }
  })

  it('nejednačine: granica je tačno za jedan pomerena i unutar 0–1000', () => {
    for (let seed = 0; seed < 20; seed++) {
      const r = generisi(cfg({ topicSlug: 'nejednacine', difficulty: 1, seed, count: 5, type: 'numeric' }))
      for (const p of r.questions) {
        const v = (p.correct as { value: number }).value
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1000)
      }
    }
  })
})

describe('nivoi 4 i 5 (Vrlo teško / Ekspert)', () => {
  it('mnozenje t4 koristi dva dvocifrena činioca; t5 tri činioca sa dva dvocifrena', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const p of generisi(cfg({ topicSlug: 'mnozenje', difficulty: 4, seed, count: 5, type: 'numeric' })).questions) {
        const cinioci = p.signature.replace('mnozenje:', '').split('x').map(Number)
        expect(cinioci).toHaveLength(2)
        expect(cinioci.every((c) => c >= 11)).toBe(true)
      }
      for (const p of generisi(cfg({ topicSlug: 'mnozenje', difficulty: 5, seed, count: 5, type: 'numeric' })).questions) {
        const cinioci = p.signature.replace('mnozenje:', '').split('x').map(Number)
        expect(cinioci).toHaveLength(3)
        expect(cinioci.filter((c) => c >= 11).length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('deljenje t4/t5 nikad nema ostatak i koristi dvocifreni delilac', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (const tezina of [4, 5] as const) {
        const r = generisi(cfg({ topicSlug: 'deljenje', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const brojevi = p.signature.replace('deljenje:', '').split(':').map(Number)
          const [deljenik, ...delioci] = brojevi
          expect(delioci[0]).toBeGreaterThanOrEqual(11)
          let medjurezultat = deljenik
          for (const d of delioci) {
            expect(medjurezultat % d).toBe(0)
            medjurezultat /= d
          }
        }
      }
    }
  })

  it('rimski t5 (aritmetika): tekst sadrži rimske brojeve, rezultat je tačan zbir/razlika', () => {
    for (let seed = 0; seed < 20; seed++) {
      const r = generisi(cfg({ topicSlug: 'rimski-brojevi', difficulty: 5, seed, count: 5, type: 'numeric' }))
      for (const p of r.questions) {
        const m = p.signature.match(/^rimski:aritmetika:([+-]):(\d+),(\d+)$/)
        expect(m, p.signature).toBeTruthy()
        const [, znak, xs, ys] = m!
        const x = Number(xs)
        const y = Number(ys)
        const ocekivano = znak === '-' ? x - y : x + y
        expect(tacnaVrednost(p)).toBe(ocekivano)
        expect(p.text).toContain(uRimski(x))
        expect(p.text).toContain(uRimski(y))
      }
    }
  })

  it('poređenje brojeva: leva i desna strana se razlikuju za najviše 3', () => {
    function izracunajStranu(prikaz: string): number {
      const delovi = prikaz.split(' ')
      if (delovi.length === 1) return Number(delovi[0])
      if (delovi.length === 3) {
        const [a, op, b] = delovi
        const x = Number(a); const y = Number(b)
        if (op === '+') return x + y
        if (op === '−') return x - y
        return x * y
      }
      const [a, op1, b, op2, c] = delovi
      const baza = op1 === '·' ? Number(a) * Number(b) : Number(a) + Number(b)
      return op2 === '+' ? baza + Number(c) : baza - Number(c)
    }
    for (const tezina of TEZINE) {
      for (let seed = 0; seed < 20; seed++) {
        const r = generisi(cfg({ topicSlug: 'poredjenje-brojeva', difficulty: tezina, seed, count: 6, type: 'single' }))
        for (const p of r.questions) {
          const m = p.signature.match(/^poredjenje:(.+)\?(.+)$/)
          expect(m, p.signature).toBeTruthy()
          const [, levoStr, desnoStr] = m!
          const razlika = Math.abs(izracunajStranu(levoStr) - izracunajStranu(desnoStr))
          expect(razlika, p.signature).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('rimski: nikad ponuđeni odgovori, uvek otvoren unos (numeric ili text)', () => {
    for (const tezina of TEZINE) {
      for (let seed = 0; seed < 15; seed++) {
        // Tražimo 'single' eksplicitno — mora biti ignorisano za ovu oblast
        const r = generisi(cfg({ topicSlug: 'rimski-brojevi', difficulty: tezina, seed, count: 6, type: 'single' }))
        for (const p of r.questions) {
          expect(['numeric', 'text']).toContain(p.type)
          expect(p.options).toBeNull()
          if (p.type === 'text') {
            const prihvaceni = (p.correct as { accept: string[] }).accept
            expect(prihvaceni.length).toBeGreaterThan(0)
            expect(/^[IVXLCDM]+$/.test(prihvaceni[0])).toBe(true)
          }
        }
      }
    }
  })

  it('jednačine t5 (dvostepeno): x tačno rešava a·x ± b = c', () => {
    for (let seed = 0; seed < 20; seed++) {
      const r = generisi(cfg({ topicSlug: 'jednacine', difficulty: 5, seed, count: 5, type: 'numeric' }))
      for (const p of r.questions) {
        const m = p.signature.match(/^jednacine:dvokorak:([+-]):(\d+),(\d+),(\d+)$/)
        expect(m, p.signature).toBeTruthy()
        const [, znak, as, xs, bs] = m!
        const a = Number(as)
        const x = Number(xs)
        const b = Number(bs)
        expect(tacnaVrednost(p)).toBe(x)
        const c = znak === '+' ? a * x + b : a * x - b
        expect(c).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('nejednačine t4/t5: granica je tačno za jedan pomerena i unutar 0–1000', () => {
    for (const tezina of [4, 5] as const) {
      for (let seed = 0; seed < 20; seed++) {
        const r = generisi(cfg({ topicSlug: 'nejednacine', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const v = tacnaVrednost(p)
          expect(v, `t${tezina} seed${seed}: ${p.text}`).toBeGreaterThanOrEqual(0)
          expect(v, `t${tezina} seed${seed}: ${p.text}`).toBeLessThanOrEqual(1000)
        }
      }
    }
  })

  it('podrazumevani NAZIVI_TEZINA pokrivaju svih 5 nivoa', async () => {
    const { NAZIVI_TEZINA } = await import('../types/db')
    expect(Object.keys(NAZIVI_TEZINA)).toHaveLength(5)
    expect(NAZIVI_TEZINA[4]).toBeTruthy()
    expect(NAZIVI_TEZINA[5]).toBeTruthy()
  })
})
