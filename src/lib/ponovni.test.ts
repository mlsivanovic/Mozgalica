// Testovi ponovnog pokušaja: generisanje novih verzija netačnih zadataka sa
// različitim brojevima, fallback na original i lokalno čuvanje odgovora.
import { describe, expect, it } from 'vitest'
import { generisi } from '../generator/index.ts'
import type { GenerisanoPitanje } from '../generator/types.ts'
import type { RezultatPitanja } from '../types/kviz.ts'
import {
  generisiPonovne, obrisiPonovneOdgovore, sacuvajPonovneOdgovore, ucitajPonovneOdgovore,
} from './ponovni'
import type { Skladiste } from './offlineQueue'

function memorijskoSkladiste(): Skladiste {
  const mapa = new Map<string, string>()
  return {
    getItem: (k) => mapa.get(k) ?? null,
    setItem: (k, v) => void mapa.set(k, v),
    removeItem: (k) => void mapa.delete(k),
  }
}

function netacno(partial: Partial<RezultatPitanja> = {}): RezultatPitanja {
  return {
    id: 'qq-1',
    type: 'numeric',
    text: 'Izračunaj: 23 + 45',
    options: null,
    points: 1,
    answer: null,
    isCorrect: false,
    awardedPoints: 0,
    correct: { value: 68 },
    explanation: '23 + 45 = 68',
    topicSlug: 'sabiranje',
    ...partial,
  }
}

// Original kakav bi stigao iz rezultata: generisano pitanje prebaceno u oblik
// pregleda rezultata (netačno odgovoreno).
function netacnoGenerisano(p: GenerisanoPitanje, id: string): RezultatPitanja {
  return {
    id,
    type: p.type,
    text: p.text,
    options: p.options,
    points: p.points,
    answer: null,
    isCorrect: false,
    awardedPoints: 0,
    correct: p.correct,
    explanation: p.explanation,
    topicSlug: p.topicSlug,
  }
}

// Sveža serija seed-ova — svaki poziv daje drugačiji seed
function serijaSeedova(od: number): () => number {
  let n = 0
  return () => od + n++
}

describe('generisanje ponovnih zadataka', () => {
  it('pravi novu verziju zadatka sa različitim tekstom (različiti brojevi)', () => {
    const [original] = generisi({
      topicSlug: 'sabiranje', difficulty: 1, count: 1, type: 'numeric',
      wordProblems: false, allowRepeats: false, seed: 42,
    }).questions
    expect(original).toBeDefined()

    const [unos] = generisiPonovne([netacnoGenerisano(original, 'qq-1')], serijaSeedova(9000))
    expect(unos.sourceId).toBe('qq-1')
    expect(unos.text).not.toBe(original.text)
    expect(unos.type).toBe(original.type)
    expect(unos.points).toBe(original.points)
    expect(unos.correct).toBeDefined()
    expect(unos.explanation).toBeTruthy()
  })

  it('za svaki netačan zadatak vraća tačno jedan unos, redosledom i sa jedinstvenim sourceId', () => {
    const unosi = generisiPonovne([
      netacno({ id: 'a', topicSlug: 'sabiranje', text: 'Koliko je 12 + 7?' }),
      netacno({ id: 'b', topicSlug: 'oduzimanje', type: 'single' }),
      netacno({ id: 'c', topicSlug: 'mnozenje' }),
    ])
    expect(unosi).toHaveLength(3)
    expect(new Set(unosi.map((u) => u.sourceId))).toEqual(new Set(['a', 'b', 'c']))
    expect(unosi.map((u) => u.sourceId)).toEqual(['a', 'b', 'c'])
  })

  it('vraća originalni zadatak nepromenjeno kad oblast nema generatorski modul', () => {
    const orig = netacno({ topicSlug: 'nepostojeca-oblast' })
    const [unos] = generisiPonovne([orig])
    expect(unos.text).toBe(orig.text)
    expect(unos.type).toBe(orig.type)
    expect(unos.correct).toEqual({ value: 68 })
    expect(unos.explanation).toBe('23 + 45 = 68')
    expect(unos.points).toBe(1)
  })

  it('baca grešku ako original nema sačuvan tačan odgovor (odbrana tipova)', () => {
    const orig = netacno({ topicSlug: 'nepostojeca-oblast' })
    delete orig.correct
    expect(() => generisiPonovne([orig])).toThrow()
  })
})

describe('lokalno čuvanje odgovora ponovnog pokušaja', () => {
  it('čuva i učitava odgovore izolovano po kviz tokenu', () => {
    const s = memorijskoSkladiste()
    sacuvajPonovneOdgovore(s, 'kviz1', { q1: { value: '15' } })
    sacuvajPonovneOdgovore(s, 'kviz2', { q1: { value: '99' } })
    expect(ucitajPonovneOdgovore(s, 'kviz1')).toEqual({ q1: { value: '15' } })
    expect(ucitajPonovneOdgovore(s, 'kviz2')).toEqual({ q1: { value: '99' } })
  })

  it('prazno skladište i pokvaren JSON ne ruše učitavanje', () => {
    const s = memorijskoSkladiste()
    expect(ucitajPonovneOdgovore(s, 'nepostojeci')).toEqual({})
    s.setItem('mozgalica:ponovni:pokvaren', '{ne-validno')
    expect(ucitajPonovneOdgovore(s, 'pokvaren')).toEqual({})
  })

  it('briše odgovore nakon predaje', () => {
    const s = memorijskoSkladiste()
    sacuvajPonovneOdgovore(s, 'kviz1', { q1: { optionId: 'o2' } })
    obrisiPonovneOdgovore(s, 'kviz1')
    expect(ucitajPonovneOdgovore(s, 'kviz1')).toEqual({})
  })
})
