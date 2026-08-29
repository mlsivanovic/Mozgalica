import { describe, expect, it } from 'vitest'
import { napraviPametniPlan, type TemaPametneVezbe } from './pametnaVezba'

const TEME: TemaPametneVezbe[] = [
  { topicId: '1', topicSlug: 'razlomci', topicName: 'Razlomci', answersCount: 8, successPct: 35, lastAnsweredAt: '2026-08-28T10:00:00Z' },
  { topicId: '2', topicSlug: 'mnozenje', topicName: 'Množenje', answersCount: 10, successPct: 65, lastAnsweredAt: '2026-08-20T10:00:00Z' },
  { topicId: '3', topicSlug: 'geometrija', topicName: 'Geometrija', answersCount: 12, successPct: 90, lastAnsweredAt: '2026-08-27T10:00:00Z' },
  { topicId: '4', topicSlug: 'jedinice', topicName: 'Jedinice', answersCount: 0, successPct: null, lastAnsweredAt: null },
]

describe('pametna dnevna vežba', () => {
  it('raspoređuje sva pitanja u odnosu 60/25/15', () => {
    const plan = napraviPametniPlan(TEME, 10, 3)
    expect(plan.reduce((zbir, stavka) => zbir + stavka.questionCount, 0)).toBe(10)
    expect(plan.filter((s) => s.reason === 'slaba_oblast').reduce((z, s) => z + s.questionCount, 0)).toBe(6)
    expect(plan.filter((s) => s.reason === 'ponavljanje').reduce((z, s) => z + s.questionCount, 0)).toBe(3)
    expect(plan.filter((s) => s.reason === 'izazov').reduce((z, s) => z + s.questionCount, 0)).toBe(1)
  })

  it('olakšava veoma slabu oblast, a izazov podiže za jedan nivo', () => {
    const plan = napraviPametniPlan(TEME, 10, 3)
    expect(plan.find((s) => s.reason === 'slaba_oblast')?.difficulty).toBe(2)
    expect(plan.find((s) => s.reason === 'izazov')?.difficulty).toBe(4)
  })

  it('uvodi neobrađene oblasti i bez prethodne statistike', () => {
    const bezIstorije = TEME.map((tema) => ({ ...tema, answersCount: 0, successPct: null, lastAnsweredAt: null }))
    const plan = napraviPametniPlan(bezIstorije, 8, null)
    expect(new Set(plan.map((stavka) => stavka.topicId)).size).toBe(4)
    expect(plan.reduce((zbir, stavka) => zbir + stavka.questionCount, 0)).toBe(8)
  })

  it('ograničava težinu na dozvoljeni opseg', () => {
    const plan = napraviPametniPlan(TEME, 5, 5)
    expect(plan.every((stavka) => stavka.difficulty >= 1 && stavka.difficulty <= 5)).toBe(true)
    expect(plan.find((stavka) => stavka.reason === 'izazov')?.difficulty).toBe(5)
  })

  it('za predmet sa fiksnom težinom prilagođava oblasti, ali ne menja težinu', () => {
    const plan = napraviPametniPlan(TEME, 10, null, 5)
    expect(plan.every((stavka) => stavka.difficulty === 5)).toBe(true)
    expect(new Set(plan.map((stavka) => stavka.reason))).toEqual(
      new Set(['slaba_oblast', 'ponavljanje', 'izazov']),
    )
  })
})
