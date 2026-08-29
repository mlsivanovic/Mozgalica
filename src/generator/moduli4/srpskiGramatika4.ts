// Generator: promenljivost reči i rečenični članovi za 4. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

const PROMENLJIVOST = [
  { rec: 'devojčica', primeri: 'devojčice, devojčici', odgovor: 'promenljiva' },
  { rec: 'zelen', primeri: 'zelena, zeleno, zeleni', odgovor: 'promenljiva' },
  { rec: 'čitati', primeri: 'čitam, čitaš, čitaju', odgovor: 'promenljiva' },
  { rec: 'ona', primeri: 'nje, njoj, njom', odgovor: 'promenljiva' },
  { rec: 'juče', primeri: 'uvek ostaje juče', odgovor: 'nepromenljiva' },
  { rec: 'brzo', primeri: 'uvek ostaje brzo', odgovor: 'nepromenljiva' },
  { rec: 'i', primeri: 'uvek ostaje i', odgovor: 'nepromenljiva' },
  { rec: 'ispred', primeri: 'uvek ostaje ispred', odgovor: 'nepromenljiva' },
] as const

const VRSTA_I_SLUZBA = [
  { recenica: 'Mila pažljivo čita knjigu.', rec: 'Mila', vrsta: 'imenica', sluzba: 'subjekat' },
  { recenica: 'Mila pažljivo čita knjigu.', rec: 'čita', vrsta: 'glagol', sluzba: 'predikat' },
  { recenica: 'Mila pažljivo čita knjigu.', rec: 'knjigu', vrsta: 'imenica', sluzba: 'objekat' },
  { recenica: 'Vesela devojčica peva.', rec: 'Vesela', vrsta: 'pridev', sluzba: 'atribut' },
  { recenica: 'Oni danas uređuju učionicu.', rec: 'Oni', vrsta: 'lična zamenica', sluzba: 'subjekat' },
  { recenica: 'Marko nosi težak ranac.', rec: 'težak', vrsta: 'pridev', sluzba: 'atribut' },
] as const

type KljucSluzbe = 'subjekat' | 'predikat' | 'objekat' | 'atribut' | 'mesto' | 'vreme' | 'nacin'
const RECENICE: Array<{ recenica: string; odgovori: Record<KljucSluzbe, string | null> }> = [
  { recenica: 'Vredni učenik danas pažljivo čita zanimljivu knjigu u biblioteci.', odgovori: { subjekat: 'učenik', predikat: 'čita', objekat: 'knjigu', atribut: 'Vredni', mesto: 'u biblioteci', vreme: 'danas', nacin: 'pažljivo' } },
  { recenica: 'Mala devojčica juče je glasno pevala pesmu na priredbi.', odgovori: { subjekat: 'devojčica', predikat: 'je pevala', objekat: 'pesmu', atribut: 'Mala', mesto: 'na priredbi', vreme: 'juče', nacin: 'glasno' } },
  { recenica: 'Spretni majstor sutra će pažljivo popraviti sat u radionici.', odgovori: { subjekat: 'majstor', predikat: 'će popraviti', objekat: 'sat', atribut: 'Spretni', mesto: 'u radionici', vreme: 'sutra', nacin: 'pažljivo' } },
  { recenica: 'Marljiva pčela svakog jutra neumorno sakuplja nektar na livadi.', odgovori: { subjekat: 'pčela', predikat: 'sakuplja', objekat: 'nektar', atribut: 'Marljiva', mesto: 'na livadi', vreme: 'svakog jutra', nacin: 'neumorno' } },
]

const NAZIVI: Record<KljucSluzbe, string> = {
  subjekat: 'subjekta', predikat: 'predikata', objekat: 'objekta', atribut: 'atributa',
  mesto: 'priloške odredbe za mesto', vreme: 'priloške odredbe za vreme', nacin: 'priloške odredbe za način',
}

const IZOSTAVLJENI = [
  { recenica: 'Čitam zanimljivu knjigu.', odgovor: 'ja' }, { recenica: 'Sutra idemo na izlet.', odgovor: 'mi' },
  { recenica: 'Pažljivo slušate učiteljicu.', odgovor: 'vi' }, { recenica: 'Uredno je napisala zadatak.', odgovor: 'ona' },
  { recenica: 'Brzo su stigli do škole.', odgovor: 'oni' }, { recenica: 'Hoćeš li doći sutra?', odgovor: 'ti' },
]

const VREMENA = [
  { predikat: 'je pročitao', vreme: 'prošlo' }, { predikat: 'piše', vreme: 'sadašnje' },
  { predikat: 'će putovati', vreme: 'buduće' }, { predikat: 'smo vežbali', vreme: 'prošlo' },
  { predikat: 'crtaju', vreme: 'sadašnje' }, { predikat: 'će pevati', vreme: 'buduće' },
] as const

export const srpskiGramatika4: TopicGenerator = {
  slug: 'srpski-gramatika-4', supportedTypes: ['text', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const vrsta = izaberi(rng, ['promenljivost', 'vrsta-sluzba', 'sluzba', 'izostavljeni-subjekat', 'vreme-predikata'] as const)
    if (vrsta === 'promenljivost') {
      const p = izaberi(rng, PROMENLJIVOST); const signature = `srpski-gramatika-4:promenljivost:${p.rec}`
      if (taken.has(signature)) return null
      const pitanje = `Da li je reč „${p.rec}“ promenljiva ili nepromenljiva?`
      if (hoceTvrdnju(cfg, rng)) return upakujSrpskiTvrdnju(cfg, rng, { tvrdnjaTacna: `Reč „${p.rec}“ je ${p.odgovor}.`,
        tvrdnjaNetacna: `Reč „${p.rec}“ je ${p.odgovor === 'promenljiva' ? 'nepromenljiva' : 'promenljiva'}.`,
        explanation: `Reč „${p.rec}“ je ${p.odgovor}: ${p.primeri}.`, hint: null, signature })
      return upakujSrpskiTekst(cfg, { pitanje, tacan: p.odgovor, explanation: `Reč „${p.rec}“ je ${p.odgovor}: ${p.primeri}.`,
        hint: 'Proveri da li reč može menjati oblik.', signature })
    }
    if (vrsta === 'vrsta-sluzba') {
      const p = izaberi(rng, VRSTA_I_SLUZBA); const traziVrstu = rng() < 0.5
      const signature = `srpski-gramatika-4:vrsta-sluzba:${p.recenica}:${p.rec}:${traziVrstu ? 'vrsta' : 'sluzba'}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, { pitanje: `${traziVrstu ? 'Kojoj vrsti reči pripada' : 'Koju službu u rečenici vrši'} reč „${p.rec}“ u rečenici „${p.recenica}“?`,
        tacan: traziVrstu ? p.vrsta : p.sluzba, explanation: `„${p.rec}“ je ${p.vrsta}, a u ovoj rečenici ima službu ${p.sluzba === 'subjekat' ? 'subjekta' : p.sluzba === 'predikat' ? 'predikata' : p.sluzba === 'objekat' ? 'objekta' : 'atributa'}.`,
        hint: 'Vrsta reči govori šta je reč, a služba šta radi u konkretnoj rečenici.', signature })
    }
    if (vrsta === 'izostavljeni-subjekat') {
      const p = izaberi(rng, IZOSTAVLJENI); const signature = `srpski-gramatika-4:izostavljeni-subjekat:${p.recenica}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, { pitanje: `Ko je izostavljeni subjekat u rečenici „${p.recenica}“?`, tacan: p.odgovor,
        explanation: `Po obliku predikata zaključujemo da je izostavljeni subjekat „${p.odgovor}“.`, hint: 'Pogledaj lice i broj predikata.', signature })
    }
    if (vrsta === 'vreme-predikata') {
      const p = izaberi(rng, VREMENA); const signature = `srpski-gramatika-4:vreme-predikata:${p.predikat}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, { pitanje: `U kom vremenu je predikat „${p.predikat}“?`, tacan: p.vreme,
        prihvaceni: [`${p.vreme} vreme`], explanation: `Predikat „${p.predikat}“ je u ${p.vreme}m vremenu.`, hint: 'Odredi kada se radnja dešava.', signature })
    }
    const p = izaberi(rng, RECENICE); const kljuc = izaberi(rng, Object.keys(NAZIVI) as KljucSluzbe[])
    const tacan = p.odgovori[kljuc]; if (tacan === null) return null
    const signature = `srpski-gramatika-4:sluzba:${kljuc}:${p.recenica}`
    if (taken.has(signature)) return null
    if (hoceTvrdnju(cfg, rng)) {
      const drugi = izaberi(rng, (Object.keys(NAZIVI) as KljucSluzbe[]).filter((k) => k !== kljuc && p.odgovori[k] !== null))
      return upakujSrpskiTvrdnju(cfg, rng, { tvrdnjaTacna: `U rečenici „${p.recenica}“ izraz „${tacan}“ ima službu ${NAZIVI[kljuc]}.`,
        tvrdnjaNetacna: `U rečenici „${p.recenica}“ izraz „${tacan}“ ima službu ${NAZIVI[drugi]}.`, explanation: `„${tacan}“ ima službu ${NAZIVI[kljuc]}.`, hint: null, signature })
    }
    return upakujSrpskiTekst(cfg, { pitanje: `Koja reč ili grupa reči u rečenici „${p.recenica}“ ima službu ${NAZIVI[kljuc]}?`, tacan,
      explanation: `„${tacan}“ ima službu ${NAZIVI[kljuc]}.`, hint: 'Postavi odgovarajuće pitanje uz predikat i pažljivo pročitaj celu rečenicu.', signature })
  },
}
