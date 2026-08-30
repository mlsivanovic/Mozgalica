// Generator: gramatičke kategorije i rečenica predviđene programom za 2. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

type Rod = 'muški' | 'ženski' | 'srednji'
type Vreme = 'sadašnje' | 'prošlo' | 'buduće'
type VrstaRecenice = 'obaveštajna' | 'upitna' | 'uzvična' | 'zapovedna'

const IMENICE = [
  { jednina: 'dečak', mnozina: 'dečaci', rod: 'muški' },
  { jednina: 'prozor', mnozina: 'prozori', rod: 'muški' },
  { jednina: 'sto', mnozina: 'stolovi', rod: 'muški' },
  { jednina: 'devojčica', mnozina: 'devojčice', rod: 'ženski' },
  { jednina: 'knjiga', mnozina: 'knjige', rod: 'ženski' },
  { jednina: 'škola', mnozina: 'škole', rod: 'ženski' },
  { jednina: 'selo', mnozina: 'sela', rod: 'srednji' },
  { jednina: 'jezero', mnozina: 'jezera', rod: 'srednji' },
] as const

const VREMENA = [
  { oblik: 'čita', vreme: 'sadašnje' }, { oblik: 'piše', vreme: 'sadašnje' },
  { oblik: 'crta', vreme: 'sadašnje' }, { oblik: 'trči', vreme: 'sadašnje' },
  { oblik: 'je čitao', vreme: 'prošlo' }, { oblik: 'je pisala', vreme: 'prošlo' },
  { oblik: 'je crtao', vreme: 'prošlo' }, { oblik: 'su trčali', vreme: 'prošlo' },
  { oblik: 'će čitati', vreme: 'buduće' }, { oblik: 'će pisati', vreme: 'buduće' },
  { oblik: 'će crtati', vreme: 'buduće' }, { oblik: 'će trčati', vreme: 'buduće' },
] as const

const OBLICI = [
  { oblik: 'čita', vrsta: 'potvrdni' }, { oblik: 'piše', vrsta: 'potvrdni' },
  { oblik: 'peva', vrsta: 'potvrdni' }, { oblik: 'crta', vrsta: 'potvrdni' },
  { oblik: 'ne čita', vrsta: 'odrični' }, { oblik: 'ne piše', vrsta: 'odrični' },
  { oblik: 'ne peva', vrsta: 'odrični' }, { oblik: 'ne crta', vrsta: 'odrični' },
] as const

const RECENICE: Array<{ tekst: string; vrsta: VrstaRecenice }> = [
  { tekst: 'Dečak čita knjigu.', vrsta: 'obaveštajna' },
  { tekst: 'Ptica sedi na grani.', vrsta: 'obaveštajna' },
  { tekst: 'Sutra idemo u park.', vrsta: 'obaveštajna' },
  { tekst: 'Da li čitaš knjigu?', vrsta: 'upitna' },
  { tekst: 'Gde je tvoja sveska?', vrsta: 'upitna' },
  { tekst: 'Hoćeš li da se igramo?', vrsta: 'upitna' },
  { tekst: 'Kakav lep dan!', vrsta: 'uzvična' },
  { tekst: 'Ura, pobeđujemo!', vrsta: 'uzvična' },
  { tekst: 'Jao, pala je kiša!', vrsta: 'uzvična' },
  { tekst: 'Otvori svesku.', vrsta: 'zapovedna' },
  { tekst: 'Dođi ovamo.', vrsta: 'zapovedna' },
  { tekst: 'Pažljivo slušaj.', vrsta: 'zapovedna' },
]

const OBLIK_RECENICE = [
  { tekst: 'Mina čita priču.', oblik: 'potvrdna' },
  { tekst: 'Ptice lete visoko.', oblik: 'potvrdna' },
  { tekst: 'Sunce sija.', oblik: 'potvrdna' },
  { tekst: 'Luka crta brod.', oblik: 'potvrdna' },
  { tekst: 'Mina ne čita priču.', oblik: 'odrična' },
  { tekst: 'Ptice ne lete visoko.', oblik: 'odrična' },
  { tekst: 'Sunce ne sija.', oblik: 'odrična' },
  { tekst: 'Luka ne crta brod.', oblik: 'odrična' },
] as const

const SLOVA = [
  { slovo: 'a', vrsta: 'samoglasnik' }, { slovo: 'e', vrsta: 'samoglasnik' },
  { slovo: 'i', vrsta: 'samoglasnik' }, { slovo: 'o', vrsta: 'samoglasnik' },
  { slovo: 'u', vrsta: 'samoglasnik' },
  { slovo: 'b', vrsta: 'suglasnik' }, { slovo: 'k', vrsta: 'suglasnik' },
  { slovo: 'm', vrsta: 'suglasnik' }, { slovo: 's', vrsta: 'suglasnik' },
  { slovo: 't', vrsta: 'suglasnik' }, { slovo: 'n', vrsta: 'suglasnik' },
  { slovo: 'p', vrsta: 'suglasnik' },
] as const

const SLOGOVI = [
  { rec: 'mama', broj: 2 }, { rec: 'tata', broj: 2 }, { rec: 'voda', broj: 2 },
  { rec: 'ruka', broj: 2 }, { rec: 'škola', broj: 2 }, { rec: 'kuća', broj: 2 },
  { rec: 'pas', broj: 1 }, { rec: 'sto', broj: 1 }, { rec: 'dan', broj: 1 },
  { rec: 'cvet', broj: 1 }, { rec: 'banana', broj: 3 }, { rec: 'učitelj', broj: 3 },
] as const

const RODOVI: Rod[] = ['muški', 'ženski', 'srednji']
const VREMENA_NAZIVI: Vreme[] = ['sadašnje', 'prošlo', 'buduće']
const VRSTE_RECENICE: VrstaRecenice[] = ['obaveštajna', 'upitna', 'uzvična', 'zapovedna']

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
  return upakujSrpskiTekst(cfg, {
    pitanje: ulaz.pitanje, tacan: ulaz.tacan, prihvaceni: ulaz.prihvaceni,
    explanation: ulaz.objasnjenje, hint: ulaz.hint, signature: ulaz.signature,
  })
}

export const srpskiGramatika2: TopicGenerator = {
  slug: 'srpski-gramatika-2', supportedTypes: ['text', 'truefalse', 'numeric'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.type === 'numeric' || (cfg.type === 'auto' && rng() < 0.12)) {
      const p = izaberi(rng, SLOGOVI)
      const signature = `srpski-gramatika-2:slogovi:${p.rec}`
      if (taken.has(signature)) return null
      return {
        type: 'numeric', text: `Koliko slogova ima reč „${p.rec}“?`, options: null,
        correct: { value: p.broj }, explanation: `Reč „${p.rec}“ ima ${p.broj} ${p.broj === 1 ? 'slog' : 'sloga'}.`,
        hint: 'Izgovori reč naglas i prebroj otvaranja usta.',
        points: 5, topicSlug: cfg.topicSlug, difficulty: 5, signature,
      }
    }
    const vrsta = izaberi(rng, [
      'imenica-rod', 'imenica-broj', 'vreme', 'glagol-oblik', 'recenica-vrsta', 'recenica-oblik', 'glas',
    ] as const)
    if (vrsta === 'imenica-rod' || vrsta === 'imenica-broj') {
      const p = izaberi(rng, IMENICE)
      if (vrsta === 'imenica-rod') {
        const signature = `srpski-gramatika-2:imenica-rod:${p.jednina}`
        if (taken.has(signature)) return null
        return pitanjeKategorije(cfg, rng, {
          pitanje: `Kog je roda imenica „${p.jednina}“?`, tacan: p.rod, prihvaceni: [`${p.rod} rod`],
          objasnjenje: `Imenica „${p.jednina}“ je ${p.rod} rod.`, hint: 'Pomozi se rečima taj, ta, to.',
          signature, moguci: RODOVI, tvrdnja: (odgovor) => `Imenica „${p.jednina}“ je ${odgovor} rod.`,
        })
      }
      const kaMnozini = rng() < 0.5
      const polazni = kaMnozini ? p.jednina : p.mnozina
      const tacan = kaMnozini ? p.mnozina : p.jednina
      const signature = `srpski-gramatika-2:imenica-broj:${polazni}:${tacan}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, {
        pitanje: `Napiši ${kaMnozini ? 'množinu' : 'jedninu'} imenice „${polazni}“.`, tacan,
        explanation: `${polazni} → ${tacan}.`,
        hint: 'Obrati pažnju da li se govori o jednom ili o više bića ili predmeta.', signature,
      })
    }
    if (vrsta === 'vreme') {
      const p = izaberi(rng, VREMENA)
      const signature = `srpski-gramatika-2:vreme:${p.oblik}`
      if (taken.has(signature)) return null
      return pitanjeKategorije(cfg, rng, {
        pitanje: `U kom je vremenu glagol „${p.oblik}“: sadašnjem, prošlom ili budućem?`,
        tacan: p.vreme, prihvaceni: [`${p.vreme} vreme`],
        objasnjenje: `Glagol „${p.oblik}“ je u ${p.vreme}m vremenu.`,
        hint: 'Sadašnje se dešava sada, prošlo se desilo, a buduće tek će se desiti.',
        signature, moguci: VREMENA_NAZIVI,
        tvrdnja: (odgovor) => `Glagol „${p.oblik}“ je u ${odgovor}m vremenu.`,
      })
    }
    if (vrsta === 'glagol-oblik') {
      const p = izaberi(rng, OBLICI)
      const signature = `srpski-gramatika-2:glagol-oblik:${p.oblik}`
      if (taken.has(signature)) return null
      return pitanjeKategorije(cfg, rng, {
        pitanje: `Da li je glagol „${p.oblik}“ potvrdni ili odrični oblik?`,
        tacan: p.vrsta, prihvaceni: [p.vrsta === 'potvrdni' ? 'potvrdan' : 'odričan'],
        objasnjenje: `Glagol „${p.oblik}“ je ${p.vrsta} oblik.`,
        hint: 'Odrični oblik ima rečcu ne.',
        signature, moguci: ['potvrdni', 'odrični'],
        tvrdnja: (odgovor) => `Glagol „${p.oblik}“ je ${odgovor} oblik.`,
      })
    }
    if (vrsta === 'recenica-vrsta') {
      const p = izaberi(rng, RECENICE)
      const signature = `srpski-gramatika-2:recenica-vrsta:${p.tekst}`
      if (taken.has(signature)) return null
      return pitanjeKategorije(cfg, rng, {
        pitanje: `Koja je ovo vrsta rečenice: „${p.tekst}“?`,
        tacan: p.vrsta,
        objasnjenje: `Rečenica „${p.tekst}“ je ${p.vrsta}.`,
        hint: 'Pogledaj znak na kraju i da li rečenica obaveštava, pita, zapoveda ili izražava osećanje.',
        signature, moguci: VRSTE_RECENICE,
        tvrdnja: (odgovor) => `Rečenica „${p.tekst}“ je ${odgovor}.`,
      })
    }
    if (vrsta === 'recenica-oblik') {
      const p = izaberi(rng, OBLIK_RECENICE)
      const signature = `srpski-gramatika-2:recenica-oblik:${p.tekst}`
      if (taken.has(signature)) return null
      return pitanjeKategorije(cfg, rng, {
        pitanje: `Da li je rečenica „${p.tekst}“ potvrdna ili odrična?`,
        tacan: p.oblik,
        objasnjenje: `Rečenica „${p.tekst}“ je ${p.oblik}.`,
        hint: 'Odrična rečenica ima rečcu ne.',
        signature, moguci: ['potvrdna', 'odrična'],
        tvrdnja: (odgovor) => `Rečenica „${p.tekst}“ je ${odgovor}.`,
      })
    }
    const p = izaberi(rng, SLOVA)
    const signature = `srpski-gramatika-2:glas:${p.slovo}`
    if (taken.has(signature)) return null
    return pitanjeKategorije(cfg, rng, {
      pitanje: `Da li je slovo „${p.slovo}“ samoglasnik ili suglasnik?`,
      tacan: p.vrsta,
      objasnjenje: `Slovo „${p.slovo}“ je ${p.vrsta}.`,
      hint: 'Samoglasnici su a, e, i, o, u.',
      signature, moguci: ['samoglasnik', 'suglasnik'],
      tvrdnja: (odgovor) => `Slovo „${p.slovo}“ je ${odgovor}.`,
    })
  },
}
