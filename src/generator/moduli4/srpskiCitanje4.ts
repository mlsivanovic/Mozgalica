// Generator: čitanje i razumevanje 4. razred — duži tekstovi.
// Odgovor se uvek ukucava; pitanja obuhvataju i pripovedačko lice, temu,
// osobine, odnose likova, poruku, personifikaciju i opis.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst } from '../moduli/srpskiZajednicko.ts'

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
  { id: 'matej-kosarka', tekst: 'Matej je želeo da pogodi koš sa pola terena, kao stariji dečaci sa kraja ulice. Prvih dana lopta je uvek promašivala obruč, a nekad ni dnevno svetlo nije trajalo dovoljno dugo za vežbanje. Tata mu je pokazao kako da drži lakat i da prati loptu pogledom. Matej je svako popodne vežbao po pola sata, po kiši i po suncu. Posle mesec dana lopta je prvi put prošla kroz obruč bez dodira ivice, a dečaci su mu aplaudirali.', ko: 'Matej', gde: ['na košarkaškom terenu', 'na terenu', 'terenu'], predmetPitanje: 'Čime je Matej svako popodne vežbao šut?', predmet: ['loptom', 'košarkaškom loptom'] },
  { id: 'jana-dunav', tekst: 'Jana je dobila zadatak da pred celim odeljenjem predstavi grad na Dunavu. Prve večeri je samo prelistavala slajdove i bojala se da će pred tablom zaboraviti reči. Mama joj je predložila da pretvori pripremu u igru: svaku činjenicu da nacrta na zaseban papir i poreda ih po redu. Treće večeri Jana je celu priču ispričala lutki bez oklevanja. Na prezentaciji je govorila mirno, a odeljenje je na kraju zapljeskalo.', ko: 'Jana', gde: ['u učionici', 'učionici', 'u školi'], predmetPitanje: 'Šta je Jana crtala na zasebne papire?', predmet: ['činjenice', 'činjenice o gradu', 'svaku činjenicu'] },
  { id: 'vukasin-igra', tekst: 'Vukašin je za kišnog popodneva ostao sam u kući, bez drugara i bez volje za crtanjem. Setio se bakine kutije sa dugmadima koju je baka čuvala u fioci. Od dugmadi, kartona i kockica napravio je igru u kojoj figura ide od polja do polja do cilja. Uveče su roditelji odigrali s njim tri partije za redom. Drugog dana je igru poneo u školu i drugari su je igrali na velikom odmoru.', ko: 'Vukašin', gde: ['kod kuće', 'kući'], predmetPitanje: 'Čiju je kutiju sa dugmadima Vukašin pronašao u fioci?', predmet: ['bakinu', 'bakine', 'bakine kutiju'] },
  { id: 'elena-pismo', tekst: 'Elenina najbolja drugarica Maša se preselila u drugi grad sred školske godine. Prvo su razmenjivale kratke poruke koje su postajale sve ređe. Za rođendan Elena je umesto poklona poslala pismo u kojem je opisala njihova zajednička sećanja, uz fotografiju sa prošlogodišnjeg izleta. Maša joj je uz odgovor vratila fotografiju u lepom okviru i obećale su se videti letos. Od tada svakog meseca razmenjuju po jedno dugo pismo.', ko: 'Elena', gde: ['kod kuće', 'kući', 'za pisaćim stolom'], predmetPitanje: 'Šta je Elena poslala drugarici za rođendan?', predmet: ['pismo', 'pismo sa sećanjima', 'pismo i fotografiju'] },
  { id: 'andrej-torba', tekst: 'Andrej je posle treninga zaspao u autobusu i silazio tek na trećoj stanici. Torba sa knjigama i sveskama ostala je na sedištu pored prozora. Kod kuće je majka odmah pozvala autobusko preduzeće, a vozač je torbu pronašao i dežurni ju je sačuvao do sutradan. Andrej je ujutru pre prvog časa otrčao po torbu. Stigao je na vreme i napisao test iz matematike.', ko: 'Andrej', gde: ['u autobusu', 'autobusu', 'na stanici', 'u autobusu i na stanici'], predmetPitanje: 'Šta je Andrej ostavio u autobusu?', predmet: ['torbu', 'torbu sa knjigama', 'torbu sa knjigama i sveskama'] },
  { id: 'isidora-struna', tekst: 'Isidora je na školskoj priredbi trebalo da odsvira pesmu na violini. Malo pre izlaska na binu, tokom štimovanja, pukla je najtanja struna. Suze su joj bile blizu, ali je duboko udahnula i mirno zamolila profesora muzičkog za rezervnu. Za dva minuta struna je zamenjena i Isidora je izašla pred publiku. Svirala je kao da se ništa nije desilo, a slušaoci nisu ni primetili problem.', ko: 'Isidora', gde: ['na bini', 'bini', 'na priredbi', 'u školi'], predmetPitanje: 'Na kom instrumentu je Isidora svirala?', predmet: ['na violini', 'violini', 'violina'] },
  { id: 'vasilije-ribolov', tekst: 'Vasilije je prvi put krenuo na ribolov sa dedom, sa novim štapom i velikim očekivanjima. Prvi sat ništa nije zagrizlo, pa je hteo da spakuje stvari i da se vrati kući. Deda mu je pokazao kako da namesti plovak i objasnio da pecanje uči čekanju. Vasilije je seo u tišini i posmatrao vodu bez mrdanja. Tek pred povratak plovak je zatreperio i izvukao je svog prvog šarana.', ko: 'Vasilije', gde: ['na reci', 'reci', 'na ribolovu', 'ribolovu'], predmetPitanje: 'Šta je Vasilije izvukao iz vode?', predmet: ['šarana', 'šaran', 'prvog šarana', 'svog prvog šarana'] },
  { id: 'andjela-bicikl', tekst: 'Anđelin mlađi brat nije umeo da vozi bicikl bez pomoćnih točkića. Anđela je svako veče trčala pored njega po dvorištu, držeći sedište sve kraće vreme. Kad bi brat pao, podigla bi bicikl i podsetila ga da je i ona padala dok je učila. Posle nedelju dana brat je prešao celu stazu sam, okrećući se ka njoj sa osmehom. Anđela je pljeskala glasnije od svih u dvorištu.', ko: 'Anđela', gde: ['u dvorištu', 'dvorištu'], predmetPitanje: 'Šta je Anđelin brat učio da vozi?', predmet: ['bicikl', 'bicikl bez točkića', 'bicikl bez pomoćnih točkića'] },
  { id: 'nikolina-dar', tekst: 'Za mamin rođendan Nikolina nije imala dovoljno džeparca za poklon. U kutiji za reciklažu pronašla je staklenku, ukrasnu hartiju i komadiće tkanine. Od staklenke je napravila ukrasnu čašu za olovke, a od tkanine mašnu na poklopcu. Mama je na daru najviše zavolela mali natpis „najboljoj mami“. Rekla je da joj je ovaj poklon draži od svih kupljenih, jer je napravljen rukama.', ko: 'Nikolina', gde: ['kod kuće', 'kući', 'za radnim stolom'], predmetPitanje: 'Od čega je Nikolina napravila čašu za olovke?', predmet: ['od staklenke', 'staklenke', 'od staklenke iz reciklaže'] },
  { id: 'zoran-sneg', tekst: 'Zoran je ujutru zatekao dvorište zgrade pod debelim snegom, a stari komšija Đorđe se sam borio sa ledenom stazom. Zoran je iz šupe uzeo lopatu i prvo očistio ispred Đorđevih vrata, pa tek onda svoj prilaz. Njegov primer su videle i druga deca, pa su zajedno očistili ceo prilaz zgradi. Đorđe im je iz stana doneo vruć čaj i kolače. Zoran je tog jutra kasnio pet minuta, ali je do škole hodao ponosno.', ko: 'Zoran', gde: ['u dvorištu', 'dvorištu', 'u dvorištu zgrade'], predmetPitanje: 'Šta je Zoran uzeo iz šupe?', predmet: ['lopatu', 'lopatu za sneg'] },
  { id: 'iva-oluja', tekst: 'Zovem se Iva. Jednog popodneva vraćala sam se iz škole dok je vetar ljutito zviždao između zgrada i uporno vukao moj kišobran. Kada sam stigla kući, kroz prozor sam posmatrala kako se grane klanjaju oluji. Zapisala sam te slike u svesku i od njih napravila kratku pesmu.', ko: 'Iva', gde: ['na putu iz škole', 'na putu kući', 'kod kuće'], predmetPitanje: 'Šta je Iva napravila od slika koje je zapisala?', predmet: ['kratku pesmu', 'pesmu'] },
]

interface Tumacenje { id: string; pitanje: string; tacan: string; prihvaceni?: string[]; objasnjenje: string }
const TUMACENJA: Record<string, Tumacenje[]> = {
  'matej-kosarka': [
    { id: 'osobina', pitanje: 'Koju osobinu Matej pokazuje?', tacan: 'upornost', prihvaceni: ['istrajnost', 'uporan', 'istrajan'], objasnjenje: 'Matej je dugo i redovno vežbao uprkos promašajima.' },
    { id: 'poruka', pitanje: 'Koja je poruka teksta?', tacan: 'upornost vodi do uspeha', prihvaceni: ['vežbanjem se postiže uspeh', 'treba biti uporan'], objasnjenje: 'Matej je uspeo zahvaljujući redovnom vežbanju.' },
  ],
  'jana-dunav': [{ id: 'pripovedac', pitanje: 'Da li se pripoveda u prvom ili trećem licu?', tacan: 'trećem', prihvaceni: ['treće', 'treće lice', 'u trećem licu'], objasnjenje: 'Pripovedač govori o Jani koristeći njeno ime i zamenicu ona.' }],
  'vukasin-igra': [{ id: 'tema', pitanje: 'Koja je tema teksta?', tacan: 'Vukašinovo pravljenje igre', prihvaceni: ['stvaranje igre od jednostavnih predmeta', 'maštovitost u igri'], objasnjenje: 'Tekst prati kako Vukašin od dugmadi, kartona i kockica pravi novu igru.' }],
  'elena-pismo': [{ id: 'odnos', pitanje: 'Kakav odnos imaju Elena i Maša?', tacan: 'blisko prijateljstvo', prihvaceni: ['prijateljski', 'one su bliske drugarice', 'prijateljstvo'], objasnjenje: 'One čuvaju zajednička sećanja i nastavljaju redovno da razmenjuju pisma.' }],
  'isidora-struna': [{ id: 'osobina', pitanje: 'Koju osobinu Isidora pokazuje pred nastup?', tacan: 'pribranost', prihvaceni: ['smirenost', 'pribrana', 'smirena'], objasnjenje: 'Isidora je ostala mirna i potražila rešenje neposredno pred nastup.' }],
  'vasilije-ribolov': [{ id: 'poruka', pitanje: 'Čemu je pecanje naučilo Vasilija?', tacan: 'strpljenju', prihvaceni: ['strpljenje', 'da bude strpljiv'], objasnjenje: 'Vasilije je morao mirno da čeka pre nego što je riba zagrizla.' }],
  'andjela-bicikl': [{ id: 'odnos', pitanje: 'Kako se Anđela odnosi prema mlađem bratu?', tacan: 'strpljivo i podržavajuće', prihvaceni: ['pomaže mu i ohrabruje ga', 'brižno', 'strpljivo'], objasnjenje: 'Anđela mu pomaže, podiže bicikl i ohrabruje ga posle pada.' }],
  'nikolina-dar': [{ id: 'poruka', pitanje: 'Zašto je mami poklon bio posebno drag?', tacan: 'jer ga je Nikolina sama napravila', prihvaceni: ['jer je napravljen rukama', 'zato što je ručno napravljen'], objasnjenje: 'Poklon je pokazao Nikolinin trud i ljubav, pa je mami bio vredniji od kupljenih.' }],
  'zoran-sneg': [{ id: 'opis', pitanje: 'Koja reč iz teksta opisuje stazu?', tacan: 'ledena', prihvaceni: ['ledenom'], objasnjenje: 'U tekstu se staza opisuje pridevom „ledena“.' }],
  'andrej-torba': [{ id: 'pripovedac', pitanje: 'Da li se pripoveda u prvom ili trećem licu?', tacan: 'trećem', prihvaceni: ['treće', 'treće lice', 'u trećem licu'], objasnjenje: 'Pripovedač govori o Andreju, a nije učesnik događaja.' }],
  'iva-oluja': [
    { id: 'pripovedac', pitanje: 'Da li se pripoveda u prvom ili trećem licu?', tacan: 'prvom', prihvaceni: ['prvo', 'prvo lice', 'u prvom licu'], objasnjenje: 'Iva govori o sopstvenom doživljaju koristeći oblike „zovem se“, „vraćala sam se“ i „posmatrala sam“.' },
    { id: 'personifikacija', pitanje: 'Koja je neživa pojava u tekstu opisana kao da se ljuti i deluje poput čoveka?', tacan: 'vetar', prihvaceni: ['vetar koji ljutito zviždi'], objasnjenje: 'Vetru su pripisani ljudsko osećanje i namera, što je personifikacija.' },
  ],
}

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

export const srpskiCitanje4: TopicGenerator = {
  slug: 'srpski-citanje-4',
  supportedTypes: ['text'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const prica = izaberi(rng, PRICE)
    const tumacenja = TUMACENJA[prica.id] ?? []
    if (tumacenja.length > 0 && rng() < 0.6) {
      const zadatak = izaberi(rng, tumacenja)
      const signature = `srpski-citanje-4:${prica.id}:${zadatak.id}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, { pitanje: `Pročitaj tekst:\n\n${prica.tekst}\n\n${zadatak.pitanje}`, tacan: zadatak.tacan,
        prihvaceni: zadatak.prihvaceni, explanation: zadatak.objasnjenje, hint: 'Odgovor zasnuj na tekstu i postupcima likova.', signature })
    }
    const polje = izaberi(rng, ['ko', 'gde', 'predmet'] as const)
    const signature = `srpski-citanje-4:${prica.id}:${polje}`
    if (taken.has(signature)) return null
    const { tacan, prihvaceni } = tacanZa(prica, polje)
    return upakujSrpskiTekst(cfg, {
      pitanje: `Pročitaj tekst:\n\n${prica.tekst}\n\n${pitanjeZa(prica, polje)}`,
      tacan,
      prihvaceni,
      explanation: `Tačan odgovor je „${tacan}“. Zaključuje se iz teksta pažljivim čitanjem.`,
      hint: 'Ponovo pročitaj tekst i pronađi odgovor u njemu.',
      signature,
    })
  },
}
