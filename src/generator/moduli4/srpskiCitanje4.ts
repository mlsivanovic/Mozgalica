// Generator: čitanje i razumevanje 4. razred — duži tekstovi.
// Odgovor se UVEK ukucava: ime lika, mesto i predmet iz priče, sa
// varijantama prihvatanja (padeži, kraći oblici) jer se ocenjuje na serveru.
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
  { id: 'matej-kosarka', tekst: 'Matej je želeo da pogodi koš sa pola terene, kao stariji dečaci sa kraja ulice. Prvih dana lopta je uvek promašila obruč, a nekad ni dnevno svetlo nije stizalo do vežbanja. Tata mu je pokazao kako da drži lakat i da prati loptu pogledom. Matej je svako popodne vežbao po pola sata, po kiši i po suncu. Posle mesec dana lopta je prvi put prošla kroz obruč bez dodira ivice, a dečaci su mu aplaudirali.', ko: 'Matej', gde: ['na košarkaškoj tereni', 'na tereni', 'tereni'], predmetPitanje: 'Čime je Matej svako popodne vežbao šut?', predmet: ['loptu', 'košarkašku loptu'] },
  { id: 'jana-dunav', tekst: 'Jana je dobila zadatak da pred celim odeljenjem predstavi grad na Dunavu. Prve večeri je samo prelistavala slajdove i bojala se da će pred tablom zaboraviti reči. Mama joj je predložila da pretvori pripremu u igru: svaku činjenicu da nacrta na zaseban papir i poreda ih po redu. Treće večeri Jana je celu priču ispričala lutki bez oklevanja. Na prezentaciji je govorila mirno, a odeljenje je na kraju zapljeskalo.', ko: 'Jana', gde: ['u učionici', 'učionici', 'u školi'], predmetPitanje: 'Šta je Jana crtala na zasebne papire?', predmet: ['činjenice', 'činjenice o gradu', 'svaku činjenicu'] },
  { id: 'vukasin-igra', tekst: 'Vukašin je za kišnog popodneva ostao sam u kući, bez drugara i bez volje za crtanjem. Setio se bakine kutije sa dugmadima koju je baka čuvala u fioci. Od dugmadi, kartona i kockica napravio je igru u kojoj figura ide od polja do polja do cilja. Uveče su roditelji odigrali s njim tri partije za redom. Drugog dana je igru poneo u školu i drugari su je igrali na velikom odmoru.', ko: 'Vukašin', gde: ['kod kuće', 'kući'], predmetPitanje: 'Čiju je kutiju sa dugmadima Vukašin pronašao u fioci?', predmet: ['bakinu', 'bakine', 'bakine kutiju'] },
  { id: 'elena-pismo', tekst: 'Elenina najbolja drugarica Maša se preselila u drugi grad sred školske godine. Prvo su razmenjivale kratke poruke koje su postajale sve ređe. Za rođendan Elena je umesto poklona poslala pismo u kojem je opisala njihova zajednička sećanja, uz fotografiju sa prošlogodišnjeg izleta. Maša joj je uz odgovor vratila fotografiju u lepom okviru i obećale su se videti letos. Od tada svakog meseca razmenjuju po jedno dugo pismo.', ko: 'Elena', gde: ['kod kuće', 'kući', 'za pisaćim stolom'], predmetPitanje: 'Šta je Elena poslala drugarici za rođendan?', predmet: ['pismo', 'pismo sa sećanjima', 'pismo i fotografiju'] },
  { id: 'andrej-torba', tekst: 'Andrej je posle treninga zaspao u autobusu i silazio tek na trećoj stanici. Torba sa knjigama i sveskama ostala je na sedištu pored prozora. Kod kuće je majka odmah pozvala autobusko preduzeće, a vozač je torbu pronašao i dežurni ju je sačuvao do sutradan. Andrej je ujutru pre prvog časa otrčao po torbu. Stigao je na vreme i napisao test iz matematike.', ko: 'Andrej', gde: ['u autobusu', 'autobusu', 'na stanici', 'u autobusu i na stanici'], predmetPitanje: 'Šta je Andrej ostavio u autobusu?', predmet: ['torbu', 'torbu sa knjigama', 'torbu sa knjigama i sveskama'] },
  { id: 'isidora-struna', tekst: 'Isidora je na školskoj priredbi trebalo da odsvira pesmu na violini. Malo pre izlaska na binu, tokom štimovanja, pukla je najtanja struna. Suze su joj bile blizu, ali je duboko udahnula i mirno zamolila profesora muzičkog za rezervnu. Za dva minuta struna je zamenjena i Isidora je izašla pred publiku. Svirala je kao da se ništa nije desilo, a slušaoci nisu ni primetili problem.', ko: 'Isidora', gde: ['na bini', 'bini', 'na priredbi', 'u školi'], predmetPitanje: 'Na kom instrumentu je Isidora svirala?', predmet: ['na violini', 'violini', 'violina'] },
  { id: 'vasilije-ribolov', tekst: 'Vasilije je prvi put krenuo na ribolov sa dedom, sa novim štapom i velikim očekivanjima. Prvi sat ništa nije zagrizlo, pa je hteo da spakuje stvari i da se vrati kući. Deda mu je pokazao kako da namesti plutu i objasnio da pecanje uči čekanju. Vasilije je seo u tišini i posmatrao vodu bez mrdanja. Tek pred povratak plutu se zatreperila i izvukao je svog prvog šarana.', ko: 'Vasilije', gde: ['na reci', 'reci', 'na ribolovu', 'ribolovu'], predmetPitanje: 'Šta je Vasilije izvukao iz vode?', predmet: ['šarana', 'šaran', 'prvog šarana', 'svog prvog šarana'] },
  { id: 'andjela-bicikl', tekst: 'Anđelin mlađi brat nije umeo da vozi bicikl bez pomoćnih točkića. Anđela je svako veče trčala pored njega po dvorištu, držeći sedište sve kraće vreme. Kad bi brat pao, podigla bi bicikl i podsetila ga da je i ona padala dok je učila. Posle nedelju dana brat je prešao celu stazu sam, okrećući se ka njoj sa osmehom. Anđela je pljeskala glasnije od svih u dvorištu.', ko: 'Anđela', gde: ['u dvorištu', 'dvorištu'], predmetPitanje: 'Šta je Anđelin brat učio da vozi?', predmet: ['bicikl', 'bicikl bez točkića', 'bicikl bez pomoćnih točkića'] },
  { id: 'nikolina-dar', tekst: 'Za mamain rođendan Nikolina nije imala dovoljno džeparca za poklon. U kutiji za reciklazu pronašla je staklenku, ukrasnu hartiju i komadiće tkanine. Od staklenke je napravila ukrasnu čašu za olovke, a od tkanine mašnu na poklopac. Mama je na daru najviše zavolela mali natpis „najboljoj mami“. Rekla je da joj je ovaj poklon draži od svih kupljenih, jer je napravljen rukama.', ko: 'Nikolina', gde: ['kod kuće', 'kući', 'za radnim stolom'], predmetPitanje: 'Od čega je Nikolina napravila čašu za olovke?', predmet: ['od staklenke', 'staklenke', 'od staklenke iz reciklaže'] },
  { id: 'zoran-sneg', tekst: 'Zoran je ujutru zatekao dvorište zgrade pod debelim snegom, a stari komšija Đorđe se sam borio sa ledenom stazom. Zoran je iz šupe uzeo lopatu i prvo očistio ispred Đorđevih vrata, pa tek onda svoj prilaz. Njegov primer su videle i druga deca, pa su zajedno očistili ceo prilaz zgradi. Đorđe im je iz stana doneo vruć čaj i kolače. Zoran je tog jutra kasnio pet minuta, ali je do škole hodao ponosno.', ko: 'Zoran', gde: ['u dvorištu', 'dvorištu', 'u dvorištu zgrade'], predmetPitanje: 'Šta je Zoran uzeo iz šupe?', predmet: ['lopatu', 'lopatu za sneg'] },
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

export const srpskiCitanje4: TopicGenerator = {
  slug: 'srpski-citanje-4',
  supportedTypes: ['text'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const prica = izaberi(rng, PRICE)
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
