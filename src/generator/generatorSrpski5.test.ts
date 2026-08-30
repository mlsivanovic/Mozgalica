import { describe, expect, it } from 'vitest'
import { generisi, podrzaneOblasti, regenerisiJedno } from './index.ts'
import { GRAMATIKA5 } from './moduliSrpski5/gramatika.ts'
import { RECNIK5 } from './moduliSrpski5/recnik.ts'
import { TEKSTOVI5 } from './moduliSrpski5/citanje.ts'
import { NAZIVI_GENERISANIH_OBLASTI, IKONE_GENERISANIH_OBLASTI } from './oblasti.ts'
import { razrediPredmeta, tezinaZaPredmet } from '../lib/predmet.ts'
import { izaberiOblastiZaKviz, napraviPlanOblastiKviza } from '../lib/raspodelaKviza.ts'
import type { GeneratorConfig } from './types.ts'
import type { Oblast } from '../types/db.ts'

const MODULI = ['srpski-gramatika-5', 'srpski-recnik-5', 'srpski-citanje-5']
const SVE = [...MODULI, 'srpski-pravopis-5', 'srpski-knjizevnost-5', 'srpski-jezicka-kultura-5']
const BROJEVI = [GRAMATIKA5.length, RECNIK5.length, TEKSTOVI5.reduce((n, t) => n + t.pitanja.length, 0)]
const cfg = (topicSlug: string, izmene: Partial<GeneratorConfig> = {}): GeneratorConfig => ({
  topicSlug, difficulty: 1, count: 8, type: 'auto', wordProblems: false, allowRepeats: false, seed: 42, ...izmene,
})
const norm = (s: string) => s.toLowerCase().replace(/[čć]/g, 'c').replaceAll('đ', 'd')
  .replaceAll('š', 's').replaceAll('ž', 'z').replace(/\s+/g, ' ').trim()

describe('srpski za 5. razred', () => {
  it('registruje tri generatora i omogućava razred bez promene težine', () => {
    expect(razrediPredmeta('srpski')).toEqual([2, 3, 4, 5])
    expect(razrediPredmeta('priroda_drustvo')).toEqual([3, 4])
    expect(tezinaZaPredmet('srpski', 1)).toBe(5)
    for (const slug of MODULI) {
      expect(podrzaneOblasti()).toContain(slug)
      expect(NAZIVI_GENERISANIH_OBLASTI[slug]).toBeTruthy()
      expect(IKONE_GENERISANIH_OBLASTI[slug]).toBeTruthy()
    }
    expect(podrzaneOblasti().filter((s) => s.startsWith('srpski-') && s.endsWith('-5'))).toHaveLength(3)
  })

  it('ispunjava minimalni obim bez brojanja obrnutih tvrdnji kao novih zadataka', () => {
    expect(GRAMATIKA5.length).toBeGreaterThanOrEqual(100)
    expect(RECNIK5.length).toBeGreaterThanOrEqual(60)
    expect(TEKSTOVI5).toHaveLength(12)
    expect(new Set(TEKSTOVI5.map((t) => t.id)).size).toBe(12)
    for (const t of TEKSTOVI5) expect(t.pitanja.length).toBeGreaterThanOrEqual(5)
    for (const zadaci of [GRAMATIKA5, RECNIK5]) {
      expect(new Set(zadaci.map((z) => `${z.porodica}:${z.id}`)).size).toBe(zadaci.length)
      expect(new Set(zadaci.map((z) => z.pitanje)).size).toBe(zadaci.length)
      for (const z of zadaci) {
        expect(z.tvrdnjaTacna).not.toBe(z.tvrdnjaNetacna)
        const pogresan = z.tvrdnjaNetacna.match(/„([^„“]*)“\.$/)?.[1]
        expect(pogresan).toBeTruthy()
        expect([z.tacan, ...z.prihvaceni ?? []].map(norm)).not.toContain(norm(pogresan!))
      }
    }
  })

  it('pokriva svaku dogovorenu porodicu i svih sedam padeža', () => {
    expect(new Set(GRAMATIKA5.map((z) => z.porodica))).toEqual(new Set([
      'padezi', 'vrste-reci', 'nepromenljive', 'osnova', 'nastavak', 'kongruencija', 'komparacija',
      'zamenice', 'brojevi', 'glagolski-vid', 'glagolski-rod', 'glagolski-oblici',
      'glagolske-osnove', 'pomocni-glagoli', 'recenicni-clanovi',
    ]))
    for (const naziv of ['nominativ', 'genitiv', 'dativ', 'akuzativ', 'vokativ', 'instrumental', 'lokativ']) {
      expect(GRAMATIKA5.filter((z) => z.porodica === 'padezi' && z.tacan === naziv)).toHaveLength(6)
    }
    expect(new Set(RECNIK5.map((z) => z.porodica))).toEqual(new Set(['sinonimi', 'antonimi', 'znacenje', 'izrazavanje']))
    for (const z of GRAMATIKA5.filter((z) => z.porodica === 'padezi')) {
      expect(z.pitanje).toContain('u rečenici')
    }
    const odgovor = (id: string) => GRAMATIKA5.find((z) => z.id === id)!.tacan
    expect(odgovor('aku-prozor')).toBe('akuzativ')
    expect(odgovor('aku-druga')).toBe('akuzativ')
    expect(odgovor('vok-marko')).toBe('vokativ')
    expect(odgovor('dat-skoli')).toBe('dativ')
    expect(odgovor('lok-skoli')).toBe('lokativ')
    expect(odgovor('pisati')).toBe('nesvršeni')
    expect(GRAMATIKA5.find((z) => z.porodica === 'glagolske-osnove' && z.id === 'pisati')!.tacan).toBe('piše')
  })

  it('čitanje obuhvata informacije, tumačenje i primenu bez potrebe za lektirom', () => {
    const vrste = new Set(TEKSTOVI5.flatMap((t) => t.pitanja.map((p) => p[0])))
    for (const vrsta of ['informacija', 'uzrok', 'posledica', 'zakljucak', 'pripovedac', 'redosled', 'odnos', 'svrha', 'primena', 'glavno']) {
      expect(vrste.has(vrsta), vrsta).toBe(true)
    }
    for (const t of TEKSTOVI5) {
      expect(new Set(t.pitanja.map((p) => p[0])).size).toBe(t.pitanja.length)
      expect(t.tekst.length).toBeGreaterThan(350)
    }
  })

  it('isti seed daje isti rezultat, podržani tipovi se poštuju na svim težinama', () => {
    for (const slug of MODULI) {
      for (const type of ['auto', 'text', 'truefalse'] as const) {
        for (const difficulty of [1, 3, 5] as const) {
          const konf = cfg(slug, { type, difficulty })
          const rezultat = generisi(konf)
          expect(rezultat).toEqual(generisi(konf))
          expect(rezultat.questions).toHaveLength(8)
          for (const p of rezultat.questions) {
            expect(p.type).toBe(slug === 'srpski-citanje-5' ? 'text' : type === 'auto' ? p.type : type)
            expect(['text', 'truefalse']).toContain(p.type)
            expect(p.difficulty).toBe(5)
            expect(p.points).toBe(5)
          }
        }
      }
    }
  })

  it('sva pitanja imaju validan odgovor, čist tekst i staju u bazu', () => {
    for (const slug of MODULI) {
      for (const type of ['text', 'truefalse'] as const) {
        for (const p of generisi(cfg(slug, { type, count: 1000 })).questions) {
          expect(p.text.length).toBeLessThanOrEqual(2000)
          expect(p.text.length).toBeGreaterThan(10)
          expect(p.explanation.length).toBeGreaterThan(10)
          expect(`${p.text} ${p.explanation}`).not.toMatch(/undefined|\p{Script=Cyrillic}/u)
          expect(p.options).toBeNull()
          if (p.type === 'text') {
            const accept = (p.correct as { accept: string[] }).accept
            expect(accept.length).toBeGreaterThan(0)
            expect(accept.every((s) => s.trim().length > 0)).toBe(true)
            expect(new Set(accept.map(norm)).size).toBe(accept.length)
            expect(accept.join(' ')).not.toMatch(/\p{Script=Cyrillic}/u)
          } else expect(typeof (p.correct as { value: boolean }).value).toBe('boolean')
        }
      }
    }
  })

  it('iscrpljuje ceo skup, poštuje prethodne potpise i regeneraciju', () => {
    for (const [i, slug] of MODULI.entries()) {
      const rezultat = generisi(cfg(slug, { count: 1000, type: 'text' }))
      expect(rezultat.questions).toHaveLength(BROJEVI[i])
      expect(rezultat.warning).not.toBeNull()
      const potpisi = rezultat.questions.map((p) => p.signature)
      expect(new Set(potpisi).size).toBe(BROJEVI[i])
      const svi = generisi(cfg(slug, { count: BROJEVI[i], type: 'truefalse' }))
      expect(svi.warning).toBeNull()
      expect(new Set(svi.questions.map((p) => p.signature))).toEqual(new Set(potpisi))
      expect(generisi(cfg(slug, { excludedSignatures: potpisi })).questions).toEqual([])
      expect(regenerisiJedno(cfg(slug), new Set(potpisi))).toBeNull()
      const osimPrvog = potpisi.slice(1)
      expect(regenerisiJedno(cfg(slug), new Set(osimPrvog))?.signature).toBe(potpisi[0])
      expect(generisi(cfg(slug, { excludedSignatures: osimPrvog })).questions).toHaveLength(1)
      expect(generisi(cfg(slug, { count: 400, allowRepeats: true, excludedSignatures: potpisi })).questions).toHaveLength(400)
    }
  })

  it('kombinovani kviz koristi tri generatora i tri banke bez mešanja razreda', () => {
    const oblasti: Oblast[] = SVE.map((slug, i) => ({ id: String(i), slug, name: slug, subject: 'srpski', grade: 5, sort_order: i }))
    oblasti.push({ id: 'stara', slug: 'srpski-gramatika-4', name: 'Gramatika', subject: 'srpski', grade: 4, sort_order: 1 })
    oblasti.push({ id: 'mat', slug: 'deljivost-5', name: 'Deljivost', subject: 'matematika', grade: 5, sort_order: 1 })
    const izabrane = izaberiOblastiZaKviz(oblasti, 'srpski', 5, oblasti.map((o) => o.slug))
    expect(izabrane.map((o) => o.slug)).toEqual(SVE)
    const plan = napraviPlanOblastiKviza(SVE, 20, new Set(podrzaneOblasti()), 'combined')
    expect(plan.reduce((n, p) => n + p.questionCount, 0)).toBe(20)
    expect(plan.filter((p) => p.source === 'generator').map((p) => p.topicSlug)).toEqual(MODULI)
    expect(plan.filter((p) => p.source === 'bank').map((p) => p.topicSlug)).toEqual(SVE.slice(3))
    expect(napraviPlanOblastiKviza(SVE, 12, new Set(podrzaneOblasti()), 'generator')).toHaveLength(3)
  })
})
