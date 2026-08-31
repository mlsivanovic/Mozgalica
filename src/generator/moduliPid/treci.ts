import { napraviPidGenerator, type PidCinjenica, type PidOblast, type PidPar } from './zajednicko.ts'

function c(
  id: string, porodica: string, pitanje: string, tacan: string, netacni: readonly string[],
  tacnaTvrdnja: string, netacnaTvrdnja: string, objasnjenje: string, hint: string,
): PidCinjenica {
  return { id, porodica, pitanje, tacan, netacni, tacnaTvrdnja, netacnaTvrdnja, objasnjenje, hint }
}

function p(id: string, levo: string, desno: string): PidPar { return { id, levo, desno } }

const prirodaCovekDrustvo: PidOblast = {
  slug: 'pid-priroda-covek-drustvo-3',
  povezivanjeTekst: 'Poveži pojam iz prirode ili društva sa odgovarajućim opisom.',
  cinjenice: [
    c('reljef-vrh', 'reljef', 'Kako se zove najviši deo uzvišenja?', 'vrh', ['podnožje', 'obronak', 'udubljenje'],
      'Vrh je najviši deo uzvišenja.', 'Podnožje je najviši deo uzvišenja.',
      'Uzvišenje ima podnožje, strane, obronke i vrh; vrh je njegov najviši deo.', 'Zamisli put od podnožja ka najvišoj tački.'),
    c('pritoka', 'povrsinske-vode', 'Kako se zove vodotok koji se uliva u veću reku?', 'pritoka', ['obala', 'izvor svetlosti', 'ravnica'],
      'Pritoka je vodotok koji se uliva u veću reku.', 'Pritoka je deo kopna između dve reke.',
      'Pritoka donosi vodu u veću reku u koju se uliva.', 'Seti se značenja glagola „priticati”.'),
    c('delatnosti', 'delatnosti', 'Koja je delatnost proizvodna?', 'pravljenje nameštaja', ['lečenje pacijenata', 'podučavanje učenika', 'prevoz putnika'],
      'Pravljenje nameštaja je proizvodna delatnost.', 'Prevoz putnika je proizvodna delatnost.',
      'Proizvodne delatnosti stvaraju proizvode; uslužne delatnosti pružaju usluge.', 'Zapitaj se da li nastaje proizvod koji možemo koristiti.'),
    c('selo-grad', 'naselja', 'Koji primer najbolje pokazuje povezanost sela i grada?', 'Hrana sa sela prodaje se u gradu, a mašine iz grada koriste se na selu.', ['Selo i grad ne razmenjuju proizvode.', 'Stanovnici sela nikada ne odlaze u grad.', 'U gradu nema proizvoda sa sela.'],
      'Selo i grad su povezani razmenom proizvoda i usluga.', 'Selo i grad nemaju međusobne veze.',
      'Naselja zavise jedna od drugih kroz proizvodnju, trgovinu, rad, školovanje i saobraćaj.', 'Potraži primer u kome obe sredine doprinose.'),
    c('informacioni-saobracaj', 'saobracaj', 'Čemu prvenstveno služi informacioni saobraćaj?', 'prenošenju poruka i podataka', ['prevozu tereta', 'prevozu putnika', 'navodnjavanju njiva'],
      'Informacioni saobraćaj prenosi poruke i podatke.', 'Informacioni saobraćaj služi samo prevozu robe.',
      'Telefon, internet, radio i pošta omogućavaju razmenu poruka i podataka.', 'Razmisli šta putuje komunikacionim mrežama.'),
    c('kaciga', 'bezbednost-saobracaj', 'Koja oprema štiti glavu pri vožnji bicikla, rolera ili trotineta?', 'kaciga', ['kišobran', 'šal', 'ranac'],
      'Kaciga štiti glavu pri vožnji bicikla, rolera ili trotineta.', 'Kaciga nije potrebna pri vožnji bicikla.',
      'Pravilno postavljena kaciga smanjuje rizik od povrede glave.', 'Izaberi zaštitnu opremu namenjenu glavi.'),
    c('stanja-vode', 'stanja-vode', 'U kom stanju je vodena para?', 'gasovitom', ['čvrstom', 'tečnom', 'rastvorenom'],
      'Vodena para predstavlja vodu u gasovitom stanju.', 'Led predstavlja vodu u gasovitom stanju.',
      'Voda se javlja kao led, tečna voda i vodena para.', 'Seti se tri agregatna stanja vode.'),
    c('kruzenje-vode', 'kruzenje-vode', 'Šta se dešava sa vodenom parom kada se dovoljno ohladi?', 'kondenzuje se u sitne kapljice', ['pretvara se u metal', 'nestaje bez traga', 'postaje toplija'],
      'Hlađenjem se vodena para kondenzuje u sitne kapljice.', 'Hlađenjem se voda uvek pretvara u vodenu paru.',
      'Kondenzacija je prelazak iz gasovitog u tečno stanje i deo je kruženja vode.', 'Seti se kapljica na hladnom staklu.'),
    c('zagrejan-vazduh', 'vazduh-temperatura', 'Kako se najčešće ponaša zagrejan vazduh?', 'širi se i podiže', ['skuplja se i pada', 'pretvara se u vodu', 'prestaje da zauzima prostor'],
      'Zagrejan vazduh se širi i podiže.', 'Zagrejan vazduh se skuplja i uvek pada.',
      'Zagrevanjem se vazduh širi, postaje ređi i podiže se.', 'Razmisli zašto se topao vazduh podiže iznad grejnog tela.'),
    c('termometar', 'merenje-temperature', 'Kojim instrumentom merimo temperaturu vazduha, vode ili tela?', 'termometrom', ['kompasom', 'lenjirom', 'vagom'],
      'Temperatura se meri termometrom.', 'Temperatura se meri kompasom.',
      'Termometar pokazuje temperaturu, dok kompas pokazuje strane sveta.', 'Instrument u nazivu ima deo „termo”.'),
    c('lanac-ishrane', 'lanci-ishrane', 'Koji niz predstavlja moguć lanac ishrane na livadi?', 'trava → skakavac → žaba', ['žaba → trava → Sunce', 'kamen → trava → skakavac', 'skakavac → vazduh → trava'],
      'Trava → skakavac → žaba može biti lanac ishrane na livadi.', 'Kamen → trava → skakavac je lanac ishrane.',
      'Biljku jede biljojed, a njega može pojesti druga životinja.', 'Lanac obično počinje biljkom.'),
    c('kultivisana-zajednica', 'zivotne-zajednice', 'Koja životna zajednica je kultivisana, odnosno uređena radom čoveka?', 'voćnjak', ['prirodna šuma', 'reka', 'bara'],
      'Voćnjak je kultivisana životna zajednica.', 'Prirodna reka je kultivisana životna zajednica.',
      'Voćnjake, povrtnjake, njive i parkove čovek planski uređuje i održava.', 'Potraži zajednicu koju čovek sadi i neguje.'),
    c('zastita-voda', 'zastita-prirode', 'Koji postupak štiti vodene životne zajednice?', 'sprečavanje bacanja otpada u vodu', ['ispuštanje ulja u reku', 'ostavljanje plastike na obali', 'uništavanje biljaka uz vodu'],
      'Sprečavanje zagađenja vode štiti vodene životne zajednice.', 'Bacanje otpada u reku pomaže vodenim životnim zajednicama.',
      'Čista voda je uslov života biljaka, životinja i ljudi.', 'Izaberi postupak koji ne unosi zagađivače.'),
    c('zarazne-bolesti', 'zdravlje', 'Koji postupak smanjuje širenje zaraznih bolesti?', 'redovno pranje ruku', ['deljenje iste čaše sa bolesnom osobom', 'dodirivanje lica neopranim rukama', 'izbegavanje provetravanja'],
      'Redovno pranje ruku pomaže u sprečavanju širenja zaraznih bolesti.', 'Deljenje čaše sa bolesnom osobom sprečava zarazu.',
      'Higijena ruku, provetravanje i odgovorno ponašanje smanjuju mogućnost prenosa zaraze.', 'Izaberi higijensku meru.'),
  ],
  parovi: [
    p('podnozje', 'Podnožje', 'najniži deo uzvišenja'), p('pritoka', 'Pritoka', 'vodotok koji se uliva u veću reku'),
    p('park', 'Park', 'kultivisana životna zajednica'), p('livada', 'Livada', 'kopnena životna zajednica'),
    p('teretni', 'Teretni saobraćaj', 'prevoz robe'), p('informacioni', 'Informacioni saobraćaj', 'prenos poruka i podataka'),
    p('termometar', 'Termometar', 'merenja temperature'), p('reciklaza', 'Reciklaža', 'ponovna prerada korisnog otpada'),
    p('kaciga', 'Kaciga', 'zaštita glave u vožnji'), p('pranje-ruku', 'Pranje ruku', 'mera zaštite od zaraznih bolesti'),
  ],
}

const orijentacija: PidOblast = {
  slug: 'pid-orijentacija-3',
  povezivanjeTekst: 'Poveži pojam za orijentaciju u prostoru i vremenu sa njegovim značenjem.',
  cinjenice: [
    c('suprotno-sever', 'strane-sveta', 'Koja glavna strana sveta je nasuprot severu?', 'jug', ['istok', 'zapad', 'severoistok'],
      'Jug je nasuprot severu.', 'Istok je nasuprot severu.', 'Parovi suprotnih glavnih strana su sever–jug i istok–zapad.', 'Zamisli kompasnu ružu.'),
    c('izlazak-sunca', 'strane-sveta', 'Na kojoj strani sveta Sunce prividno izlazi?', 'istoku', ['zapadu', 'severu', 'jugu'],
      'Sunce prividno izlazi na istoku.', 'Sunce prividno izlazi na zapadu.', 'Usled Zemljinog okretanja Sunce nam prividno izlazi na istoku.', 'Suprotna strana je ona na kojoj zalazi.'),
    c('kompas', 'orijentacija', 'Šta pokazuje magnetna igla kompasa kada se umiri?', 'pravac sever–jug', ['temperaturu vazduha', 'nadmorsku visinu', 'protok reke'],
      'Magnetna igla kompasa pokazuje pravac sever–jug.', 'Kompas meri temperaturu vazduha.', 'Kompas služi orijentaciji prema stranama sveta.', 'Seti se čemu služi kompas.'),
    c('pticja-perspektiva', 'plan-naselja', 'Iz koje perspektive se objekti prikazuju na planu naselja?', 'odozgo, iz „ptičje” perspektive', ['samo iznutra', 'uvek sa nivoa tla', 'isključivo ispod zemlje'],
      'Plan prikazuje objekte odozgo, iz „ptičje” perspektive.', 'Plan naselja prikazuje objekte samo iznutra.', 'Pogled odozgo omogućava da se vide položaji ulica i objekata.', 'Zamisli pogled ptice iznad naselja.'),
    c('umanjenje', 'plan-naselja', 'Zašto se objekti na planu prikazuju umanjeno?', 'da bi veći prostor stao na manju podlogu', ['da bi promenili stvarni položaj', 'da bi nestale ulice', 'da bi sever postao jug'],
      'Umanjenje omogućava da se veći prostor prikaže na manjoj podlozi.', 'Umanjeni prikaz menja stvarni raspored objekata.', 'Plan zadržava odnose položaja, ali ih prikazuje u manjoj veličini.', 'Uporedi stvarno naselje sa listom papira.'),
    c('plava-boja', 'geografska-karta', 'Šta se na geografskoj karti najčešće prikazuje plavom bojom?', 'vode', ['putevi', 'državne granice', 'naselja'],
      'Vode se na karti najčešće prikazuju plavom bojom.', 'Planine se na karti najčešće prikazuju plavom bojom.', 'Plava kartografska boja koristi se za reke, jezera i druge vode.', 'Poveži boju sa onim što je i u prirodi povezujemo sa plavom.'),
    c('kartografski-znak', 'geografska-karta', 'Čemu služi kartografski znak?', 'da jednostavno prikaže određeni objekat ili pojavu', ['da izmeri temperaturu', 'da promeni granice države', 'da odredi starost predmeta'],
      'Kartografski znak predstavlja određeni objekat ili pojavu na karti.', 'Kartografski znak služi za merenje temperature.', 'Legenda objašnjava značenje kartografskih znakova.', 'Potraži vezu između znaka i legende karte.'),
    c('decenija', 'vremenske-odrednice', 'Koliko godina ima jedna decenija?', '10', ['5', '50', '100'],
      'Jedna decenija traje deset godina.', 'Jedna decenija traje sto godina.', 'Naziv decenija označava period od deset godina.', 'Prefiks „deci” upućuje na deset.'),
    c('vek', 'vremenske-odrednice', 'Koliko godina ima jedan vek?', '100', ['10', '50', '1000'],
      'Jedan vek traje sto godina.', 'Jedan vek traje deset godina.', 'Vek je vremenski period od sto godina.', 'Deset decenija čini jedan vek.'),
    c('datum', 'vremenske-odrednice', 'Koja vremenska odrednica precizno označava dan, mesec i godinu?', 'datum', ['legenda', 'razmera', 'kompas'],
      'Datum označava dan, mesec i godinu.', 'Kompas označava dan, mesec i godinu.', 'Datum služi preciznom smeštanju događaja u vreme.', 'Pogledaj šta zapisujemo kada beležimo kada se nešto dogodilo.'),
  ],
  parovi: [
    p('sever', 'Sever', 'nasuprot jugu'), p('istok', 'Istok', 'strana prividnog izlaska Sunca'),
    p('kompas', 'Kompas', 'orijentacija prema stranama sveta'), p('plan', 'Plan naselja', 'umanjen prikaz prostora odozgo'),
    p('legenda', 'Legenda karte', 'objašnjenje kartografskih znakova'), p('plavo', 'Plava boja na karti', 'vode'),
    p('decenija', 'Decenija', '10 godina'), p('vek', 'Vek', '100 godina'),
    p('datum', 'Datum', 'dan, mesec i godina'), p('pticja', '„Ptičja” perspektiva', 'pogled odozgo'),
  ],
}

const proslost: PidOblast = {
  slug: 'pid-proslost-3',
  povezivanjeTekst: 'Poveži pojam iz proučavanja prošlosti sa odgovarajućim primerom ili značenjem.',
  cinjenice: [
    c('materijalni-izvor', 'istorijski-izvori', 'Šta je materijalni istorijski izvor?', 'stari novčić', ['priča bake', 'zapis u dnevniku', 'budući plan putovanja'],
      'Stari novčić je materijalni istorijski izvor.', 'Priča svedoka je materijalni istorijski izvor.', 'Predmeti i građevine iz prošlosti pripadaju materijalnim izvorima.', 'Izaberi predmet koji je sačuvan iz prošlosti.'),
    c('pisani-izvor', 'istorijski-izvori', 'Šta je pisani istorijski izvor?', 'staro pismo', ['porodična priča ispričana usmeno', 'alatka bez natpisa', 'savremeni razgovor telefonom'],
      'Staro pismo je pisani istorijski izvor.', 'Usmeno sećanje je pisani istorijski izvor.', 'Pisma, dnevnici i dokumenti prenose podatke zapisom.', 'Potraži izvor koji sadrži zapis.'),
    c('usmeni-izvor', 'istorijski-izvori', 'Koji primer je usmeni istorijski izvor?', 'sećanje pradede ispričano porodici', ['stara fotografija', 'krštenica', 'novčić'],
      'Ispričano sećanje je usmeni istorijski izvor.', 'Novčić je usmeni istorijski izvor.', 'Usmeni izvori prenose se govorom, često kroz sećanja i kazivanja.', 'Izaberi primer koji slušamo.'),
    c('predak', 'porodicna-proslost', 'Ko je predak?', 'član porodice koji je živeo pre nas', ['član porodice koji će se tek roditi', 'svaki naš vršnjak', 'isključivo komšija'],
      'Predak je član porodice koji je živeo pre nas.', 'Predak je potomak koji će živeti posle nas.', 'Roditelji, bake, deke i stariji naraštaji pripadaju našim precima.', 'Razmišljaj unazad kroz porodično stablo.'),
    c('potomak', 'porodicna-proslost', 'Ko je potomak neke osobe?', 'član porodice iz narednih naraštaja', ['isključivo njen predak', 'svaki stanovnik istog grada', 'predmet iz muzeja'],
      'Potomci pripadaju naraštajima koji dolaze posle određene osobe.', 'Potomak je osoba koja je živela pre svog pretka.', 'Deca, unuci i kasniji naraštaji jesu potomci.', 'Kreći se unapred kroz porodično stablo.'),
    c('sadasnjost', 'vremenske-odrednice', 'Koja odrednica označava vreme u kome sada živimo?', 'sadašnjost', ['prošlost', 'budućnost', 'vek'],
      'Sadašnjost je vreme u kome sada živimo.', 'Budućnost je vreme u kome sada živimo.', 'Prošlost je bila, sadašnjost traje, a budućnost tek dolazi.', 'U nazivu se krije reč „sada”.'),
    c('hronologija', 'redosled-dogadjaja', 'Kako događaje poređamo hronološki?', 'od ranijeg ka kasnijem', ['po dužini njihovog naziva', 'nasumično', 'samo po mestu događaja'],
      'Hronološki red prati događaje od ranijeg ka kasnijem.', 'Hronološki red raspoređuje događaje nasumično.', 'Hronologija prati vremenski sled događaja.', 'Prvo ide ono što se ranije dogodilo.'),
    c('promene-zanimanja', 'zivot-nekad-i-sad', 'Zašto se neka zanimanja kroz vreme menjaju ili nestaju?', 'zbog promena potreba, alata i tehnologije', ['zato što se prošlost nikada ne menja', 'zato što ljudi više nemaju potrebe', 'isključivo zbog godišnjih doba'],
      'Promene potreba, alata i tehnologije utiču na zanimanja.', 'Zanimanja se nikada ne menjaju kroz vreme.', 'Način rada prati razvoj društva, znanja, alata i tehnologije.', 'Uporedi stare zanate sa savremenim poslovima.'),
    c('porodicna-fotografija', 'porodicna-proslost', 'Šta možemo pouzdano zaključivati iz stare porodične fotografije?', 'kako su ljudi izgledali i bili odeveni u tom trenutku', ['tačno šta su mislili', 'sve događaje u njihovom životu', 'šta će se dogoditi u budućnosti'],
      'Fotografija može pokazati izgled, odeću i okruženje u trenutku snimanja.', 'Fotografija pouzdano otkriva sve misli snimljenih ljudi.', 'Izvor daje određene podatke, ali ne odgovara na svako pitanje.', 'Zaključi samo ono što se zaista može videti.'),
    c('vise-izvora', 'istorijski-izvori', 'Zašto je korisno uporediti više istorijskih izvora?', 'da bismo dobili potpuniju i pouzdaniju sliku', ['da bismo uklonili sve razlike', 'da ne bismo morali da proveravamo podatke', 'da bismo promenili prošlost'],
      'Poređenje više izvora daje potpuniju i pouzdaniju sliku prošlosti.', 'Jedan izvor uvek odgovara na sva pitanja o prošlosti.', 'Različiti izvori mogu dopuniti ili proveriti podatke.', 'Razmisli zašto istraživači ne koriste samo jedan trag.'),
  ],
  parovi: [
    p('materijalni', 'Stari novčić', 'materijalni izvor'), p('pisani', 'Dnevnik', 'pisani izvor'),
    p('usmeni', 'Kazivanje svedoka', 'usmeni izvor'), p('predak', 'Predak', 'član porodice iz ranijeg naraštaja'),
    p('potomak', 'Potomak', 'član porodice iz kasnijeg naraštaja'), p('proslost', 'Prošlost', 'vreme koje je bilo'),
    p('sadasnjost', 'Sadašnjost', 'vreme koje traje sada'), p('buducnost', 'Budućnost', 'vreme koje tek dolazi'),
    p('hronologija', 'Hronologija', 'redosled događaja kroz vreme'), p('fotografija', 'Stara fotografija', 'slikovni trag prošlosti'),
  ],
}

const kretanje: PidOblast = {
  slug: 'pid-kretanje-3',
  povezivanjeTekst: 'Poveži pojavu kretanja, svetlosti ili zvuka sa odgovarajućim opisom.',
  cinjenice: [
    c('pravolinijsko', 'putanja', 'Kako se zove kretanje po pravoj putanji?', 'pravolinijsko', ['krivolinijsko', 'kružno svetlosno', 'nepovratno'],
      'Kretanje po pravoj putanji je pravolinijsko.', 'Kretanje po pravoj putanji je krivolinijsko.', 'Naziv kretanja opisuje oblik putanje tela.', 'Pogledaj da li putanja skreće.'),
    c('krivolinijsko', 'putanja', 'Koji primer predstavlja krivolinijsko kretanje?', 'lopta koja leti u luku', ['lift koji ide pravo nagore', 'voz na potpuno pravoj deonici', 'knjiga koja miruje'],
      'Lopta koja leti u luku kreće se krivolinijski.', 'Lift koji ide pravo nagore kreće se krivolinijski.', 'Krivolinijska putanja menja pravac i nije prava linija.', 'Pronađi putanju koja je zakrivljena.'),
    c('jace-delovanje', 'sila-i-rastojanje', 'Šta se obično događa sa istom loptom kada je u istim uslovima gurnemo jače?', 'pređe veće rastojanje', ['uvek ostane na mestu', 'pretvori se u svetlost', 'pređe manje rastojanje bez obzira na podlogu'],
      'U istim uslovima jače guranje može povećati pređeno rastojanje.', 'Jačina delovanja nikada ne utiče na kretanje tela.', 'Jače delovanje menja kretanje tela, uz iste ostale uslove.', 'Uporedi dva guranja iste lopte na istoj podlozi.'),
    c('zemljina-teza', 'zemljina-teza', 'Zbog kog delovanja predmeti pušteni iz ruke padaju ka tlu?', 'Zemljine teže', ['zvuka', 'senke', 'isparavanja'],
      'Zemljina teža privlači tela ka Zemlji.', 'Senka privlači tela ka Zemlji.', 'Gravitaciono delovanje Zemlje uzrokuje padanje tela.', 'Seti se sile koja nas zadržava na tlu.'),
    c('oblik-padanje', 'padanje-tela', 'Zašto zgužvan list papira obično pada brže od ravnog lista?', 'oblik mu pruža manji otpor vazduha', ['ima drugačiju boju', 'više ne deluje Zemljina teža', 'ravni list nema masu'],
      'Oblik tela može promeniti otpor vazduha i brzinu padanja.', 'Oblik tela nikada ne utiče na brzinu padanja kroz vazduh.', 'Ravan list nailazi na veći otpor vazduha od zgužvanog.', 'Uporedi površinu koja udara u vazduh.'),
    c('prirodni-izvor', 'izvori-svetlosti', 'Koji je prirodni izvor svetlosti?', 'Sunce', ['sijalica', 'baterijska lampa', 'ulična svetiljka'],
      'Sunce je prirodni izvor svetlosti.', 'Mesec je veštački napravljen izvor svetlosti.', 'Prirodni izvori postoje bez ljudske izrade; Sunce samo emituje svetlost.', 'Izaberi izvor koji nije napravio čovek.'),
    c('senka', 'senka', 'Kada nastaje senka neprovidnog predmeta?', 'kada predmet zakloni svetlost', ['kada nema ni predmeta ni izvora svetlosti', 'kada predmet potpuno propušta svetlost', 'samo kada pada kiša'],
      'Senka nastaje kada neprovidan predmet zakloni svetlost.', 'Senka nastaje bez izvora svetlosti.', 'Iza osvetljenog neprovidnog predmeta ostaje prostor do kog svetlost ne dopire.', 'Potrebni su izvor svetlosti i prepreka.'),
    c('blizi-izvor-senka', 'senka', 'Šta se najčešće dešava sa senkom predmeta kada izvor svetlosti približimo predmetu?', 'senka postaje veća', ['senka uvek nestaje', 'senka postaje izvor svetlosti', 'predmet postaje providan'],
      'Približavanjem izvora svetlosti predmetu senka najčešće postaje veća.', 'Položaj izvora svetlosti ne može promeniti senku.', 'Veličina i položaj senke zavise od položaja izvora, predmeta i podloge.', 'Zamisli baterijsku lampu sve bliže igrački.'),
    c('zvuk-vibracije', 'nastanak-zvuka', 'Kako nastaje zvuk na zategnutoj žici?', 'treperenjem žice', ['isparavanjem žice', 'mirovanjem žice bez delovanja', 'pretvaranjem žice u magnet'],
      'Treperenje zategnute žice proizvodi zvuk.', 'Potpuno mirna žica sama proizvodi zvuk.', 'Izvori zvuka trepere i pokreću okolni vazduh.', 'Posmatraj žicu instrumenta posle trzaja.'),
    c('udaljenost-zvuk', 'jacina-zvuka', 'Kako se obično menja jačina zvuka kada se udaljavamo od njegovog izvora?', 'zvuk postaje tiši', ['zvuk uvek postaje glasniji', 'zvuk se pretvara u svetlost', 'udaljenost nema nikakav uticaj'],
      'Udaljavanjem od izvora zvuk obično postaje tiši.', 'Udaljavanjem od izvora zvuk uvek postaje glasniji.', 'Do veće udaljenosti stiže manje zvučne energije.', 'Uporedi zvuk zvona iz blizine i daljine.'),
    c('zastita-buka', 'zastita-od-buke', 'Koji postupak pomaže zaštiti sluha od buke?', 'smanjivanje jačine zvuka i udaljavanje od izvora', ['pojačavanje slušalica', 'dugo stajanje uz zvučnik', 'ignorisanjem bola u ušima'],
      'Smanjivanje jačine i udaljavanje od buke štite sluh.', 'Dug boravak uz veoma glasan zvučnik štiti sluh.', 'Prejaka i dugotrajna buka može oštetiti sluh.', 'Izaberi postupak koji smanjuje izloženost.'),
  ],
  parovi: [
    p('prava', 'Pravolinijsko kretanje', 'putanja je prava'), p('kriva', 'Krivolinijsko kretanje', 'putanja je zakrivljena'),
    p('teza', 'Zemljina teža', 'privlači tela ka Zemlji'), p('sunce', 'Sunce', 'prirodni izvor svetlosti'),
    p('sijalica', 'Sijalica', 'veštački izvor svetlosti'), p('senka', 'Senka', 'nastaje zaklanjanjem svetlosti'),
    p('zica', 'Zategnuta žica', 'treperenjem proizvodi zvuk'), p('udaljavanje', 'Udaljavanje od izvora zvuka', 'zvuk postaje tiši'),
    p('kaciga-sluh', 'Štitnici za uši', 'zaštita od jake buke'), p('otpor', 'Otpor vazduha', 'može uticati na padanje tela'),
  ],
}

const materijali: PidOblast = {
  slug: 'pid-materijali-3',
  povezivanjeTekst: 'Poveži promenu ili svojstvo materijala sa odgovarajućim primerom.',
  cinjenice: [
    c('savijanje', 'povratne-promene', 'Koja promena može biti povratna ako se predmet vrati u prvobitni oblik?', 'savijanje elastične trake', ['sagorevanje papira', 'rđanje eksera', 'pečenje testa'],
      'Savijanje elastične trake može biti povratna promena.', 'Sagorevanje papira je povratna promena.', 'Kod povratne promene materijal se može vratiti u prethodno stanje.', 'Proveri da li posle promene možemo dobiti početni predmet.'),
    c('sagorevanje', 'nepovratne-promene', 'Koja promena materijala je nepovratna?', 'sagorevanje drveta', ['topljenje leda', 'istezanje gumice', 'kondenzovanje pare'],
      'Sagorevanje drveta je nepovratna promena.', 'Topljenje i ponovno očvršćavanje vode je nepovratna promena.', 'Od pepela i gasova ne možemo jednostavno ponovo dobiti početno drvo.', 'Potraži promenu posle koje ne vraćamo početni materijal.'),
    c('kondenzacija', 'promene-stanja', 'Kako se zove prelazak vodene pare u tečnost?', 'kondenzacija', ['isparavanje', 'sagorevanje', 'rđanje'],
      'Kondenzacija je prelazak gasovitog stanja u tečno.', 'Isparavanje je prelazak gasovitog stanja u tečno.', 'Hlađenjem pare nastaju sitne kapljice tečnosti.', 'Seti se kapljica na hladnoj površini.'),
    c('tecnosti-oblik', 'svojstva-tecnosti', 'Koje svojstvo je zajedničko vodi, ulju i medu?', 'teku i poprimaju oblik posude', ['uvek imaju isti oblik', 'sve su bezbojne', 'sve imaju istu gustinu'],
      'Tečnosti teku i poprimaju oblik posude.', 'Sve tečnosti imaju istu boju i gustinu.', 'Tečnosti mogu da se razlikuju po boji, providnosti i gustini, ali teku i menjaju oblik.', 'Traži osobinu koja važi za sve navedene tečnosti.'),
    c('usitnjavanje', 'rastvaranje', 'Šta obično ubrzava rastvaranje iste količine šećera u vodi?', 'usitnjavanje šećera', ['pretvaranje vode u led', 'prestanak svakog mešanja', 'dodavanje nerastvorljivog kamenja'],
      'Usitnjavanje povećava površinu materijala i može ubrzati rastvaranje.', 'Krupniji komadi se uvek rastvaraju brže od usitnjenih.', 'Sitnije čestice imaju veću ukupnu dodirnu površinu sa vodom.', 'Uporedi kocku šećera i šećer u prahu.'),
    c('topla-voda', 'rastvaranje', 'U kojoj vodi će se šećer, uz iste ostale uslove, obično brže rastvoriti?', 'u toploj vodi', ['u zaleđenoj vodi', 'uvek podjednako', 'u vodi koja je pretvorena u paru'],
      'Šećer se obično brže rastvara u toploj nego u hladnoj vodi.', 'Temperatura tečnosti nikada ne utiče na brzinu rastvaranja.', 'Viša temperatura ubrzava kretanje čestica i rastvaranje mnogih materijala.', 'Seti se pripremanja toplog napitka.'),
    c('metal-kasika', 'toplotna-provodljivost', 'Zašto se metalna kašika u toplom čaju brzo zagreje?', 'metal dobro provodi toplotu', ['metal stvara hladnoću', 'čaj prestaje da bude tečnost', 'kašika nema masu'],
      'Metal dobro provodi toplotu.', 'Metal je uvek dobar toplotni izolator.', 'Toplota prelazi kroz metal od toplijeg ka hladnijem delu.', 'Uporedi metalnu i drvenu dršku.'),
    c('vazduh-izolator', 'toplotna-izolacija', 'Zašto slojevita odeća bolje čuva toplotu?', 'između slojeva zadržava vazduh koji slabo provodi toplotu', ['zato što vazduh brzo odvodi svu toplotu', 'zato što odeća proizvodi vatru', 'zato što temperatura više ne postoji'],
      'Zarobljeni slojevi vazduha deluju kao toplotni izolator.', 'Vazduh između slojeva odeće ubrzava gubitak toplote.', 'Vazduh slabo provodi toplotu kada je zarobljen između slojeva.', 'Seti se perja, krzna i vunene odeće.'),
    c('staklo-kontejner', 'reciklaza', 'U koji namenski tok otpada spada staklena flaša?', 'staklo', ['papir', 'organski otpad', 'tekstil'],
      'Staklena flaša se razvrstava sa staklenim otpadom.', 'Staklena flaša se razvrstava kao papir.', 'Pravilno razvrstavanje omogućava reciklažu odgovarajućeg materijala.', 'Odredi od kog je materijala predmet napravljen.'),
    c('reciklaza', 'reciklaza', 'Kako reciklaža pomaže očuvanju prirode?', 'smanjuje količinu otpada i potrebu za novim sirovinama', ['uvek povećava količinu otpada', 'zahteva bacanje svih korisnih materijala', 'uklanja potrebu za razvrstavanjem'],
      'Reciklaža smanjuje otpad i čuva sirovine.', 'Reciklaža povećava potrebu za novim sirovinama.', 'Ponovnom preradom deo otpada postaje sirovina za nove proizvode.', 'Razmisli šta se dešava kada materijal ponovo upotrebimo.'),
    c('racionalna-potrosnja', 'odrzivi-razvoj', 'Koji primer predstavlja racionalnu potrošnju?', 'zatvaranje česme dok peremo zube', ['ostavljanje vode da nepotrebno teče', 'bacanje ispravnih stvari', 'paljenje svetla u praznoj sobi'],
      'Zatvaranje česme kada voda nije potrebna predstavlja racionalnu potrošnju.', 'Ostavljanje česme da nepotrebno teče štedi vodu.', 'Racionalna potrošnja koristi resurse samo koliko je potrebno.', 'Izaberi postupak koji sprečava rasipanje.'),
  ],
  parovi: [
    p('topljenje', 'Topljenje leda', 'povratna promena'), p('sagorevanje', 'Sagorevanje papira', 'nepovratna promena'),
    p('isparavanje', 'Isparavanje', 'tečnost prelazi u gas'), p('kondenzacija', 'Kondenzacija', 'gas prelazi u tečnost'),
    p('metal', 'Metal', 'dobar toplotni provodnik'), p('vazduh', 'Zarobljen vazduh', 'toplotni izolator'),
    p('mesanje', 'Mešanje rastvora', 'može ubrzati rastvaranje'), p('usitnjavanje', 'Usitnjavanje', 'povećava dodirnu površinu'),
    p('staklo', 'Staklena flaša', 'otpad za reciklažu stakla'), p('papir', 'Novine', 'otpad za reciklažu papira'),
  ],
}

export const pidPrirodaCovekDrustvo3 = napraviPidGenerator(prirodaCovekDrustvo)
export const pidOrijentacija3 = napraviPidGenerator(orijentacija)
export const pidProslost3 = napraviPidGenerator(proslost)
export const pidKretanje3 = napraviPidGenerator(kretanje)
export const pidMaterijali3 = napraviPidGenerator(materijali)

export const PID_OBLASTI_3 = [
  pidPrirodaCovekDrustvo3, pidOrijentacija3, pidProslost3, pidKretanje3, pidMaterijali3,
]

export const PID_PODACI_3 = [prirodaCovekDrustvo, orijentacija, proslost, kretanje, materijali]
