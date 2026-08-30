import { describe, expect, it } from 'vitest'
import { SRPSKI4_BANKA } from './srpski4Banka.ts'
import { napraviSqlUvoza } from '../../scripts/uvoz-srpski4.mjs'

const norm = (s: string) => s.toLowerCase().replace(/[čć]/g, 'c').replaceAll('đ', 'd')
  .replaceAll('š', 's').replaceAll('ž', 'z').replace(/\s+/g, ' ').trim()

describe('početna banka srpskog za 4. razred', () => {
  it('ima 140 jedinstvenih pitanja, po dogovorenom obimu oblasti', () => {
    expect(SRPSKI4_BANKA).toHaveLength(140)
    expect(SRPSKI4_BANKA.filter((p) => p.topicSlug === 'srpski-pravopis-4')).toHaveLength(40)
    expect(SRPSKI4_BANKA.filter((p) => p.topicSlug === 'srpski-knjizevnost-4')).toHaveLength(50)
    expect(SRPSKI4_BANKA.filter((p) => p.topicSlug === 'srpski-jezicka-kultura-4')).toHaveLength(50)
    expect(new Set(SRPSKI4_BANKA.map((p) => p.gen_signature)).size).toBe(140)
    expect(new Set(SRPSKI4_BANKA.map((p) => p.text)).size).toBe(140)
  })

  it('svi odgovori su automatski ocenljivi u postojećoj SQL šemi', () => {
    for (const p of SRPSKI4_BANKA) {
      expect(p.type === 'text' || p.type === 'truefalse').toBe(true)
      expect(p.options).toBeNull()
      expect(p.manual_review).toBe(false)
      expect(p.points).toBe(5)
      expect(p.difficulty).toBe(5)
      expect(p.gen_signature).toMatch(/^srpski-[a-z-]+-4:banka:[a-z0-9-]+$/)
      expect(p.text.length).toBeLessThanOrEqual(2000)
      expect(p.explanation!.length).toBeGreaterThan(10)
      expect(JSON.stringify(p)).not.toMatch(/undefined|\p{Script=Cyrillic}/u)
      if (p.type === 'truefalse') expect(typeof (p.correct as { value: boolean }).value).toBe('boolean')
      else {
        const accept = (p.correct as { accept: string[] }).accept
        expect(accept.length).toBeGreaterThan(0)
        expect(accept.every((s) => s.trim().length > 0)).toBe(true)
        expect(new Set(accept.map(norm)).size).toBe(accept.length)
      }
    }
  })

  it('pravopis ne koristi normalizovano tekstualno ocenjivanje', () => {
    const pravopis = SRPSKI4_BANKA.filter((p) => p.topicSlug === 'srpski-pravopis-4')
    expect(pravopis.every((p) => p.type === 'truefalse')).toBe(true)
    for (const porodica of ['jeli', 'vi', 'ustanove', 'istorija', 'imena-dela', 'upravni-govor']) {
      expect(pravopis.some((p) => p.porodica === porodica), porodica).toBe(true)
    }
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':jer-pitanje'))!.correct).toEqual({ value: false })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':je-l-olovka'))!.correct).toEqual({ value: true })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':skola-pogresno'))!.correct).toEqual({ value: false })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':treci-model'))!.correct).toEqual({ value: true })
    expect(pravopis.find((p) => p.gen_signature!.endsWith(':vi-odeljenje'))!.correct).toEqual({ value: false })
  })

  it('književnost pokriva pojmove 4. razreda bez lektire i bez programa 5. razreda', () => {
    const knjizevnost = SRPSKI4_BANKA.filter((p) => p.topicSlug === 'srpski-knjizevnost-4')
    for (const porodica of ['vrste', 'epska', 'pesma', 'pripovedanje', 'drama', 'likovi', 'tema', 'ton', 'personifikacija']) {
      expect(knjizevnost.some((p) => p.porodica === porodica), porodica).toBe(true)
    }
    const tekst = JSON.stringify(SRPSKI4_BANKA).toLowerCase()
    expect(tekst).not.toMatch(/lirski subjekt|didaskal|zaplet|rasplet|apozicij|nominativ|genitiv|dativ|akuzativ|vokativ|instrumental|lokativ|glagolski vid|radni glagolski pridev|fruška gora|najjači|ni od koga|radiću|doći ću|epitet|onomatopej/)
    expect(tekst).not.toMatch(/ko je napisao delo|glavni junak \(ili lik\) u delu/)
    expect(knjizevnost.every((p) => p.type === 'text')).toBe(true)
    const odgovor = (id: string) => knjizevnost.find((p) => p.gen_signature!.endsWith(`:${id}`))!.correct
    expect((odgovor('basna') as { accept: string[] }).accept[0]).toBe('basna')
    expect((odgovor('deseterac') as { accept: string[] }).accept[0]).toBe('deseterac')
    expect((odgovor('personifikacija') as { accept: string[] }).accept[0]).toBe('personifikacija')
  })

  it('uvoz podrazumevano radi rollback, ne hardkoduje vlasnika i ne prepisuje pitanja', () => {
    const sql = napraviSqlUvoza()
    expect(sql).toContain('rollback;')
    expect(sql).not.toContain('commit;')
    expect(napraviSqlUvoza(true)).toContain('commit;')
    expect(sql).toContain('count(distinct q.owner_id)')
    expect(sql).toContain('v_broj <> 1')
    expect(sql).toContain('or t.grade <> 4')
    expect(sql).toContain('on conflict (owner_id, gen_signature) where gen_signature is not null do nothing')
    expect(sql).toContain('is distinct from row(')
    expect(sql).toContain('fn_normalize_text')
    expect(sql).not.toMatch(/\b(update|delete|truncate)\b/i)
  })
})
