// Generator: čitanje i razumevanje 4. razred — duži tekstovi i pitanja koja
// traže zaključivanje (uzrok, posledica, raspoloženje lika, pouka, naslov).
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from '../moduli/srpskiZajednicko.ts'

interface Prica {
  id: string
  tekst: string
  ko: string
  gde: string
  predmet: string
  radnja: string
  razlog: string
  ishod: string
  raspolozenje: string
  poruka: string
  naslov: string
}

const PRICE: Prica[] = [
  { id: 'matej-kosarka', tekst: 'Matej je želeo da pogodi koš sa pola terene, kao stariji dečaci sa kraja ulice. Prvih dana lopta je uvek promašila obruč, a nekad ni dnevno svetlo nije stizalo do vežbanja. Tata mu je pokazao kako da drži lakat i da prati loptu pogledom. Matej je svako popodne vežbao po pola sata, po kiši i po suncu. Posle mesec dana lopta je prvi put prošla kroz obruč bez dodira ivice, a dečaci su mu aplaudirali.', ko: 'Matej', gde: 'na košarkaškoj tereni', predmet: 'košarkašku loptu', radnja: 'svako popodne je vežbao šut uz tatin savet', razlog: 'želeo je da pogodi koš kao stariji dečaci', ishod: 'posle mesec dana pogodio je koš bez dodira ivice', raspolozenje: 'istrajno, a na kraju ponosno', poruka: 'upornim vežbanjem se postiže cilj', naslov: 'Šut sa pola terene' },
  { id: 'jana-dunav', tekst: 'Jana je dobila zadatak da pred celim odeljenjem predstavi grad na Dunavu. Prve večeri je samo prelistavala slajdove i bojala se da će pred tablom zaboraviti reči. Mama joj je predložila da pretvori pripremu u igru: svaku činjenicu da nacrta na zaseban papir i poreda ih po redu. Treće večeri Jana je celu priču ispričala lutki bez oklevanja. Na prezentaciji je govorila mirno, a odeljenje je na kraju zapljeskalo.', ko: 'Jana', gde: 'u učionici pred odeljenjem', predmet: 'slajdove i nacrthane papire sa činjenicama', radnja: 'pretvorila je pripremu u igru i vežbala priču', razlog: 'bojala se da će pred tablom zaboraviti reči', ishod: 'prezentacija je prošla mirno uz aplauz odeljenja', raspolozenje: 'od uplašene do smirene', poruka: 'dobrom pripremom se savladava strah', naslov: 'Prezentacija o Dunavu' },
  { id: 'vukasin-igra', tekst: 'Vukašin je za kišnog popodneva ostao sam u kući, bez drugara i bez volje za crtanjem. Setio se bakuine kutije sa dugmadima koju je baka čuvala u fioci. Od dugmadi, kartona i kockica napravio je igru u kojoj figura ide od polja do polja do cilja. Uveče su roditelji odigrali s njim tri partije za redom. Drugog dana je igru poneo u školu i drugari su je igrali na velikom odmoru.', ko: 'Vukašin', gde: 'kod kuće za kišnog popodneva', predmet: 'kutiju sa dugmadima, karton i kockice', radnja: 'od dugmadi i kartona napravio je sopstvenu igru', razlog: 'bilo mu je dosadno za vreme kiše', ishod: 'roditelji i drugari su igrali njegovu igru', raspolozenje: 'od dosade do ponosa', poruka: 'dosada može da podstakne maštu', naslov: 'Igra od dugmadi' },
  { id: 'elena-pismo', tekst: 'Elenina najbolja drugarica Maša se preselila u drugi grad sred školske godine. Prvo su razmenjivale kratke poruke koje su postajale sve ređe. Za rođendan Elena je umesto poklona poslala pismo u kojem je opisala njihova zajednička sećanja, uz fotografiju sa prošlogodišnjeg izleta. Maša joj je uz odgovor vratila fotografiju u lepom okviru i obećale su se videti letos. Od tada svakog meseca razmenjuju po jedno dugo pismo.', ko: 'Elena', gde: 'kod kuće za pisaćim stolom', predmet: 'pismo sa sećanjima i fotografiju sa izleta', radnja: 'poslala je drugarici pismo sa zajedničkim sećanjima', razlog: 'poruke su posle selidbe postajale sve ređe', ishod: 'devojčice su obnovile prijateljstvo mesečnim pismima', raspolozenje: 'nostalgično, pa radosno', poruka: 'prijateljstvo se održava pažnjom', naslov: 'Pismo za drugaricu' },
  { id: 'andrej-torba', tekst: 'Andrej je posle treninga zaspao u autobusu i silazio tek na trećoj stanici. Torba sa knjigama i sveskama ostala je na sedištu pored prozora. Kod kuće je majka odmah pozvala autobusko preduzeće, a vozač je torbu pronašao i dežurni ju je sačuvao do sutradan. Andrej je ujutru pre prvog časa otrčao po torbu. Stigao je na vreme i napisao test iz matematike.', ko: 'Andrej', gde: 'u autobusu i na stanici', predmet: 'torbu sa knjigama i sveskama', radnja: 'zaspao je u autobusu pa je majka potražila torbu', razlog: 'bio je umoran posle treninga pa je zaspao', ishod: 'torba je vraćena, a Andrej je stigao na test', raspolozenje: 'preplašeno, pa olakšano', poruka: 'od greške se brže oporavlja onaj ko odmah traži pomoć', naslov: 'Torba u autobusu' },
  { id: 'isidora-struna', tekst: 'Isidora je na školskoj priredbi trebalo da odsvira pesmu na violini. Malo pre izlaska na binu, tokom štimovanja, pukla je najtanja struna. Suze su joj bile blizu, ali je duboko udahnula i mirno zamolila profesora muzičkog za rezervnu. Za dva minuta struna je zamenjena i Isidora je izašla pred publiku. Svirala je kao da se ništa nije desilo, a slušaoci nisu ni primetili problem.', ko: 'Isidora', gde: 'na bini školske priredbe', predmet: 'violinu i rezervnu strunu', radnja: 'zamolila je profesora da zameni strunu i mirno nastavila', razlog: 'najtanja struna je pukla malo pre nastupa', ishod: 'odsvirala je pesmu, a publika nije primetila problem', raspolozenje: 'uplašeno, pa smireno i ponosno', poruka: 'smirenost rešava probleme brže od panike', naslov: 'Puknuta struna' },
  { id: 'vasilije-ribolov', tekst: 'Vasilije je prvi put krenuo na ribolov sa dedom, sa novim štapom i velikim očekivanjima. Prvi sat ništa nije zagrizlo, pa je hteo da spakuje stvari i da se vrati kući. Deda mu je pokazao kako da namesti plutu i objasnio da pecanje uči čekanju. Vasilije je seo u tišini i posmatrao vodu bez mrdanja. Tek pred povratak plutu se zatreperila i izvukao je svog prvog šarana.', ko: 'Vasilije', gde: 'na reci sa dedom', predmet: 'štap za pecanje i plutu', radnja: 'sedeo je strpljivo uz dedu i izvukao prvog šarana', razlog: 'hteo je da odustane, ali deda ga je naučio čekanju', ishod: 'ulovio je svog prvog šarana', raspolozenje: 'nestrpljivo, pa ushićeno', poruka: 'strpljenje se najbolje nagrađuje', naslov: 'Prvi šaran' },
  { id: 'andjela-bicikl', tekst: 'Anđelin mlađi brat nije umeo da vozi bicikl bez pomoćnih točkića. Anđela je svako veče trčala pored njega po dvorištu, držeći sedište sve kraće vreme. Kad bi brat pao, podigla bi bicikl i podsetila ga da je i ona padala dok je učila. Posle nedelju dana brat je prešao celu stazu sam, okrećući se ka njoj sa osmehom. Anđela je pljeskala glasnije od svih u dvorištu.', ko: 'Anđela', gde: 'u dvorištu', predmet: 'bratov bicikl bez pomoćnih točkića', radnja: 'trčala je pored brata i držala sedište dok je učio', razlog: 'brat nije umeo da vozi bez pomoćnih točkića', ishod: 'brat je sam prešao celu stazu', raspolozenje: 'strpljivo i podržavajuće', poruka: 'podrška olakšava tuđe učenje', naslov: 'Trčanje pored brata' },
  { id: 'nikolina-dar', tekst: 'Za mamain rođendan Nikolina nije imala dovoljno džeparca za poklon. U kutiji za reciklazu pronašla je staklenku, ukrasnu hartiju i komadiće tkanine. Od staklenke je napravila ukrasnu čašu za olovke, a od tkanine mašnu na poklopac. Mama je na daru najviše zavolela mali natpis „najboljoj mami“. Rekla je da joj je ovaj poklon draži od svih kupljenih, jer je napravljen rukama.', ko: 'Nikolina', gde: 'kod kuće za radnim stolom', predmet: 'staklenku, ukrasnu hartiju i tkaninu', radnja: 'od recikliranih stvari napravila je poklon za mamu', razlog: 'nije imala dovoljno džeparca za kupljen poklon', ishod: 'mama se obradovala poklonu napravljenom rukama', raspolozenje: 'maštovito i veselo', poruka: 'dar napravljen srcem vredi više od kupljenog', naslov: 'Poklon od staklenke' },
  { id: 'zoran-sneg', tekst: 'Zoran je ujutru zatekao dvorište zgrade pod debelim snegom, a stari komšija Đorđe se sam borio sa ledenom stazom. Zoran je iz šupe uzeo lopatu i prvo očistio ispred Đorđevih vrata, pa tek onda svoj prilaz. Njegov primer su videle i druga deca, pa su zajedno očistili ceo prilaz zgradi. Đorđe im je iz stana doneo vruć čaj i kolače. Zoran je tog jutra kasnio pet minuta, ali je do škole hodao ponosno.', ko: 'Zoran', gde: 'u dvorištu zgrade', predmet: 'lopatu za sneg', radnja: 'prvo je očistio sneg ispred vrata starog komšije', razlog: 'komšija se sam teško snalazio sa ledenom stazom', ishod: 'komšija je deci doneo čaj, a prilaz je bio čist', raspolozenje: 'spremno da pomogne', poruka: 'mala pomoć komšiji vredi kao velika', naslov: 'Lopata i čaj' },
]

type PoljePrice = 'ko' | 'gde' | 'predmet' | 'radnja' | 'razlog' | 'ishod' | 'raspolozenje' | 'poruka' | 'naslov'

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
    polje = izaberi(rng, ['radnja', 'ishod', 'raspolozenje'] as const)
    pitanje = polje === 'radnja'
      ? 'Šta je glavni lik uradio u tekstu?'
      : polje === 'ishod'
        ? 'Kako se događaj završio?'
        : 'Kako se osećao glavni lik u tekstu?'
  } else if (cfg.difficulty === 4) {
    polje = izaberi(rng, ['razlog', 'ishod'] as const)
    pitanje = polje === 'razlog' ? 'Zašto je glavni lik tako postupio?' : 'Koja je posledica postupka glavnog lika?'
  } else {
    polje = izaberi(rng, ['poruka', 'naslov'] as const)
    pitanje = polje === 'poruka' ? 'Koja pouka najbolje odgovara tekstu?' : 'Koji naslov najbolje odgovara tekstu?'
  }
  return { polje, pitanje }
}

export const srpskiCitanje4: TopicGenerator = {
  slug: 'srpski-citanje-4',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const prica = izaberi(rng, PRICE)
    const { polje, pitanje } = pitanjeZa(cfg, rng)
    const signature = `srpski-citanje-4:${prica.id}:${polje}`
    if (taken.has(signature)) return null
    const tacan = prica[polje]
    return upakujSrpskiIzbor(cfg, rng, {
      pitanje: `Pročitaj tekst:\n\n${prica.tekst}\n\n${pitanje}`,
      tacan,
      netacni: netacniZa(prica, polje),
      tvrdnja: (odgovor) => `Pročitaj tekst:\n\n${prica.tekst}\n\nTvrdnja „${odgovor}“ tačno odgovara na pitanje: ${pitanje}`,
      explanation: `Tačan odgovor je „${tacan}“. Zaključuje se iz teksta pažljivim čitanjem.`,
      hint: 'Vrati se na deo teksta u kojem se opisuje uzrok, postupak ili posledica.',
      signature,
    })
  },
}
