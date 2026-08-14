// Generator: gramatika 4. razred — vrste reči (zamenice, brojevi), služba reči (subjekat, predikat, atribut, objekat) i glagolska vremena/lica.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from '../moduli/srpskiZajednicko.ts'

const ZAMENICE = [
  { rec: 'ja', lice: '1. lice', broj: 'jednina' },
  { rec: 'ti', lice: '2. lice', broj: 'jednina' },
  { rec: 'on', lice: '3. lice muškog roda', broj: 'jednina' },
  { rec: 'ona', lice: '3. lice ženskog roda', broj: 'jednina' },
  { rec: 'ono', lice: '3. lice srednjeg roda', broj: 'jednina' },
  { rec: 'mi', lice: '1. lice', broj: 'množina' },
  { rec: 'vi', lice: '2. lice', broj: 'množina' },
  { rec: 'oni', lice: '3. lice muškog roda', broj: 'množina' },
  { rec: 'one', lice: '3. lice ženskog roda', broj: 'množina' },
  { rec: 'ona', lice: '3. lice srednjeg roda', broj: 'množina' },
]

const BROJEVI = [
  { rec: 'jedan', vrsta: 'osnovni', tip: 'broj' },
  { rec: 'dva', vrsta: 'osnovni', tip: 'broj' },
  { rec: 'tri', vrsta: 'osnovni', tip: 'broj' },
  { rec: 'pet', vrsta: 'osnovni', tip: 'broj' },
  { rec: 'deset', vrsta: 'osnovni', tip: 'broj' },
  { rec: 'prvi', vrsta: 'redni', tip: 'broj' },
  { rec: 'drugi', vrsta: 'redni', tip: 'broj' },
  { rec: 'treći', vrsta: 'redni', tip: 'broj' },
  { rec: 'peti', vrsta: 'redni', tip: 'broj' },
  { rec: 'deseti', vrsta: 'redni', tip: 'broj' },
]

const SLUZBA_RECI = [
  { recenica: 'Vredni učenik pažljivo čita zanimljivu knjigu.', subjekat: 'učenik', predikat: 'čita', pravi_objekat: 'knjigu', atribut_uz_subjekat: 'Vredni', atribut_uz_objekat: 'zanimljivu' },
  { recenica: 'Mala devojčica peva lepu pesmu.', subjekat: 'devojčica', predikat: 'peva', pravi_objekat: 'pesmu', atribut_uz_subjekat: 'Mala', atribut_uz_objekat: 'lepu' },
  { recenica: 'Stari deda hrani gladnog psa.', subjekat: 'deda', predikat: 'hrani', pravi_objekat: 'psa', atribut_uz_subjekat: 'Stari', atribut_uz_objekat: 'gladnog' },
  { recenica: 'Spretni majstor popravlja pokvareni sat.', subjekat: 'majstor', predikat: 'popravlja', pravi_objekat: 'sat', atribut_uz_subjekat: 'Spretni', atribut_uz_objekat: 'pokvareni' },
  { recenica: 'Brzi dečak šutira šarenu loptu.', subjekat: 'dečak', predikat: 'šutira', pravi_objekat: 'loptu', atribut_uz_subjekat: 'Brzi', atribut_uz_objekat: 'šarenu' },
  { recenica: 'Dobra mama kuva ukusan ručak.', subjekat: 'mama', predikat: 'kuva', pravi_objekat: 'ručak', atribut_uz_subjekat: 'Dobra', atribut_uz_objekat: 'ukusan' },
  { recenica: 'Mladi slikar slika predivnu sliku.', subjekat: 'slikar', predikat: 'slika', pravi_objekat: 'sliku', atribut_uz_subjekat: 'Mladi', atribut_uz_objekat: 'predivnu' },
  { recenica: 'Umoran radnik pije hladnu vodu.', subjekat: 'radnik', predikat: 'pije', pravi_objekat: 'vodu', atribut_uz_subjekat: 'Umoran', atribut_uz_objekat: 'hladnu' },
]

const GLAGOLSKA_VREMENA = [
  { rec: 'sam učio', vreme: 'prošlo', lice: '1. lice', broj: 'jednina' },
  { rec: 'ćeš čitati', vreme: 'buduće', lice: '2. lice', broj: 'jednina' },
  { rec: 'spava', vreme: 'sadašnje', lice: '3. lice', broj: 'jednina' },
  { rec: 'smo trčali', vreme: 'prošlo', lice: '1. lice', broj: 'množina' },
  { rec: 'gledate', vreme: 'sadašnje', lice: '2. lice', broj: 'množina' },
  { rec: 'će pisati', vreme: 'buduće', lice: '3. lice', broj: 'množina' },
  { rec: 'su igrali', vreme: 'prošlo', lice: '3. lice', broj: 'množina' },
  { rec: 'igram se', vreme: 'sadašnje', lice: '1. lice', broj: 'jednina' },
  { rec: 'ćeš pevati', vreme: 'buduće', lice: '2. lice', broj: 'jednina' },
  { rec: 'crtamo', vreme: 'sadašnje', lice: '1. lice', broj: 'množina' },
  { rec: 'ste skakali', vreme: 'prošlo', lice: '2. lice', broj: 'množina' },
]

export const srpskiGramatika4: TopicGenerator = {
  slug: 'srpski-gramatika-4',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      // Zamenice i brojevi
      const tip = izaberi(rng, ['zamenice', 'brojevi'])
      if (tip === 'zamenice') {
        const zamenica = izaberi(rng, ZAMENICE)
        const signature = `srpski-gramatika-4:zamenica:${zamenica.rec}`
        if (taken.has(signature)) return null
        return upakujSrpskiIzbor(cfg, rng, {
          pitanje: `Kojoj vrsti reči pripada reč „${zamenica.rec}“?`,
          tacan: 'lična zamenica',
          netacni: ['imenica', 'glagol', 'pridev'],
          tvrdnja: (odgovor) => `Reč „${zamenica.rec}“ je ${odgovor}.`,
          explanation: `Reč „${zamenica.rec}“ je lična zamenica.`,
          hint: 'Ove reči zamenjuju imena bića i predmeta.',
          signature,
        })
      } else {
        const broj = izaberi(rng, BROJEVI)
        const signature = `srpski-gramatika-4:broj:${broj.rec}`
        if (taken.has(signature)) return null
        return upakujSrpskiIzbor(cfg, rng, {
          pitanje: `Kakav je po vrsti broj „${broj.rec}“?`,
          tacan: broj.vrsta,
          netacni: broj.vrsta === 'osnovni' ? ['redni', 'zbirni', 'razlomački'] : ['osnovni', 'zbirni', 'razlomački'],
          tvrdnja: (odgovor) => `Broj „${broj.rec}“ je ${odgovor} broj.`,
          explanation: `Broj „${broj.rec}“ je ${broj.vrsta} broj.`,
          hint: broj.vrsta === 'osnovni' ? 'Ovaj broj pokazuje koliko nečega ima (količinu).' : 'Ovaj broj pokazuje koje je nešto po redu.',
          signature,
        })
      }
    }

    if (cfg.difficulty === 2) {
      // Zamenice (lice i broj) ili glagolska vremena (samo vreme)
      const zamenica = izaberi(rng, ZAMENICE)
      const signature = `srpski-gramatika-4:zamenica-lice-broj:${zamenica.rec}`
      if (taken.has(signature)) return null
      
      const netacni = ZAMENICE.filter(z => z.rec !== zamenica.rec).map(z => `${z.lice}, ${z.broj}`)
      // remove duplicates from netacni
      const uniqueNetacni = Array.from(new Set(netacni)).filter(n => n !== `${zamenica.lice}, ${zamenica.broj}`).slice(0, 3)

      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Koje lice i broj označava lična zamenica „${zamenica.rec}“?`,
        tacan: `${zamenica.lice}, ${zamenica.broj}`,
        netacni: uniqueNetacni,
        tvrdnja: (odgovor) => `Lična zamenica „${zamenica.rec}“ označava ${odgovor}.`,
        explanation: `Lična zamenica „${zamenica.rec}“ označava ${zamenica.lice}, ${zamenica.broj}.`,
        hint: 'Razmisli da li se odnosi na tebe (1. lice), sagovornika (2. lice) ili nekog trećeg (3. lice), kao i da li je jedna osoba ili više njih.',
        signature,
      })
    }

    if (cfg.difficulty === 3) {
      // Glagolska vremena
      const glagol = izaberi(rng, GLAGOLSKA_VREMENA)
      const signature = `srpski-gramatika-4:glagol-vreme:${glagol.rec}`
      if (taken.has(signature)) return null

      const svaVremena = ['prošlo', 'sadašnje', 'buduće']
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `U kom vremenu je glagol „${glagol.rec}“?`,
        tacan: glagol.vreme,
        netacni: svaVremena.filter(v => v !== glagol.vreme),
        tvrdnja: (odgovor) => `Glagol „${glagol.rec}“ je u ${odgovor}m vremenu.`,
        explanation: `Glagol „${glagol.rec}“ označava radnju u ${glagol.vreme}m vremenu.`,
        hint: glagol.vreme === 'prošlo' ? 'Radnja se već dogodila.' : glagol.vreme === 'sadašnje' ? 'Radnja se dešava sada.' : 'Radnja će se tek dogoditi.',
        signature,
      })
    }

    if (cfg.difficulty === 4) {
      // Služba reči: subjekat i predikat
      const s = izaberi(rng, SLUZBA_RECI)
      const traziSubjekat = rng() < 0.5
      const signature = `srpski-gramatika-4:sluzba-sp:${s.recenica}:${traziSubjekat ? 's' : 'p'}`
      if (taken.has(signature)) return null

      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Koja reč u rečenici vrši službu ${traziSubjekat ? 'subjekta' : 'predikata'}?\n„${s.recenica}“`,
        tacan: traziSubjekat ? s.subjekat : s.predikat,
        netacni: traziSubjekat ? [s.predikat, s.pravi_objekat, s.atribut_uz_subjekat] : [s.subjekat, s.pravi_objekat, s.atribut_uz_objekat],
        tvrdnja: (odgovor) => `U rečenici „${s.recenica}“ ${traziSubjekat ? 'subjekat' : 'predikat'} je „${odgovor}“.`,
        explanation: `${traziSubjekat ? 'Subjekat' : 'Predikat'} u ovoj rečenici je „${traziSubjekat ? s.subjekat : s.predikat}“.`,
        hint: traziSubjekat ? 'Subjekat pokazuje vršioca radnje (ko ili šta radi).' : 'Predikat pokazuje radnju koju subjekat vrši (šta radi subjekat).',
        signature,
      })
    }

    // Nivo 5: Atribut i objekat
    const s = izaberi(rng, SLUZBA_RECI)
    const traziAtribut = rng() < 0.5
    const signature = `srpski-gramatika-4:sluzba-ao:${s.recenica}:${traziAtribut ? 'a' : 'o'}`
    if (taken.has(signature)) return null

    if (traziAtribut) {
      const kojiAtribut = rng() < 0.5 ? 'uz subjekat' : 'uz objekat'
      const tacan = kojiAtribut === 'uz subjekat' ? s.atribut_uz_subjekat : s.atribut_uz_objekat
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Koja reč u rečenici vrši službu atributa ${kojiAtribut}?\n„${s.recenica}“`,
        tacan,
        netacni: [s.subjekat, s.predikat, s.pravi_objekat, kojiAtribut === 'uz subjekat' ? s.atribut_uz_objekat : s.atribut_uz_subjekat].filter(x => x !== tacan).slice(0, 3),
        tvrdnja: (odgovor) => `Reč „${odgovor}“ vrši službu atributa ${kojiAtribut}.`,
        explanation: `Atribut ${kojiAtribut} u ovoj rečenici je „${tacan}“.`,
        hint: 'Atribut je dodatak imenici koji je bliže opisuje.',
        signature,
      })
    } else {
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Koja reč u rečenici vrši službu pravog objekta?\n„${s.recenica}“`,
        tacan: s.pravi_objekat,
        netacni: [s.subjekat, s.predikat, s.atribut_uz_objekat],
        tvrdnja: (odgovor) => `Reč „${odgovor}“ vrši službu pravog objekta.`,
        explanation: `Pravi objekat u ovoj rečenici je „${s.pravi_objekat}“.`,
        hint: 'Objekat je predmet radnje, trpi radnju na sebi. Odgovara na pitanje Koga ili Šta.',
        signature,
      })
    }
  },
}
