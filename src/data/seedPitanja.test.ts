// Sanity provera početnog skupa pitanja — hvata greške u ručno unetim podacima
// (npr. tačan odgovor koji ne postoji među ponuđenim opcijama)
import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db'
import { SEED_PITANJA } from './seedPitanja'

const POZNATE_OBLASTI = new Set([
  'sabiranje', 'oduzimanje', 'mnozenje', 'deljenje', 'kombinovane-operacije',
  'tekstualni-zadaci', 'poredjenje-brojeva', 'nizovi-i-obrasci', 'geometrija',
  'obim-i-merenje', 'vreme-i-sat', 'novac', 'merne-jedinice', 'razlomci', 'logicki-zadaci',
])

describe('seed pitanja', () => {
  it('ima tačno 30 pitanja, po dva za svaku od 15 oblasti', () => {
    expect(SEED_PITANJA).toHaveLength(30)
    const brojPoOblasti = new Map<string, number>()
    for (const p of SEED_PITANJA) brojPoOblasti.set(p.topicSlug, (brojPoOblasti.get(p.topicSlug) ?? 0) + 1)
    expect(brojPoOblasti.size).toBe(15)
    for (const [oblast, broj] of brojPoOblasti) expect(broj, oblast).toBe(2)
  })

  it('sve oblasti su poznate (postoje u seed migraciji topics)', () => {
    for (const p of SEED_PITANJA) expect(POZNATE_OBLASTI.has(p.topicSlug), p.topicSlug).toBe(true)
  })

  it('single/multi pitanja imaju tačan odgovor među ponuđenim opcijama', () => {
    for (const p of SEED_PITANJA) {
      if (p.type === 'single') {
        const opcije = p.options as Opcija[]
        const id = (p.correct as { optionId: string }).optionId
        expect(opcije.some((o) => o.id === id), p.text).toBe(true)
      }
    }
  })

  it('svako pitanje ima tekst, objašnjenje i pozitivne poene', () => {
    for (const p of SEED_PITANJA) {
      expect(p.text.trim().length, p.text).toBeGreaterThan(5)
      expect(p.explanation.trim().length, p.text).toBeGreaterThan(3)
      expect(p.points, p.text).toBeGreaterThan(0)
    }
  })

  it('logički zadatak sa deljenjem ima ceo broj kao rezultat (nema razlomljenih dece)', () => {
    const zadatak = SEED_PITANJA.find((p) => p.text.includes('28 sličica'))!
    const opcije = zadatak.options as Opcija[]
    const id = (zadatak.correct as { optionId: string }).optionId
    const tacanTekst = opcije.find((o) => o.id === id)!.text
    expect(Number(tacanTekst)).toBe(14)
  })
})
