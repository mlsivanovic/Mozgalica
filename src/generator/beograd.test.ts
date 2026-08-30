import { describe, expect, it } from 'vitest'
import type { MatchingOpcije, Opcija } from '../types/db.ts'
import { generisi } from './index.ts'
import { BEOGRAD_3 } from './moduliPid/beograd.ts'
import type { GeneratorConfig } from './types.ts'

function konfiguracija(type: GeneratorConfig['type'], seed = 42, count = 10): GeneratorConfig {
  return {
    topicSlug: 'pid-beograd-3', type, seed, count,
    difficulty: 1, wordProblems: false, allowRepeats: false,
  }
}

describe('Beograd za treći razred', () => {
  it('sadržaj ima jedinstvene potpise i tačno tri različita netačna odgovora', () => {
    const cinjenice = BEOGRAD_3.cinjenice
    expect(cinjenice.length).toBeGreaterThanOrEqual(24)
    expect(new Set(cinjenice.map((c) => c.id)).size).toBe(cinjenice.length)
    expect(new Set(cinjenice.map((c) => c.pitanje)).size).toBe(cinjenice.length)
    for (const c of cinjenice) {
      expect(c.id).toMatch(/^[a-z0-9-]+$/)
      expect(c.netacni).toHaveLength(3)
      const odgovori = [c.tacan, ...c.netacni].map((tekst) => tekst.trim().toLocaleLowerCase('sr'))
      expect(new Set(odgovori).size, c.id).toBe(4)
      expect(c.tacnaTvrdnja).not.toBe(c.netacnaTvrdnja)
      expect(c.objasnjenje.trim().length).toBeGreaterThan(10)
      expect(c.hint.trim().length).toBeGreaterThan(10)
    }
  })

  it.each(['single', 'truefalse', 'matching', 'auto'] as const)(
    'daje deset pitanja bez ponavljanja i poštuje ranije korišćene potpise (%s)', (tip) => {
      for (let seed = 0; seed < 40; seed++) {
        const cfg = konfiguracija(tip, seed)
        const prvi = generisi(cfg)
        expect(prvi.warning).toBeNull()
        expect(prvi.questions).toHaveLength(10)
        expect(prvi).toEqual(generisi(cfg))
        const potpisi = prvi.questions.map((p) => p.signature)
        expect(new Set(potpisi).size).toBe(10)
        const sledeci = generisi({ ...cfg, count: 5, excludedSignatures: potpisi })
        expect(sledeci.warning).toBeNull()
        expect(sledeci.questions).toHaveLength(5)
        expect(sledeci.questions.every((p) => !potpisi.includes(p.signature))).toBe(true)
      }
    },
  )

  it('mešanje opcija zadržava proverene odgovore o gradu', () => {
    const ocekivani = new Map([
      ['glavni-grad', 'Beograd'], ['dve-reke', 'Save i Dunava'], ['smer-ulivanja', 'Sava'],
      ['avala', 'Avala'], ['savsko-jezero', 'Savsko jezero'], ['kalemegdan', 'Kalemegdan'],
      ['pobednik', 'Pobednik'], ['singidunum', 'Singidunum'], ['knez-mihailo', 'knezu Mihailu'],
    ])
    const pronadjeni = new Set<string>()
    for (let seed = 0; seed < 100; seed++) {
      for (const pitanje of generisi(konfiguracija('single', seed)).questions) {
        const id = pitanje.signature.split(':')[3]
        if (!ocekivani.has(id)) continue
        pronadjeni.add(id)
        const opcije = pitanje.options as Opcija[]
        const tacanId = (pitanje.correct as { optionId: string }).optionId
        expect(opcije.find((o) => o.id === tacanId)?.text, id).toBe(ocekivani.get(id))
      }
    }
    expect(pronadjeni).toEqual(new Set(ocekivani.keys()))
  })

  it('razlikuje smer ulivanja reka i u tačnim i u netačnim tvrdnjama', () => {
    const pronadjene = new Set<string>()
    for (let seed = 0; seed < 100; seed++) {
      for (const pitanje of generisi(konfiguracija('truefalse', seed)).questions) {
        if (pitanje.text === 'Sava se u Beogradu uliva u Dunav.') {
          expect(pitanje.correct).toEqual({ value: true })
          pronadjene.add('tacna')
        } else if (pitanje.text === 'Dunav se u Beogradu uliva u Savu.') {
          expect(pitanje.correct).toEqual({ value: false })
          pronadjene.add('netacna')
        }
      }
    }
    expect(pronadjene).toEqual(new Set(['tacna', 'netacna']))
  })

  it('povezivanje ne menja parove posle nezavisnog mešanja leve i desne strane', () => {
    const parovi = BEOGRAD_3.parovi
    expect(new Set(parovi.map((p) => p.id)).size).toBe(parovi.length)
    expect(new Set(parovi.map((p) => p.levo)).size).toBe(parovi.length)
    expect(new Set(parovi.map((p) => p.desno)).size).toBe(parovi.length)
    const ocekivani = new Map(parovi.map((p) => [p.levo, p.desno]))
    const pronadjeni = new Set<string>()
    for (let seed = 0; seed < 40; seed++) {
      for (const pitanje of generisi(konfiguracija('matching', seed)).questions) {
        const { left, right } = pitanje.options as MatchingOpcije
        const { pairs } = pitanje.correct as { pairs: Record<string, string> }
        for (const leva of left) {
          expect(right.find((desna) => desna.id === pairs[leva.id])?.text).toBe(ocekivani.get(leva.text))
          pronadjeni.add(leva.text)
        }
      }
    }
    expect(pronadjeni).toEqual(new Set(ocekivani.keys()))
  })
})
