import { describe, expect, it } from 'vitest'
import { PRIRODA_DRUSTVO_BANKA } from '../data/prirodaDrustvoBanka.ts'
import type { GenerisanoPitanje, GeneratorConfig } from '../generator/types.ts'
import type { TipPitanja } from '../types/db.ts'
import { kljucSadrzaja, podeliPidKvote, sastaviKombinovaniPid, type PitanjeKombinovaneBanke } from './kombinovaniPid.ts'

const tema = { id: 'tema', slug: 'pid-test-3', name: 'Probna oblast' }
const banka = (broj: number): PitanjeKombinovaneBanke[] => Array.from({ length: broj }, (_, i) => ({
  id: 'b' + i, topic_id: tema.id, type: 'truefalse', difficulty: 5, text: 'Tvrdnja banke ' + i,
  options: null, correct: { value: i % 2 === 0 }, explanation: 'Objašnjenje banke ' + i,
  hint: 'Pomoć ' + i, points: 5, manual_review: false,
}))
const generisana = (broj: number): GenerisanoPitanje[] => Array.from({ length: broj }, (_, i) => ({
  signature: 'g' + i, topicSlug: tema.slug, type: 'truefalse', difficulty: 5, text: 'Tvrdnja generatora ' + i,
  options: null, correct: { value: i % 2 === 0 }, explanation: 'Objašnjenje generatora ' + i,
  hint: 'Pomoć ' + i, points: 5,
}))
const izSkupa = (pitanja: GenerisanoPitanje[]) => (cfg: GeneratorConfig) => ({
  questions: pitanja.filter((p) => !new Set(cfg.excludedSignatures).has(p.signature)
    && p.topicSlug === cfg.topicSlug && (cfg.type === 'auto' || p.type === cfg.type)).slice(0, cfg.count), warning: null,
})
const konfiguracija = (broj = 10, fond = banka(20)) => ({
  plan: [{ topicSlug: tema.slug, questionCount: broj }], oblasti: [tema], banka: fond,
  seed: 42, type: 'auto' as TipPitanja | 'auto',
})
const izBanke = (rez: ReturnType<typeof sastaviKombinovaniPid>) => rez.snapshot.filter((p) => p.source_question_id !== null).length

function jedinstvena(rez: ReturnType<typeof sastaviKombinovaniPid>, broj: number) {
  expect(rez.snapshot).toHaveLength(broj)
  expect(new Set(rez.kljucevi).size).toBe(broj)
  expect(new Set(rez.snapshot.map(kljucSadrzaja)).size).toBe(broj)
  expect(rez.snapshot.map((p) => p.position)).toEqual(Array.from({ length: broj }, (_, i) => i))
}

describe('kombinovani izbor prirode i društva', () => {
  it('grupiše ponovljene oblasti pametnog plana pre podele', () => {
    const plan = podeliPidKvote([
      { topicSlug: tema.slug, questionCount: 3 }, { topicSlug: tema.slug, questionCount: 2 },
      { topicSlug: tema.slug, questionCount: 1 },
    ], 42)
    expect(plan).toEqual([{ topicSlug: tema.slug, questionCount: 6, bankCount: 3, generatorCount: 3 }])
  })

  it('naizmenično deli neparna mesta, uključujući oblasti sa jednim pitanjem', () => {
    const plan = Array.from({ length: 10 }, (_, i) => ({ topicSlug: 'pid-' + i, questionCount: 1 }))
    const raspodela = podeliPidKvote(plan, 7)
    expect(raspodela.reduce((s, p) => s + p.bankCount, 0)).toBe(5)
    expect(raspodela.every((p, i) => i === 0 || p.bankCount !== raspodela[i - 1].bankCount)).toBe(true)
    expect(new Set(Array.from({ length: 20 }, (_, seed) => podeliPidKvote(plan, seed)[0].bankCount)).size).toBe(2)
    expect(podeliPidKvote(plan, 7)).toEqual(raspodela)
  })

  it('ne prihvata neispravne kvote, a nulte preskače', () => {
    expect(podeliPidKvote([{ topicSlug: tema.slug, questionCount: 0 }], 0)).toEqual([])
    expect(() => podeliPidKvote([{ topicSlug: tema.slug, questionCount: -1 }], 0)).toThrow()
    expect(() => podeliPidKvote([{ topicSlug: tema.slug, questionCount: 1.5 }], 0)).toThrow()
  })

  it('daje polovinu iz svakog izvora i čuva podatke i reference snapshot-a', () => {
    const cfg = konfiguracija()
    const rez = sastaviKombinovaniPid(cfg, izSkupa(generisana(20)))
    jedinstvena(rez, 10)
    expect(izBanke(rez)).toBe(5)
    rez.snapshot.forEach((p, i) => {
      expect(p.topic_id).toBe(tema.id)
      expect(p.topic_name).toBe(tema.name)
      if (p.source_question_id) {
        const original = cfg.banka.find((q) => q.id === p.source_question_id)!
        expect(rez.kljucevi[i]).toBe(original.id)
        expect(p.correct).toEqual(original.correct)
        expect(p.hint).toBe(original.hint)
      } else {
        expect(rez.kljucevi[i]).toMatch(/^g/)
        expect(p.manual_review).toBe(false)
      }
    })
  })

  it.each([[0, 20, 0], [2, 20, 2], [20, 0, 10], [20, 2, 8]])(
    'dopunjava istu oblast kada banka ima %i, a generator %i pitanja', (bankCount, genCount, ocekivano) => {
      const rez = sastaviKombinovaniPid(konfiguracija(10, banka(bankCount)), izSkupa(generisana(genCount)))
      jedinstvena(rez, 10)
      expect(izBanke(rez)).toBe(ocekivano)
    },
  )

  it('daje prednost novom drugom izvoru pre istorijskih ponavljanja', () => {
    const fond = banka(10)
    const rez = sastaviKombinovaniPid({ ...konfiguracija(10, fond), prethodniKljucevi: fond.map((p) => p.id) }, izSkupa(generisana(10)))
    expect(izBanke(rez)).toBe(0)
    jedinstvena(rez, 10)
    const rez2 = sastaviKombinovaniPid({ ...konfiguracija(10), prethodniKljucevi: generisana(10).map((p) => p.signature) }, izSkupa(generisana(10)))
    expect(izBanke(rez2)).toBe(10)
  })

  it('ponavlja istorijska pitanja tek po iscrpljenju novih, bez duplikata unutar kviza', () => {
    const fond = banka(6), gen = generisana(6)
    const istorija = [...fond.map((p) => p.id), ...gen.map((p) => p.signature)]
    const rez = sastaviKombinovaniPid({ ...konfiguracija(10, fond), prethodniKljucevi: istorija }, izSkupa(gen))
    jedinstvena(rez, 10)
    expect(izBanke(rez)).toBe(5)
  })

  it('poštuje temu, težinu i izričit tip pitanja pri dopunjavanju', () => {
    const fond = banka(2)
    const strano = { ...fond[0], id: 'strano', topic_id: 'druga-tema' }
    const lako = { ...fond[0], id: 'lako', difficulty: 1 as const }
    const drugiTip = { ...fond[0], id: 'tip', type: 'numeric' as const, correct: { value: 42 } }
    const rez = sastaviKombinovaniPid({ ...konfiguracija(6, [...fond, strano, lako, drugiTip]), type: 'truefalse' }, izSkupa(generisana(10)))
    jedinstvena(rez, 6)
    expect(izBanke(rez)).toBe(2)
    expect(rez.snapshot.every((p) => p.type === 'truefalse')).toBe(true)
    expect(rez.kljucevi).not.toContain('strano')
    expect(rez.kljucevi).not.toContain('lako')
  })

  it('odbacuje sadržajno ista pitanja čak i sa različitim ID-jevima i razmacima', () => {
    const fond = banka(8)
    const gen = generisana(12)
    gen[0] = { ...gen[0], text: '  TVRDNJA  banke 0  ' }
    const rez = sastaviKombinovaniPid(konfiguracija(10, [...fond, { ...fond[0], id: 'kopija' }]), izSkupa(gen))
    jedinstvena(rez, 10)
  })

  it('ne bira generatorski original ako je već izabrana sačuvana kopija iz banke', () => {
    const fond = banka(1).map((p) => ({ ...p, gen_signature: 'g0' }))
    const rez = sastaviKombinovaniPid(konfiguracija(2, fond), izSkupa(generisana(4)))
    expect(rez.kljucevi).toContain('b0')
    expect(rez.kljucevi).not.toContain('g0')
  })

  it('za isti seed ne zavisi od redosleda čitanja banke', () => {
    const cfg = konfiguracija()
    expect(sastaviKombinovaniPid(cfg, izSkupa(generisana(20))))
      .toEqual(sastaviKombinovaniPid({ ...cfg, banka: [...cfg.banka].reverse() }, izSkupa(generisana(20))))
  })

  it('prijavljuje oblast i nedostajući broj kada oba izvora zajedno nisu dovoljna', () => {
    expect(() => sastaviKombinovaniPid(konfiguracija(10, banka(2)), izSkupa(generisana(3))))
      .toThrow('Za oblast „Probna oblast“ nedostaje 5 pitanja')
  })

  it('povezivanje ostaje isto pitanje nakon promene ID-jeva i redosleda opcija', () => {
    const prvo = { type: 'matching' as const, text: 'Poveži.', options: {
      left: [{ id: '1', text: 'A' }, { id: '2', text: 'B' }], right: [{ id: '3', text: 'C' }, { id: '4', text: 'D' }],
    } }
    const drugo = { ...prvo, options: { left: [...prvo.options.left].reverse().map((o) => ({ ...o, id: 'x' + o.id })), right: [...prvo.options.right].reverse() } }
    expect(kljucSadrzaja(prvo)).toBe(kljucSadrzaja(drugo))
  })

  it.each(['auto', 'single', 'truefalse', 'matching'] as const)('sastavlja stvarnu banku i generatore za svih deset oblasti: %s', (type) => {
    const slugs = [...new Set(PRIRODA_DRUSTVO_BANKA.map((p) => p.topicSlug))]
    const oblasti = slugs.map((slug) => ({ id: slug, slug, name: slug }))
    const fond = PRIRODA_DRUSTVO_BANKA.map((p) => ({ ...p, id: p.gen_signature!, topic_id: p.topicSlug }))
    const cfg = { oblasti, banka: fond, seed: 78, type, plan: slugs.map((topicSlug) => ({ topicSlug, questionCount: 10 })) }
    const rez = sastaviKombinovaniPid(cfg)
    jedinstvena(rez, 100)
    expect(izBanke(rez)).toBe(50)
    expect(rez.snapshot.every((p) => type === 'auto' || p.type === type)).toBe(true)
    expect(sastaviKombinovaniPid(cfg)).toEqual(rez)
  })
})
