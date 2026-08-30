// Generator: reči suprotnog značenja i porodice reči za 2. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

const SUPROTNO: Array<[string, string, ...string[]]> = [
  ['visok', 'nizak', 'niska'], ['topao', 'hladan', 'hladna'], ['brz', 'spor', 'spora'],
  ['svetao', 'taman', 'tamna'], ['velik', 'mali', 'malen'], ['veseo', 'tužan', 'tužna'],
  ['pun', 'prazan', 'prazna'], ['jak', 'slab', 'slaba'], ['čist', 'prljav', 'prljava'],
  ['dug', 'kratak', 'kratka'], ['nov', 'star', 'stara'], ['tih', 'glasan', 'glasna'],
  ['lak', 'težak', 'teška'], ['dobar', 'loš', 'zao'],
]

const PORODICE = [
  { rec: 'škola', srodna: 'školski', recenica: 'Školski ranac je plav.' },
  { rec: 'kuća', srodna: 'kućni', recenica: 'Kućni prag je čist.' },
  { rec: 'voda', srodna: 'vodeni', recenica: 'Vodeni točak se okreće.' },
  { rec: 'sunce', srodna: 'sunčan', recenica: 'Sunčan dan je topao.' },
  { rec: 'šuma', srodna: 'šumski', recenica: 'Šumski put je uzak.' },
  { rec: 'more', srodna: 'morski', recenica: 'Morski talas je visok.' },
  { rec: 'cvet', srodna: 'cvetni', recenica: 'Cvetni venac miriše.' },
  { rec: 'sneg', srodna: 'snežni', recenica: 'Snežni čovek stoji u dvorištu.' },
  { rec: 'grad', srodna: 'gradski', recenica: 'Gradski park je zelen.' },
  { rec: 'dete', srodna: 'dečji', recenica: 'Dečji crtež visi na zidu.', prihvaceni: ['dečiji'] },
]

export const srpskiRecnik2: TopicGenerator = {
  slug: 'srpski-recnik-2', supportedTypes: ['text', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (rng() < 0.45) {
      const p = izaberi(rng, PORODICE)
      const signature = `srpski-recnik-2:porodica:${p.rec}`
      if (taken.has(signature)) return null
      if (cfg.type === 'truefalse') {
        const pogresna = izaberi(rng, PORODICE.filter((x) => x.rec !== p.rec)).srodna
        return upakujSrpskiTvrdnju(cfg, rng, {
          tvrdnjaTacna: `Reč „${p.srodna}“ u rečenici „${p.recenica}“ srodna je reči „${p.rec}“.`,
          tvrdnjaNetacna: `Reč „${pogresna}“ u rečenici „${p.recenica}“ srodna je reči „${p.rec}“.`,
          explanation: `Reči „${p.rec}“ i „${p.srodna}“ pripadaju istoj porodici reči.`,
          hint: null, signature,
        })
      }
      return upakujSrpskiTekst(cfg, {
        pitanje: `Napiši srodnu reč reči „${p.rec}“ iz rečenice „${p.recenica}“.`,
        tacan: p.srodna, prihvaceni: p.prihvaceni,
        explanation: `Reči „${p.rec}“ i „${p.srodna}“ pripadaju istoj porodici reči.`,
        hint: 'Srodna reč ima isti koren, ali drugi nastavak.', signature,
      })
    }
    const [rec, ...odgovori] = izaberi(rng, SUPROTNO)
    const signature = `srpski-recnik-2:suprotno:${rec}`
    if (taken.has(signature)) return null
    if (cfg.type === 'truefalse') {
      const pogresna = izaberi(rng, SUPROTNO.filter((par) => par[0] !== rec))[1]
      return upakujSrpskiTvrdnju(cfg, rng, {
        tvrdnjaTacna: `Reč suprotnog značenja reči „${rec}“ je „${odgovori[0]}“.`,
        tvrdnjaNetacna: `Reč suprotnog značenja reči „${rec}“ je „${pogresna}“.`,
        explanation: `Reč suprotnog značenja reči „${rec}“ je „${odgovori[0]}“.`,
        hint: null, signature,
      })
    }
    return upakujSrpskiTekst(cfg, {
      pitanje: `Napiši reč suprotnog značenja reči „${rec}“.`,
      tacan: odgovori[0], prihvaceni: odgovori.slice(1),
      explanation: `Reč suprotnog značenja reči „${rec}“ je „${odgovori[0]}“.`,
      hint: 'Traži reč koja znači obrnuto.', signature,
    })
  },
}
