// Generator: rečnik — antonimi, sinonimi, porodice reči i umanjenice se
// ukucaju; značenja izraza se proveravaju tačno/netačno tvrdnjama.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst, upakujSrpskiTvrdnju } from './srpskiZajednicko.ts'

// [reč, tačan odgovor, …prihvaćene varijante (npr. ženski oblik prideva)]
const ANTONIMI: Array<[string, string, ...string[]]> = [
  ['visok', 'nizak', 'niska'], ['topao', 'hladan', 'hladna'], ['brz', 'spor', 'spora'],
  ['svetao', 'taman', 'tamna'], ['širok', 'uzak', 'uzka'], ['veseo', 'tužan', 'tužna'],
  ['pun', 'prazan', 'prazna'], ['mek', 'tvrd', 'tvrda'], ['blizu', 'daleko'],
  ['početak', 'kraj'], ['jak', 'slab', 'slaba'], ['težak', 'lak', 'laka'],
  ['hrabar', 'plašljiv', 'plašljiva'], ['nov', 'star', 'stara'], ['čist', 'prljav', 'prljava'],
  ['dobar', 'loš', 'loša'], ['isti', 'različit', 'različita'], ['dug', 'kratak', 'kratka'],
  ['jeftin', 'skup', 'skupa'], ['bogat', 'siromašan', 'siromašna'],
  ['zdrav', 'bolestan', 'bolesna'], ['beo', 'crn', 'crna'], ['istina', 'laž'],
  ['dan', 'noć'], ['prijatelj', 'neprijatelj'], ['ljubav', 'mržnja'],
  ['gust', 'redak', 'retka'], ['sladak', 'gorak', 'gorka'], ['plitak', 'dubok', 'duboka'],
  ['darežljiv', 'škrt', 'škrta'], ['strpljiv', 'nestrpljiv', 'nestrpljiva'],
]

const SINONIMI: Array<[string, string, ...string[]]> = [
  ['srećan', 'radostan', 'radostna'], ['brz', 'hitar', 'hitra'], ['pametan', 'mudar', 'mudra'],
  ['pričati', 'govoriti'], ['dom', 'kuća'], ['put', 'staza'],
  ['hrabar', 'odvažan', 'odvažna'], ['čuvati', 'paziti'], ['ljut', 'srdit', 'srdita'],
  ['poklon', 'dar'], ['đak', 'učenik'], ['tuga', 'žalost'],
  ['vrt', 'bašta'], ['doktor', 'lekar'], ['prijatelj', 'drugar'],
  ['misliti', 'razmišljati'], ['rukovati', 'upravljati'], ['šuma', 'gora'],
  ['lep', 'krasan', 'krasna'], ['briga', 'staranje'], ['jasan', 'očigledan', 'očigledna'],
  ['buka', 'galama'], ['hladnoća', 'studen'], ['velik', 'ogroman', 'ogromna'],
  ['radost', 'veselje'], ['lepo', 'divno'], ['mali', 'sićušan', 'sićušna'],
  ['tužan', 'neveseo', 'nevesela'], ['brzo', 'hitro'], ['star', 'drevan', 'drevna'],
  ['smešan', 'duhovit', 'duhovita'],
]

const PORODICE = [
  { osnova: 'rad', clan: 'radnik' },
  { osnova: 'škola', clan: 'školski' },
  { osnova: 'voda', clan: 'vodeni' },
  { osnova: 'zima', clan: 'zimski' },
  { osnova: 'riba', clan: 'ribar' },
  { osnova: 'cvet', clan: 'cvetni' },
  { osnova: 'igra', clan: 'igrač' },
  { osnova: 'list', clan: 'listić' },
  { osnova: 'sunce', clan: 'sunčan' },
  { osnova: 'more', clan: 'morski' },
  { osnova: 'pisati', clan: 'pisac' },
  { osnova: 'zub', clan: 'zubni' },
  { osnova: 'šum', clan: 'šumski' },
  { osnova: 'put', clan: 'putnik' },
  { osnova: 'led', clan: 'leden' },
  { osnova: 'drvo', clan: 'drveni' },
  { osnova: 'mleko', clan: 'mlečni' },
  { osnova: 'glava', clan: 'glavni' },
  { osnova: 'oko', clan: 'očni' },
  { osnova: 'vrt', clan: 'vrtlar' },
  { osnova: 'kuća', clan: 'kućni' },
  { osnova: 'noć', clan: 'noćni' },
  { osnova: 'hleb', clan: 'hlebni' },
  { osnova: 'prijatelj', clan: 'prijateljski' },
]

const UMALJENICE: Array<[string, string]> = [
  ['kuća', 'kućica'], ['knjiga', 'knjižica'], ['kamen', 'kamenčić'], ['cvet', 'cvetić'],
  ['prozor', 'prozorčić'], ['ptica', 'ptičica'], ['zvezda', 'zvezdica'], ['riba', 'ribica'],
  ['stolica', 'stoličica'], ['torba', 'torbica'], ['drvo', 'drvce'], ['reka', 'rečica'],
  ['mačka', 'mačkica'], ['dete', 'detence'], ['lopta', 'loptica'], ['most', 'mostić'],
  ['sat', 'satić'], ['pas', 'psić'], ['leptir', 'leptirić'], ['olovka', 'olovčica'],
  ['glava', 'glavica'], ['zub', 'zubić'], ['list', 'listić'], ['sunce', 'sunašce'],
  ['vetar', 'vetrić'],
]

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

export const srpskiRecnik: TopicGenerator = {
  slug: 'srpski-recnik',
  supportedTypes: ['text', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    // Značenje izraza ne može da se ukuca kratkim odgovorom, pa je taj tip
    // pitanja uvek tačno/netačno tvrdnja.
    const kategorija = cfg.type === 'truefalse'
      ? 'izraz'
      : cfg.type === 'text'
        ? izaberi(rng, ['antonim', 'sinonim', 'porodica', 'umanjenica'] as const)
        : izaberi(rng, ['antonim', 'sinonim', 'porodica', 'umanjenica', 'izraz'] as const)

    if (kategorija === 'izraz') {
      const primer = izaberi(rng, IZRAZI)
      const signature = `srpski-recnik:izraz:${primer.izraz}`
      if (taken.has(signature)) return null
      const netacno = izaberi(rng, primer.netacni)
      return upakujSrpskiTvrdnju(cfg, rng, {
        tvrdnjaTacna: `Izraz „${primer.izraz}“ znači: ${primer.znacenje}.`,
        tvrdnjaNetacna: `Izraz „${primer.izraz}“ znači: ${netacno}.`,
        explanation: `Značenje izraza „${primer.izraz}“ je: ${primer.znacenje}.`,
        hint: 'Ne tumači svaku reč doslovno; razmisli o poruci celog izraza.',
        signature,
      })
    }

    if (kategorija === 'antonim') {
      const [rec, ...tacni] = izaberi(rng, ANTONIMI)
      const signature = `srpski-recnik:antonim:${rec}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, {
        pitanje: `Napiši antonim (reč suprotnog značenja) reči „${rec}“.`,
        tacan: tacni[0],
        prihvaceni: tacni.slice(1),
        explanation: `Reči „${rec}“ i „${tacni[0]}“ su antonimi.`,
        hint: 'Traži reč koja znači potpuno suprotno.',
        signature,
      })
    }

    if (kategorija === 'sinonim') {
      const [rec, ...tacni] = izaberi(rng, SINONIMI)
      const signature = `srpski-recnik:sinonim:${rec}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, {
        pitanje: `Napiši sinonim (reč istog ili sličnog značenja) reči „${rec}“.`,
        tacan: tacni[0],
        prihvaceni: tacni.slice(1),
        explanation: `Reči „${rec}“ i „${tacni[0]}“ su sinonimi.`,
        hint: 'Sinonimi su reči istog ili sličnog značenja.',
        signature,
      })
    }

    if (kategorija === 'porodica') {
      const primer = izaberi(rng, PORODICE)
      const signature = `srpski-recnik:porodica:${primer.osnova}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, {
        pitanje: `Od koje reči je izvedena reč „${primer.clan}“? (upiši tu reč)`,
        tacan: primer.osnova,
        explanation: `Reč „${primer.clan}“ izvedena je od reči „${primer.osnova}“ — imaju zajednički koren i povezano značenje.`,
        hint: 'Traži reč sa kojom naša reč deli koren i značenje.',
        signature,
      })
    }

    const [rec, tacan] = izaberi(rng, UMALJENICE)
    const signature = `srpski-recnik:umanjenica:${rec}`
    if (taken.has(signature)) return null
    return upakujSrpskiTekst(cfg, {
      pitanje: `Napiši umanjenicu od reči „${rec}“.`,
      tacan,
      explanation: `Umanjenica od „${rec}“ glasi „${tacan}“.`,
      hint: 'Umanjenica označava nešto manje ili od milja.',
      signature,
    })
  },
}
