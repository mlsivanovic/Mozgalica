import { izaberi } from '../random.ts'
import type { TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst } from '../moduli/srpskiZajednicko.ts'

type PitanjeTeksta = readonly [id: string, pitanje: string, prihvaceni: readonly string[], objasnjenje: string]
interface Tekst5 { id: string; tekst: string; pitanja: readonly PitanjeTeksta[] }

export const TEKSTOVI5: readonly Tekst5[] = [
  {
    id: 'most',
    tekst: 'Lena je preko potoka svakog jutra išla do škole. Posle obilne kiše jedna daska na pešačkom mostu se odvojila. Sa druge strane stajao je njen mlađi drug Petar i spremao se da pređe. Lena ga je zaustavila i pokazala mu dasku. Iako bi preko mosta stigli za pet minuta, izabrali su duži put pored mlina. Usput su obavestili odraslog komšiju o oštećenju. U školi je Lena objasnila zašto kasne. Petar je rekao da mu je drago što ga nije požurivala. Sutradan su radnici popravili most.',
    pitanja: [
      ['informacija', 'Ko je zaustavio Petra? Napiši ime.', ['Lena'], 'Lena je primetila odvojenu dasku i zaustavila Petra.'],
      ['uzrok', 'Šta je bilo oštećeno na mostu?', ['daska', 'jedna daska', 'daska na mostu'], 'U tekstu je navedeno da se jedna daska odvojila.'],
      ['posledica', 'Da li je obilazak puta izazvao kašnjenje ili raniji dolazak?', ['kašnjenje', 'kasnjenje u školu'], 'Zbog dužeg puta Lena i Petar kasne u školu.'],
      ['zakljucak', 'Da li je Lena prednost dala bezbednosti ili brzini dolaska?', ['bezbednosti', 'bezbednost'], 'Odabrala je duži, bezbedan put i obavestila odraslog.'],
      ['pripovedac', 'U kom licu pripoveda pripovedač: prvom ili trećem?', ['trećem', 'treće', 'treće lice', 'u trećem licu'], 'Pripovedač govori o Leni i Petru, a ne o sebi.'],
    ],
  },
  {
    id: 'sveska',
    tekst: 'Zovem se Vuk. Pred čas prirodnih nauka otvorio sam ranac i shvatio da nema sveske sa beleškama za naš zajednički ogled. Najpre sam pomislio da kažem kako je svesku uzeo moj brat. Ipak, setio sam se da sam je sinoć ostavio na svom stolu. Rekao sam grupi šta se dogodilo. Drugovi su iz svojih beležaka obnovili postupak, a ja sam preuzeo zapisivanje rezultata na novom listu. Nastavnica nas je pohvalila što smo našli rešenje. Posle škole sam stavio svesku u ranac i napravio spisak pribora za sledeći dan.',
    pitanja: [
      ['informacija', 'Kako se zove pripovedač?', ['Vuk'], 'Tekst počinje rečenicom Zovem se Vuk.'],
      ['informacija-mesto', 'Gde je Vuk ostavio svesku?', ['na svom stolu', 'na stolu', 'na stolu kod kuće'], 'Prisetio se da je svesku ostavio na svom stolu.'],
      ['redosled', 'Šta je Vuk uradio prvo: priznao propust grupi ili zapisivao rezultate?', ['priznao propust grupi', 'priznao propust', 'priznao', 'rekao grupi šta se dogodilo'], 'Najpre je rekao šta se dogodilo, a zatim je preuzeo zapisivanje.'],
      ['osobina', 'Koju osobinu pokazuje priznanjem: iskrenost ili sebičnost?', ['iskrenost'], 'Vuk je priznao sopstveni propust umesto da okrivi brata.'],
      ['pripovedac', 'U kom licu je ispričana priča?', ['prvom', 'prvo', 'prvo lice', 'u prvom licu'], 'Vuk govori o sebi: otvorio sam, rekao sam, stavio sam.'],
    ],
  },
  {
    id: 'proba',
    tekst: 'Mina i Sara spremale su kratku predstavu. Mina je naučila duži govor, a Sara je izrađivala kulise. Na probi se jedna kulisa srušila i pocepala. Mina je već htela da ponovi svoj govor, ali je videla da Sara ćutke skuplja karton. Odložila je tekst i pomogla joj da ojačaju postolje. Za to vreme ostali su uvežbavali završnu scenu. Kada su ponovo počeli, kulisa je stajala čvrsto. Mina je svoj govor uvežbala posle probe. Na kraju su obe zapisale da za sledeću predstavu pre probe treba proveriti postolja.',
    pitanja: [
      ['informacija', 'Ko je izrađivao kulise?', ['Sara'], 'Sara je bila zadužena za izradu kulisa.'],
      ['uzrok', 'Šta se srušilo na probi?', ['kulisa', 'jedna kulisa'], 'U priči se srušila i pocepala jedna kulisa.'],
      ['redosled', 'Da li je Mina govor uvežbala pre popravke ili posle popravke?', ['posle popravke', 'posle'], 'Prvo je pomogla Sari, a govor je uvežbala posle probe.'],
      ['odnos', 'Da li Minin postupak pokazuje saradnju ili nadmetanje?', ['saradnju', 'saradnja'], 'Mina je odložila svoj posao da bi pomogla Sari.'],
      ['zakljucak', 'Šta će devojčice ubuduće proveravati pre probe?', ['postolja', 'postolja kulisa', 'čvrstinu postolja'], 'Na kraju su zapisale da treba proveriti postolja.'],
    ],
  },
  {
    id: 'seme',
    tekst: 'Nikola je posadio dva zrna pasulja u dve jednake saksije. Obe je držao pored istog prozora i zalivao istom količinom vode. Jednu saksiju pokrio je neprovidnom kutijom. Kada su biljke nikle, ona ispod kutije bila je bleda i izdužena, a nepokrivena zelena. Nikola nije odmah zapisao zaključak. Pokazao je beleške učiteljici i ponovio ogled s novim zrnima. Ponovo je uočio razliku. Tada je napisao da su biljke u njegovom ogledu imale različit izgled pri različitom osvetljenju. Dodao je da ne treba menjati više uslova odjednom.',
    pitanja: [
      ['informacija', 'Koju biljku je Nikola posadio?', ['pasulj'], 'Posadio je zrna pasulja.'],
      ['informacija-uslov', 'Koji uslov se razlikovao: količina vode ili osvetljenje?', ['osvetljenje', 'svetlost'], 'Vode je bilo jednako, ali jedna biljka bila je pod neprovidnom kutijom.'],
      ['poredjenje', 'Koje boje je bila nepokrivena biljka?', ['zelene', 'zelena'], 'Nepokrivena biljka je u tekstu opisana kao zelena.'],
      ['redosled', 'Da li je Nikola konačni zaključak zapisao pre ponavljanja ogleda ili posle njega?', ['posle', 'posle ponavljanja', 'posle ponavljanja ogleda', 'posle njega'], 'Najpre je proverio beleške i ponovio ogled.'],
      ['zakljucak', 'Da li ponavljanjem ogleda Nikola proverava rezultat ili menja temu?', ['proverava rezultat', 'proverava', 'provera rezultata'], 'Ponavljanje mu omogućava da proveri da li se zapažanje ponavlja.'],
    ],
  },
  {
    id: 'sat',
    tekst: 'U biblioteci je godinama stajao zidni sat koji više nije radio. Kada je bibliotekarka predložila da ga sklone, Đorđe je zamolio da ga najpre pokaže svom dedi, časovničaru. Deda je otkrio mali pokvaren deo, zamenio ga i očistio mehanizam. Đorđe je doneo sat nazad. Bibliotekarka ga je postavila iznad police sa pričama. Na ceduljici pored njega napisala je da se neke stvari mogu popraviti pre nego što ih odbacimo. Đorđe je toga dana pozajmio knjigu o starim zanatima, jer ga je zanimalo šta još časovničari rade.',
    pitanja: [
      ['informacija', 'Gde je stajao pokvareni sat?', ['u biblioteci', 'biblioteci'], 'Sat je godinama bio u biblioteci.'],
      ['lik', 'Ko je popravio sat?', ['Đorđev deda', 'deda', 'časovničar', 'njegov deda'], 'Đorđev deda, časovničar, zamenio je deo i očistio mehanizam.'],
      ['uzrok', 'Šta je deda zamenio?', ['pokvaren deo', 'mali pokvaren deo', 'deo', 'pokvareni deo'], 'Sat je imao mali pokvaren deo.'],
      ['poruka', 'Šta prema ceduljici vredi pokušati pre odbacivanja stvari?', ['popravku', 'popravka', 'popraviti ih', 'popraviti'], 'Ceduljica govori o popravljanju stvari pre odbacivanja.'],
      ['zakljucak', 'Da li pozajmljivanje knjige pokazuje Đorđevu radoznalost ili ravnodušnost?', ['radoznalost'], 'Želeo je da sazna više o zanimanju svog dede.'],
    ],
  },
  {
    id: 'trka',
    tekst: 'Pred školsku trku Iva je vežbala svako popodne. Želela je medalju. Na poslednjoj krivini videla je kako se takmičarki ispred nje odvezala pertla. Pozvala ju je da pripazi, a devojčica se zaustavila i vezala patiku. Iva je nastavila da trči i stigla četvrta. Bila je razočarana što nije osvojila medalju, ali joj je devojčica posle trke zahvalila što ju je upozorila. Iva je treneru rekla da sledeći put želi bolji rezultat, ali da bi drugaricu ponovo upozorila. Trener joj je predložio da nastavi redovno vežbanje.',
    pitanja: [
      ['informacija', 'Koje mesto je Iva osvojila? Napiši rečima.', ['četvrto', 'četvrto mesto'], 'U tekstu piše da je stigla četvrta.'],
      ['uzrok', 'Šta se odvezalo takmičarki?', ['pertla'], 'Takmičarki se odvezala pertla na patiki.'],
      ['osecanje', 'Kako se Iva osećala zbog izostanka medalje?', ['razočarano', 'bila je razočarana', 'razočarana'], 'U tekstu je izričito navedeno razočaranje.'],
      ['odnos', 'Da li je Iva upozorila suparnicu ili prećutala opasnost?', ['upozorila suparnicu', 'upozorila', 'upozorila ju je'], 'Iva ju je pozvala da pripazi.'],
      ['glavno', 'Da li je glavna tema pošteno ponašanje na trci ili izbor patika?', ['pošteno ponašanje na trci', 'pošteno ponašanje', 'sportsko ponašanje', 'fer-plej'], 'Priča naglašava Ivin odnos prema drugoj takmičarki.'],
    ],
  },
  {
    id: 'biblioteka-obavestenje',
    tekst: 'OBAVEŠTENJE ŠKOLSKE BIBLIOTEKE\nU četvrtak će biblioteka raditi od 10 do 14 časova zbog sređivanja polica. Radionica pravljenja obeleživača za knjige počinje u 12 časova i traje jedan sat. Prijave se primaju do srede kod bibliotekarke. Učenici treba da ponesu makaze i lepak; papir i bojice obezbeđuje škola. Tokom radionice pozajmljivanje knjiga biće moguće na pomoćnom pultu. Ko ne može da prisustvuje radionici, može posle nje preuzeti štampano uputstvo. Promenjeno radno vreme važi samo u četvrtak; od petka biblioteka radi kao ranije.',
    pitanja: [
      ['svrha', 'Da li je svrha teksta obaveštavanje ili pripovedanje izmišljenog događaja?', ['obaveštavanje', 'da obavesti'], 'Tekst daje podatke o radu biblioteke i radionici.'],
      ['informacija', 'Do kog dana se učenici prijavljuju?', ['do srede', 'srede', 'sreda'], 'Rok za prijavu je sreda.'],
      ['informacija-pribor', 'Ko obezbeđuje papir i bojice?', ['škola'], 'Učenici nose makaze i lepak, a škola obezbeđuje papir i bojice.'],
      ['primena', 'Gde se tokom radionice pozajmljuju knjige?', ['na pomoćnom pultu', 'pomoćnom pultu', 'pomoćni pult'], 'Za pozajmljivanje je određen pomoćni pult.'],
      ['zakljucak', 'Da li promenjeno radno vreme važi i u petak?', ['ne', 'ne važi'], 'Obaveštenje kaže da promena važi samo u četvrtak.'],
    ],
  },
  {
    id: 'kompost',
    tekst: 'Kompostiranje je razlaganje organskih ostataka kojim nastaje materijal koristan za zemljište. U školski komposter učenici stavljaju suvo lišće, sitne grančice i ostatke voća i povrća. Ne stavljaju plastične kese, staklo ni metal. Ostatke povremeno promešaju da bi vazduh dospeo u unutrašnjost. Sadržaj treba da bude umereno vlažan, a ne natopljen vodom. Kompost ne nastaje za jedan dan: za razlaganje je potrebno vreme. Učenici beleže promene, a gotov materijal koriste za zemlju u školskim žardinjerama. Tako deo otpada vraćaju u prirodni kružni tok.',
    pitanja: [
      ['vrsta-teksta', 'Da li je tekst književni ili neknjiževni?', ['neknjiževni', 'neknjiževni tekst'], 'Tekst objašnjava postupak i daje činjenične informacije.'],
      ['informacija', 'Koji materijal iz teksta ne ide u komposter: lišće ili staklo?', ['staklo'], 'Staklo je navedeno među materijalima koji se ne stavljaju.'],
      ['uzrok', 'Šta mešanjem treba da dospe u unutrašnjost kompostera?', ['vazduh'], 'Ostaci se mešaju da bi u unutrašnjost dospeo vazduh.'],
      ['informacija-vlaga', 'Da li sadržaj treba da bude umereno vlažan ili natopljen?', ['umereno vlažan', 'vlažan'], 'Tekst razlikuje umerenu vlažnost od natopljenosti.'],
      ['primena', 'Gde učenici koriste gotov kompost?', ['u školskim žardinjerama', 'u žardinjerama', 'za zemlju u školskim žardinjerama', 'školskim žardinjerama'], 'Gotov materijal koriste u zemlji školskih žardinjera.'],
    ],
  },
  {
    id: 'kucica-uputstvo',
    tekst: 'UPUTSTVO ZA PAPIRNU KUĆICU\nNajpre pripremi list papira, olovku, lenjir, makaze i lepak. Nacrtaj četiri jednaka pravougaonika jedan uz drugi i ostavi usku traku na kraju za lepljenje. Na pravougaonicima nacrtaj vrata i prozore pre nego što sastaviš kućicu. Iseci spoljašnji obris, presavij papir između pravougaonika i zalepi završnu traku za prvi zid. Posebno presavij drugi list napola da napraviš krov. Sačekaj da se zidovi osuše, pa tek onda postavi krov. Ako kućica stoji nakrivo, proveri pregibe umesto da dodaješ još lepka.',
    pitanja: [
      ['svrha', 'Da li tekst objašnjava postupak izrade ili opisuje istoriju kuća?', ['postupak izrade', 'objašnjava postupak izrade', 'izradu kućice'], 'Koraci govore kako se pravi papirna kućica.'],
      ['informacija', 'Koliko pravougaonika treba nacrtati? Napiši rečima.', ['četiri'], 'Uputstvo traži četiri jednaka pravougaonika.'],
      ['redosled', 'Da li se prozori crtaju pre sastavljanja ili posle sastavljanja zidova?', ['pre sastavljanja', 'pre', 'pre sastavljanja zidova'], 'Prozori se crtaju dok je papir još ravan.'],
      ['uzrok', 'Čemu služi uska završna traka?', ['lepljenju', 'za lepljenje', 'spajanju zidova', 'za spajanje zidova'], 'Traka se lepi za prvi zid i zatvara kućicu.'],
      ['primena', 'Šta treba proveriti ako kućica stoji nakrivo?', ['pregibe', 'pregibi', 'pregibe papira'], 'Uputstvo izričito savetuje proveru pregiba.'],
    ],
  },
  {
    id: 'pismo',
    tekst: 'Draga bako,\nHvala ti za seme nevena koje si mi poslala. Posadila sam ga sa odeljenjem u dvorištu škole. Naša grupa obilazi gredicu ponedeljkom, a druga grupa četvrtkom. Prošle nedelje kiša je dobro natopila zemlju, pa nismo dodavali vodu. Napravili smo malu tablu sa nazivom biljke i datumom sadnje. Volela bih da dođeš na školsku izložbu u maju, kada ćemo pokazati fotografije rasta biljaka. Molim te javi da li ti odgovara subota, kako bih rezervisala mesto na radionici.\nVoli te tvoja unuka Tara.',
    pitanja: [
      ['posiljalac', 'Ko je napisao pismo?', ['Tara'], 'Pismo je potpisala unuka Tara.'],
      ['primalac', 'Kome je pismo upućeno?', ['baki', 'baki od Tare', 'Tarinoj baki'], 'Početno obraćanje glasi Draga bako.'],
      ['informacija', 'Kojim danom Tarina grupa obilazi gredicu?', ['ponedeljkom', 'ponedeljak'], 'U pismu piše da Tarina grupa dolazi ponedeljkom.'],
      ['uzrok', 'Zašto nisu dodavali vodu: zbog kiše ili zbog kvara česme?', ['zbog kiše', 'kiše', 'kiša'], 'Kiša je već natopila zemlju.'],
      ['svrha', 'Šta baka treba da potvrdi: dolazak u subotu ili slanje novog semena?', ['dolazak u subotu', 'dolazak', 'da li joj odgovara subota'], 'Tara traži potvrdu termina da bi rezervisala mesto.'],
    ],
  },
  {
    id: 'tabela-citanja',
    tekst: 'Odeljenje je pratilo broj pozajmljenih knjiga tokom četiri dana. Beležili su pozajmljivanja, a ne broj pročitanih knjiga. Jedan učenik mogao je da pozajmi više od jedne knjige.\n\nDan — broj pozajmljenih knjiga\nPonedeljak — 12\nUtorak — 8\nSreda — 15\nČetvrtak — 10\n\nBibliotekarka je zamolila učenike da naprave kratku vest na osnovu tabele. Napomenula je da iz ovih podataka ne mogu saznati koliko je knjiga pročitano do kraja niti koji je naslov najpopularniji. Za takvu vest potrebno je prikupiti dodatne podatke. Tabelu će dopuniti podacima za petak kada se završi radni dan.',
    pitanja: [
      ['informacija', 'Koji dan ima najviše pozajmljenih knjiga?', ['sreda', 'u sredu'], 'Najveća vrednost, 15, zabeležena je u sredu.'],
      ['informacija-minimum', 'Koji dan ima najmanje pozajmljenih knjiga?', ['utorak', 'u utorak'], 'Najmanja vrednost je osam, u utorak.'],
      ['glavno', 'Da li tabela prikazuje pozajmljene ili pročitane knjige?', ['pozajmljene', 'pozajmljene knjige'], 'Tekst naglašava da se beleže pozajmljivanja.'],
      ['zakljucak', 'Može li se iz tabele odrediti najpopularniji naslov?', ['ne', 'ne može'], 'Nisu dati naslovi knjiga, pa takav zaključak nije moguć.'],
      ['primena', 'Podaci za koji dan tek treba da se dodaju?', ['petak', 'za petak'], 'Tabelu će dopuniti nakon završetka petka.'],
    ],
  },
  {
    id: 'vest-i-reklama',
    tekst: 'Na školskom panou osvanula su dva teksta. Prvi je glasio: „U subotu je održana razmena knjiga. Učestvovala su četiri odeljenja, a knjige koje nisu razmenjene ostavljene su biblioteci.“ Drugi je bio poziv: „Dođi u naš klub čitalaca! Čekaju te zanimljive priče i druženje svakog petka.“ Odeljenje je upoređivalo poruke. Prvi tekst izveštava o završenom događaju, dok drugi pokušava da podstakne čitaoca da se pridruži. Nastavnica je zamolila učenike da u svom izveštaju odvoje proverljive podatke od ličnih utisaka i da ne obećavaju ono što ne mogu da ispune.',
    pitanja: [
      ['svrha', 'Koji tekst izveštava o završenom događaju: prvi ili drugi?', ['prvi', 'prvi tekst'], 'Prvi tekst govori o razmeni održanoj u subotu.'],
      ['svrha-poziv', 'Koji tekst poziva na učlanjenje u klub?', ['drugi', 'drugi tekst'], 'Drugi tekst se obraća čitaocu pozivom Dođi.'],
      ['informacija', 'Kome su ostavljene nerazmenjene knjige?', ['biblioteci', 'školskoj biblioteci'], 'Prvi tekst navodi da su knjige ostavljene biblioteci.'],
      ['informacija-dan', 'Kojim danom se klub sastaje?', ['petkom', 'petak', 'svakog petka'], 'U pozivu piše svakog petka.'],
      ['zakljucak', 'Da li je broj odeljenja proverljiv podatak ili lični utisak?', ['proverljiv podatak', 'podatak', 'činjenica'], 'Broj učesničkih odeljenja može se proveriti.'],
    ],
  },
]

const ZADACI = TEKSTOVI5.flatMap((tekst) => tekst.pitanja.map((pitanje) => ({ tekst, pitanje })))
export const srpskiCitanje5: TopicGenerator = {
  slug: 'srpski-citanje-5', supportedTypes: ['text'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const potpis = (z: typeof ZADACI[number]) => `srpski-citanje-5:${z.tekst.id}:${z.pitanje[0]}`
    const dostupni = ZADACI.filter((z) => !taken.has(potpis(z)))
    if (dostupni.length === 0) return null
    const z = izaberi(rng, dostupni)
    const [, pitanje, prihvaceni, explanation] = z.pitanje
    return upakujSrpskiTekst(cfg, {
      pitanje: `Pročitaj tekst:\n\n${z.tekst.tekst}\n\n${pitanje}`,
      tacan: prihvaceni[0], prihvaceni: [...prihvaceni.slice(1)], explanation,
      hint: 'Odgovor zasnuj na podacima iz teksta.', signature: potpis(z),
    })
  },
}
