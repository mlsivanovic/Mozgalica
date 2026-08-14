// Generator: gramatika — rod i broj imenica, subjekat i predikat.
// Odgovori se ukucaju; povremeno se umesto toga ponudi tačno/netačno tvrdnja.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from './srpskiZajednicko.ts'

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
}

const RECENICE: Recenica[] = [
  { tekst: 'Mala ptica peva na grani.', subjekat: 'ptica', predikat: 'peva' },
  { tekst: 'Marko pažljivo čita knjigu.', subjekat: 'Marko', predikat: 'čita' },
  { tekst: 'Visoki bor šumi na vetru.', subjekat: 'bor', predikat: 'šumi' },
  { tekst: 'Vredne pčele skupljaju polen.', subjekat: 'pčele', predikat: 'skupljaju' },
  { tekst: 'Stari sat glasno otkucava.', subjekat: 'sat', predikat: 'otkucava' },
  { tekst: 'Ana i Iva uređuju pano.', subjekat: 'Ana i Iva', predikat: 'uređuju' },
  { tekst: 'Žuto lišće pada na stazu.', subjekat: 'lišće', predikat: 'pada' },
  { tekst: 'Naš pas čuva dvorište.', subjekat: 'pas', predikat: 'čuva' },
  { tekst: 'Brzi voz prolazi kroz tunel.', subjekat: 'voz', predikat: 'prolazi' },
  { tekst: 'Jutarnje sunce greje livadu.', subjekat: 'sunce', predikat: 'greje' },
  { tekst: 'Učenici trećeg razreda pevaju.', subjekat: 'učenici', predikat: 'pevaju' },
  { tekst: 'Beli oblaci prekrivaju nebo.', subjekat: 'oblaci', predikat: 'prekrivaju' },
  { tekst: 'Hrabar vatrogasac gasi vatru.', subjekat: 'vatrogasac', predikat: 'gasi' },
  { tekst: 'Vesela deca trče parkom.', subjekat: 'deca', predikat: 'trče' },
  { tekst: 'Moja baka pravi pitu.', subjekat: 'baka', predikat: 'pravi' },
  { tekst: 'Mina lepo svira violinu.', subjekat: 'Mina', predikat: 'svira' },
  { tekst: 'Zelena žaba skače u baru.', subjekat: 'žaba', predikat: 'skače' },
  { tekst: 'Stari ribar plete mrežu.', subjekat: 'ribar', predikat: 'plete' },
  { tekst: 'Hladna kiša neprestano pada.', subjekat: 'kiša', predikat: 'pada' },
  { tekst: 'Moj brat vozi bicikl.', subjekat: 'brat', predikat: 'vozi' },
  { tekst: 'Luka i Ivan grade kulu.', subjekat: 'Luka i Ivan', predikat: 'grade' },
  { tekst: 'Šareni leptir leti svuda.', subjekat: 'leptir', predikat: 'leti' },
  { tekst: 'Drveni čamac plovi rekom.', subjekat: 'čamac', predikat: 'plovi' },
  { tekst: 'Mali miš gricka sir.', subjekat: 'miš', predikat: 'gricka' },
  { tekst: 'Zlatni ključ otvara vrata.', subjekat: 'ključ', predikat: 'otvara' },
]

const RODOVI: Rod[] = ['muški rod', 'ženski rod', 'srednji rod']

function rodULokativu(rod: Rod): string {
  if (rod === 'muški rod') return 'muškom rodu'
  if (rod === 'ženski rod') return 'ženskom rodu'
  return 'srednjem rodu'
}

// Kratki oblik roda za ukucavanje („ženski“), sa prirodnijim varijantama
const ROD_ODGOVORI: Record<Rod, { tacan: string; prihvaceni: string[] }> = {
  'muški rod': { tacan: 'muški', prihvaceni: ['muški rod', 'muškog'] },
  'ženski rod': { tacan: 'ženski', prihvaceni: ['ženski rod', 'ženskog'] },
  'srednji rod': { tacan: 'srednji', prihvaceni: ['srednji rod', 'srednjeg'] },
}

export const srpskiGramatika: TopicGenerator = {
  slug: 'srpski-gramatika',
  supportedTypes: ['text', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const vrsta = izaberi(rng, ['rod', 'broj', 'clan-subjekat', 'clan-predikat'] as const)

    if (vrsta === 'rod') {
      const imenica = izaberi(rng, IMENICE)
      const signature = `srpski-gramatika:rod:${imenica.jednina}`
      if (taken.has(signature)) return null
      if (hoceTvrdnju(cfg, rng)) {
        const pogresanRod = izaberi(rng, RODOVI.filter((rod) => rod !== imenica.rod))
        return upakujSrpskiTvrdnju(cfg, rng, {
          tvrdnjaTacna: `Imenica „${imenica.jednina}“ je ${rodULokativu(imenica.rod)}.`,
          tvrdnjaNetacna: `Imenica „${imenica.jednina}“ je ${rodULokativu(pogresanRod)}.`,
          explanation: `Imenica „${imenica.jednina}“ pripada ${rodULokativu(imenica.rod)} (pomozi se rečju: taj, ta, to).`,
          hint: null,
          signature,
        })
      }
      const { tacan, prihvaceni } = ROD_ODGOVORI[imenica.rod]
      return upakujSrpskiTekst(cfg, {
        pitanje: `Kog je roda imenica „${imenica.jednina}“? (upiši: muški, ženski ili srednji)`,
        tacan,
        prihvaceni,
        explanation: `Imenica „${imenica.jednina}“ je ${imenica.rod}.`,
        hint: 'Pomozi sebi rečima: taj, ta, to.',
        signature,
      })
    }

    if (vrsta === 'broj') {
      const imenica = izaberi(rng, IMENICE)
      const traziMnozinu = rng() < 0.5
      const polazna = traziMnozinu ? imenica.jednina : imenica.mnozina
      const tacan = traziMnozinu ? imenica.mnozina : imenica.jednina
      const signature = `srpski-gramatika:broj:${traziMnozinu ? 'j-m' : 'm-j'}:${polazna}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, {
        pitanje: `Napiši ${traziMnozinu ? 'množinu' : 'jedninu'} imenice „${polazna}“.`,
        tacan,
        explanation: `${polazna} → ${tacan}.`,
        hint: traziMnozinu ? 'Množina označava više bića, predmeta ili pojava.' : 'Jednina označava jedno biće, predmet ili pojavu.',
        signature,
      })
    }

    const recenica = izaberi(rng, RECENICE)
    const traziSubjekat = vrsta === 'clan-subjekat'
    const tacan = traziSubjekat ? recenica.subjekat : recenica.predikat
    const signature = `srpski-gramatika:${traziSubjekat ? 'subjekat' : 'predikat'}:${recenica.tekst}`
    if (taken.has(signature)) return null

    if (hoceTvrdnju(cfg, rng)) {
      const pogresan = traziSubjekat ? recenica.predikat : recenica.subjekat
      return upakujSrpskiTvrdnju(cfg, rng, {
        tvrdnjaTacna: `U rečenici „${recenica.tekst}“ ${traziSubjekat ? 'subjekat' : 'predikat'} je „${tacan}“.`,
        tvrdnjaNetacna: `U rečenici „${recenica.tekst}“ ${traziSubjekat ? 'subjekat' : 'predikat'} je „${pogresan}“.`,
        explanation: `Subjekat je „${recenica.subjekat}“, a predikat „${recenica.predikat}“.`,
        hint: null,
        signature,
      })
    }

    return upakujSrpskiTekst(cfg, {
      pitanje: `Šta je ${traziSubjekat ? 'subjekat' : 'predikat'} u rečenici „${recenica.tekst}“? (upiši tu reč)`,
      tacan,
      explanation: `Subjekat je „${recenica.subjekat}“, a predikat „${recenica.predikat}“.`,
      hint: traziSubjekat ? 'Subjekat kazuje ko vrši radnju.' : 'Predikat kazuje šta subjekat radi.',
      signature,
    })
  },
}
