import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db'
import { MATEMATIKA3_BANKA, MATEMATIKA3_SLUGS } from './matematika3Banka'
import { napraviSqlUvoza } from '../../scripts/uvoz-matematika3.mjs'

const CETVRTO = /subjekat|predikat|padež|površina kvadrata|P\s*=\s*a|zapremina|milion|procenat|decimalni broj|mešoviti broj|proširivanje razlomka|kocka ima 6 strana|kvadar/i

describe('banka matematike za 3. razred', () => {
  it('ima pitanja za svih pet oblasti bez generatora, bez duplikata', () => {
    expect(MATEMATIKA3_SLUGS).toEqual([
      'geometrija', 'vreme-i-sat', 'razlomci', 'tekstualni-zadaci', 'logicki-zadaci',
    ])
    for (const slug of MATEMATIKA3_SLUGS) {
      expect(MATEMATIKA3_BANKA.filter((p) => p.topicSlug === slug).length, slug).toBeGreaterThanOrEqual(30)
    }
    expect(new Set(MATEMATIKA3_BANKA.map((p) => p.gen_signature)).size).toBe(MATEMATIKA3_BANKA.length)
    expect(new Set(MATEMATIKA3_BANKA.map((p) => p.text)).size).toBe(MATEMATIKA3_BANKA.length)
  })

  it('svaka oblast ima pitanja na svakom nivou težine 1–5', () => {
    for (const slug of MATEMATIKA3_SLUGS) {
      for (const tezina of [1, 2, 3, 4, 5] as const) {
        const broj = MATEMATIKA3_BANKA.filter((p) => p.topicSlug === slug && p.difficulty === tezina).length
        expect(broj, `${slug} tezina ${tezina}`).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('odgovori su automatski ocenljivi i ostaju u programu 3. razreda', () => {
    for (const p of MATEMATIKA3_BANKA) {
      expect(p.manual_review).toBe(false)
      expect(p.points).toBe(p.difficulty)
      expect(p.source).toBe('manual')
      expect(p.gen_signature).toMatch(new RegExp(`^${p.topicSlug}:banka:[a-z0-9-]+$`))
      expect(p.text.length).toBeGreaterThan(8)
      expect(p.explanation!.length).toBeGreaterThan(10)
      expect(JSON.stringify(p)).not.toMatch(/undefined|\p{Script=Cyrillic}/u)
      expect(JSON.stringify(p)).not.toMatch(CETVRTO)
      if (p.type === 'single') {
        const opcije = p.options as Opcija[]
        const id = (p.correct as { optionId: string }).optionId
        expect(opcije.some((o) => o.id === id), p.text).toBe(true)
        expect(new Set(opcije.map((o) => o.text)).size).toBe(opcije.length)
      } else if (p.type === 'numeric') {
        const v = (p.correct as { value: number }).value
        expect(Number.isFinite(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1000)
        expect(Number.isInteger(v)).toBe(true)
      } else if (p.type === 'truefalse') {
        expect(typeof (p.correct as { value: boolean }).value).toBe('boolean')
      } else if (p.type === 'text') {
        const accept = (p.correct as { accept: string[] }).accept
        expect(accept.length).toBeGreaterThan(0)
        expect(new Set(accept.map((s) => s.toLowerCase().trim())).size).toBe(accept.length)
      } else {
        throw new Error(`Nepodržan tip: ${p.type}`)
      }
    }
  })

  it('razlomci ostaju oblika m/n sa m ≤ n ≤ 10 i porede isti imenilac ili jedinične delove', () => {
    const razlomci = MATEMATIKA3_BANKA.filter((p) => p.topicSlug === 'razlomci')
    const zapisi = razlomci.flatMap((p) => `${p.text} ${p.explanation}`.match(/\d+\/\d+/g) ?? [])
    expect(zapisi.length).toBeGreaterThan(10)
    for (const zapis of zapisi) {
      const [m, n] = zapis.split('/').map(Number)
      expect(n, zapis).toBeGreaterThanOrEqual(2)
      expect(n, zapis).toBeLessThanOrEqual(10)
      expect(m, zapis).toBeLessThanOrEqual(n)
    }
  })

  it('geometrija ne traži obim po formuli ni uglove u stepenima iznad pravog ugla kao račun', () => {
    const tekst = MATEMATIKA3_BANKA.filter((p) => p.topicSlug === 'geometrija').map((p) => p.text).join('\n')
    expect(tekst).not.toMatch(/obim|O\s*=/i)
    expect(tekst).not.toMatch(/\b180\b|\b360\b/)
  })

  it('uvoz podrazumevano radi rollback, ne hardkoduje vlasnika i ne prepisuje pitanja', () => {
    const sql = napraviSqlUvoza()
    expect(sql).toContain('rollback;')
    expect(sql).not.toContain('commit;')
    expect(napraviSqlUvoza(true)).toContain('commit;')
    expect(sql).toContain('count(distinct q.owner_id)')
    expect(sql).toContain('or t.grade <> 3')
    expect(sql).toContain("t.subject <> 'matematika'")
    expect(sql).toContain('on conflict (owner_id, gen_signature) where gen_signature is not null do nothing')
    expect(sql).not.toMatch(/\b(update|delete|truncate)\b/i)
  })
})
