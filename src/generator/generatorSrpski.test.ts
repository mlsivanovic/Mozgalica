// Testovi generatora srpskog jezika: ukucani odgovori, samostalne tvrdnje,
// fiksan najteži nivo (težina je uklonjena) i determinizam.
import { describe, expect, it } from 'vitest'
import { generisi, podrzaneOblasti } from './index.ts'
import { napraviPlanOblastiKviza } from '../lib/raspodelaKviza.ts'
import type { GeneratorConfig, GenerisanoPitanje } from './types.ts'

const OBLASTI = [
  'srpski-vrste-reci',
  'srpski-gramatika',
  'srpski-citanje',
  'srpski-recnik',
  'srpski-gramatika-4',
  'srpski-recnik-4',
  'srpski-citanje-4',
] as const

const TIPOVI = ['text', 'truefalse', 'numeric'] as const

function cfg(delimicno: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    topicSlug: 'srpski-gramatika',
    difficulty: 3,
    count: 8,
    type: 'auto',
    wordProblems: false,
    allowRepeats: false,
    seed: 42,
    ...delimicno,
  }
}

function accept(pitanje: GenerisanoPitanje): string[] {
  return (pitanje.correct as { accept: string[] }).accept
}

describe('generatori srpskog jezika', () => {
  it('svaka oblast pravi pitanja isključivo dozvoljenih tipova, bez obzira na težinu', () => {
    for (const oblast of OBLASTI) {
      for (const difficulty of [1, 3, 5] as const) {
        const rezultat = generisi(cfg({ topicSlug: oblast, difficulty, count: 6, seed: 100 + difficulty }))
        expect(rezultat.questions, `${oblast}, nivo ${difficulty}`).toHaveLength(6)
        for (const pitanje of rezultat.questions) {
          expect(pitanje.topicSlug).toBe(oblast)
          expect(TIPOVI).toContain(pitanje.type)
          expect(pitanje.type).not.toBe('single')
          // Težina je uklonjena: sva pitanja idu na najtežem nivou
          expect(pitanje.difficulty).toBe(5)
          expect(pitanje.points).toBe(5)
          expect(pitanje.text.length).toBeGreaterThan(10)
          expect(pitanje.explanation.length).toBeGreaterThan(5)
          expect(pitanje.text).not.toContain('undefined')
        }
      }
    }
  })

  it('tekstualna pitanja imaju listu prihvaćenih odgovora bez duplikata', () => {
    for (const oblast of OBLASTI) {
      const pitanja = generisi(cfg({ topicSlug: oblast, count: 15, seed: 11 })).questions
      for (const pitanje of pitanja.filter((p) => p.type === 'text')) {
        expect(pitanje.options).toBeNull()
        const lista = accept(pitanje)
        expect(lista.length).toBeGreaterThan(0)
        for (const odgovor of lista) expect(odgovor.trim().length).toBeGreaterThan(0)
        // Duplikati po normalizovanom obliku (velika/mala slova, dijakritici)
        const normalizovano = lista.map((odgovor) =>
          odgovor.toLowerCase().replaceAll(/[čć]/g, 'c').replaceAll('š', 's').replaceAll('ž', 'z').replaceAll('đ', 'd').replace(/\s+/g, ' ').trim())
        expect(new Set(normalizovano).size).toBe(normalizovano.length)
      }
    }
  })

  it('tačno/netačno tvrdnje su samostalne i jednoznačne', () => {
    for (const oblast of OBLASTI) {
      const pitanja = generisi(cfg({ topicSlug: oblast, count: 12, type: 'truefalse', seed: 91 })).questions
      expect(pitanja.length).toBeGreaterThan(0)
      for (const pitanje of pitanja) {
        if (pitanje.type !== 'truefalse') continue
        expect(pitanje.options).toBeNull()
        expect(typeof (pitanje.correct as { value: boolean }).value).toBe('boolean')
        // Tvrdnja ne sme da visi u praznini (npr. „pripada ovoj porodici reči“)
        expect(pitanje.text).not.toMatch(/\bovoj\b/)
        expect(pitanje.text).toContain('„')
        expect(pitanje.text).not.toContain('undefined')
      }
    }
  })

  it('čitanje uvek traži ukucan odgovor, čak i kad je izabran tačno/netačno', () => {
    for (const oblast of ['srpski-citanje', 'srpski-citanje-4'] as const) {
      for (const type of ['auto', 'text', 'truefalse'] as const) {
        const pitanja = generisi(cfg({ topicSlug: oblast, count: 8, type, seed: 55 })).questions
        expect(pitanja).toHaveLength(8)
        for (const pitanje of pitanja) {
          expect(pitanje.type).toBe('text')
          expect(pitanje.text).toContain('Pročitaj tekst:')
          expect(accept(pitanje).length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('ime glavnog lika iz čitanja zaista se nalazi u tekstu priče', () => {
    for (const oblast of ['srpski-citanje', 'srpski-citanje-4'] as const) {
      const pitanja = generisi(cfg({ topicSlug: oblast, count: 12, seed: 77 })).questions
      const oImenu = pitanja.filter((pitanje) => pitanje.signature.endsWith(':ko'))
      expect(oImenu.length).toBeGreaterThan(0)
      for (const pitanje of oImenu) {
        const telo = pitanje.text.split('\n\n')[1] ?? ''
        expect(telo).toContain(accept(pitanje)[0])
      }
    }
  })

  it('brojanje reči u rečenici daje brojčani unos', () => {
    const pitanja = generisi(cfg({ topicSlug: 'srpski-vrste-reci', count: 10, type: 'numeric', seed: 33 })).questions
    expect(pitanja).toHaveLength(10)
    for (const pitanje of pitanja) {
      expect(pitanje.type).toBe('numeric')
      const vrednost = (pitanje.correct as { value: number }).value
      expect(vrednost).toBeGreaterThanOrEqual(0)
      expect(vrednost).toBeLessThanOrEqual(3)
      expect(pitanje.text).toMatch(/Koliko (imenica|glagola|prideva|ličnih zamenica) ima/)
    }
  })

  it('ukucani tip poštuje se svuda gde postoji', () => {
    for (const oblast of OBLASTI) {
      if (oblast === 'srpski-vrste-reci') continue
      const pitanja = generisi(cfg({ topicSlug: oblast, count: 8, type: 'text', seed: 21 })).questions
      for (const pitanje of pitanja) expect(pitanje.type).toBe('text')
    }
  })

  it('3. razred pokriva program i ne generiše gradivo 4. razreda', () => {
    const potpisi = new Set<string>()
    const tekstovi: string[] = []
    for (const oblast of ['srpski-vrste-reci', 'srpski-gramatika', 'srpski-recnik'] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        for (const pitanje of generisi(cfg({ topicSlug: oblast, count: 8, seed })).questions) {
          potpisi.add(pitanje.signature)
          tekstovi.push(pitanje.text)
        }
      }
    }
    for (const prefiks of [
      'srpski-vrste-reci:podvrsta:', 'srpski-gramatika:imenica-rod:', 'srpski-gramatika:pridev-rod:',
      'srpski-gramatika:glagol-lice:', 'srpski-gramatika:zamenica-broj:', 'srpski-recnik:umanjenica:',
      'srpski-recnik:uvecanica:', 'srpski-recnik:znacenje-reci:',
    ]) expect([...potpisi].some((potpis) => potpis.startsWith(prefiks)), prefiks).toBe(true)
    expect([...potpisi].join('\n')).not.toMatch(/:(subjekat|predikat|porodica|izvedena|slozena|ustaljeni-izraz):/)
    expect(tekstovi.join('\n').toLowerCase()).not.toMatch(/\b(subjekat|predikat|objekat|atribut|priloška odredba)\b/)
  })

  it('4. razred pokriva rečenične članove, promenljivost i odgovarajući rečnik', () => {
    const potpisi = new Set<string>()
    for (const oblast of ['srpski-gramatika-4', 'srpski-recnik-4'] as const) {
      for (let seed = 1; seed <= 100; seed++) {
        for (const pitanje of generisi(cfg({ topicSlug: oblast, count: 10, seed })).questions) potpisi.add(pitanje.signature)
      }
    }
    for (const prefiks of [
      'srpski-gramatika-4:promenljivost:', 'srpski-gramatika-4:vrsta-sluzba:',
      'srpski-gramatika-4:izostavljeni-subjekat:', 'srpski-gramatika-4:vreme-predikata:',
      'srpski-recnik-4:sinonim:', 'srpski-recnik-4:homonim:', 'srpski-recnik-4:ustaljeni-izraz:',
    ]) expect([...potpisi].some((potpis) => potpis.startsWith(prefiks)), prefiks).toBe(true)
    for (const clan of ['subjekat', 'predikat', 'objekat', 'atribut', 'mesto', 'vreme', 'nacin']) {
      expect([...potpisi].some((potpis) => potpis.startsWith(`srpski-gramatika-4:sluzba:${clan}:`)), clan).toBe(true)
    }
    expect([...potpisi].join('\n')).not.toMatch(/:(slozena|izvedena|broj-zamenice|broj-vrsta):/)
  })

  it('čitanje obuhvata programske ishode oba razreda', () => {
    const potpisi = new Set<string>()
    for (const oblast of ['srpski-citanje', 'srpski-citanje-4'] as const) {
      for (let seed = 1; seed <= 120; seed++) {
        for (const pitanje of generisi(cfg({ topicSlug: oblast, count: 8, seed })).questions) potpisi.add(pitanje.signature)
      }
    }
    for (const zavrsetak of [':tema', ':uzrok', ':posledica', ':osobina', ':redosled', ':sporedni-lik']) {
      expect([...potpisi].some((potpis) => potpis.endsWith(zavrsetak)), zavrsetak).toBe(true)
    }
    for (const zavrsetak of [':pripovedac', ':odnos', ':poruka', ':personifikacija', ':opis']) {
      expect([...potpisi].some((potpis) => potpis.endsWith(zavrsetak) && potpis.startsWith('srpski-citanje-4:')), zavrsetak).toBe(true)
    }
  })

  it('ugrađeni tekstovi ne sadrže pronađene jezičke greške', () => {
    const tekstovi: string[] = []
    for (const oblast of OBLASTI) {
      for (let seed = 1; seed <= 100; seed++) {
        for (const pitanje of generisi(cfg({ topicSlug: oblast, count: 8, seed })).questions) {
          tekstovi.push(pitanje.text, pitanje.explanation)
        }
      }
    }
    expect(tekstovi.join('\n')).not.toMatch(/uzka|radostna|\bmenji\b|Nasmijana|pola terene|košarkaškoj tereni|plutu se|mamain|Upravio je domaći|pokrovče/)
  })

  it('kombinovani dnevni kviz ravnomerno raspoređuje svih 20 pitanja', () => {
    const oblasti = [
      'srpski-vrste-reci', 'srpski-gramatika', 'srpski-pravopis', 'srpski-citanje',
      'srpski-recnik', 'srpski-knjizevnost', 'srpski-jezicka-kultura',
    ]
    const plan = napraviPlanOblastiKviza(oblasti, 20, new Set(podrzaneOblasti()), 'combined')
    expect(plan.reduce((zbir, stavka) => zbir + stavka.questionCount, 0)).toBe(20)
    expect(plan.map((stavka) => stavka.topicSlug)).toEqual(oblasti)
    expect(plan.find((stavka) => stavka.topicSlug === 'srpski-pravopis')?.source).toBe('bank')
    expect(plan.find((stavka) => stavka.topicSlug === 'srpski-gramatika')?.source).toBe('generator')
  })

  it('kombinovani kviz 4. razreda deli generator i banku', () => {
    const oblasti = [
      'srpski-gramatika-4', 'srpski-pravopis-4', 'srpski-citanje-4',
      'srpski-recnik-4', 'srpski-knjizevnost-4', 'srpski-jezicka-kultura-4',
    ]
    const plan = napraviPlanOblastiKviza(oblasti, 20, new Set(podrzaneOblasti()), 'combined')
    expect(plan.reduce((zbir, stavka) => zbir + stavka.questionCount, 0)).toBe(20)
    expect(plan.map((stavka) => stavka.topicSlug)).toEqual(oblasti)
    expect(plan.find((stavka) => stavka.topicSlug === 'srpski-pravopis-4')?.source).toBe('bank')
    expect(plan.find((stavka) => stavka.topicSlug === 'srpski-knjizevnost-4')?.source).toBe('bank')
    expect(plan.find((stavka) => stavka.topicSlug === 'srpski-jezicka-kultura-4')?.source).toBe('bank')
    expect(plan.find((stavka) => stavka.topicSlug === 'srpski-gramatika-4')?.source).toBe('generator')
    expect(plan.find((stavka) => stavka.topicSlug === 'srpski-citanje-4')?.source).toBe('generator')
  })

  it('bez ponavljanja zaustavlja se kada iscrpi tekstualne sinonime 4. razreda', () => {
    const rezultat = generisi(cfg({ topicSlug: 'srpski-recnik-4', count: 50, type: 'text', seed: 7 }))
    expect(rezultat.questions).toHaveLength(16)
    expect(rezultat.warning).not.toBeNull()
    expect(new Set(rezultat.questions.map((pitanje) => pitanje.signature)).size).toBe(16)
  })

  it('isti seed daje potpuno isti skup pitanja', () => {
    for (const oblast of OBLASTI) {
      const prvi = generisi(cfg({ topicSlug: oblast, seed: 123 }))
      const drugi = generisi(cfg({ topicSlug: oblast, seed: 123 }))
      expect(prvi).toEqual(drugi)
    }
  })
})
