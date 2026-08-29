// Generator: značenje reči predviđeno programom za 3. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst, upakujSrpskiTvrdnju } from './srpskiZajednicko.ts'

const ANTONIMI: Array<[string, string, ...string[]]> = [
  ['visok', 'nizak', 'niska'], ['topao', 'hladan', 'hladna'], ['brz', 'spor', 'spora'], ['svetao', 'taman', 'tamna'],
  ['širok', 'uzak', 'uska'], ['veseo', 'tužan', 'tužna'], ['pun', 'prazan', 'prazna'], ['blizu', 'daleko'],
  ['jak', 'slab', 'slaba'], ['hrabar', 'plašljiv', 'plašljiva'], ['čist', 'prljav', 'prljava'], ['dug', 'kratak', 'kratka'],
]
const SINONIMI: Array<[string, string, ...string[]]> = [
  ['srećan', 'radostan'], ['brz', 'hitar', 'hitra'], ['pametan', 'mudar', 'mudra'], ['pričati', 'govoriti'],
  ['dom', 'kuća'], ['put', 'staza'], ['hrabar', 'odvažan', 'odvažna'], ['poklon', 'dar'],
  ['đak', 'učenik'], ['vrt', 'bašta'], ['doktor', 'lekar'], ['prijatelj', 'drugar'],
]
const UMALJENICE: Array<[string, string]> = [
  ['kuća', 'kućica'], ['knjiga', 'knjižica'], ['kamen', 'kamenčić'], ['cvet', 'cvetić'], ['prozor', 'prozorčić'],
  ['ptica', 'ptičica'], ['zvezda', 'zvezdica'], ['riba', 'ribica'], ['lopta', 'loptica'], ['most', 'mostić'],
]
const UVECANICE: Array<[string, string]> = [
  ['kuća', 'kućerina'], ['knjiga', 'knjižurina'], ['nos', 'nosina'], ['glava', 'glavurda'], ['ruka', 'ručerda'],
  ['mačka', 'mačketina'], ['pas', 'psećina'], ['kamen', 'kamenčina'], ['torba', 'torbetina'], ['brdo', 'brdina'],
]
const ZNACENJA = [
  { rec: 'topao', osnovno: 'Topao čaj me je zagrejao.', preneseno: 'Dočekao nas je topao osmeh.' },
  { rec: 'oštar', osnovno: 'Nož je oštar.', preneseno: 'Njegov odgovor je bio oštar.' },
  { rec: 'sladak', osnovno: 'Med je sladak.', preneseno: 'Taj dečak je baš sladak.' },
  { rec: 'hladan', osnovno: 'Sok je hladan.', preneseno: 'Njegov odgovor je bio hladan.' },
  { rec: 'vedar', osnovno: 'Dan je vedar.', preneseno: 'Milan je vedar dečak.' },
  { rec: 'težak', osnovno: 'Kofer je veoma težak.', preneseno: 'Pred nama je težak zadatak.' },
  { rec: 'mek', osnovno: 'Jastuk je mek.', preneseno: 'Deda je mek prema unucima.' },
  { rec: 'zlatan', osnovno: 'Prsten je zlatan.', preneseno: 'Naš komšija je zlatan čovek.' },
]

export const srpskiRecnik: TopicGenerator = {
  slug: 'srpski-recnik', supportedTypes: ['text', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const vrsta = cfg.type === 'truefalse'
      ? 'znacenje'
      : cfg.type === 'text'
        ? izaberi(rng, ['antonim', 'sinonim', 'umanjenica', 'uvecanica'] as const)
        : izaberi(rng, ['antonim', 'sinonim', 'umanjenica', 'uvecanica', 'znacenje'] as const)
    if (vrsta === 'znacenje') {
      const p = izaberi(rng, ZNACENJA); const preneseno = rng() < 0.5
      const signature = `srpski-recnik:znacenje-reci:${p.rec}:${preneseno ? 'preneseno' : 'osnovno'}`
      if (taken.has(signature)) return null
      return upakujSrpskiTvrdnju(cfg, rng, {
        tvrdnjaTacna: `U rečenici „${preneseno ? p.preneseno : p.osnovno}“ reč „${p.rec}“ ima ${preneseno ? 'preneseno' : 'osnovno'} značenje.`,
        tvrdnjaNetacna: `U rečenici „${preneseno ? p.preneseno : p.osnovno}“ reč „${p.rec}“ ima ${preneseno ? 'osnovno' : 'preneseno'} značenje.`,
        explanation: `U toj rečenici reč „${p.rec}“ ima ${preneseno ? 'preneseno' : 'osnovno'} značenje.`,
        hint: 'Proveri da li reč označava nešto doslovno ili slikovito.', signature,
      })
    }
    const skup = vrsta === 'antonim' ? ANTONIMI : vrsta === 'sinonim' ? SINONIMI : vrsta === 'umanjenica' ? UMALJENICE : UVECANICE
    const [rec, ...odgovori] = izaberi(rng, skup)
    const signature = `srpski-recnik:${vrsta}:${rec}`
    if (taken.has(signature)) return null
    const naziv = vrsta === 'antonim' ? 'antonim' : vrsta === 'sinonim' ? 'sinonim' : vrsta === 'umanjenica' ? 'umanjenicu' : 'uvećanicu'
    return upakujSrpskiTekst(cfg, {
      pitanje: `Napiši ${naziv} reči „${rec}“.`, tacan: odgovori[0], prihvaceni: odgovori.slice(1),
      explanation: `${naziv[0].toUpperCase()}${naziv.slice(1)} reči „${rec}“ je „${odgovori[0]}“.`,
      hint: vrsta === 'antonim' ? 'Traži reč suprotnog značenja.' : vrsta === 'sinonim' ? 'Traži reč istog ili sličnog značenja.' : vrsta === 'umanjenica' ? 'Umanjenica označava nešto manje ili od milja.' : 'Uvećanica označava nešto veliko ili pojačano.',
      signature,
    })
  },
}
