// Generator: čitanje i razumevanje — kratki originalni tekstovi i pitanja sa jednoznačnim odgovorom.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from './srpskiZajednicko.ts'

interface Prica {
  id: string
  tekst: string
  ko: string
  gde: string
  predmet: string
  radnja: string
  razlog: string
  ishod: string
  naslov: string
}

const PRICE: Prica[] = [
  { id: 'mina-biblioteka', tekst: 'Mina je posle škole otišla u biblioteku. Vratila je pročitanu knjigu i izabrala atlas o životinjama jer priprema plakat. Bibliotekarka joj je pokazala policu sa enciklopedijama. Mina je pronašla sve potrebne podatke.', ko: 'Mina', gde: 'u biblioteci', predmet: 'atlas o životinjama', radnja: 'pronašla je podatke za plakat', razlog: 'pripremala je plakat o životinjama', ishod: 'pronašla je sve potrebne podatke', naslov: 'Minino istraživanje u biblioteci' },
  { id: 'luka-kisa', tekst: 'Luka je krenuo na trening kada je počela jaka kiša. Setio se da u rancu ima sklopivi kišobran. Otvorio ga je i nastavio putem, pa je u salu stigao suv i na vreme.', ko: 'Luka', gde: 'na putu do treninga', predmet: 'sklopivi kišobran', radnja: 'otvorio je kišobran i nastavio putem', razlog: 'počela je jaka kiša', ishod: 'stigao je suv i na vreme', naslov: 'Kišobran u rancu' },
  { id: 'ana-sadnica', tekst: 'Ana je u školskom dvorištu primetila mladu sadnicu nagnutu od vetra. Donela je drveni štap i mekom trakom pažljivo vezala stablo. Sledećeg jutra sadnica je stajala uspravno.', ko: 'Ana', gde: 'u školskom dvorištu', predmet: 'drveni štap i meku traku', radnja: 'učvrstila je mladu sadnicu', razlog: 'sadnica se nagnula od vetra', ishod: 'sadnica je ponovo stajala uspravno', naslov: 'Pomoć mladoj sadnici' },
  { id: 'vuk-pas', tekst: 'Vuk je ispred prodavnice ugledao psa sa crvenom ogrlicom. Na ogrlici je pročitao broj telefona i pozvao vlasnicu. Sačekao je pored psa dok ona nije stigla, a zatim se zadovoljan vratio kući.', ko: 'Vuk', gde: 'ispred prodavnice', predmet: 'crvenu ogrlicu sa brojem telefona', radnja: 'pozvao je vlasnicu psa', razlog: 'pas je bio bez vlasnika', ishod: 'pas se vratio vlasnici', naslov: 'Pas sa crvenom ogrlicom' },
  { id: 'iva-kolac', tekst: 'Iva je želela da iznenadi baku voćnim kolačem. Pažljivo je pročitala recept, odmerila sastojke i zamolila tatu da uključi rernu. Kada je baka stigla, kuća je mirisala na jabuke i cimet.', ko: 'Iva', gde: 'u kuhinji', predmet: 'recept za voćni kolač', radnja: 'napravila je voćni kolač', razlog: 'želela je da iznenadi baku', ishod: 'baka je dočekana mirisnim kolačem', naslov: 'Iznenađenje za baku' },
  { id: 'filip-most', tekst: 'Filip je od kartona pravio most za školski projekat. Prvi most se srušio pod težinom igračaka, pa je dodao trouglaste oslonce. Drugi pokušaj je uspeo i most je izdržao sve autiće.', ko: 'Filip', gde: 'kod kuće za radnim stolom', predmet: 'kartonski most', radnja: 'dodao je trouglaste oslonce', razlog: 'prvi most se srušio', ishod: 'novi most je izdržao sve autiće', naslov: 'Čvršći most' },
  { id: 'sara-park', tekst: 'Sara je u parku videla praznu flašu pored klupe. Podigla ju je i odnela do žutog kontejnera za plastiku. Njena drugarica je zatim sakupila još dve plastične čaše, pa je travnjak ostao čist.', ko: 'Sara', gde: 'u parku', predmet: 'praznu plastičnu flašu', radnja: 'odnela je flašu u kontejner za plastiku', razlog: 'želela je da park ostane čist', ishod: 'travnjak je ostao čist', naslov: 'Čist park' },
  { id: 'ognjen-sat', tekst: 'Ognjenov budilnik nije zazvonio jer se baterija ispraznila. Kada je video koliko je sati, brzo se spremio, ali nije preskočio doručak. Tata ga je odvezao do škole i Ognjen je stigao pre početka časa.', ko: 'Ognjen', gde: 'kod kuće pred polazak u školu', predmet: 'budilnik sa praznom baterijom', radnja: 'brzo se spremio za školu', razlog: 'budilnik nije zazvonio', ishod: 'stigao je pre početka časa', naslov: 'Jutro bez budilnika' },
  { id: 'dunja-pismo', tekst: 'Dunja je pronašla pismo svoje drugarice koja se preselila. Pročitala ga je dva puta, zatim uzela papir u boji i napisala odgovor. U kovertu je dodala i crtež njihovog omiljenog drveta.', ko: 'Dunja', gde: 'u svojoj sobi', predmet: 'pismo drugarice', radnja: 'napisala je odgovor i dodala crtež', razlog: 'želela je da odgovori drugarici', ishod: 'pripremila je pismo za slanje', naslov: 'Pismo staroj drugarici' },
  { id: 'marko-ptice', tekst: 'Marko je tokom hladnog jutra primetio vrapce na snegu. Od drvenih daščica napravio je hranilicu i sipao semenke. Ptice su ubrzo sletele, a Marko ih je tiho posmatrao kroz prozor.', ko: 'Marko', gde: 'u dvorištu', predmet: 'drvenu hranilicu sa semenkama', radnja: 'napravio je hranilicu za ptice', razlog: 'vrapcima je zimi teško da pronađu hranu', ishod: 'ptice su došle do hrane', naslov: 'Zimska hranilica' },
]

type PoljePrice = 'ko' | 'gde' | 'predmet' | 'radnja' | 'razlog' | 'ishod' | 'naslov'

function netacniZa(prica: Prica, polje: PoljePrice): string[] {
  return PRICE.filter((druga) => druga !== prica).map((druga) => druga[polje])
}

function pitanjeZa(cfg: GeneratorConfig, rng: Rng) {
  let polje: PoljePrice
  let pitanje: string
  if (cfg.difficulty === 1) {
    polje = izaberi(rng, ['ko', 'gde'] as const)
    pitanje = polje === 'ko' ? 'Ko je glavni lik u tekstu?' : 'Gde se odvija glavni događaj?'
  } else if (cfg.difficulty === 2) {
    polje = izaberi(rng, ['predmet', 'radnja'] as const)
    pitanje = polje === 'predmet' ? 'Koji predmet je važan za događaj u tekstu?' : 'Šta je glavni lik uradio?'
  } else if (cfg.difficulty === 3) {
    polje = izaberi(rng, ['radnja', 'ishod'] as const)
    pitanje = polje === 'radnja' ? 'Šta je glavni lik uradio u tekstu?' : 'Kako se događaj završio?'
  } else if (cfg.difficulty === 4) {
    polje = izaberi(rng, ['razlog', 'ishod'] as const)
    pitanje = polje === 'razlog' ? 'Zašto je glavni lik tako postupio?' : 'Koja je posledica postupka glavnog lika?'
  } else {
    polje = izaberi(rng, ['razlog', 'naslov'] as const)
    pitanje = polje === 'naslov' ? 'Koji naslov najbolje odgovara tekstu?' : 'Koji razlog najbolje objašnjava postupak glavnog lika?'
  }
  return { polje, pitanje }
}

export const srpskiCitanje: TopicGenerator = {
  slug: 'srpski-citanje',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const prica = izaberi(rng, PRICE)
    const { polje, pitanje } = pitanjeZa(cfg, rng)
    const signature = `srpski-citanje:${prica.id}:${polje}`
    if (taken.has(signature)) return null
    const tacan = prica[polje]
    return upakujSrpskiIzbor(cfg, rng, {
      pitanje: `Pročitaj tekst:\n\n${prica.tekst}\n\n${pitanje}`,
      tacan,
      netacni: netacniZa(prica, polje),
      tvrdnja: (odgovor) => `Pročitaj tekst:\n\n${prica.tekst}\n\nTvrdnja „${odgovor}“ tačno odgovara na pitanje: ${pitanje}`,
      explanation: `Tačan odgovor je „${tacan}“. Podatak se zaključuje iz teksta.`,
      hint: 'Vrati se na deo teksta u kojem se pominju uzrok, postupak ili posledica.',
      signature,
    })
  },
}
