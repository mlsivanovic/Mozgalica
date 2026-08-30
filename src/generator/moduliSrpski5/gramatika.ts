import { napraviSrpskiGenerator5, zadatak5, type ZadatakSrpski5 } from './zajednicko.ts'

const PADEZI = [
  ['nom-pas', 'Pas čuva dvorište.', 'Pas', 'nominativ', 'akuzativ', 'Pas je vršilac radnje i subjekat.'],
  ['nom-ucenica', 'Učenica rešava zadatak.', 'Učenica', 'nominativ', 'genitiv', 'Učenica vrši radnju rešavanja.'],
  ['nom-vetar', 'Vetar savija grane.', 'Vetar', 'nominativ', 'instrumental', 'Vetar je subjekat rečenice.'],
  ['nom-deca', 'Deca pevaju.', 'Deca', 'nominativ', 'vokativ', 'Deca su vršioci radnje, a rečenica nije obraćanje.'],
  ['nom-ptica', 'Ptica leti iznad sela.', 'Ptica', 'nominativ', 'dativ', 'Pitanje za subjekat je: ko leti?'],
  ['nom-sunce', 'Sunce greje livadu.', 'Sunce', 'nominativ', 'lokativ', 'Sunce je subjekat uz predikat greje.'],
  ['gen-sestre', 'Ovo je knjiga moje sestre.', 'sestre', 'genitiv', 'dativ', 'Genitiv označava pripadanje: knjiga pripada sestri.'],
  ['gen-hleba', 'Odsekao je parče hleba.', 'hleba', 'genitiv', 'akuzativ', 'Genitiv označava deo celine: parče od hleba.'],
  ['gen-vode', 'Popila je čašu vode.', 'vode', 'genitiv', 'instrumental', 'Reč vode kazuje čega je čaša puna, odnosno deo celine.'],
  ['gen-druga', 'Ranac mog druga je plav.', 'druga', 'genitiv', 'nominativ', 'Genitiv kazuje kome ranac pripada.'],
  ['gen-sira', 'Na tanjiru je komad sira.', 'sira', 'genitiv', 'vokativ', 'Komad predstavlja deo sira.'],
  ['gen-kuce', 'Krov kuće je crven.', 'kuće', 'genitiv', 'lokativ', 'Genitiv označava pripadanje krova kući.'],
  ['dat-bratu', 'Poklonila je knjigu bratu.', 'bratu', 'dativ', 'lokativ', 'Bratu označava kome je knjiga namenjena.'],
  ['dat-skoli', 'Putnici prilaze školi.', 'školi', 'dativ', 'genitiv', 'Prilaženje je usmereno ka školi.'],
  ['dat-majci', 'Pišem pismo majci.', 'majci', 'dativ', 'akuzativ', 'Majka je primalac pisma: kome pišem?'],
  ['dat-deci', 'Podelili smo sveske deci.', 'deci', 'dativ', 'instrumental', 'Deci označava primaoce svezaka.'],
  ['dat-drugu', 'Pomažem drugu.', 'drugu', 'dativ', 'akuzativ', 'Pomažem kome? Drugu, u dativu.'],
  ['dat-macki', 'Sipala je mleko mački.', 'mački', 'dativ', 'lokativ', 'Mački označava kome je mleko namenjeno.'],
  ['aku-knjigu', 'Čitam knjigu.', 'knjigu', 'akuzativ', 'nominativ', 'Knjigu je pravi objekat: šta čitam?'],
  ['aku-loptu', 'Dečak baca loptu.', 'loptu', 'akuzativ', 'dativ', 'Lopta je predmet radnje bacanja.'],
  ['aku-druga', 'Vidim druga na kapiji.', 'druga', 'akuzativ', 'genitiv', 'Vidim koga? Druga je pravi objekat, iako oblik liči na genitiv.'],
  ['aku-pesmu', 'Pevamo pesmu.', 'pesmu', 'akuzativ', 'instrumental', 'Pesmu označava predmet radnje pevanja.'],
  ['aku-prozor', 'Otvaram prozor.', 'prozor', 'akuzativ', 'nominativ', 'Prozor je objekat, iako je oblik jednak nominativu.'],
  ['aku-sliku', 'Posmatram sliku.', 'sliku', 'akuzativ', 'lokativ', 'Šta posmatram? Sliku, u akuzativu.'],
  ['vok-marko', 'Marko, zatvori vrata!', 'Marko', 'vokativ', 'nominativ', 'Ime je upotrebljeno za obraćanje i odvojeno zapetom.'],
  ['vok-sestro', 'Sestro, sačekaj me!', 'Sestro', 'vokativ', 'genitiv', 'Govornik se obraća sestri.'],
  ['vok-druze', 'Druže, priđi bliže!', 'Druže', 'vokativ', 'akuzativ', 'Druže je oblik za dozivanje.'],
  ['vok-deco', 'Deco, počinje predstava!', 'Deco', 'vokativ', 'dativ', 'Deco je obraćanje deci.'],
  ['vok-ucitelju', 'Učitelju, imam pitanje.', 'Učitelju', 'vokativ', 'lokativ', 'Učitelju je obraćanje sagovorniku.'],
  ['vok-milice', 'Milice, donesi svesku!', 'Milice', 'vokativ', 'genitiv', 'Milica je dozvana vokativom Milice.'],
  ['ins-olovkom', 'Pišem olovkom.', 'olovkom', 'instrumental', 'akuzativ', 'Olovka je sredstvo pisanja.'],
  ['ins-bratom', 'Šetam sa bratom.', 'bratom', 'instrumental', 'dativ', 'Sa bratom označava društvo.'],
  ['ins-nozem', 'Sečem hleb nožem.', 'nožem', 'instrumental', 'genitiv', 'Nož je sredstvo sečenja.'],
  ['ins-vozom', 'Putujemo vozom.', 'vozom', 'instrumental', 'lokativ', 'Voz je prevozno sredstvo.'],
  ['ins-drugaricom', 'Razgovaram sa drugaricom.', 'drugaricom', 'instrumental', 'vokativ', 'Sa drugaricom označava s kim se razgovara.'],
  ['ins-cetkom', 'Slikam četkom.', 'četkom', 'instrumental', 'nominativ', 'Četkom označava sredstvo slikanja.'],
  ['lok-skoli', 'Učimo u školi.', 'školi', 'lokativ', 'dativ', 'U školi označava mesto, uz predlog u.'],
  ['lok-stolu', 'Sveska leži na stolu.', 'stolu', 'lokativ', 'dativ', 'Na stolu označava mesto na kome sveska leži.'],
  ['lok-selu', 'Baka živi u selu.', 'selu', 'lokativ', 'akuzativ', 'U selu označava mesto stanovanja.'],
  ['lok-parku', 'Sedimo u parku.', 'parku', 'lokativ', 'genitiv', 'U parku je odredba mesta.'],
  ['lok-polici', 'Knjige su na polici.', 'polici', 'lokativ', 'instrumental', 'Na polici označava položaj knjiga.'],
  ['lok-sobi', 'Devojčica crta u sobi.', 'sobi', 'lokativ', 'vokativ', 'U sobi označava mesto radnje.'],
] as const

const VRSTE = [
  ['vlastita', 'Dunav', 'vlastita imenica', 'zajednička imenica', 'Imenuje određenu reku.'],
  ['zajednicka', 'učenik', 'zajednička imenica', 'zbirna imenica', 'Imenuje pripadnika grupe bića.'],
  ['zbirna', 'lišće', 'zbirna imenica', 'gradivna imenica', 'Označava skup listova kao celinu.'],
  ['gradivna', 'brašno', 'gradivna imenica', 'vlastita imenica', 'Označava materiju.'],
  ['misaona', 'radost', 'misaona imenica', 'gradivna imenica', 'Imenuje osećanje, a ne opipljiv predmet.'],
  ['opisni', 'veseo', 'opisni pridev', 'prisvojni pridev', 'Opisuje osobinu.'],
  ['prisvojni', 'Anin', 'prisvojni pridev', 'mesni pridev', 'Označava pripadanje Ani.'],
  ['gradivni', 'drveni', 'gradivni pridev', 'vremenski pridev', 'Označava građu, odnosno materijal.'],
  ['mesni', 'ovdašnji', 'mesni pridev', 'gradivni pridev', 'Označava odnos prema mestu: odavde.'],
  ['vremenski', 'jučerašnji', 'vremenski pridev', 'prisvojni pridev', 'Označava odnos prema vremenu: od juče.'],
] as const

const NEPROMENLJIVE = [
  ['mesto', 'Ovde rastu ruže.', 'Ovde', 'prilog za mesto', 'predlog', 'Pokazuje gde ruže rastu.'],
  ['vreme', 'Sutra putujemo.', 'Sutra', 'prilog za vreme', 'pridev', 'Pokazuje kada putujemo.'],
  ['nacin', 'Ana pažljivo piše.', 'pažljivo', 'prilog za način', 'imenica', 'Pokazuje kako Ana piše.'],
  ['uzrok', 'Zašto ćutiš?', 'Zašto', 'prilog za uzrok', 'predlog', 'Pitanjem zašto traži se uzrok.'],
  ['kolicina', 'Mnogo smo vežbali.', 'Mnogo', 'prilog za količinu', 'veznik', 'Pokazuje koliko smo vežbali.'],
  ['predlog', 'Knjiga je ispod stola.', 'ispod', 'predlog', 'uzvik', 'Uz imenicu označava prostorni odnos.'],
  ['veznik', 'Mila i Uroš pevaju.', 'i', 'veznik', 'predlog', 'Povezuje dve imenice.'],
  ['recca', 'Zar već odlaziš?', 'Zar', 'rečca', 'veznik', 'Rečca zar oblikuje upitnu rečenicu i izražava čuđenje.'],
  ['uzvik', 'Hej, sačekaj!', 'Hej', 'uzvik', 'prilog', 'Služi dozivanju i odvojen je zapetom.'],
] as const

// ID-jevi su trajni: redosled podataka ne sme da promeni istorijske potpise.
const KATEGORIJE = [
  ['osnova', 'skole', 'Koja je gramatička osnova oblika „škole“?', 'škol', 'škole', 'Gramatička osnova oblika „škole“ je', 'Kada od oblika škole odvojimo nastavak -e, ostaje škol-.'],
  ['osnova', 'knjigom', 'Koja je gramatička osnova oblika „knjigom“?', 'knjig', 'knjigo', 'Gramatička osnova oblika „knjigom“ je', 'Odvajanjem nastavka -om ostaje knjig-.'],
  ['nastavak', 'skoli', 'Koji je nastavak za oblik u reči „školi“ (osnova škol-)?', 'i', 'a', 'Nastavak za oblik u reči „školi“ je', 'Oblik školi sastoji se od osnove škol- i nastavka -i.'],
  ['nastavak', 'knjigama', 'Koji je nastavak za oblik u reči „knjigama“ (osnova knjig-)?', 'ama', 'om', 'Nastavak za oblik u reči „knjigama“ je', 'Oblik knjigama rastavlja se na knjig- i -ama.'],
  ['kongruencija', 'zelene', 'Dopuni pridevom „zelen“: Na stolu su ___ jabuke.', 'zelene', 'zeleni', 'Uz imenicu „jabuke“ u rečenici „Na stolu su ___ jabuke“ odgovara oblik', 'Jabuke je ženski rod, množina, nominativ; pridev se s tim slaže.'],
  ['kongruencija', 'malim', 'Dopuni pridevom „mali“: Razgovaram sa ___ detetom.', 'malim', 'malo', 'Uz „detetom“ u rečenici „Razgovaram sa ___ detetom“ odgovara oblik', 'Pridev mora biti u instrumentalu jednine, srednjem rodu.'],
  ['kongruencija', 'vredne', 'Dopuni pridevom „vredan“: Pohvalila je ___ učenice.', 'vredne', 'vrednim', 'Uz „učenice“ u rečenici „Pohvalila je ___ učenice“ odgovara oblik', 'Pridev se slaže s imenicom u ženskom rodu, množini i akuzativu.'],
  ['kongruencija', 'ona', 'Dopuni predikat glagolom „pevati“ u prezentu: Ona ___.', 'peva', 'pevaju', 'Prezent glagola „pevati“ uz subjekat „ona“ glasi', 'Subjekat ona zahteva treće lice jednine.'],
  ['kongruencija', 'mi', 'Dopuni predikat glagolom „čitati“ u prezentu: Mi ___.', 'čitamo', 'čitate', 'Prezent glagola „čitati“ uz subjekat „mi“ glasi', 'Subjekat mi zahteva prvo lice množine.'],
  ['komparacija', 'lep', 'Napiši komparativ prideva „lep“.', 'lepši', 'najlepši', 'Komparativ prideva „lep“ glasi', 'Lepši je komparativ, a najlepši superlativ.'],
  ['komparacija', 'dobar', 'Napiši komparativ prideva „dobar“.', 'bolji', 'dobriji', 'Komparativ prideva „dobar“ glasi', 'Dobar ima nepravilan komparativ bolji.'],
  ['komparacija', 'visok', 'Napiši komparativ prideva „visok“.', 'viši', 'visočiji', 'Komparativ prideva „visok“ glasi', 'Pravilan komparativ je viši.'],
  ['komparacija', 'jak', 'Napiši superlativ prideva „jak“.', 'najjači', 'jači', 'Superlativ prideva „jak“ glasi', 'Na komparativ jači dodaje se naj-: najjači.'],
  ['komparacija', 'brzo', 'Dopuni komparativom priloga „brzo“: Danas trčim ___ nego juče.', 'brže', 'najbrže', 'Komparativ priloga „brzo“ glasi', 'Prilog brzo poredi se: brzo, brže, najbrže.'],
  ['zamenice', 'sebe', 'Koja je lična zamenica za svako lice (napiši puni oblik)?', 'sebe', 'ja', 'Lična zamenica za svako lice, u punom obliku, glasi', 'Zamenica sebe odnosi se na subjekat bez obzira na lice.'],
  ['zamenice', 'mene', 'Koji je puni, naglašeni oblik zamenice „me“?', 'mene', 'meni', 'Puni, naglašeni oblik zamenice „me“ glasi', 'Me je nenaglašeni oblik, a mene naglašeni.'],
  ['zamenice', 'mi', 'Koji je nenaglašeni oblik zamenice „meni“?', 'mi', 'me', 'Nenaglašeni oblik zamenice „meni“ glasi', 'Dativ ima oblike meni i mi, dok je me genitiv ili akuzativ.'],
  ['zamenice', 'ko', 'Kojoj vrsti neličnih imeničkih zamenica pripada „ko“?', 'upitna', 'odrična', 'Vrsta nelične imeničke zamenice „ko“ je', 'Zamenicom ko postavlja se pitanje o licu.'],
  ['zamenice', 'niko', 'Kojoj vrsti neličnih imeničkih zamenica pripada „niko“?', 'odrična', 'neodređena', 'Vrsta nelične imeničke zamenice „niko“ je', 'Niko odriče postojanje lica u datoj situaciji.'],
  ['zamenice', 'neko', 'Kojoj vrsti neličnih imeničkih zamenica pripada „neko“?', 'neodređena', 'opšta', 'Vrsta nelične imeničke zamenice „neko“ je', 'Neko označava neodređeno lice.'],
  ['zamenice', 'svako', 'Kojoj vrsti neličnih imeničkih zamenica pripada „svako“?', 'opšta', 'upitna', 'Vrsta nelične imeničke zamenice „svako“ je', 'Svako obuhvata sva lica pojedinačno.'],
  ['brojevi', 'pet', 'Kojoj vrsti glavnih brojeva pripada „pet“?', 'osnovni', 'zbirni', 'Vrsta glavnog broja „pet“ je', 'Osnovni brojevi označavaju koliko nečega ima.'],
  ['brojevi', 'troje', 'Kojoj vrsti glavnih brojeva pripada „troje“?', 'zbirni', 'osnovni', 'Vrsta glavnog broja „troje“ je', 'Troje je zbirni broj, npr. troje dece.'],
  ['brojevi', 'sesti', 'Kojoj vrsti brojeva pripada „šesti“?', 'redni', 'zbirni', 'Vrsta broja „šesti“ je', 'Šesti označava mesto u redosledu.'],
  ['brojevi', 'dvoje', 'Dopuni zbirnim brojem izvedenim od „dva“: ___ dece.', 'dvoje', 'drugo', 'Zbirni broj izveden od „dva“ glasi', 'Uz decu različitog pola upotrebljava se zbirni broj dvoje.'],
  ['glagolski-vid', 'procitati', 'Odredi glagolski vid glagola „pročitati“.', 'svršeni', 'nesvršeni', 'Glagolski vid glagola „pročitati“ je', 'Pročitati označava radnju sagledanu kao celinu, sa završetkom.'],
  ['glagolski-vid', 'citati', 'Odredi glagolski vid glagola „čitati“.', 'nesvršeni', 'svršeni', 'Glagolski vid glagola „čitati“ je', 'Čitati označava radnju u trajanju, bez isticanja završetka.'],
  ['glagolski-vid', 'napisati', 'Odredi glagolski vid glagola „napisati“.', 'svršeni', 'nesvršeni', 'Glagolski vid glagola „napisati“ je', 'Napisati označava završenu celinu radnje pisanja.'],
  ['glagolski-vid', 'pisati', 'Odredi glagolski vid glagola „pisati“.', 'nesvršeni', 'svršeni', 'Glagolski vid glagola „pisati“ je', 'Pisati ne određuje završetak radnje.'],
  ['glagolski-rod', 'nositi', 'Odredi glagolski rod glagola „nositi“ u rečenici „Nosim torbu.“', 'prelazni', 'neprelazni', 'Glagolski rod glagola „nositi“ u „Nosim torbu“ je', 'Glagol ima pravi objekat torbu: radnja prelazi na predmet.'],
  ['glagolski-rod', 'spavati', 'Odredi glagolski rod glagola „spavati“.', 'neprelazni', 'prelazni', 'Glagolski rod glagola „spavati“ je', 'Spavati ne otvara mesto za pravi objekat.'],
  ['glagolski-rod', 'umivati-se', 'Odredi glagolski rod glagola „umivati se“.', 'povratni', 'prelazni', 'Glagolski rod glagola „umivati se“ je', 'U ovoj upotrebi glagol sadrži se i radnja je usmerena na vršioca.'],
  ['glagolski-rod', 'setati-se', 'Odredi glagolski rod glagola „šetati se“.', 'povratni', 'prelazni', 'Glagolski rod glagola „šetati se“ je', 'Glagol se upotrebljava sa rečcom se.'],
  ['glagolski-oblici', 'infinitiv', 'Imenuj glagolski oblik „pevati“.', 'infinitiv', 'prezent', 'Naziv glagolskog oblika „pevati“ je', 'Infinitiv je osnovni nelični glagolski oblik.'],
  ['glagolski-oblici', 'prezent', 'Imenuj glagolski oblik „pevamo“.', 'prezent', 'perfekat', 'Naziv glagolskog oblika „pevamo“ je', 'Pevamo je prvo lice množine prezenta.'],
  ['glagolski-oblici', 'perfekat', 'Imenuj glagolski oblik „smo pevali“.', 'perfekat', 'futur I', 'Naziv glagolskog oblika „smo pevali“ je', 'Perfekat se gradi od prezenta pomoćnog glagola jesam i radnog glagolskog prideva.'],
  ['glagolski-oblici', 'futur', 'Imenuj glagolski oblik „ćemo pevati“.', 'futur I', 'perfekat', 'Naziv glagolskog oblika „ćemo pevati“ je', 'Futur I ovde čine nenaglašeni prezent glagola hteti i infinitiv.'],
  ['glagolski-oblici', 'radni', 'Koji je nelični glagolski oblik reč „pevala“?', 'radni glagolski pridev', 'infinitiv', 'Naziv neličnog oblika „pevala“ je', 'Pevala je radni glagolski pridev ženskog roda u jednini.'],
  ['glagolske-osnove', 'pevati', 'Napiši infinitivnu osnovu glagola „pevati“.', 'peva', 'pev', 'Infinitivna osnova glagola „pevati“ glasi', 'Od infinitiva pevati uklanja se -ti: peva-.'],
  ['glagolske-osnove', 'citati', 'Napiši infinitivnu osnovu glagola „čitati“.', 'čita', 'čit', 'Infinitivna osnova glagola „čitati“ glasi', 'Od infinitiva čitati uklanja se -ti: čita-.'],
  ['glagolske-osnove', 'pisati', 'Napiši prezentsku osnovu glagola „pisati“ (mi pišemo).', 'piše', 'pisa', 'Prezentska osnova glagola „pisati“ glasi', 'Od pišemo odvaja se nastavak -mo: piše-.'],
  ['glagolske-osnove', 'nositi', 'Napiši prezentsku osnovu glagola „nositi“ (mi nosimo).', 'nosi', 'nos', 'Prezentska osnova glagola „nositi“ glasi', 'Od nosimo odvaja se -mo: nosi-.'],
  ['pomocni-glagoli', 'jesam', 'Koji je naglašeni oblik prezenta uz „ja“ za nenaglašeno „sam“?', 'jesam', 'jeste', 'Naglašeni oblik koji odgovara obliku „sam“ je', 'Jesam i sam jesu naglašeni i nenaglašeni oblik prvog lica jednine.'],
  ['pomocni-glagoli', 'hocu', 'Koji je nenaglašeni oblik prezenta „hoću“?', 'ću', 'će', 'Nenaglašeni oblik prezenta „hoću“ je', 'Hoću i ću jesu oblici prvog lica jednine glagola hteti.'],
] as const

const SLUZBE = [
  ['subjekat', 'Mila piše pismo.', 'Mila', 'subjekat', 'objekat', 'Mila je vršilac radnje.'],
  ['glagolski-predikat', 'Dečak trči.', 'trči', 'glagolski predikat', 'imenski predikat', 'Predikat je iskazan glagolom koji označava radnju.'],
  ['imenski-predikat', 'Moj brat je lekar.', 'je lekar', 'imenski predikat', 'glagolski predikat', 'Predikat čine spona je i imenski deo lekar.'],
  ['pravi-objekat', 'Čitam knjigu.', 'knjigu', 'pravi objekat', 'nepravi objekat', 'Knjigu je akuzativ bez predloga uz prelazni glagol.'],
  ['nepravi-objekat', 'Pomažem sestri.', 'sestri', 'nepravi objekat', 'pravi objekat', 'Sestri je dopuna glagolu u dativu, a ne akuzativu bez predloga.'],
  ['mesto', 'Deca se igraju u dvorištu.', 'u dvorištu', 'priloška odredba za mesto', 'priloška odredba za vreme', 'Izraz odgovara na pitanje gde se igraju.'],
  ['vreme', 'Sutra dolazi tetka.', 'Sutra', 'priloška odredba za vreme', 'priloška odredba za način', 'Sutra odgovara na pitanje kada dolazi.'],
  ['nacin', 'Voz polako kreće.', 'polako', 'priloška odredba za način', 'atribut', 'Polako pokazuje kako voz kreće.'],
  ['uzrok', 'Drhti od hladnoće.', 'od hladnoće', 'priloška odredba za uzrok', 'priloška odredba za mesto', 'Izraz kazuje zbog čega drhti.'],
  ['kolicina', 'Juče smo mnogo vežbali.', 'mnogo', 'priloška odredba za količinu', 'priloška odredba za vreme', 'Mnogo kazuje koliko smo vežbali.'],
  ['atribut', 'Plavi ranac je na klupi.', 'Plavi', 'atribut', 'subjekat', 'Plavi određuje imenicu ranac.'],
  ['apozicija', 'Mila, moja drugarica, svira violinu.', 'moja drugarica', 'apozicija', 'pravi objekat', 'Izraz dodatno imenuje Milu i izdvaja se zapetama.'],
] as const

export const GRAMATIKA5: ZadatakSrpski5[] = [
  ...PADEZI.map(([id, recenica, rec, tacan, pogresan, razlog]) => zadatak5(
    'padezi', id, `U kom padežu je reč „${rec}“ u rečenici „${recenica}“? Napiši naziv padeža.`, tacan, pogresan,
    `Padež reči „${rec}“ u rečenici „${recenica}“ je`, razlog, [tacan + 'u', 'u ' + tacan + 'u'],
  )),
  ...VRSTE.map(([id, rec, tacan, pogresan, razlog]) => zadatak5(
    'vrste-reci', id, `Odredi vrstu i podvrstu reči „${rec}“ (npr. opisni pridev).`, tacan, pogresan,
    `Vrsta i podvrsta reči „${rec}“ je`, razlog,
  )),
  ...NEPROMENLJIVE.map(([id, recenica, rec, tacan, pogresan, razlog]) => zadatak5(
    'nepromenljive', id, `Kojoj nepromenljivoj vrsti reči pripada „${rec}“ u „${recenica}“? Za prilog navedi i vrstu po značenju.`,
    tacan, pogresan, `Vrsta reči „${rec}“ u rečenici „${recenica}“ je`, razlog,
  )),
  ...KATEGORIJE.map(([porodica, id, pitanje, tacan, pogresan, pocetak, razlog]) => zadatak5(
    porodica, id, pitanje, tacan, pogresan, pocetak, razlog,
    porodica === 'osnova' || porodica === 'glagolske-osnove' ? [tacan + '-']
      : porodica === 'nastavak' ? ['-' + tacan]
      : tacan === 'futur I' ? ['futur prvi', 'futur 1', 'futur']
      : porodica === 'zamenice' && ['upitna', 'odrična', 'neodređena', 'opšta'].includes(tacan) ? [tacan + ' zamenica']
      : porodica === 'brojevi' && ['osnovni', 'zbirni', 'redni'].includes(tacan) ? [tacan + ' broj']
      : porodica === 'glagolski-vid' ? [tacan + ' vid', tacan + ' glagol']
      : porodica === 'glagolski-rod' ? [tacan + ' glagol'] : undefined,
  )),
  ...SLUZBE.map(([id, recenica, izraz, tacan, pogresan, razlog]) => zadatak5(
    'recenicni-clanovi', id, `Odredi službu izraza „${izraz}“ u rečenici „${recenica}“. Kod predikata i objekta navedi i podvrstu.`,
    tacan, pogresan, `Služba izraza „${izraz}“ u rečenici „${recenica}“ je`, razlog,
  )),
]

export const srpskiGramatika5 = napraviSrpskiGenerator5('srpski-gramatika-5', GRAMATIKA5)
