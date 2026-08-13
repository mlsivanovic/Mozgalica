// Generator: rečnik — antonimi, sinonimi, porodice reči i značenja izraza.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor, type SrpskiIzborUlaz } from './srpskiZajednicko.ts'

const ANTONIMI = [
  ['visok', 'nizak'], ['topao', 'hladan'], ['brz', 'spor'], ['svetao', 'taman'], ['širok', 'uzak'],
  ['veseo', 'tužan'], ['pun', 'prazan'], ['mek', 'tvrd'], ['blizu', 'daleko'], ['početak', 'kraj'],
] as const

const SINONIMI = [
  ['srećan', 'radostan'], ['brz', 'hitar'], ['pametan', 'mudar'], ['pričati', 'govoriti'], ['dom', 'kuća'],
  ['put', 'staza'], ['hrabar', 'odvažan'], ['čuvati', 'paziti'], ['ljut', 'srdit'], ['poklon', 'dar'],
] as const

const PORODICE = [
  { osnova: 'rad', clan: 'radnik', uljezi: ['voda', 'radost', 'grad'] },
  { osnova: 'škola', clan: 'školski', uljezi: ['školjka', 'polje', 'sto'] },
  { osnova: 'voda', clan: 'vodeni', uljezi: ['vođa', 'vodič', 'voz'] },
  { osnova: 'zima', clan: 'zimski', uljezi: ['zemlja', 'zid', 'zmaj'] },
  { osnova: 'riba', clan: 'ribar', uljezi: ['ribizla', 'bunar', 'čamac'] },
  { osnova: 'cvet', clan: 'cvetni', uljezi: ['svet', 'vetar', 'boja'] },
  { osnova: 'igra', clan: 'igrač', uljezi: ['igla', 'grad', 'račun'] },
  { osnova: 'list', clan: 'listić', uljezi: ['lisica', 'slika', 'pismo'] },
  { osnova: 'sunce', clan: 'sunčan', uljezi: ['sundjer', 'san', 'mesec'] },
  { osnova: 'more', clan: 'morski', uljezi: ['mora', 'most', 'barka'] },
]

const UMALJENICE = [
  ['kuća', 'kućica'], ['knjiga', 'knjižica'], ['kamen', 'kamenčić'], ['cvet', 'cvetić'], ['prozor', 'prozorčić'],
  ['ptica', 'ptičica'], ['zvezda', 'zvezdica'], ['riba', 'ribica'], ['stolica', 'stoličica'], ['torba', 'torbica'],
] as const

const IZRAZI = [
  { izraz: 'ima zlatne ruke', znacenje: 'veoma je vešt', netacni: ['nosi zlatan nakit', 'ruke su mu hladne', 'ne voli da radi'] },
  { izraz: 'brz je kao munja', znacenje: 'veoma je brz', netacni: ['plaši se oluje', 'glasan je', 'veoma je spor'] },
  { izraz: 'pao mu je kamen sa srca', znacenje: 'osetio je olakšanje', netacni: ['povredio je nogu', 'pronašao je kamen', 'veoma se naljutio'] },
  { izraz: 'drži jezik za zubima', znacenje: 'ćuti i čuva tajnu', netacni: ['govori veoma glasno', 'boli ga zub', 'uči strani jezik'] },
  { izraz: 'zasukao je rukave', znacenje: 'spremio se da radi', netacni: ['kupio je košulju', 'završio je posao', 'smrzle su mu se ruke'] },
  { izraz: 'srce mu je na mestu', znacenje: 'dobar je i plemenit', netacni: ['lekar ga pregleda', 'izgubio se', 'veoma je brz'] },
  { izraz: 'otvorio je četvore oči', znacenje: 'pažljivo je gledao', netacni: ['odmah je zaspao', 'stavio je naočare', 'nije ništa primetio'] },
  { izraz: 'reč mu je zapela u grlu', znacenje: 'nije uspeo da progovori', netacni: ['bio je veoma gladan', 'glasno je pevao', 'naučio je novu reč'] },
  { izraz: 'leti od sreće', znacenje: 'veoma je srećan', netacni: ['putuje avionom', 'boji se visine', 'veoma je umoran'] },
  { izraz: 'spava kao top', znacenje: 'spava veoma čvrsto', netacni: ['spava veoma kratko', 'čuje svaki šum', 'spava pored igračke'] },
]

function izborZa(cfg: GeneratorConfig, rng: Rng): SrpskiIzborUlaz {
  if (cfg.difficulty === 1) {
    const [rec, tacan] = izaberi(rng, ANTONIMI)
    return {
      pitanje: `Koja reč ima suprotno značenje od reči „${rec}“?`, tacan,
      netacni: ANTONIMI.map((par) => par[1]).filter((x) => x !== tacan),
      tvrdnja: (odgovor) => `Reč „${odgovor}“ ima suprotno značenje od reči „${rec}“.`,
      explanation: `Reči „${rec}“ i „${tacan}“ su antonimi.`,
      hint: 'Traži reč koja znači potpuno suprotno.', signature: `srpski-recnik:antonim:${rec}`,
    }
  }
  if (cfg.difficulty === 2) {
    const [rec, tacan] = izaberi(rng, SINONIMI)
    return {
      pitanje: `Koja reč ima isto ili slično značenje kao „${rec}“?`, tacan,
      netacni: SINONIMI.map((par) => par[1]).filter((x) => x !== tacan),
      tvrdnja: (odgovor) => `Reč „${odgovor}“ ima isto ili slično značenje kao „${rec}“.`,
      explanation: `Reči „${rec}“ i „${tacan}“ su sinonimi.`,
      hint: 'Sinonimi su reči istog ili sličnog značenja.', signature: `srpski-recnik:sinonim:${rec}`,
    }
  }
  if (cfg.difficulty === 3) {
    const primer = izaberi(rng, PORODICE)
    return {
      pitanje: `Koja reč pripada porodici reči „${primer.osnova}“?`, tacan: primer.clan,
      netacni: primer.uljezi,
      tvrdnja: (odgovor) => `Reč „${odgovor}“ pripada porodici reči „${primer.osnova}“.`,
      explanation: `„${primer.osnova}“ i „${primer.clan}“ imaju zajednički koren i povezano značenje.`,
      hint: 'Slična slova nisu dovoljna — reči moraju imati i povezano značenje.', signature: `srpski-recnik:porodica:${primer.osnova}`,
    }
  }
  if (cfg.difficulty === 4) {
    const [rec, tacan] = izaberi(rng, UMALJENICE)
    return {
      pitanje: `Koja je umanjenica od reči „${rec}“?`, tacan,
      netacni: UMALJENICE.map((par) => par[1]).filter((x) => x !== tacan),
      tvrdnja: (odgovor) => `Reč „${odgovor}“ je umanjenica od reči „${rec}“.`,
      explanation: `Umanjenica od „${rec}“ glasi „${tacan}“.`,
      hint: 'Umanjenica često označava nešto manje ili od milja.', signature: `srpski-recnik:umanjenica:${rec}`,
    }
  }
  const primer = izaberi(rng, IZRAZI)
  return {
    pitanje: `Šta znači izraz „${primer.izraz}“?`, tacan: primer.znacenje, netacni: primer.netacni,
    tvrdnja: (odgovor) => `Izraz „${primer.izraz}“ znači: ${odgovor}.`,
    explanation: `Značenje izraza „${primer.izraz}“ je: ${primer.znacenje}.`,
    hint: 'Ne tumači svaku reč doslovno; razmisli o poruci celog izraza.', signature: `srpski-recnik:izraz:${primer.izraz}`,
  }
}

export const srpskiRecnik: TopicGenerator = {
  slug: 'srpski-recnik',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const ulaz = izborZa(cfg, rng)
    if (taken.has(ulaz.signature)) return null
    return upakujSrpskiIzbor(cfg, rng, ulaz)
  },
}
