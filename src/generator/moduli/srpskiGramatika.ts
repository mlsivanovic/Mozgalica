// Generator: gramatika — rod i broj imenica, subjekat i predikat.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from './srpskiZajednicko.ts'

type Rod = 'muški rod' | 'ženski rod' | 'srednji rod'

interface Imenica {
  jednina: string
  mnozina: string
  rod: Rod
}

const IMENICE: Imenica[] = [
  // Muški rod
  { jednina: 'dečak', mnozina: 'dečaci', rod: 'muški rod' },
  { jednina: 'prozor', mnozina: 'prozori', rod: 'muški rod' },
  { jednina: 'leptir', mnozina: 'leptiri', rod: 'muški rod' },
  { jednina: 'most', mnozina: 'mostovi', rod: 'muški rod' },
  { jednina: 'učenik', mnozina: 'učenici', rod: 'muški rod' },
  { jednina: 'grad', mnozina: 'gradovi', rod: 'muški rod' },
  { jednina: 'drugar', mnozina: 'drugari', rod: 'muški rod' },
  { jednina: 'ranac', mnozina: 'rančevi', rod: 'muški rod' },
  { jednina: 'korak', mnozina: 'koraci', rod: 'muški rod' },
  { jednina: 'hrast', mnozina: 'hrastovi', rod: 'muški rod' },

  // Ženski rod
  { jednina: 'devojčica', mnozina: 'devojčice', rod: 'ženski rod' },
  { jednina: 'sveska', mnozina: 'sveske', rod: 'ženski rod' },
  { jednina: 'lopta', mnozina: 'lopte', rod: 'ženski rod' },
  { jednina: 'noć', mnozina: 'noći', rod: 'ženski rod' },
  { jednina: 'knjiga', mnozina: 'knjige', rod: 'ženski rod' },
  { jednina: 'reka', mnozina: 'reke', rod: 'ženski rod' },
  { jednina: 'pesma', mnozina: 'pesme', rod: 'ženski rod' },
  { jednina: 'škola', mnozina: 'škole', rod: 'ženski rod' },
  { jednina: 'zvezda', mnozina: 'zvezde', rod: 'ženski rod' },
  { jednina: 'olovka', mnozina: 'olovke', rod: 'ženski rod' },

  // Srednji rod
  { jednina: 'selo', mnozina: 'sela', rod: 'srednji rod' },
  { jednina: 'sunce', mnozina: 'sunca', rod: 'srednji rod' },
  { jednina: 'polje', mnozina: 'polja', rod: 'srednji rod' },
  { jednina: 'jezero', mnozina: 'jezera', rod: 'srednji rod' },
  { jednina: 'stablo', mnozina: 'stabla', rod: 'srednji rod' },
  { jednina: 'pismo', mnozina: 'pisma', rod: 'srednji rod' },
  { jednina: 'brdo', mnozina: 'brda', rod: 'srednji rod' },
  { jednina: 'pero', mnozina: 'pera', rod: 'srednji rod' },
  { jednina: 'zvono', mnozina: 'zvona', rod: 'srednji rod' },
  { jednina: 'jaje', mnozina: 'jaja', rod: 'srednji rod' },
]

interface Recenica {
  tekst: string
  subjekat: string
  predikat: string
  // Reči iz iste rečenice (u obliku iz rečenice) koje služe kao distraktori
  // za pitanja o subjektu i predikatu — nikad reči iz tuđih rečenica.
  distraktori: string[]
}

const RECENICE: Recenica[] = [
  { tekst: 'Mala ptica peva na grani.', subjekat: 'ptica', predikat: 'peva', distraktori: ['Mala', 'na', 'grani'] },
  { tekst: 'Marko pažljivo čita knjigu.', subjekat: 'Marko', predikat: 'čita', distraktori: ['pažljivo', 'knjigu'] },
  { tekst: 'Visoki bor šumi na vetru.', subjekat: 'bor', predikat: 'šumi', distraktori: ['Visoki', 'na', 'vetru'] },
  { tekst: 'Vredne pčele skupljaju polen.', subjekat: 'pčele', predikat: 'skupljaju', distraktori: ['Vredne', 'polen'] },
  { tekst: 'Stari sat glasno otkucava.', subjekat: 'sat', predikat: 'otkucava', distraktori: ['Stari', 'glasno'] },
  { tekst: 'Ana i Iva uređuju pano.', subjekat: 'Ana i Iva', predikat: 'uređuju', distraktori: ['i', 'pano'] },
  { tekst: 'Žuto lišće pada na stazu.', subjekat: 'lišće', predikat: 'pada', distraktori: ['Žuto', 'na', 'stazu'] },
  { tekst: 'Naš pas čuva dvorište.', subjekat: 'pas', predikat: 'čuva', distraktori: ['Naš', 'dvorište'] },
  { tekst: 'Brzi voz prolazi kroz tunel.', subjekat: 'voz', predikat: 'prolazi', distraktori: ['Brzi', 'kroz', 'tunel'] },
  { tekst: 'Jutarnje sunce greje livadu.', subjekat: 'sunce', predikat: 'greje', distraktori: ['Jutarnje', 'livadu'] },
  { tekst: 'Učenici trećeg razreda pevaju.', subjekat: 'učenici', predikat: 'pevaju', distraktori: ['trećeg', 'razreda'] },
  { tekst: 'Beli oblaci prekrivaju nebo.', subjekat: 'oblaci', predikat: 'prekrivaju', distraktori: ['Beli', 'nebo'] },
  // Nove rečenice
  { tekst: 'Hrabar vatrogasac gasi vatru.', subjekat: 'vatrogasac', predikat: 'gasi', distraktori: ['Hrabar', 'vatru'] },
  { tekst: 'Vesela deca trče parkom.', subjekat: 'deca', predikat: 'trče', distraktori: ['Vesela', 'parkom'] },
  { tekst: 'Moja baka pravi pitu.', subjekat: 'baka', predikat: 'pravi', distraktori: ['Moja', 'pitu'] },
  { tekst: 'Mina lepo svira violinu.', subjekat: 'Mina', predikat: 'svira', distraktori: ['lepo', 'violinu'] },
  { tekst: 'Zelena žaba skače u baru.', subjekat: 'žaba', predikat: 'skače', distraktori: ['Zelena', 'u', 'baru'] },
  { tekst: 'Stari ribar plete mrežu.', subjekat: 'ribar', predikat: 'plete', distraktori: ['Stari', 'mrežu'] },
  { tekst: 'Hladna kiša neprestano pada.', subjekat: 'kiša', predikat: 'pada', distraktori: ['Hladna', 'neprestano'] },
  { tekst: 'Moj brat vozi bicikl.', subjekat: 'brat', predikat: 'vozi', distraktori: ['Moj', 'bicikl'] },
  { tekst: 'Luka i Ivan grade kulu.', subjekat: 'Luka i Ivan', predikat: 'grade', distraktori: ['i', 'kulu'] },
  { tekst: 'Šareni leptir leti svuda.', subjekat: 'leptir', predikat: 'leti', distraktori: ['Šareni', 'svuda'] },
  { tekst: 'Drveni čamac plovi rekom.', subjekat: 'čamac', predikat: 'plovi', distraktori: ['Drveni', 'rekom'] },
  { tekst: 'Mali miš gricka sir.', subjekat: 'miš', predikat: 'gricka', distraktori: ['Mali', 'sir'] },
  { tekst: 'Zlatni ključ otvara vrata.', subjekat: 'ključ', predikat: 'otvara', distraktori: ['Zlatni', 'vrata'] },
]

const RODOVI: Rod[] = ['muški rod', 'ženski rod', 'srednji rod']

function rodULokativu(rod: string): string {
  if (rod === 'muški rod') return 'muškom rodu'
  if (rod === 'ženski rod') return 'ženskom rodu'
  return 'srednjem rodu'
}

export const srpskiGramatika: TopicGenerator = {
  slug: 'srpski-gramatika',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      const imenica = izaberi(rng, IMENICE)
      const signature = `srpski-gramatika:rod:${imenica.jednina}`
      if (taken.has(signature)) return null
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Kog je roda imenica „${imenica.jednina}“?`,
        tacan: imenica.rod,
        netacni: RODOVI.filter((rod) => rod !== imenica.rod),
        tvrdnja: (odgovor) => `Imenica „${imenica.jednina}“ pripada ${rodULokativu(odgovor)}.`,
        explanation: `Imenica „${imenica.jednina}“ pripada ${rodULokativu(imenica.rod)}.`,
        hint: 'Pomozi sebi rečima: taj, ta, to.',
        signature,
      })
    }

    if (cfg.difficulty === 2) {
      const imenica = izaberi(rng, IMENICE)
      const izJednine = rng() < 0.5
      const polazna = izJednine ? imenica.jednina : imenica.mnozina
      const tacan = izJednine ? imenica.mnozina : imenica.jednina
      const signature = `srpski-gramatika:broj:${izJednine ? 'j-m' : 'm-j'}:${polazna}`
      if (taken.has(signature)) return null
      const netacni = IMENICE.filter((druga) => druga !== imenica).map((druga) => izJednine ? druga.mnozina : druga.jednina)
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Koji je oblik ${izJednine ? 'množine' : 'jednine'} imenice „${polazna}“?`,
        tacan,
        netacni,
        tvrdnja: (odgovor) => `${izJednine ? 'Množina' : 'Jednina'} imenice „${polazna}“ glasi „${odgovor}“.`,
        explanation: `${polazna} → ${tacan}.`,
        hint: izJednine ? 'Množina označava više bića, predmeta ili pojava.' : 'Jednina označava jedno biće, predmet ili pojavu.',
        signature,
      })
    }

    const recenica = izaberi(rng, RECENICE)
    const traziSubjekat = cfg.difficulty === 3 ? rng() < 0.5 : cfg.difficulty === 4
    if (cfg.difficulty <= 4) {
      const tacan = traziSubjekat ? recenica.subjekat : recenica.predikat
      const signature = `srpski-gramatika:${traziSubjekat ? 'subjekat' : 'predikat'}:${recenica.tekst}`
      if (taken.has(signature)) return null
      const netacni = traziSubjekat
        ? [recenica.predikat, ...recenica.distraktori]
        : [recenica.subjekat, ...recenica.distraktori]
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Šta je ${traziSubjekat ? 'subjekat' : 'predikat'} u rečenici „${recenica.tekst}“?`,
        tacan,
        netacni,
        tvrdnja: (odgovor) => `U rečenici „${recenica.tekst}“ ${traziSubjekat ? 'subjekat' : 'predikat'} je „${odgovor}“.`,
        explanation: `Subjekat je „${recenica.subjekat}“, a predikat „${recenica.predikat}“.`,
        hint: traziSubjekat ? 'Subjekat kazuje ko vrši radnju.' : 'Predikat kazuje šta subjekat radi.',
        signature,
      })
    }

    const tacan = `${recenica.subjekat} — ${recenica.predikat}`
    const signature = `srpski-gramatika:subjekat-predikat:${recenica.tekst}`
    if (taken.has(signature)) return null
    return upakujSrpskiIzbor(cfg, rng, {
      pitanje: `Koji par pravilno navodi subjekat i predikat u rečenici „${recenica.tekst}“?`,
      tacan,
      netacni: [
        `${recenica.predikat} — ${recenica.subjekat}`,
        `${recenica.subjekat} — ${recenica.subjekat}`,
        `${recenica.predikat} — ${recenica.predikat}`,
      ],
      tvrdnja: (odgovor) => `U rečenici „${recenica.tekst}“ par subjekat — predikat glasi: ${odgovor}.`,
      explanation: `Subjekat je „${recenica.subjekat}“, a predikat „${recenica.predikat}“.`,
      hint: 'Prvo pronađi ko vrši radnju, a zatim reč koja označava radnju.',
      signature,
    })
  },
}
