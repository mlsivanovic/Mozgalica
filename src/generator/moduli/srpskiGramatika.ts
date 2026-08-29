// Generator: gramatičke kategorije imenica, prideva, glagola i ličnih zamenica za 3. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from './srpskiZajednicko.ts'

type Rod = 'muški' | 'ženski' | 'srednji'
type Broj = 'jednina' | 'množina'
type Lice = 'prvo' | 'drugo' | 'treće'

const IMENICE = [
  { jednina: 'dečak', mnozina: 'dečaci', rod: 'muški' }, { jednina: 'prozor', mnozina: 'prozori', rod: 'muški' },
  { jednina: 'devojčica', mnozina: 'devojčice', rod: 'ženski' }, { jednina: 'knjiga', mnozina: 'knjige', rod: 'ženski' },
  { jednina: 'selo', mnozina: 'sela', rod: 'srednji' }, { jednina: 'jezero', mnozina: 'jezera', rod: 'srednji' },
] as const
const PRIDEVI = [
  { oblik: 'veseo', recenica: 'Veseo dečak se igra.', rod: 'muški', drugiBroj: 'veseli' },
  { oblik: 'visoka', recenica: 'Visoka zgrada se vidi izdaleka.', rod: 'ženski', drugiBroj: 'visoke' },
  { oblik: 'plavo', recenica: 'Plavo nebo je vedro.', rod: 'srednji', drugiBroj: 'plava' },
  { oblik: 'vredni', recenica: 'Vredni učenici rade.', rod: 'muški', drugiBroj: 'vredan' },
  { oblik: 'mirisne', recenica: 'Mirisne ruže cvetaju.', rod: 'ženski', drugiBroj: 'mirisna' },
  { oblik: 'zelena', recenica: 'Zelena polja se prostiru.', rod: 'srednji', drugiBroj: 'zeleno' },
] as const
const GLAGOLI = [
  { oblik: 'čitam', lice: 'prvo', broj: 'jednina' }, { oblik: 'čitaš', lice: 'drugo', broj: 'jednina' },
  { oblik: 'čita', lice: 'treće', broj: 'jednina' }, { oblik: 'čitamo', lice: 'prvo', broj: 'množina' },
  { oblik: 'pevate', lice: 'drugo', broj: 'množina' }, { oblik: 'rade', lice: 'treće', broj: 'množina' },
] as const
const ZAMENICE = [
  { rec: 'ja', lice: 'prvo', broj: 'jednina' }, { rec: 'ti', lice: 'drugo', broj: 'jednina' },
  { rec: 'on', lice: 'treće', broj: 'jednina' }, { rec: 'ona', lice: 'treće', broj: 'jednina' },
  { rec: 'mi', lice: 'prvo', broj: 'množina' }, { rec: 'vi', lice: 'drugo', broj: 'množina' },
  { rec: 'oni', lice: 'treće', broj: 'množina' }, { rec: 'one', lice: 'treće', broj: 'množina' },
] as const

const RODOVI: Rod[] = ['muški', 'ženski', 'srednji']
const BROJEVI: Broj[] = ['jednina', 'množina']
const LICA: Lice[] = ['prvo', 'drugo', 'treće']

function pitanjeKategorije(cfg: GeneratorConfig, rng: Rng, ulaz: {
  pitanje: string; tacan: string; prihvaceni?: string[]; objasnjenje: string
  hint: string; signature: string; moguci: string[]; tvrdnja: (odgovor: string) => string
}): GenerisanoPitanje {
  if (hoceTvrdnju(cfg, rng)) {
    const pogresan = izaberi(rng, ulaz.moguci.filter((v) => v !== ulaz.tacan))
    return upakujSrpskiTvrdnju(cfg, rng, {
      tvrdnjaTacna: ulaz.tvrdnja(ulaz.tacan),
      tvrdnjaNetacna: ulaz.tvrdnja(pogresan),
      explanation: ulaz.objasnjenje, hint: null, signature: ulaz.signature,
    })
  }
  return upakujSrpskiTekst(cfg, { pitanje: ulaz.pitanje, tacan: ulaz.tacan, prihvaceni: ulaz.prihvaceni,
    explanation: ulaz.objasnjenje, hint: ulaz.hint, signature: ulaz.signature })
}

export const srpskiGramatika: TopicGenerator = {
  slug: 'srpski-gramatika', supportedTypes: ['text', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const vrsta = izaberi(rng, ['imenica-rod', 'imenica-broj', 'pridev-rod', 'pridev-broj', 'glagol-lice', 'glagol-broj', 'zamenica-lice', 'zamenica-broj'] as const)
    if (vrsta === 'imenica-rod' || vrsta === 'imenica-broj') {
      const p = izaberi(rng, IMENICE)
      if (vrsta === 'imenica-rod') {
        const signature = `srpski-gramatika:imenica-rod:${p.jednina}`
        if (taken.has(signature)) return null
        return pitanjeKategorije(cfg, rng, { pitanje: `Kog je roda imenica „${p.jednina}“?`, tacan: p.rod, prihvaceni: [`${p.rod} rod`],
          objasnjenje: `Imenica „${p.jednina}“ je ${p.rod} rod.`, hint: 'Pomozi se rečima taj, ta, to.', signature,
          moguci: RODOVI, tvrdnja: (odgovor) => `Imenica „${p.jednina}“ je ${odgovor} rod.` })
      }
      const kaMnozini = rng() < 0.5
      const polazni = kaMnozini ? p.jednina : p.mnozina
      const tacan = kaMnozini ? p.mnozina : p.jednina
      const signature = `srpski-gramatika:imenica-broj:${polazni}:${tacan}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, { pitanje: `Napiši ${kaMnozini ? 'množinu' : 'jedninu'} imenice „${polazni}“.`, tacan,
        explanation: `${polazni} → ${tacan}.`, hint: 'Obrati pažnju da li se govori o jednom ili o više bića ili predmeta.', signature })
    }
    if (vrsta === 'pridev-rod' || vrsta === 'pridev-broj') {
      const p = izaberi(rng, PRIDEVI)
      if (vrsta === 'pridev-rod') {
        const signature = `srpski-gramatika:pridev-rod:${p.oblik}:${p.recenica}`
        if (taken.has(signature)) return null
        return pitanjeKategorije(cfg, rng, { pitanje: `Kog je roda pridev „${p.oblik}“ u rečenici „${p.recenica}“?`, tacan: p.rod,
          prihvaceni: [`${p.rod} rod`], objasnjenje: `Pridev se slaže sa imenicom i ovde je ${p.rod} rod.`,
          hint: 'Pogledaj uz koju imenicu stoji pridev.', signature, moguci: RODOVI,
          tvrdnja: (odgovor) => `Pridev „${p.oblik}“ u rečenici „${p.recenica}“ je ${odgovor} rod.` })
      }
      const signature = `srpski-gramatika:pridev-broj:${p.oblik}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, { pitanje: `Napiši pridev „${p.oblik}“ u drugom gramatičkom broju.`, tacan: p.drugiBroj,
        explanation: `Drugi broj prideva „${p.oblik}“ glasi „${p.drugiBroj}“.`, hint: 'Promeni jedninu u množinu ili množinu u jedninu.', signature })
    }
    const p = vrsta.startsWith('glagol') ? izaberi(rng, GLAGOLI) : izaberi(rng, ZAMENICE)
    const traziLice = vrsta.endsWith('lice')
    const tacan = traziLice ? p.lice : p.broj
    const rec = 'oblik' in p ? p.oblik : p.rec
    const signature = `srpski-gramatika:${vrsta}:${rec}`
    if (taken.has(signature)) return null
    return pitanjeKategorije(cfg, rng, {
      pitanje: `${traziLice ? 'Koje lice' : 'Koji gramatički broj'} ima ${'oblik' in p ? 'glagol' : 'lična zamenica'} „${rec}“?`,
      tacan, prihvaceni: traziLice ? [`${tacan} lice`] : [`u ${tacan === 'jednina' ? 'jednini' : 'množini'}`],
      objasnjenje: `„${rec}“ je ${p.lice} lice, ${p.broj}.`,
      hint: traziLice ? 'Prvo lice govori, drugo sluša, a o trećem se govori.' : 'Odredi da li oblik označava jednu ili više osoba.',
      signature, moguci: traziLice ? LICA : BROJEVI,
      tvrdnja: (odgovor) => traziLice
        ? `${'oblik' in p ? 'Glagol' : 'Lična zamenica'} „${rec}“ je ${odgovor} lice.`
        : `${'oblik' in p ? 'Glagol' : 'Lična zamenica'} „${rec}“ je u ${odgovor === 'jednina' ? 'jednini' : 'množini'}.`,
    })
  },
}
