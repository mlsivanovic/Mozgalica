// Generator: rečnik — antonimi, sinonimi, porodice reči i značenja izraza.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor, type SrpskiIzborUlaz } from './srpskiZajednicko.ts'

const ANTONIMI = [
  ['visok', 'nizak'], ['topao', 'hladan'], ['brz', 'spor'], ['svetao', 'taman'], ['širok', 'uzak'],
  ['veseo', 'tužan'], ['pun', 'prazan'], ['mek', 'tvrd'], ['blizu', 'daleko'], ['početak', 'kraj'],
  ['jak', 'slab'], ['težak', 'lak'], ['hrabar', 'plašljiv'], ['nov', 'star'], ['čist', 'prljav'],
  ['dobar', 'loš'], ['isti', 'različit'], ['dug', 'kratak'], ['jeftin', 'skup'], ['bogat', 'siromašan'],
  ['zdrav', 'bolestan'], ['beo', 'crn'], ['istina', 'laž'], ['dan', 'noć'], ['prijatelj', 'neprijatelj'],
  ['ljubav', 'mržnja'], ['gust', 'redak'], ['sladak', 'gorak'], ['plitak', 'dubok'],
  ['darežljiv', 'škrt'], ['strpljiv', 'nestrpljiv'],
] as const

const SINONIMI = [
  ['srećan', 'radostan'], ['brz', 'hitar'], ['pametan', 'mudar'], ['pričati', 'govoriti'], ['dom', 'kuća'],
  ['put', 'staza'], ['hrabar', 'odvažan'], ['čuvati', 'paziti'], ['ljut', 'srdit'], ['poklon', 'dar'],
  ['đak', 'učenik'], ['tuga', 'žalost'], ['vrt', 'bašta'], ['doktor', 'lekar'],
  ['prijatelj', 'drugar'], ['misliti', 'razmišljati'], ['rukovati', 'upravljati'], ['šuma', 'gora'],
  ['lep', 'krasan'], ['briga', 'staranje'], ['jasan', 'očigledan'], ['buka', 'galama'], ['hladnoća', 'studen'],
  ['velik', 'ogroman'], ['radost', 'veselje'], ['lepo', 'divno'], ['mali', 'sićušan'], ['tužan', 'neveseo'],
  ['brzo', 'hitro'], ['star', 'drevan'], ['smešan', 'duhovit'],
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
  { osnova: 'pisati', clan: 'pisac', uljezi: ['pijac', 'pesak', 'pas'] },
  { osnova: 'zub', clan: 'zubni', uljezi: ['zubor', 'zob', 'buba'] },
  { osnova: 'šum', clan: 'šumski', uljezi: ['šala', 'šlem', 'šator'] },
  { osnova: 'put', clan: 'putnik', uljezi: ['ptica', 'pauk', 'peta'] },
  { osnova: 'led', clan: 'leden', uljezi: ['leđa', 'lepak', 'lep'] },
  { osnova: 'drvo', clan: 'drveni', uljezi: ['društvo', 'dva', 'dugme'] },
  { osnova: 'sol', clan: 'slan', uljezi: ['slon', 'sito', 'smer'] },
  { osnova: 'mleko', clan: 'mlečni', uljezi: ['mlin', 'metla', 'more'] },
  { osnova: 'glava', clan: 'glavni', uljezi: ['glina', 'glas', 'guma'] },
  { osnova: 'oko', clan: 'očni', uljezi: ['osa', 'ovca', 'orac'] },
  { osnova: 'vrt', clan: 'vrtlar', uljezi: ['vrat', 'vaza', 'vuk'] },
  { osnova: 'kuća', clan: 'kućni', uljezi: ['kula', 'kum', 'kuka'] },
  { osnova: 'noć', clan: 'noćni', uljezi: ['nos', 'nož', 'nokat'] },
  { osnova: 'hleb', clan: 'hlebni', uljezi: ['hlađenje', 'hrana', 'hram'] },
  { osnova: 'prijatelj', clan: 'prijateljski', uljezi: ['priča', 'prozor', 'ptica'] },
]

const UMALJENICE = [
  ['kuća', 'kućica'], ['knjiga', 'knjižica'], ['kamen', 'kamenčić'], ['cvet', 'cvetić'], ['prozor', 'prozorčić'],
  ['ptica', 'ptičica'], ['zvezda', 'zvezdica'], ['riba', 'ribica'], ['stolica', 'stoličica'], ['torba', 'torbica'],
  ['drvo', 'drvce'], ['reka', 'rečica'], ['mačka', 'mačkica'], ['dete', 'detence'], ['lopta', 'loptica'],
  ['most', 'mostić'], ['sat', 'satić'], ['pas', 'psić'], ['leptir', 'leptirić'], ['olovka', 'olovčica'],
  ['glava', 'glavica'], ['zub', 'zubić'], ['list', 'listić'], ['sunce', 'sunašce'], ['vetar', 'vetrić'],
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
  { izraz: 'mrtav umoran', znacenje: 'veoma iscrpljen', netacni: ['teško bolestan', 'veoma tužan', 'rano se probudio'] },
  { izraz: 'soliti pamet', znacenje: 'deliti neželjene savete', netacni: ['kuvati jelo', 'učiti školu', 'biti veoma pametan'] },
  { izraz: 'obećavati kule i gradove', znacenje: 'davati velika, nerealna obećanja', netacni: ['graditi kuće', 'crtati zgrade', 'putovati svetom'] },
  { izraz: 'gvožđe se kuje dok je vruće', znacenje: 'treba raditi u pravo vreme', netacni: ['praviti metalne predmete', 'loš je kovač', 'čekati zimu'] },
  { izraz: 'upala mu sekira u med', znacenje: 'imao je veliku sreću', netacni: ['izgubio je alat', 'traži pčele', 'radi u šumi'] },
  { izraz: 'mlati praznu slamu', znacenje: 'govori ili radi bez koristi', netacni: ['skuplja seno', 'radi na njivi', 'veoma je umoran'] },
  { izraz: 'preveo ga žedna preko vode', znacenje: 'nasamario ga je', netacni: ['pomogao mu je da pređe reku', 'doneo mu je čašu vode', 'putovao je sa njim'] },
  { izraz: 'kao pas i mačka', znacenje: 'stalno se svađaju', netacni: ['veoma su bliski', 'vole da se igraju', 'trče zajedno'] },
  { izraz: 'bije ga loš glas', znacenje: 'ima lošu reputaciju', netacni: ['glasno peva', 'boli ga grlo', 'neko ga tuče'] },
  { izraz: 'trči pred rudu', znacenje: 'prebrzo donosi odluke', netacni: ['brzo trči', 'bavi se sportom', 'vozi traktor'] },
  { izraz: 'skida zvezde s neba', znacenje: 'čini sve za nekoga', netacni: ['leti u svemir', 'bavi se astronomijom', 'pravi ukrase'] },
  { izraz: 'kupiti mačku u džaku', znacenje: 'uzeti nešto neprovereno', netacni: ['čuvati kućnog ljubimca', 'ići na pijacu', 'pronaći izgubljenu stvar'] },
  { izraz: 'ide mu od ruke', znacenje: 'uspešan je u tome što radi', netacni: ['boli ga ruka', 'traži pomoć', 'igra se loptom'] },
  { izraz: 'graditi kule u vazduhu', znacenje: 'maštati o nemogućim stvarima', netacni: ['graditi visoku zgradu', 'leteti avionom', 'duvati balone'] },
  { izraz: 'pokazati zube', znacenje: 'suprotstaviti se i braniti se', netacni: ['nasmejati se', 'ići kod zubara', 'prati zube ujutru'] },
  { izraz: 'imati leptire u stomaku', znacenje: 'nervozan je zbog nečega', netacni: ['progutao je insekta', 'veoma je gladan', 'boli ga stomak'] },
  { izraz: 'biti na sedmom nebu', znacenje: 'veoma je srećan', netacni: ['putuje avionom', 'leteti zmajem', 'visoko se popeo'] },
  { izraz: 'osećati se kao riba u vodi', znacenje: 'oseća se veoma prijatno', netacni: ['pliva svaki dan', 'živi kraj reke', 'redovno jede ribu'] },
  { izraz: 'prazne priče', znacenje: 'reči bez sadržaja i vrednosti', netacni: ['zanimljive priče', 'domaći iz prirode', 'slikovnice za decu'] },
  { izraz: 'gladan kao vuk', znacenje: 'veoma je gladan', netacni: ['čuva vukove', 'glasno laje', 'živi u šumi'] },
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
