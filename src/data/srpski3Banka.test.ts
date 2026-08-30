import { describe, expect, it } from 'vitest'
import { SRPSKI3_BANKA, SRPSKI3_SLUGS } from './srpski3Banka'
import { napraviSqlUvoza } from '../../scripts/uvoz-srpski3.mjs'

const CETVRTO = /subjekat|predikat|padež|apozicija|futur i\b|glagolsko vreme|didaskalij/i

describe('dopuna banke srpskog za 3. razred', () => {
  it('ima pitanja samo za oblasti bez generatora koje su tanke', () => {
    expect(SRPSKI3_SLUGS).toEqual(['srpski-jezicka-kultura', 'srpski-knjizevnost'])
    for (const slug of SRPSKI3_SLUGS) {
      expect(SRPSKI3_BANKA.filter((p) => p.topicSlug === slug).length, slug).toBeGreaterThanOrEqual(24)
    }
    expect(new Set(SRPSKI3_BANKA.map((p) => p.gen_signature)).size).toBe(SRPSKI3_BANKA.length)
    expect(new Set(SRPSKI3_BANKA.map((p) => p.text)).size).toBe(SRPSKI3_BANKA.length)
  })

  it('svi odgovori su automatski ocenljivi kao u postojećoj srpskoj banci', () => {
    for (const p of SRPSKI3_BANKA) {
      expect(p.type === 'text' || p.type === 'truefalse').toBe(true)
      expect(p.options).toBeNull()
      expect(p.manual_review).toBe(false)
      expect(p.points).toBe(5)
      expect(p.difficulty).toBe(5)
      expect(p.gen_signature).toMatch(/^srpski-[a-z-]+:banka:[a-z0-9-]+$/)
      expect(p.text.length).toBeLessThanOrEqual(2000)
      expect(p.explanation!.length).toBeGreaterThan(10)
      expect(JSON.stringify(p)).not.toMatch(/undefined|\p{Script=Cyrillic}/u)
      expect(JSON.stringify(p)).not.toMatch(CETVRTO)
      if (p.type === 'truefalse') expect(typeof (p.correct as { value: boolean }).value).toBe('boolean')
      else {
        const accept = (p.correct as { accept: string[] }).accept
        expect(accept.length).toBeGreaterThan(0)
        expect(accept.every((s) => s.trim().length > 0)).toBe(true)
        expect(new Set(accept.map((s) => s.toLowerCase().trim())).size).toBe(accept.length)
      }
    }
  })

  it('jezička kultura pokriva oblike kazivanja, obrazac i formalni govor', () => {
    const kultura = SRPSKI3_BANKA.filter((p) => p.topicSlug === 'srpski-jezicka-kultura')
    for (const porodica of ['oblici', 'formalno', 'obrazac', 'obrasci', 'razgovor']) {
      expect(kultura.some((p) => p.porodica === porodica), porodica).toBe(true)
    }
  })

  it('književnost pokriva programske pojmove 3. razreda', () => {
    const knj = SRPSKI3_BANKA.filter((p) => p.topicSlug === 'srpski-knjizevnost')
    for (const porodica of ['lirika', 'himna', 'epika', 'bajka', 'figure', 'kazivanje', 'drama']) {
      expect(knj.some((p) => p.porodica === porodica), porodica).toBe(true)
    }
  })

  it('uvoz podrazumevano radi rollback, ne hardkoduje vlasnika i ne prepisuje pitanja', () => {
    const sql = napraviSqlUvoza()
    expect(sql).toContain('rollback;')
    expect(sql).not.toContain('commit;')
    expect(napraviSqlUvoza(true)).toContain('commit;')
    expect(sql).toContain('count(distinct q.owner_id)')
    expect(sql).toContain('or t.grade <> 3')
    expect(sql).toContain("t.subject <> 'srpski'")
    expect(sql).toContain('on conflict (owner_id, gen_signature) where gen_signature is not null do nothing')
    expect(sql).not.toMatch(/\b(update|delete|truncate)\b/i)
  })
})
