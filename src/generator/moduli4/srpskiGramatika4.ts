// Generator: gramatika 4. razred — zamenice (lice, broj, rod), brojevi,
// služba reči u rečenici i glagolska vremena. Odgovori se ukucaju;
// povremeno tačno/netačno tvrdnja o službi reči.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

interface Zamenica {
  rec: string
  lice: '1.' | '2.' | '3.'
  rod: 'muškog' | 'ženskog' | 'srednjeg' | null
  broj: 'jednina' | 'množina'
  primer: string
}

const ZAMENICE: Zamenica[] = [
  { rec: 'ja', lice: '1.', rod: null, broj: 'jednina', primer: 'Ja svaki dan čitam knjigu.' },
  { rec: 'ti', lice: '2.', rod: null, broj: 'jednina', primer: 'Ti si odlično napisao zadatak.' },
  { rec: 'on', lice: '3.', rod: 'muškog', broj: 'jednina', primer: 'Marko je stigao. On nosi novi ranac.' },
  { rec: 'ona', lice: '3.', rod: 'ženskog', broj: 'jednina', primer: 'Ana je nazvala. Ona je vesela.' },
  { rec: 'ono', lice: '3.', rod: 'srednjeg', broj: 'jednina', primer: 'Pismo je stiglo. Ono je za tebe.' },
  { rec: 'mi', lice: '1.', rod: null, broj: 'množina', primer: 'Mi smo četvrti razred.' },
  { rec: 'vi', lice: '2.', rod: null, broj: 'množina', primer: 'Vi ste lepo nacrtali plakat.' },
  { rec: 'oni', lice: '3.', rod: 'muškog', broj: 'množina', primer: 'Dečaci igraju fudbal. Oni su brzi.' },
  { rec: 'one', lice: '3.', rod: 'ženskog', broj: 'množina', primer: 'Devojčice vežbaju pesmu. One pevaju lepo.' },
  { rec: 'ona', lice: '3.', rod: 'srednjeg', broj: 'množina', primer: 'Deca se igraju. Ona su vesela.' },
]

const LICE_ODGOVORI: Record<'1.' | '2.' | '3.', { tacan: string; prihvaceni: string[] }> = {
  '1.': { tacan: 'prvo', prihvaceni: ['prvi', '1', '1.', 'prvo lice', '1. lice'] },
  '2.': { tacan: 'drugo', prihvaceni: ['drugi', '2', '2.', 'drugo lice', '2. lice'] },
  '3.': { tacan: 'treće', prihvaceni: ['treci', 'treći', '3', '3.', 'treće lice', '3. lice'] },
}

const BROJ_ODGOVORI: Record<'jednina' | 'množina', { tacan: string; prihvaceni: string[] }> = {
  jednina: { tacan: 'jednina', prihvaceni: ['jednine', 'jedninu', 'u jednini', 'jednini'] },
  množina: { tacan: 'množina', prihvaceni: ['množine', 'množinu', 'u množini', 'množini'] },
}

const ROD_ODGOVORI: Record<'muškog' | 'ženskog' | 'srednjeg', { tacan: string; prihvaceni: string[] }> = {
  muškog: { tacan: 'muškog', prihvaceni: ['muški'] },
  ženskog: { tacan: 'ženskog', prihvaceni: ['ženski'] },
  srednjeg: { tacan: 'srednjeg', prihvaceni: ['srednji'] },
}

const BROJEVI = [
  { rec: 'jedan', vrsta: 'osnovni' },
  { rec: 'dva', vrsta: 'osnovni' },
  { rec: 'tri', vrsta: 'osnovni' },
  { rec: 'pet', vrsta: 'osnovni' },
  { rec: 'deset', vrsta: 'osnovni' },
  { rec: 'prvi', vrsta: 'redni' },
  { rec: 'drugi', vrsta: 'redni' },
  { rec: 'treći', vrsta: 'redni' },
  { rec: 'peti', vrsta: 'redni' },
  { rec: 'deseti', vrsta: 'redni' },
]

interface Sluzba {
  recenica: string
  subjekat: string
  predikat: string
  pravi_objekat: string
  atribut_uz_subjekat: string
  atribut_uz_objekat: string
}

const SLUZBA_RECI: Sluzba[] = [
  { recenica: 'Vredni učenik pažljivo čita zanimljivu knjigu.', subjekat: 'učenik', predikat: 'čita', pravi_objekat: 'knjigu', atribut_uz_subjekat: 'Vredni', atribut_uz_objekat: 'zanimljivu' },
  { recenica: 'Mala devojčica peva lepu pesmu.', subjekat: 'devojčica', predikat: 'peva', pravi_objekat: 'pesmu', atribut_uz_subjekat: 'Mala', atribut_uz_objekat: 'lepu' },
  { recenica: 'Stari deda hrani gladnog psa.', subjekat: 'deda', predikat: 'hrani', pravi_objekat: 'psa', atribut_uz_subjekat: 'Stari', atribut_uz_objekat: 'gladnog' },
  { recenica: 'Spretni majstor popravlja pokvareni sat.', subjekat: 'majstor', predikat: 'popravlja', pravi_objekat: 'sat', atribut_uz_subjekat: 'Spretni', atribut_uz_objekat: 'pokvareni' },
  { recenica: 'Brzi dečak šutira šarenu loptu.', subjekat: 'dečak', predikat: 'šutira', pravi_objekat: 'loptu', atribut_uz_subjekat: 'Brzi', atribut_uz_objekat: 'šarenu' },
  { recenica: 'Dobra mama kuva ukusan ručak.', subjekat: 'mama', predikat: 'kuva', pravi_objekat: 'ručak', atribut_uz_subjekat: 'Dobra', atribut_uz_objekat: 'ukusan' },
  { recenica: 'Mladi slikar slika predivnu sliku.', subjekat: 'slikar', predikat: 'slika', pravi_objekat: 'sliku', atribut_uz_subjekat: 'Mladi', atribut_uz_objekat: 'predivnu' },
  { recenica: 'Umoran radnik pije hladnu vodu.', subjekat: 'radnik', predikat: 'pije', pravi_objekat: 'vodu', atribut_uz_subjekat: 'Umoran', atribut_uz_objekat: 'hladnu' },
  { recenica: 'Veseli turista fotografiše staru tvrđavu.', subjekat: 'turista', predikat: 'fotografiše', pravi_objekat: 'tvrđavu', atribut_uz_subjekat: 'Veseli', atribut_uz_objekat: 'staru' },
  { recenica: 'Marljiva pčela sakuplja slatki nektar.', subjekat: 'pčela', predikat: 'sakuplja', pravi_objekat: 'nektar', atribut_uz_subjekat: 'Marljiva', atribut_uz_objekat: 'slatki' },
  { recenica: 'Nasmijana prodavčica pokazuje toplu jaknu.', subjekat: 'prodavčica', predikat: 'pokazuje', pravi_objekat: 'jaknu', atribut_uz_subjekat: 'Nasmijana', atribut_uz_objekat: 'toplu' },
  { recenica: 'Radoznalo dete posmatra živog mrava.', subjekat: 'dete', predikat: 'posmatra', pravi_objekat: 'mrava', atribut_uz_subjekat: 'Radoznalo', atribut_uz_objekat: 'živog' },
]

const GLAGOLSKA_VREMENA = [
  { rec: 'sam učio', vreme: 'prošlo' },
  { rec: 'ćeš čitati', vreme: 'buduće' },
  { rec: 'spava', vreme: 'sadašnje' },
  { rec: 'smo trčali', vreme: 'prošlo' },
  { rec: 'gledate', vreme: 'sadašnje' },
  { rec: 'će pisati', vreme: 'buduće' },
  { rec: 'su igrali', vreme: 'prošlo' },
  { rec: 'igram se', vreme: 'sadašnje' },
  { rec: 'ćeš pevati', vreme: 'buduće' },
  { rec: 'crtamo', vreme: 'sadašnje' },
  { rec: 'ste skakali', vreme: 'prošlo' },
]

// Sve četiri službe koje tražimo u rečenici, sa nazivom za pitanje
const SLUZBE = [
  { kljuc: 'subjekat', naziv: 'subjekta' },
  { kljuc: 'predikat', naziv: 'predikata' },
  { kljuc: 'pravi_objekat', naziv: 'pravog objekta' },
  { kljuc: 'atribut_uz_subjekat', naziv: 'atributa uz subjekat' },
  { kljuc: 'atribut_uz_objekat', naziv: 'atributa uz objekat' },
] as const

export const srpskiGramatika4: TopicGenerator = {
  slug: 'srpski-gramatika-4',
  supportedTypes: ['text', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const kategorija = izaberi(rng, ['lice', 'broj-zamenice', 'rod', 'broj-vrsta', 'sluzba', 'vreme'] as const)

    if (kategorija === 'lice') {
      const zamenica = izaberi(rng, ZAMENICE)
      const signature = `srpski-gramatika-4:lice:${zamenica.rec}:${zamenica.primer}`
      if (taken.has(signature)) return null
      const { tacan, prihvaceni } = LICE_ODGOVORI[zamenica.lice]
      return upakujSrpskiTekst(cfg, {
        pitanje: `Koje lice označava zamenica „${zamenica.rec}“ u rečenici „${zamenica.primer}“? (prvo, drugo ili treće)`,
        tacan,
        prihvaceni,
        explanation: `Zamenica „${zamenica.rec}“ je ${zamenica.lice} lice — ${zamenica.lice === '1.' ? 'govornik' : zamenica.lice === '2.' ? 'sagovornik' : 'osoba o kojoj se govori'}.`,
        hint: 'Razmisli da li se odnosi na govornika, sagovornika ili osobu o kojoj se govori.',
        signature,
      })
    }

    if (kategorija === 'broj-zamenice') {
      const zamenica = izaberi(rng, ZAMENICE)
      const signature = `srpski-gramatika-4:broj-zamenice:${zamenica.rec}:${zamenica.primer}`
      if (taken.has(signature)) return null
      const { tacan, prihvaceni } = BROJ_ODGOVORI[zamenica.broj]
      return upakujSrpskiTekst(cfg, {
        pitanje: `Da li je zamenica „${zamenica.rec}“ u rečenici „${zamenica.primer}“ u jednini ili množini? (upiši)`,
        tacan,
        prihvaceni,
        explanation: `Zamenica „${zamenica.rec}“ je u ${zamenica.broj === 'jednina' ? 'jednini' : 'množini'} — ${zamenica.broj === 'jednina' ? 'menja jednu osobu ili stvar' : 'menji više osoba ili stvari'}.`,
        hint: 'Razmisli da li zamenica zamenjuje jednu ili više osoba.',
        signature,
      })
    }

    if (kategorija === 'rod') {
      const saRodom = ZAMENICE.filter((zamenica) => zamenica.rod !== null)
      const zamenica = izaberi(rng, saRodom)
      const signature = `srpski-gramatika-4:rod:${zamenica.rec}:${zamenica.primer}`
      if (taken.has(signature)) return null
      const { tacan, prihvaceni } = ROD_ODGOVORI[zamenica.rod!]
      return upakujSrpskiTekst(cfg, {
        pitanje: `Kojeg je roda zamenica „${zamenica.rec}“ u rečenici „${zamenica.primer}“? (muškog, ženskog ili srednjeg)`,
        tacan,
        prihvaceni,
        explanation: `Zamenica „${zamenica.rec}“ u ovoj rečenici je ${zamenica.rod} roda — zamenjuje imenicu tog roda.`,
        hint: 'Pogledaj koju imenicu zamenica menja u rečenici.',
        signature,
      })
    }

    if (kategorija === 'broj-vrsta') {
      const broj = izaberi(rng, BROJEVI)
      const signature = `srpski-gramatika-4:broj-vrsta:${broj.rec}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, {
        pitanje: `Da li je broj „${broj.rec}“ osnovni ili redni? (upiši)`,
        tacan: broj.vrsta,
        prihvaceni: [`${broj.vrsta} broj`],
        explanation: `Broj „${broj.rec}“ je ${broj.vrsta} broj — ${broj.vrsta === 'osnovni' ? 'pokazuje koliko nečega ima' : 'pokazuje koje je nešto po redu'}.`,
        hint: broj.vrsta === 'osnovni' ? 'Osnovni brojevi pokazuju količinu: jedan, dva, tri…' : 'Redni brojevi pokazuju redosled: prvi, drugi, treći…',
        signature,
      })
    }

    if (kategorija === 'sluzba') {
      const s = izaberi(rng, SLUZBA_RECI)
      const sluzba = izaberi(rng, SLUZBE)
      const tacan = s[sluzba.kljuc]
      const signature = `srpski-gramatika-4:sluzba:${s.recenica}:${sluzba.kljuc}`
      if (taken.has(signature)) return null

      if (hoceTvrdnju(cfg, rng)) {
        const pogresna = izaberi(rng, SLUZBE.filter((x) => x.kljuc !== sluzba.kljuc))
        return upakujSrpskiTvrdnju(cfg, rng, {
          tvrdnjaTacna: `U rečenici „${s.recenica}“ reč „${tacan}“ vrši službu ${sluzba.naziv}.`,
          tvrdnjaNetacna: `U rečenici „${s.recenica}“ reč „${tacan}“ vrši službu ${pogresna.naziv}.`,
          explanation: `Reč „${tacan}“ vrši službu ${sluzba.naziv}.`,
          hint: null,
          signature,
        })
      }

      return upakujSrpskiTekst(cfg, {
        pitanje: `Koja reč u rečenici vrši službu ${sluzba.naziv}?\n„${s.recenica}“\n(upiši tu reč)`,
        tacan,
        explanation: `Reč „${tacan}“ vrši službu ${sluzba.naziv}.`,
        hint: sluzba.kljuc === 'subjekat'
          ? 'Subjekat pokazuje vršioca radnje (ko ili šta radi).'
          : sluzba.kljuc === 'predikat'
            ? 'Predikat pokazuje radnju koju subjekat vrši.'
            : sluzba.kljuc === 'pravi_objekat'
              ? 'Objekat je predmet radnje — odgovara na pitanje koga ili šta.'
              : 'Atribut je dodatak imenici koji je bliže opisuje.',
        signature,
      })
    }

    const glagol = izaberi(rng, GLAGOLSKA_VREMENA)
    const signature = `srpski-gramatika-4:vreme:${glagol.rec}`
    if (taken.has(signature)) return null
    return upakujSrpskiTekst(cfg, {
      pitanje: `U kom glagolskom vremenu je oblik „${glagol.rec}“? (prošlo, sadašnje ili buduće)`,
      tacan: glagol.vreme,
      explanation: `Glagolski oblik „${glagol.rec}“ je u ${glagol.vreme}m vremenu — ${glagol.vreme === 'prošlo' ? 'radnja se već dogodila' : glagol.vreme === 'sadašnje' ? 'radnja se dešava sada' : 'radnja će se tek dogoditi'}.`,
      hint: glagol.vreme === 'prošlo' ? 'Radnja se već dogodila.' : glagol.vreme === 'sadašnje' ? 'Radnja se dešava sada.' : 'Radnja će se tek dogoditi.',
      signature,
    })
  },
}
