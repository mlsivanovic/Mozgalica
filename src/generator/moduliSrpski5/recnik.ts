import { napraviSrpskiGenerator5, zadatak5, type ZadatakSrpski5 } from './zajednicko.ts'

type ParReci = readonly [id: string, recenica: string, rec: string, tacan: string, pogresan: string, ...prihvaceni: string[]]
const SINONIMI: readonly ParReci[] = [
  ['hrabar', 'Hrabar vatrogasac je ušao u zgradu.', 'hrabar', 'odvažan', 'plašljiv', 'smeo', 'neustrašiv', 'junačan'],
  ['brz', 'Brz trkač je stigao prvi.', 'brz', 'hitar', 'spor', 'okretan', 'munjevit'],
  ['radostan', 'Radostan dečak maše drugovima.', 'radostan', 'veseo', 'tužan', 'srećan', 'razdragan'],
  ['tuzan', 'Tužan putnik briše suze.', 'tužan', 'žalostan', 'veseo', 'setan', 'nesrećan', 'utučen'],
  ['marljiv', 'Marljiv učenik redovno vežba.', 'marljiv', 'vredan', 'lenj', 'radišan', 'radan'],
  ['dom', 'Posle puta vraćamo se u dom.', 'dom', 'kuću', 'ulicu'],
  ['drum', 'Stari drum vodi do sela.', 'drum', 'put', 'potok', 'cesta'],
  ['pricati', 'Volim da pričam o putovanjima.', 'pričam', 'pripovedam', 'ćutim', 'govorim', 'kazujem'],
  ['gledati', 'Posmatram ptice sa prozora.', 'posmatram', 'gledam', 'slušam', 'promatram'],
  ['suma', 'Gusta šuma se prostire iza sela.', 'šuma', 'gora', 'livada'],
  ['tih', 'Tih glas dopire iz sobe.', 'tih', 'prigušen', 'glasan', 'slab', 'jedva čujan'],
  ['pametan', 'Pametan dečak je rešio zagonetku.', 'pametan', 'bistar', 'glup', 'inteligentan', 'oštrouman', 'mudar'],
  ['ljutit', 'Ljutit čovek se namrštio.', 'ljutit', 'besan', 'smiren', 'srdit', 'ljut', 'razljućen'],
  ['poklon', 'Za rođendan je dobio poklon.', 'poklon', 'dar', 'kaznu'],
  ['smion', 'Smion istraživač kreće na put.', 'smion', 'hrabar', 'plašljiv', 'smeo', 'odvažan', 'neustrašiv'],
  ['ogroman', 'Ogroman kamen zatvara prolaz.', 'ogroman', 'golem', 'sitan', 'velik', 'veliki', 'džinovski'],
  ['malen', 'Malen leptir sleteo je na cvet.', 'malen', 'mali', 'ogroman', 'sitan', 'sićušan'],
  ['jasan', 'Jasan odgovor nije potrebno dodatno objašnjavati.', 'jasan', 'razumljiv', 'nerazumljiv', 'shvatljiv'],
  ['teskoca', 'Ta teškoća se može savladati.', 'teškoća', 'poteškoća', 'olakšica', 'prepreka', 'problem'],
  ['umoran', 'Umoran planinar je seo.', 'umoran', 'iscrpljen', 'odmoran', 'zamoren', 'premoren', 'malaksao'],
  ['cuvati', 'Čuvamo prirodu od zagađenja.', 'čuvamo', 'štitimo', 'uništavamo', 'očuvavamo'],
  ['pocetak', 'Početak predstave je u osam.', 'početak', 'start', 'kraj'],
  ['zavrsiti', 'Završio sam zadatak na vreme.', 'završio', 'dovršio', 'započeo', 'okončao', 'uradio'],
  ['strah', 'Strah ga je sprečio da priđe.', 'strah', 'bojazan', 'hrabrost', 'strepnja', 'plašnja'],
]

const ANTONIMI: readonly ParReci[] = [
  ['dan', 'Dan je bio topao.', 'dan', 'noć', 'jutro'],
  ['svetao', 'Hodnik je svetao.', 'svetao', 'taman', 'osvetljen', 'mračan'],
  ['topao', 'Čaj je topao.', 'topao', 'hladan', 'vruć', 'leden'],
  ['visok', 'Ovaj zid je visok.', 'visok', 'nizak', 'dugačak'],
  ['sirok', 'Most je širok.', 'širok', 'uzak', 'velik', 'tesan'],
  ['dubok', 'Potok je dubok.', 'dubok', 'plitak', 'hladan'],
  ['tezak', 'Ranac je težak.', 'težak', 'lak', 'pun', 'lagan'],
  ['mek', 'Jastuk je mek.', 'mek', 'tvrd', 'nežan'],
  ['cist', 'Peškir je čist.', 'čist', 'prljav', 'uredan', 'uprljan'],
  ['mlad', 'Drvored je mlad.', 'mlad', 'star', 'nov'],
  ['blizu', 'Škola je blizu.', 'blizu', 'daleko', 'ovde'],
  ['rano', 'Ustajem rano.', 'rano', 'kasno', 'brzo'],
  ['ulaz', 'Ovo je ulaz u salu.', 'ulaz', 'izlaz', 'vrata'],
  ['pocetak', 'Pamtim početak priče.', 'početak', 'kraj', 'uvod', 'završetak'],
  ['uspeh', 'Tim je ostvario uspeh.', 'uspeh', 'neuspeh', 'pobedu', 'poraz'],
  ['istina', 'To je istina.', 'istina', 'laž', 'činjenica', 'neistina'],
  ['miran', 'Pas je miran.', 'miran', 'nemiran', 'tih', 'uznemiren'],
  ['hrabar', 'Junak je hrabar.', 'hrabar', 'plašljiv', 'odvažan', 'bojažljiv'],
  ['vredan', 'Radnik je vredan.', 'vredan', 'lenj', 'marljiv', 'len'],
  ['otvoriti', 'Treba otvoriti prozor.', 'otvoriti', 'zatvoriti', 'oprati'],
  ['doci', 'Odlučio je doći.', 'doći', 'otići', 'stići'],
  ['govoriti', 'Želi govoriti pred svima.', 'govoriti', 'ćutati', 'pričati'],
  ['davati', 'Lepo je davati poklone.', 'davati', 'uzimati', 'poklanjati', 'primati'],
  ['graditi', 'Počeli su graditi kuću.', 'graditi', 'rušiti', 'praviti', 'razgrađivati'],
]

const ZNACENJA = [
  ['zlatne-ruke', 'Za majstora kažu da ima „zlatne ruke“. Da li izraz znači da je vešt ili bogat?', 'vešt', 'bogat', 'Izraz „imati zlatne ruke“ opisuje nekoga ko je', 'Izraz pohvaljuje spretnost i umeće, a ne novac.', ['spretan', 'veoma vešt']],
  ['glava-porodice', 'U izrazu „glava porodice“, da li je reč „glava“ upotrebljena doslovno ili preneseno?', 'preneseno', 'doslovno', 'Značenje reči „glava“ u izrazu „glava porodice“ je', 'Glava ovde označava osobu koja vodi porodicu, a ne deo tela.', ['u prenesenom značenju']],
  ['oko-igle', 'U izrazu „oko igle“, da li reč „oko“ označava organ vida ili otvor?', 'otvor', 'organ vida', 'Reč „oko“ u izrazu „oko igle“ označava', 'Kroz otvor na igli provlači se konac.', ['otvor za konac']],
  ['cvrst-dogovor', 'U izrazu „čvrst dogovor“, da li pridev znači pouzdan ili tvrd na dodir?', 'pouzdan', 'tvrd na dodir', 'Pridev „čvrst“ u izrazu „čvrst dogovor“ znači', 'Dogovor nije predmet koji se dodiruje; čvrst znači pouzdan.', ['siguran']],
  ['more-posla', 'U rečenici „Imam more posla“, da li „more“ znači mnogo ili malo?', 'mnogo', 'malo', 'Reč „more“ u izrazu „more posla“ znači', 'More preneseno označava veliku količinu.', ['veoma mnogo']],
  ['bistar-um', 'U izrazu „bistar um“, da li „bistar“ znači pametan ili providan?', 'pametan', 'providan', 'Reč „bistar“ u izrazu „bistar um“ znači', 'Bistar um je um koji lako shvata, a ne tečnost kroz koju se vidi.', ['oštrouman']],
  ['pao-kamen', 'Neko kaže: „Pao mi je kamen sa srca.“ Da li oseća olakšanje ili strah?', 'olakšanje', 'strah', 'Osećanje opisano izrazom „pao mi je kamen sa srca“ jeste', 'Izraz znači prestanak brige i osećanje olakšanja.', ['olakšanje zbog prestanka brige']],
  ['drzati-rec', 'Da li „držati reč“ znači ispuniti ili prekršiti obećanje?', 'ispuniti', 'prekršiti', 'Izraz „držati reč“ znači da obećanje treba', 'Ko drži reč, postupa onako kako je obećao.', ['ispuniti obećanje']],
] as const

const IZRAZAVANJE = [
  ['cale', 'ćale', 'otac', 'sin', ['tata']],
  ['keva', 'keva', 'majka', 'ćerka', ['mama']],
  ['klopa', 'klopa', 'hrana', 'piće', ['jelo']],
  ['kinta', 'kinta', 'novac', 'knjiga', []],
  ['smarati', 'smarati', 'dosađivati', 'zabavljati', []],
  ['ortak', 'ortak', 'drug', 'neprijatelj', ['prijatelj', 'drugar']],
  ['bajk', 'bajk', 'bicikl', 'automobil', []],
  ['kul', 'kul', 'odlično', 'loše', ['dobro', 'sjajno', 'izvrsno', 'odličan', 'dobar', 'sjajan']],
] as const

export const RECNIK5: ZadatakSrpski5[] = [
  ...SINONIMI.map(([id, recenica, rec, tacan, pogresan, ...prihvaceni]) => zadatak5(
    'sinonimi', id, `U rečenici „${recenica}“ zameni reč „${rec}“ rečju sličnog značenja. Napiši samo zamenu, u obliku koji odgovara rečenici.`,
    tacan, pogresan, `U rečenici „${recenica}“ zamena za „${rec}“ sličnog značenja je`,
    `U ovom kontekstu „${rec}“ i „${tacan}“ imaju slično značenje.`, prihvaceni,
  )),
  ...ANTONIMI.map(([id, recenica, rec, tacan, pogresan, ...prihvaceni]) => zadatak5(
    'antonimi', id, `Napiši antonim reči „${rec}“, prema njenom značenju u rečenici „${recenica}“.`,
    tacan, pogresan, `U kontekstu rečenice „${recenica}“ antonim reči „${rec}“ je`,
    `Reči „${rec}“ i „${tacan}“ imaju suprotno značenje u ovom kontekstu.`, prihvaceni,
  )),
  ...ZNACENJA.map(([id, pitanje, tacan, pogresan, pocetak, razlog, prihvaceni]) => zadatak5(
    'znacenje', id, pitanje, tacan, pogresan, pocetak, razlog, [...prihvaceni],
  )),
  ...IZRAZAVANJE.map(([id, rec, tacan, pogresan, prihvaceni]) => zadatak5(
    'izrazavanje', id, `Neformalni izraz „${rec}“ zameni neutralnim izrazom istog značenja, pogodnim za školski sastav.`,
    tacan, pogresan, `Neutralna zamena za neformalni izraz „${rec}“ je`,
    `U školskom sastavu umesto neformalnog izraza „${rec}“ može se upotrebiti „${tacan}“.`, [...prihvaceni],
  )),
]

export const srpskiRecnik5 = napraviSrpskiGenerator5('srpski-recnik-5', RECNIK5)
