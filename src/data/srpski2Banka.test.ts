import { describe, expect, it } from 'vitest'
import { SRPSKI2_BANKA } from './srpski2Banka.ts'
import { napraviSqlUvoza } from '../../scripts/uvoz-srpski2.mjs'

describe('početna banka srpskog za 2. razred', () => {
  it('ima 150 jedinstvenih pitanja, po 50 za svaku oblast', () => {
    expect(SRPSKI2_BANKA).toHaveLength(150)
    for (const slug of ['srpski-pravopis-2', 'srpski-knjizevnost-2', 'srpski-jezicka-kultura-2']) {
      expect(SRPSKI2_BANKA.filter((p) => p.topicSlug === slug)).toHaveLength(50)
    }
    expect(new Set(SRPSKI2_BANKA.map((p) => p.gen_signature)).size).toBe(150)
    expect(new Set(SRPSKI2_BANKA.map((p) => p.text)).size).toBe(150)
  })

  it('svi odgovori su automatski ocenljivi u postojećoj SQL šemi', () => {
    for (const p of SRPSKI2_BANKA) {
      expect(p.type === 'text' || p.type === 'truefalse').toBe(true)
      expect(p.options).toBeNull()
      expect(p.manual_review).toBe(false)
      expect(p.points).toBe(5)
      expect(p.difficulty).toBe(5)
      expect(p.gen_signature).toMatch(/^srpski-[a-z-]+-2:banka:[a-z0-9-]+$/)
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
    const pravopis = SRPSKI2_BANKA.filter((p) => p.topicSlug === 'srpski-pravopis-2')
    expect(pravopis.every((p) => p.type === 'truefalse')).toBe(true)
    for (const porodica of ['veliko-slovo', 'ne', 'li', 'tacka', 'upitnik', 'uzvicnik', 'nabrajanje', 'datum']) {
      expect(pravopis.some((p) => p.porodica === porodica), porodica).toBe(true)
    }
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':novi-sad'))!.correct).toEqual({ value: true })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':novi-sad-malo'))!.correct).toEqual({ value: false })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':neznam'))!.correct).toEqual({ value: false })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':nemam'))!.correct).toEqual({ value: true })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':nemoj'))!.correct).toEqual({ value: true })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':upitnik-tacka'))!.correct).toEqual({ value: false })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':crna-gora'))!.correct).toEqual({ value: true })
  })

  it('ne izlazi iz programa 2. razreda', () => {
    const tekst = JSON.stringify(SRPSKI2_BANKA).toLowerCase()
    expect(tekst).not.toMatch(/zbirn|gradivn|ličn[ae] zamenic|prisvojni pridev|lirik|epik[ae]|didaskal|personifik|apozicij|subjekat|predikat|nepravda|nesrećan|fruška gora|imena naroda/)
    const knjizevnost = SRPSKI2_BANKA.filter((p) => p.topicSlug === 'srpski-knjizevnost-2')
    for (const vrsta of ['pesma', 'priča', 'basna', 'bajka', 'stih']) {
      expect(knjizevnost.some((p) => p.porodica === 'vrste' || JSON.stringify(p).toLowerCase().includes(vrsta)), vrsta).toBe(true)
    }
  })

  it('uvoz podrazumevano radi rollback, ne hardkoduje vlasnika i ne prepisuje pitanja', () => {
    const sql = napraviSqlUvoza()
    expect(sql).toContain('rollback;')
    expect(sql).not.toContain('commit;')
    expect(napraviSqlUvoza(true)).toContain('commit;')
    expect(sql).toContain('count(distinct q.owner_id)')
    expect(sql).toContain('v_broj <> 1')
    expect(sql).toContain('or t.grade <> 2')
    expect(sql).toContain('on conflict (owner_id, gen_signature) where gen_signature is not null do nothing')
    expect(sql).toContain('is distinct from row(')
    expect(sql).not.toMatch(/\b(update|delete|truncate)\b/i)
  })
})
