import { describe, expect, it } from 'vitest'
import { PID_PODACI } from '../generator/moduliPid/kombinovano.ts'
import { PRIRODA_DRUSTVO_BANKA as banka } from './prirodaDrustvoBanka.ts'
import { PID_PROGRAMSKA_POKRIVENOST } from '../generator/moduliPid/index.ts'
import type { MatchingOpcije, Opcija } from '../types/db.ts'
import { kljucSadrzaja } from '../lib/kombinovaniPid.ts'
import { napraviSqlUvoza } from '../../scripts/uvoz-priroda-drustvo.mjs'

const oblasti = Object.keys(PID_PROGRAMSKA_POKRIVENOST)

describe('dopunska banka prirode i društva', () => {
  it('ima 300 pitanja, po 20 izbora, 5 tvrdnji i 5 povezivanja u svih deset oblasti', () => {
    expect(banka).toHaveLength(300)
    expect(new Set(banka.map((p) => p.topicSlug))).toEqual(new Set(oblasti))
    for (const slug of oblasti) {
      const pitanja = banka.filter((p) => p.topicSlug === slug)
      expect(pitanja).toHaveLength(30)
      expect(pitanja.filter((p) => p.type === 'single')).toHaveLength(20)
      expect(pitanja.filter((p) => p.type === 'truefalse')).toHaveLength(5)
      expect(pitanja.filter((p) => p.type === 'matching')).toHaveLength(5)
    }
    expect(banka.filter((p) => p.topicSlug.endsWith('-3'))).toHaveLength(180)
    expect(banka.filter((p) => p.topicSlug.endsWith('-4'))).toHaveLength(120)
    expect(new Set(banka.map((p) => p.gen_signature)).size).toBe(300)
    expect(new Set(banka.map(kljucSadrzaja)).size).toBe(300)
  })

  it('pitanja su automatski ocenljiva, sa objašnjenjem i pomoći na latinici', () => {
    for (const p of banka) {
      expect(p.points).toBe(5)
      expect(p.difficulty).toBe(5)
      expect(p.source).toBe('manual')
      expect(p.manual_review).toBe(false)
      expect(p.gen_signature).toMatch(/^pid-[a-z-]+-[34]:banka:[a-z0-9-]+$/)
      expect(p.text.trim().length).toBeGreaterThan(15)
      expect(p.text.length).toBeLessThanOrEqual(2000)
      expect(p.explanation!.trim().length).toBeGreaterThan(15)
      expect(p.hint!.trim().length).toBeGreaterThan(15)
      expect(JSON.stringify(p)).not.toMatch(/undefined|\p{Script=Cyrillic}/u)
      if (p.type === 'single') {
        const opcije = p.options as Opcija[]
        expect(opcije).toHaveLength(4)
        expect(new Set(opcije.map((o) => o.id)).size).toBe(4)
        expect(new Set(opcije.map((o) => o.text.trim().toLowerCase())).size).toBe(4)
        const tacan = (p.correct as { optionId: string }).optionId
        expect(opcije.filter((o) => o.id === tacan)).toHaveLength(1)
      } else if (p.type === 'truefalse') {
        expect(p.options).toBeNull()
        expect(typeof (p.correct as { value: unknown }).value).toBe('boolean')
      } else {
        const { left, right } = p.options as MatchingOpcije
        const { pairs } = p.correct as { pairs: Record<string, string> }
        expect(left).toHaveLength(4)
        expect(right).toHaveLength(4)
        for (const strana of [left, right]) {
          expect(new Set(strana.map((o) => o.id)).size).toBe(4)
          expect(new Set(strana.map((o) => o.text.trim().toLowerCase())).size).toBe(4)
        }
        expect(new Set(Object.keys(pairs))).toEqual(new Set(left.map((o) => o.id)))
        expect(new Set(Object.values(pairs))).toEqual(new Set(right.map((o) => o.id)))
      }
    }
  })

  it('ne prepisuje tekstove pitanja, tvrdnji ili parova iz postojećih generatora', () => {
    const stari = new Set(PID_PODACI.flatMap((oblast) => oblast.cinjenice.flatMap((c) =>
      [c.pitanje, c.tacnaTvrdnja, c.netacnaTvrdnja].map((t) => t.trim().replace(/\s+/g, ' ').toLowerCase()),
    )))
    for (const p of banka) expect(stari.has(p.text.trim().replace(/\s+/g, ' ').toLowerCase()), p.text).toBe(false)
    const stariParovi = new Set(PID_PODACI.flatMap((oblast) => oblast.parovi.map((p) => (p.levo + '|' + p.desno).toLowerCase())))
    for (const p of banka.filter((p) => p.type === 'matching')) {
      const { left, right } = p.options as MatchingOpcije
      const { pairs } = p.correct as { pairs: Record<string, string> }
      const preuzeti = left.filter((l) => stariParovi.has((l.text + '|' + right.find((r) => r.id === pairs[l.id])!.text).toLowerCase()))
      expect(preuzeti.length, p.text).toBeLessThan(4)
    }
    const beograd = banka.filter((p) => p.topicSlug === 'pid-beograd-3')
    expect(beograd.every((p) => /Beograd|beograd|Zemun|zemun|Jevremovac|Jevremovcu/.test(p.text))).toBe(true)
  })

  it('tačna mesta odgovora nisu uvek ista, a tvrdnje sadrže oba ishoda', () => {
    for (const slug of oblasti) {
      const single = banka.filter((p) => p.topicSlug === slug && p.type === 'single')
      const mesta = single.map((p) => (p.correct as { optionId: string }).optionId)
      expect(new Set(mesta).size).toBe(4)
      const tvrdnje = banka.filter((p) => p.topicSlug === slug && p.type === 'truefalse')
      expect(new Set(tvrdnje.map((p) => (p.correct as { value: boolean }).value)).size).toBe(2)
    }
  })

  it('uvoz bira administratorskog vlasnika, radi rollback i ne prepisuje postojeća pitanja', () => {
    const sql = napraviSqlUvoza()
    expect(sql).toContain('rollback;')
    expect(sql).not.toContain('commit;')
    expect(napraviSqlUvoza(true)).toContain('commit;')
    expect(sql).toContain('join public.admin_settings a on a.user_id = q.owner_id')
    expect(sql).toContain('v_broj <> 1')
    expect(sql).toContain('on conflict (owner_id, gen_signature) where gen_signature is not null do nothing')
    expect(sql).toContain('is distinct from row(')
    expect(sql).toContain("'\\s+'"); expect(sql).not.toMatch(/\b(update|delete|truncate)\b/i)
  })
})
