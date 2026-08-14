// Generator: čitanje i razumevanje — kratki originalni tekstovi.
// Odgovor se UVEK ukucava: ime lika, mesto i predmet iz priče, sa
// varijantama prihvatanja (padeži, kraći oblici) jer se ocenjuje na serveru.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst } from './srpskiZajednicko.ts'

interface Prica {
  id: string
  tekst: string
  ko: string
  // Prihvaćeni odgovori za mesto radnje (prvi je kanonski oblik iz teksta)
  gde: string[]
  // Pitanje o predmetu piše se po priči (glagol zavisi od radnje)
  predmetPitanje: string
  predmet: string[]
}

const PRICE: Prica[] = [
  { id: 'mina-biblioteka', tekst: 'Mina je posle škole otišla u biblioteku. Vratila je pročitanu knjigu i izabrala atlas o životinjama jer priprema plakat. Bibliotekarka joj je pokazala policu sa enciklopedijama. Mina je pronašla sve potrebne podatke.', ko: 'Mina', gde: ['u biblioteci', 'biblioteci', 'biblioteka'], predmetPitanje: 'Koju je knjigu Mina izabrala za plakat?', predmet: ['atlas', 'atlas o životinjama'] },
  { id: 'luka-kisa', tekst: 'Luka je krenuo na trening kada je počela jaka kiša. Setio se da u rancu ima sklopivi kišobran. Otvorio ga je i nastavio putem, pa je u salu stigao suv i na vreme.', ko: 'Luka', gde: ['na putu do treninga', 'na putu', 'putu do treninga'], predmetPitanje: 'Šta je Luka izvadio iz rancu?', predmet: ['kišobran', 'sklopivi kišobran'] },
  { id: 'ana-sadnica', tekst: 'Ana je u školskom dvorištu primetila mladu sadnicu nagnutu od vetra. Donela je drveni štap i mekom trakom pažljivo vezala stablo. Sledećeg jutra sadnica je stajala uspravno.', ko: 'Ana', gde: ['u školskom dvorištu', 'školskom dvorištu', 'u dvorištu', 'dvorištu'], predmetPitanje: 'Čime je Ana vezala sadnicu za štap?', predmet: ['mekom trakom', 'trakom', 'traka', 'štapom i trakom'] },
  { id: 'vuk-pas', tekst: 'Vuk je ispred prodavnice ugledao psa sa crvenom ogrlicom. Na ogrlici je pročitao broj telefona i pozvao vlasnicu. Sačekao je pored psa dok ona nije stigla, a zatim se zadovoljan vratio kući.', ko: 'Vuk', gde: ['ispred prodavnice', 'prodavnice', 'pred prodavnicom'], predmetPitanje: 'Na čemu je Vuk pročitao broj telefona?', predmet: ['na ogrlici', 'ogrlici', 'na crvenoj ogrlici', 'ogrlica'] },
  { id: 'iva-kolac', tekst: 'Iva je želela da iznenadi baku voćnim kolačem. Pažljivo je pročitala recept, odmerila sastojke i zamolila tatu da uključi rernu. Kada je baka stigla, kuća je mirisala na jabuke i cimet.', ko: 'Iva', gde: ['u kuhinji', 'kuhinji', 'kuhinja'], predmetPitanje: 'Šta je Iva pažljivo pročitala pre pravljenja kolača?', predmet: ['recept', 'recept za kolač'] },
  { id: 'filip-most', tekst: 'Filip je od kartona pravio most za školski projekat. Prvi most se srušio pod težinom igračaka, pa je dodao trouglaste oslonce. Drugi pokušaj je uspeo i most je izdržao sve autiće.', ko: 'Filip', gde: ['kod kuće', 'kući', 'za radnim stolom'], predmetPitanje: 'Šta je Filip pravio od kartona?', predmet: ['most', 'kartonski most'] },
  { id: 'sara-park', tekst: 'Sara je u parku videla praznu flašu pored klupe. Podigla ju je i odnela do žutog kontejnera za plastiku. Njena drugarica je zatim sakupila još dve plastične čaše, pa je travnjak ostao čist.', ko: 'Sara', gde: ['u parku', 'parku', 'park'], predmetPitanje: 'Šta je Sara podigla sa travnjaka?', predmet: ['flašu', 'praznu flašu', 'plastičnu flašu'] },
  { id: 'ognjen-sat', tekst: 'Ognjenov budilnik nije zazvonio jer se baterija ispraznila. Kada je video koliko je sati, brzo se spremio, ali nije preskočio doručak. Tata ga je odvezao do škole i Ognjen je stigao pre početka časa.', ko: 'Ognjen', gde: ['kod kuće', 'kući'], predmetPitanje: 'Šta nije zazvonilo tog jutra?', predmet: ['budilnik', 'Ognjenov budilnik'] },
  { id: 'dunja-pismo', tekst: 'Dunja je pronašla pismo svoje drugarice koja se preselila. Pročitala ga je dva puta, zatim uzela papir u boji i napisala odgovor. U kovertu je dodala i crtež njihovog omiljenog drveta.', ko: 'Dunja', gde: ['u svojoj sobi', 'u sobi', 'sobi'], predmetPitanje: 'Šta je Dunja pronašla?', predmet: ['pismo', 'pismo drugarice'] },
  { id: 'marko-ptice', tekst: 'Marko je tokom hladnog jutra primetio vrapce na snegu. Od drvenih daščica napravio je hranilicu i sipao semenke. Ptice su ubrzo sletele, a Marko ih je tiho posmatrao kroz prozor.', ko: 'Marko', gde: ['u dvorištu', 'dvorištu'], predmetPitanje: 'Šta je Marko napravio od drvenih daščica?', predmet: ['hranilicu', 'hranilicu za ptice'] },
  { id: 'jovana-mace', tekst: 'Jovana je u bašti čula tiho mjaukanje ispod grma ruža. Tamo je pronašla malo, sivo mače koje je drhtalo od hladnoće. Donela mu je činiju toplog mleka i meko ćebe, pa je mače ubrzo zaspalo.', ko: 'Jovana', gde: ['u bašti', 'bašti', 'u bašti ispod grma ruža'], predmetPitanje: 'Šta je Jovana donela mačetu?', predmet: ['mleko i ćebe', 'mleko', 'ćebe', 'činiju mleka i ćebe'] },
  { id: 'nikola-bicikl', tekst: 'Nikola je hteo da vozi bicikl, ali je guma bila potpuno prazna. U dvorištu mu je tata iz garaže doneo ručnu pumpu i pomogao mu da je napumpa. Nikola se zahvalio tati i srećan krenuo na vožnju.', ko: 'Nikola', gde: ['u dvorištu', 'dvorištu'], predmetPitanje: 'Šta je tata doneo da se napumpa guma?', predmet: ['pumpu', 'ručnu pumpu', 'pumpu iz garaže'] },
  { id: 'milica-hranilica', tekst: 'Milica je primetila da su u školskom voćnjaku ptice gladne tokom zime. Sa drugarima je od plastične flaše napravila hranilicu i napunila je mrvicama hleba. Ptice su radosno cvrkutale hraneći se.', ko: 'Milica', gde: ['u školskom voćnjaku', 'školskom voćnjaku', 'voćnjaku'], predmetPitanje: 'Od čega je Milica sa drugarima napravila hranilicu?', predmet: ['od plastične flaše', 'plastične flaše', 'flaše'] },
  { id: 'stefan-kljuc', tekst: 'Stefan je na stazi ispred zgrade pronašao izgubljeni ključ sa plavim priveskom u obliku srca. Odneo ga je kod komšije koji je predsednik kućnog saveta. Komšija je okačio obaveštenje i ključ je ubrzo vraćen vlasnici.', ko: 'Stefan', gde: ['na stazi ispred zgrade', 'ispred zgrade', 'na stazi'], predmetPitanje: 'Šta je Stefan pronašao na stazi?', predmet: ['ključ', 'izgubljeni ključ', 'ključ sa priveskom'] },
  { id: 'tara-slika', tekst: 'Tara je pripremala crtež za rođendan svoje mlađe sestre. Slučajno je prosula čašu vode preko papira i plava boja se razlila. Brzo je uzela fen za kosu, osušila papir i preko mrlje nacrtala prelepo jezero.', ko: 'Tara', gde: ['u svojoj sobi', 'u sobi', 'sobi', 'za radnim stolom'], predmetPitanje: 'Čime je Tara osušila mokar papir?', predmet: ['fenom', 'fen', 'fenom za kosu'] },
  { id: 'pavle-lopta', tekst: 'Pavle se igrao loptom i ona je odletela na krov visoke garaže. Kako nije mogao sam da je dohvati, zamolio je starijeg brata koji je uzeo dugačke merdevine. Brat je bezbedno skinuo loptu i igra je nastavljena.', ko: 'Pavle', gde: ['pored garaže', 'u dvorištu', 'dvorištu', 'garaže'], predmetPitanje: 'Šta je brat uzeo da skine loptu sa krova?', predmet: ['merdevine', 'dugačke merdevine'] },
  { id: 'sofija-biljka', tekst: 'Sofija je u učionici primetila da je saksijsko cveće klonulo jer ga niko nije zalio tokom vikenda. Donela je bokal vode i pažljivo natopila zemlju u svim saksijama. Već popodne listovi su ponovo bili uspravni i zeleni.', ko: 'Sofija', gde: ['u učionici', 'učionici', 'učionica'], predmetPitanje: 'Čime je Sofija zalila cveće?', predmet: ['bokalom', 'bokal', 'bokalom vode', 'vodom'] },
  { id: 'dusan-puz', tekst: 'Dušan je posle kiše na betonskoj stazi video puža kako sporo puzi. Da ga neko ne bi slučajno zgazio, pažljivo ga je podigao listom i preneo na vlažnu travu u bašti gde je puž bio bezbedan.', ko: 'Dušan', gde: ['na betonskoj stazi', 'na stazi', 'ispred kuće'], predmetPitanje: 'Čime je Dušan preneo puža na travu?', predmet: ['listom', 'list', 'zelenim listom'] },
  { id: 'lena-bakin-recept', tekst: 'Lena je sa bakom mesila domaće vanilice za slavu. Pažljivo je modlicom vadila kružiće iz testa i slagala ih u pleh. Kada su se kolači ispekli, Lena ih je posula šećerom u prahu i bila ponosna na svoj rad.', ko: 'Lena', gde: ['u bakinoj kuhinji', 'bakinoj kuhinji', 'u kuhinji', 'kuhinji'], predmetPitanje: 'Čime je Lena vadila kružiće iz testa?', predmet: ['modlicom', 'modlica', 'modlicom za testo'] },
  { id: 'aleksandar-avion', tekst: 'Aleksandar je pravio papirni avion od narandžastog papira, ali krila nisu bila jednaka pa avion nije leteo pravo. Presavio je krila ponovo, pažljivo prateći uputstva iz slikovnice. Novi let je bio dug i savršeno ravan.', ko: 'Aleksandar', gde: ['u dnevnoj sobi', 'dnevnoj sobi', 'u sobi', 'sobi'], predmetPitanje: 'Šta je Aleksandar pravio od narandžastog papira?', predmet: ['avion', 'papirni avion'] },
  { id: 'nemanja-akvarijum', tekst: 'Nemanja je za rođendan dobio akvarijum sa zlatnom ribicom. U enciklopediji je pročitao da ribice treba hraniti posebnom hranom i samo malo svako jutro. Izmerio je pravu količinu pahuljica, pa je ribica bila živahna i zdrava.', ko: 'Nemanja', gde: ['kod kuće', 'kući', 'pored akvarijuma'], predmetPitanje: 'Čime je Nemanja hranio zlatnu ribicu?', predmet: ['posebnom hranom', 'posebna hrana', 'hranom za ribice', 'hranom'] },
  { id: 'tea-neveni', tekst: 'Tea je sa bakom posadila seme nevena u saksije pored prozora. Svako jutro je pipnula zemlju i, kada je bila suva, pažljivo zalivala. Posle dve nedelje pojavili su se zeleni izdanci, a Tea je datum zapisala u svesku.', ko: 'Tea', gde: ['kod kuće', 'kući', 'pored prozora'], predmetPitanje: 'Šta je Tea posadila sa bakom?', predmet: ['seme nevena', 'neven', 'nevene', 'seme'] },
  { id: 'boris-slagalica', tekst: 'Boris je za kišnog popodneva seo da složi slagalicu sa slikom dvorca. Kad je ostalo samo nebo, nedostajala su mu tri dela. Pogledao je ispod tepiha i iza fotelje, tamo ih je i našao. Slagalicu je završio pre večere i ponosno je pokazao porodici.', ko: 'Boris', gde: ['u sobi', 'sobi'], predmetPitanje: 'Šta je Boris složio pre večere?', predmet: ['slagalicu', 'slagalicu dvorca', 'slagalicu sa slikom dvorca'] },
  { id: 'mila-kucica', tekst: 'Mila je na času tehnike pravila drvenu kućicu za ptice. Otac joj je isekao daske, a Mila ih je brusila, lepila i ofarbala u plavo. Kućica je okačena na visokom stablu pred školom, a u proleće su se u nju uselili vrapci.', ko: 'Mila', gde: ['u školi', 'školi', 'na času tehnike'], predmetPitanje: 'Šta je Mila pravila na času tehnike?', predmet: ['kućicu', 'kućicu za ptice', 'drvenu kućicu'] },
  { id: 'nadja-predstava', tekst: 'Nadja je za školsku predstavu učila ulogu vilenjače. Na samoj probi je zaboravila repliku, pa je zamolila učiteljicu da vežbaju zajedno. Vežbale su svaki odmor cele nedelje i predstava je prošla bez greške, a publika je dugo pljeskala.', ko: 'Nadja', gde: ['u školi', 'školi', 'škola'], predmetPitanje: 'Koga je Nadja igrala u školskoj predstavi?', predmet: ['vilenjaču', 'vilenjače', 'ulogu vilenjače'] },
]

type PoljePrice = 'ko' | 'gde' | 'predmet'

function pitanjeZa(prica: Prica, polje: PoljePrice): string {
  if (polje === 'ko') return 'Kako se zove glavni lik priče? (upiši ime)'
  if (polje === 'gde') return 'Gde se priča odvija? (upiši kratak odgovor)'
  return prica.predmetPitanje + ' (upiši odgovor)'
}

function tacanZa(prica: Prica, polje: PoljePrice): { tacan: string; prihvaceni: string[] } {
  if (polje === 'ko') return { tacan: prica.ko, prihvaceni: [] }
  if (polje === 'gde') return { tacan: prica.gde[0], prihvaceni: prica.gde.slice(1) }
  return { tacan: prica.predmet[0], prihvaceni: prica.predmet.slice(1) }
}

export const srpskiCitanje: TopicGenerator = {
  slug: 'srpski-citanje',
  supportedTypes: ['text'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const prica = izaberi(rng, PRICE)
    const polje = izaberi(rng, ['ko', 'gde', 'predmet'] as const)
    const signature = `srpski-citanje:${prica.id}:${polje}`
    if (taken.has(signature)) return null
    const { tacan, prihvaceni } = tacanZa(prica, polje)
    return upakujSrpskiTekst(cfg, {
      pitanje: `Pročitaj tekst:\n\n${prica.tekst}\n\n${pitanjeZa(prica, polje)}`,
      tacan,
      prihvaceni,
      explanation: `Tačan odgovor je „${tacan}“. Podatak se nalazi u tekstu priče.`,
      hint: 'Ponovo pročitaj tekst i pronađi odgovor u njemu.',
      signature,
    })
  },
}
