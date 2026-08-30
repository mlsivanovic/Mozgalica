import { describe, expect, it } from 'vitest'
import { SRPSKI5_BANKA } from './srpski5Banka.ts'
import { napraviSqlUvoza } from '../../scripts/uvoz-srpski5.mjs'

describe('početna banka srpskog za 5. razred', () => {
  it('ima 120 jedinstvenih pitanja, po 40 za svaku oblast', () => {
    expect(SRPSKI5_BANKA).toHaveLength(120)
    for (const slug of ['srpski-pravopis-5', 'srpski-knjizevnost-5', 'srpski-jezicka-kultura-5']) {
      expect(SRPSKI5_BANKA.filter((p) => p.topicSlug === slug)).toHaveLength(40)
    }
    expect(new Set(SRPSKI5_BANKA.map((p) => p.gen_signature)).size).toBe(120)
    expect(new Set(SRPSKI5_BANKA.map((p) => p.text)).size).toBe(120)
  })

  it('svi odgovori su automatski ocenljivi u postojećoj SQL šemi', () => {
    for (const p of SRPSKI5_BANKA) {
      expect(p.type === 'text' || p.type === 'truefalse').toBe(true)
      expect(p.options).toBeNull()
      expect(p.manual_review).toBe(false)
      expect(p.points).toBe(5)
      expect(p.difficulty).toBe(5)
      expect(p.gen_signature).toMatch(/^srpski-[a-z-]+-5:banka:[a-z-]+$/)
      expect(p.text.length).toBeLessThanOrEqual(2000)
      expect(p.explanation!.length).toBeGreaterThan(10)
      expect(JSON.stringify(p)).not.toMatch(/undefined|\p{Script=Cyrillic}/u)
      if (p.type === 'truefalse') expect(typeof (p.correct as { value: boolean }).value).toBe('boolean')
      else {
        const accept = (p.correct as { accept: string[] }).accept
        expect(accept.length).toBeGreaterThan(0)
        expect(accept.every((s) => s.trim().length > 0)).toBe(true)
        expect(new Set(accept.map((s) => s.toLowerCase().trim())).size).toBe(accept.length)
      }
    }
  })

  it('pravopis ne koristi normalizovano tekstualno ocenjivanje', () => {
    const pravopis = SRPSKI5_BANKA.filter((p) => p.topicSlug === 'srpski-pravopis-5')
    expect(pravopis.every((p) => p.type === 'truefalse')).toBe(true)
    for (const porodica of ['veliko-slovo', 'ustanove', 'prisvojni-pridevi', 'vi', 'ne', 'naj', 'zamenice-predlozi', 'odricne-zamenice', 'brojevi', 'futur', 'radni-pridev', 'zapeta', 'navodnici', 'crta']) {
      expect(pravopis.some((p) => p.porodica === porodica), porodica).toBe(true)
    }
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':docicu'))!.correct).toEqual({ value: false })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':najjaci'))!.correct).toEqual({ value: false })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':novi-sad'))!.correct).toEqual({ value: true })
  })

  it('uvoz podrazumevano radi rollback, ne hardkoduje vlasnika i ne prepisuje pitanja', () => {
    const sql = napraviSqlUvoza()
    expect(sql).toContain('rollback;')
    expect(sql).not.toContain('commit;')
    expect(napraviSqlUvoza(true)).toContain('commit;')
    expect(sql).toContain('count(distinct q.owner_id)')
    expect(sql).toContain('v_broj <> 1')
    expect(sql).toContain('on conflict (owner_id, gen_signature) where gen_signature is not null do nothing')
    expect(sql).toContain('is distinct from row(')
    expect(sql).not.toMatch(/\b(update|delete|truncate)\b/i)
  })
})
