import type { Pitanje } from '../types/db.ts'

export type BankaPitanje5 = Pick<Pitanje, 'type' | 'difficulty' | 'text' | 'options' | 'correct' | 'explanation' | 'hint' | 'points' | 'source' | 'gen_signature' | 'manual_review'> & {
  topicSlug: string
  porodica: string
}

type Tvrdnja = readonly [id: string, porodica: string, tekst: string, tacno: boolean, objasnjenje: string]
type Unos = readonly [id: string, porodica: string, tekst: string, prihvaceni: readonly string[], objasnjenje: string]

const PRAVOPIS: readonly Tvrdnja[] = [
  ['novi-sad', 'veliko-slovo', 'Naziv grada pravilno je napisan: „Novi Sad“.', true, 'U višečlanom imenu naseljenog mesta sve glavne reči pišu se velikim slovom.'],
  ['fruska-gora', 'veliko-slovo', 'Naziv planine pravilno je napisan: „Fruška Gora“.', false, 'Pravilan zapis je Fruška gora; druga reč nije vlastito ime.'],
  ['juzna-morava', 'veliko-slovo', 'Naziv reke pravilno je napisan: „Južna Morava“.', true, 'Morava je vlastito ime, pa i u višečlanom nazivu zadržava veliko slovo.'],
  ['jadransko-more', 'veliko-slovo', 'Naziv mora pravilno je napisan: „jadransko more“.', false, 'Piše se Jadransko more: prva reč naziva počinje velikim slovom.'],
  ['matica-srpska', 'ustanove', 'Naziv ustanove pravilno je napisan: „Matica srpska“.', true, 'Prva reč naziva ustanove piše se velikim slovom.'],
  ['osnovna-skola', 'ustanove', 'Pun naziv škole pravilno je napisan: Osnovna Škola „Mladost“.', false, 'Piše se Osnovna škola „Mladost“; reč škola nije nova vlastita imenica.'],
  ['petrov', 'prisvojni-pridevi', 'Prisvojni pridev od imena Petar pravilno je napisan u izrazu „Petrov ranac“.', true, 'Prisvojni pridevi na -ov izvedeni od vlastitog imena pišu se velikim slovom.'],
  ['anin', 'prisvojni-pridevi', 'Prisvojni pridev pravilno je napisan u rečenici „Ovo je anin kaput.“', false, 'Pridev Anin izveden je od imena Ana nastavkom -in i piše se velikim slovom.'],
  ['beogradski', 'prisvojni-pridevi', 'U sredini rečenice pridev „beogradski“ piše se malim slovom.', true, 'Pridevi na -ski izvedeni od vlastitih imena pišu se malim slovom.'],
  ['niski', 'prisvojni-pridevi', 'U izrazu „Posetili smo Niški muzej“ pridev „Niški“ pravilno je napisan velikim slovom, iako nije deo zvaničnog naziva.', false, 'Kada nije deo vlastitog naziva niti početak rečenice, pridev niški piše se malim slovom.'],
  ['vi-pojedinac', 'vi', 'U učtivom pismu jednoj osobi pravilno je: „Hvala Vam na odgovoru.“', true, 'Pri učtivom obraćanju jednoj osobi oblici Vi, Vam i Vaš pišu se velikim slovom.'],
  ['vi-grupa', 'vi', 'Pri obraćanju celom odeljenju obavezno je pisati „Vi“ velikim slovom samo zato što smo ljubazni.', false, 'Veliko Vi iz poštovanja odnosi se na jednu osobu; grupi se obraćamo malim vi.'],
  ['ne-znam', 'ne', 'Odrični oblik pravilno je napisan: „ne znam“.', true, 'Rečca ne uglavnom se piše odvojeno od glagola.'],
  ['nevolim', 'ne', 'Pravilan je zapis: „nevolim kišu“.', false, 'Piše se ne volim, odvojeno.'],
  ['nemam', 'ne', 'Pravilan je zapis glagola: „nemam“.', true, 'Nemam je jedan od izuzetaka u kojima se ne piše sastavljeno sa glagolom.'],
  ['necu', 'ne', 'Odrični oblik pravilno je napisan: „ne ću“.', false, 'Piše se neću, sastavljeno.'],
  ['nepravda', 'ne', 'Imenica je pravilno napisana: „nepravda“.', true, 'Ne se u ovoj imenici piše sastavljeno.'],
  ['nesrecan', 'ne', 'U rečenici „Dečak je ne srećan“ pridev je pravilno napisan rastavljeno.', false, 'U ovom značenju piše se nesrećan, sastavljeno.'],
  ['najbolji', 'naj', 'Superlativ pravilno glasi: „najbolji“.', true, 'Naj- se piše sastavljeno sa komparativom bolji.'],
  ['najjaci', 'naj', 'Superlativ prideva jak pravilno je napisan: „najači“.', false, 'Piše se najjači: čuvaju se oba slova j na spoju naj- i jači.'],
  ['najjasniji', 'naj', 'U reči „najjasniji“ pravilno su napisana dva slova j.', true, 'Naj- i jasniji daju najjasniji.'],
  ['sa-mnom', 'zamenice-predlozi', 'Pravilan je zapis: „sa mnom“.', true, 'Predlog sa i zamenica mnom pišu se odvojeno.'],
  ['bez-njega', 'zamenice-predlozi', 'Pravilan je zapis: „beznjega“.', false, 'Predlog i zamenica pišu se odvojeno: bez njega.'],
  ['ni-od-koga', 'odricne-zamenice', 'Pravilan je zapis: „ni od koga“.', true, 'Predlog razdvaja odričnu rečcu od zamenice: ni od koga.'],
  ['ni-za-sta', 'odricne-zamenice', 'Pravilan je zapis: „nizašta“ kada znači „ni za jednu stvar“.', false, 'Odrična zamenica s predlogom piše se ni za šta.'],
  ['dvadeset-jedan', 'brojevi', 'Broj 21 rečima se pravilno piše „dvadeset jedan“.', true, 'Delovi ovog višečlanog osnovnog broja pišu se odvojeno.'],
  ['sezdeset-prvi', 'brojevi', 'Redni broj 61. rečima se pravilno piše „šezdesetprvi“.', false, 'Pravilno je šezdeset prvi, odvojeno.'],
  ['redni-tacka', 'brojevi', 'Tačka u rečenici „Osvojila je 2. mesto“ označava da je broj redni.', true, 'Iza rednog broja zapisanog arapskom cifrom piše se tačka.'],
  ['osnovni-tacka', 'brojevi', 'U rečenici „Kupio je 3 sveske“ potrebno je dodati tačku odmah iza cifre 3.', false, 'Ovde je tri osnovni broj, pa se iza cifre ne piše tačka.'],
  ['radicu', 'futur', 'Futur I pravilno je napisan: „radiću“.', true, 'Kada nenaglašeni oblik sledi infinitiv na -ti, nastaje sastavljeni zapis radiću.'],
  ['docicu', 'futur', 'Futur I pravilno je napisan: „doćiću“.', false, 'Infinitiv na -ći ostaje odvojen: doći ću.'],
  ['cu-pisati', 'futur', 'Pravilan je zapis: „Ja ću pisati.“', true, 'Kada ću stoji pre infinitiva, reči se pišu odvojeno.'],
  ['radijo', 'radni-pridev', 'Radni glagolski pridev pravilno je napisan: „radijo“.', false, 'Pravilno je radio, bez slova j.'],
  ['dosao', 'radni-pridev', 'Pravilan je oblik radnog glagolskog prideva: „došao“.', true, 'Došao je pravilan oblik muškog roda jednine.'],
  ['vokativ-zapeta', 'zapeta', 'Pravilno je: „Milice, sačekaj!“', true, 'Vokativ Milice odvaja se zapetom od ostatka rečenice.'],
  ['apozicija-zapete', 'zapeta', 'U rečenici „Mila, moja sestra, svira“ apozicija je pravilno izdvojena zapetama.', true, 'Umetnuta apozicija moja sestra odvaja se sa obe strane.'],
  ['nabrajanje', 'zapeta', 'U rečenici „Poneli smo hleb sir i vodu“ nije potrebna nijedna zapeta.', false, 'Pri nabrajanju piše se hleb, sir i vodu.'],
  ['uzvik', 'zapeta', 'Pravilno je: „Hej, vrati se!“', true, 'Uzvik hej odvaja se zapetom.'],
  ['upravni-govor', 'navodnici', 'U zapisu Ana reče: „Dolazim sutra.“ navodnici označavaju Anine doslovne reči.', true, 'Navodnicima se izdvaja upravni govor.'],
  ['crta-dijalog', 'crta', 'Crta na početku replike u dijalogu može zameniti navodnike.', true, 'U upravnom govoru replike mogu biti označene crtom.'],
]

const KNJIZEVNOST: readonly Unos[] = [
  ['lirika', 'rodovi', 'Kom književnom rodu pripada pesma koja prvenstveno izražava osećanja i doživljaje?', ['lirici', 'lirika'], 'Lirika u prvi plan stavlja osećanja i doživljaje.'],
  ['epika', 'rodovi', 'Kom književnom rodu pripada pripovetka koja pripoveda o događajima i likovima?', ['epici', 'epika'], 'Epika pripoveda o događajima i likovima.'],
  ['drama', 'rodovi', 'Kom književnom rodu pripada tekst namenjen izvođenju na pozornici?', ['drami', 'drama'], 'Dramski tekst je namenjen scenskom izvođenju.'],
  ['narodna', 'poreklo', 'Kako nazivamo književnost koja se prenosila usmeno, a prvobitni autor joj uglavnom nije poznat?', ['narodna', 'narodna književnost', 'usmena književnost', 'usmena'], 'Narodna književnost nastajala je i prenosila se usmenim putem.'],
  ['autorska', 'poreklo', 'Kako nazivamo književnost koju stvara poznati pisac: narodna ili autorska?', ['autorska', 'autorska književnost', 'umetnička', 'umetnička književnost'], 'Autorsku književnost vezujemo za određenog pisca.'],
  ['basna', 'vrste', 'Koja kratka književna vrsta prikazuje ljudske osobine kroz životinje i obično donosi pouku?', ['basna'], 'Basna kroz životinje govori o ljudskim osobinama i postupcima.'],
  ['bajka', 'vrste', 'U priči junakinji pomaže čarobni prsten, a zmaj čuva dvorac. Koja je to književna vrsta?', ['bajka'], 'Čudesni predmeti i bića karakteristični su za bajku.'],
  ['poslovica', 'vrste', 'Kako se zove kratka narodna izreka koja sažima životno iskustvo?', ['poslovica', 'narodna poslovica'], 'Poslovica sažeto izražava iskustvo ili pouku.'],
  ['zagonetka', 'vrste', 'Kako se zove kratka književna forma koja prikriveno opisuje pojam i traži da ga odgonetnemo?', ['zagonetka'], 'Zagonetka zahteva otkrivanje skrivenog pojma.'],
  ['tema', 'tema-motiv', 'Kako nazivamo ono o čemu književni tekst u celini govori?', ['tema', 'tema teksta'], 'Tema obuhvata osnovni predmet o kome tekst govori.'],
  ['motiv', 'tema-motiv', 'Kako nazivamo manju tematsku jedinicu u delu, poput putovanja, sna ili susreta?', ['motiv'], 'Motiv je manja tematska jedinica koja učestvuje u izgradnji dela.'],
  ['stih', 'stih-strofa', 'Kako se zove jedan red u pesmi?', ['stih'], 'Stih je jedan red poetskog teksta.'],
  ['strofa', 'stih-strofa', 'Kako se zove celina od više stihova, grafički odvojena od drugih takvih celina?', ['strofa'], 'Strofa je izdvojena celina od više stihova.'],
  ['rima', 'stih-strofa', 'Kako se zove glasovno podudaranje završetaka stihova?', ['rima'], 'Rima povezuje stihove sličnim završecima.'],
  ['pesnik', 'pripovedac', 'Kako nazivamo stvarnu osobu koja piše pesmu: pesnik ili lirski subjekt?', ['pesnik'], 'Pesnik je autor, dok je lirski subjekt glas u pesmi.'],
  ['lirski-subjekt', 'pripovedac', 'Kako nazivamo glas koji u lirskoj pesmi iskazuje osećanja?', ['lirski subjekt', 'lirski subjekat'], 'Lirski subjekt nije nužno ista osoba kao pesnik.'],
  ['pripovedac', 'pripovedac', 'Kako nazivamo glas koji pripoveda priču, a nije nužno sam pisac?', ['pripovedač'], 'Pripovedač je glas koji kazuje događaje u delu.'],
  ['dijalog', 'kazivanje', 'Kako se zove razgovor dva lika u književnom tekstu?', ['dijalog'], 'Dijalog je razmena replika među sagovornicima.'],
  ['monolog', 'kazivanje', 'Kako se zove duži govor jednog lika bez razmene replika?', ['monolog'], 'Monolog je samostalno govorenje jednog lika.'],
  ['didaskalije', 'dramski-tekst', 'Kako se nazivaju napomene u dramskom tekstu o pokretima, izgledu scene i načinu govora?', ['didaskalije', 'didaskalija', 'scenske napomene'], 'Didaskalije daju uputstva za izvođenje drame.'],
  ['poredjenje', 'figure', 'Koju stilsku figuru prepoznaješ u izrazu „brz kao munja“?', ['poređenje'], 'Brzina se poredi sa munjom pomoću reči kao.'],
  ['personifikacija', 'figure', 'Koju stilsku figuru prepoznaješ u rečenici „Stari hrast je ljutito mrmljao“?', ['personifikacija'], 'Hrastu su pripisani ljudsko osećanje i govor.'],
  ['onomatopeja', 'figure', 'Koja stilska figura oponaša zvuk u izrazu „kuc-kuc“?', ['onomatopeja'], 'Onomatopeja oponaša zvukove iz prirode i života.'],
  ['epitet', 'figure', 'Kako nazivamo slikovit pridev „srebrni“ u pesničkom izrazu „srebrni mesec“?', ['epitet'], 'Epitet je slikovit atribut koji doprinosi izražajnosti.'],
  ['opis', 'kazivanje', '„Dvorište je bilo usko, popločano i obraslo bršljanom.“ Koji oblik kazivanja preovlađuje?', ['opisivanje', 'opis'], 'Rečenica prikazuje izgled prostora, a ne niz događaja.'],
  ['pripovedanje', 'kazivanje', '„Ušla je, spustila ranac i otvorila prozor.“ Koji oblik kazivanja preovlađuje?', ['pripovedanje', 'naracija'], 'Nižu se radnje lika.'],
  ['prvo-lice', 'pripovedac', '„Sakrio sam pismo u džep i izašao.“ U kom licu pripoveda glas u ovom odlomku?', ['prvom', 'prvo', 'prvo lice', 'u prvom licu'], 'Oblik sakrio sam pokazuje prvo lice.'],
  ['trece-lice', 'pripovedac', '„Jelena je sklopila knjigu i zaspala.“ U kom licu je pripovedanje?', ['trećem', 'treće', 'treće lice', 'u trećem licu'], 'Pripovedač govori o Jeleni kao o drugoj osobi.'],
  ['realisticno', 'stvarno-cudesno', 'Da li je događaj „Dečak je zakasnio na autobus“ realističan ili čudesan?', ['realističan', 'realistično', 'moguć'], 'Događaj je moguć u svakodnevnom životu.'],
  ['cudesno', 'stvarno-cudesno', 'Da li je događaj „Kamen je progovorio i dao putniku savet“ realističan ili čudesan?', ['čudesan', 'čudesno', 'natprirodan', 'natprirodno'], 'Govoreći kamen odstupa od zakona stvarnog sveta.'],
  ['zaplet', 'kompozicija', 'U priči se junak sprema na put, ali mu nestaje karta. Koji deo radnje pokreće prepreku: zaplet ili rasplet?', ['zaplet'], 'Zaplet uvodi problem koji pokreće dalju radnju.'],
  ['rasplet', 'kompozicija', 'Na kraju priče nestala karta je pronađena i problem rešen. Kako se zove taj deo radnje?', ['rasplet'], 'Rasplet razrešava problem ili sukob.'],
  ['glavni-lik', 'likovi', 'Cela priča prati Milinu potragu; poštar se pojavljuje samo da joj preda pismo. Ko je glavni lik?', ['Mila'], 'Glavni lik je u središtu radnje, ovde Miline potrage.'],
  ['sporedni-lik', 'likovi', 'Priča prati Pavlovo odrastanje, a prodavac se pojavljuje samo u kratkom susretu. Ko je sporedni lik?', ['prodavac'], 'Prodavac ima manju ulogu u odnosu na Pavla.'],
  ['osobina', 'likovi', 'Junakinja deli poslednji komad hleba s gladnim putnikom. Da li pokazuje darežljivost ili sebičnost?', ['darežljivost', 'nesebičnost'], 'Deljenjem hrane pokazuje brigu za drugoga.'],
  ['ton', 'lirika', '„Smeh se razlio kroz dvorište, svi su veselo zapevali.“ Da li je ton vedar ili tužan?', ['vedar', 'veseo'], 'Smeh i veselo pevanje upućuju na vedar ton.'],
  ['pesnicka-slika', 'lirika', '„Iz daljine dopire zvonjava.“ Da li slika prvenstveno deluje na sluh ili vid?', ['sluh'], 'Zvonjava je zvučni doživljaj.'],
  ['dve-strofe', 'stih-strofa', 'Pesma ima dve grupe od po četiri stiha, razdvojene praznim redom. Koliko ima strofa? Napiši rečima.', ['dve'], 'Dve izdvojene grupe stihova čine dve strofe.'],
  ['dijalog-primer', 'kazivanje', '„– Kuda ideš? – U biblioteku.“ Da li je ovo dijalog ili monolog?', ['dijalog'], 'Dva glasa razmenjuju pitanje i odgovor.'],
  ['pouka', 'tema-motiv', 'Basna prikazuje hvalisavca koji izgubi jer potceni protivnika. Koja pouka odgovara: ne potcenjuj druge ili uvek se hvali?', ['ne potcenjuj druge', 'ne treba potcenjivati druge'], 'Ishod upozorava na posledice potcenjivanja.'],
]

const KULTURA_TVRDNJE: readonly Tvrdnja[] = [
  ['slusanje', 'komunikacija', 'Pažljiv slušalac dopušta sagovorniku da završi misao pre nego što odgovori.', true, 'Neupadanje u reč pomaže razumevanju i pokazuje poštovanje.'],
  ['neslaganje', 'komunikacija', 'Ako se ne slažemo s nekim, najbolje je napasti njegov izgled umesto njegovog mišljenja.', false, 'Osporava se tvrdnja uz razloge, a ne vređa osoba.'],
  ['razjasnjenje', 'komunikacija', 'Kada uputstvo nije jasno, primereno je postaviti pitanje za razjašnjenje.', true, 'Pitanje pomaže da se postupak pravilno razume.'],
  ['sagovornik', 'komunikacija', 'Način obraćanja nastavniku u službenom mejlu mora biti isti kao šaljiva poruka najboljem drugu.', false, 'Stil i obraćanje prilagođavaju se sagovorniku i situaciji.'],
  ['argumenat', 'komunikacija', 'Rečenica „Predlažem raniji polazak jer put traje dva sata“ sadrži predlog i razlog.', true, 'Veznik jer uvodi obrazloženje predloga.'],
  ['ponavljanje', 'slusanje', 'Provera „Da li sam dobro razumeo da dolazimo u devet?“ može pomoći u razgovoru.', true, 'Proveravanjem razumevanja izbegavaju se nesporazumi.'],
  ['tema-sastava', 'plan-sastava', 'Pre pisanja sastava korisno je razjasniti temu i napraviti plan.', true, 'Plan pomaže izboru i rasporedu ideja.'],
  ['uvod', 'plan-sastava', 'Uvod sastava služi isključivo da ponovi sve detalje iz razrade.', false, 'Uvod uvodi temu; detalji se razvijaju u razradi.'],
  ['pasusi', 'pisanje', 'Podela na pasuse može pokazati prelazak na novu povezanu celinu.', true, 'Pasusi olakšavaju praćenje toka misli.'],
  ['skretanje', 'pisanje', 'U sastav o školskom izletu treba uneti što više nepovezanih činjenica o bilo kojoj temi.', false, 'Biraju se podaci koji doprinose zadatoj temi.'],
  ['revizija', 'pisanje', 'Posle pisanja korisno je pročitati tekst i proveriti jasnoću i pravopis.', true, 'Pregledanje omogućava ispravke i poboljšavanje teksta.'],
  ['sazimanje', 'sazimanje', 'Sažetak treba da zadrži glavne informacije izvornog teksta.', true, 'Sažimanjem se izdvajaju bitne informacije.'],
  ['izmisljanje', 'sazimanje', 'Pri sažimanju je dozvoljeno dodati izmišljeni događaj i predstaviti ga kao deo izvornog teksta.', false, 'Sažetak mora verno preneti sadržaj izvornika.'],
  ['beleske', 'beleske', 'Kratke beleške mogu sadržati ključne reči umesto svih rečenica izlaganja.', true, 'Beleške služe pamćenju bitnog, ne nužno doslovnom prepisivanju.'],
  ['datum', 'pismo', 'Datum u pismu može pomoći primaocu da razume kada je pismo napisano.', true, 'Datum daje vremenski kontekst poruci.'],
  ['potpis', 'pismo', 'Potpis u pismu služi da pokaže ko šalje poruku.', true, 'Potpis identifikuje pošiljaoca.'],
  ['mejl-naslov', 'digitalna-komunikacija', 'Jasan naslov mejla pomaže primaocu da prepozna temu poruke.', true, 'Naslov najavljuje sadržaj i olakšava snalaženje.'],
  ['velika-slova', 'digitalna-komunikacija', 'Poruka napisana isključivo VELIKIM SLOVIMA uvek zvuči mirnije i ljubaznije.', false, 'U digitalnoj komunikaciji takav zapis može delovati kao vikanje.'],
  ['privatnost', 'digitalna-komunikacija', 'Tuđu privatnu poruku možemo objaviti svima bez pitanja, samo zato što smo je primili.', false, 'Poštovanje sagovornika uključuje čuvanje privatnosti njegove poruke.'],
  ['provera-vesti', 'digitalna-komunikacija', 'Pre prosleđivanja vesti treba proveriti njen izvor i datum.', true, 'Izvor i datum pomažu proceni pouzdanosti i aktuelnosti vesti.'],
]

const KULTURA_UNOSI: readonly Unos[] = [
  ['uctiva-molba', 'komunikacija', 'Koja je učtivija molba: „Daj svesku!“ ili „Molim te, pozajmi mi svesku“? Napiši prvu reč učtivije molbe.', ['molim'], 'Molba sa molim te izražava poštovanje.'],
  ['izvinjenje', 'komunikacija', 'Koju reč upotrebljavaš da se izviniš drugu nakon što si ga slučajno prekinuo?', ['izvini', 'oprosti'], 'Izvini ili oprosti jesu primereni oblici izvinjenja drugu.'],
  ['zahvalnost', 'komunikacija', 'Koja reč izražava zahvalnost za dobijenu pomoć?', ['hvala'], 'Hvala jasno iskazuje zahvalnost.'],
  ['neslaganje-razlog', 'komunikacija', '„Ne slažem se jer su podaci nepotpuni.“ Da li govornik navodi razlog ili uvredu?', ['razlog', 'obrazloženje'], 'Govornik obrazlaže neslaganje stanjem podataka.'],
  ['uvod-naziv', 'plan-sastava', 'Kako se zove početni deo sastava koji uvodi temu?', ['uvod'], 'Uvod najavljuje temu i priprema čitaoca.'],
  ['razrada-naziv', 'plan-sastava', 'Kako se zove središnji deo sastava u kojem se razvijaju glavne ideje?', ['razrada'], 'Razrada donosi događaje, objašnjenja i pojedinosti.'],
  ['zakljucak-naziv', 'plan-sastava', 'Kako se zove završni deo sastava koji zaokružuje temu?', ['zaključak'], 'Zaključak zaokružuje tekst i ističe završnu misao.'],
  ['opis-portret', 'pisanje', 'Da li tekst koji opisuje izgled i osobine čoveka predstavlja portret ili pejzaž?', ['portret'], 'Portret je opis osobe.'],
  ['opis-pejzaz', 'pisanje', 'Da li opis livade, reke i okolnih brda predstavlja portret ili pejzaž?', ['pejzaž'], 'Pejzaž je opis predela.'],
  ['naracija', 'pisanje', 'Da li tekst koji redom kazuje šta se dogodilo prvenstveno pripoveda ili opisuje?', ['pripoveda', 'pripovedanje'], 'Pripovedanje niže događaje.'],
  ['sazetak-primer', 'sazimanje', '„Na izletu je pala kiša, pa je grupa prešla u muzej.“ Gde je grupa otišla zbog kiše?', ['u muzej', 'muzej'], 'Muzej je odredište nakon promene plana.'],
  ['glavna-informacija', 'sazimanje', 'Vest: „Radionica počinje u petak u 12, a voditelj nosi plavi šal.“ Šta je važnije za dolazak: vreme početka ili boja šala?', ['vreme početka', 'vreme'], 'Vreme početka omogućava dolazak; boja šala je sporedna.'],
  ['beleska-mesto', 'beleske', 'Iz uputstva „Okupljanje je ispred škole u osam“ izdvoji samo mesto okupljanja.', ['ispred škole'], 'Mesto je ispred škole, a u osam označava vreme.'],
  ['beleska-pribor', 'beleske', 'Poruka glasi: „Za crtanje ponesite olovku; papir ćete dobiti.“ Koji pribor treba zabeležiti da se ponese?', ['olovku', 'olovka'], 'Papir je obezbeđen; olovku treba poneti.'],
  ['obracanje', 'pismo', 'U pismu „Draga tetka, ... Voli te Luka“ koja reč označava primaoca?', ['tetka'], 'Početno obraćanje identifikuje kome je pismo namenjeno.'],
  ['potpis-ime', 'pismo', 'Pismo se završava sa „Srdačan pozdrav, Milena“. Kako se zove pošiljalac?', ['Milena'], 'Ime u potpisu označava pošiljaoca.'],
  ['predmet-mejla', 'digitalna-komunikacija', 'Koji naslov bolje najavljuje mejl o terminu izleta: „Pitanje o terminu izleta“ ili „Hej“? Prepiši bolji naslov.', ['Pitanje o terminu izleta'], 'Konkretan naslov jasno najavljuje temu.'],
  ['cinjenica', 'cinjenica-utisak', '„Radionica traje 60 minuta.“ Da li je to proverljiv podatak ili lični utisak?', ['proverljiv podatak', 'podatak', 'činjenica'], 'Trajanje se može proveriti merenjem ili rasporedom.'],
  ['utisak', 'cinjenica-utisak', '„Ovo je najzanimljivija radionica na svetu!“ Da li rečenica pre svega izražava lični utisak ili izmereni podatak?', ['lični utisak', 'utisak', 'mišljenje'], 'Procena zanimljivosti zavisi od govornika.'],
  ['ispravka-poruke', 'digitalna-komunikacija', 'Poslao si pogrešno vreme sastanka. Da li treba poslati jasnu ispravku ili prećutati grešku?', ['poslati jasnu ispravku', 'poslati ispravku', 'ispravku', 'ispraviti'], 'Jasna ispravka sprečava da primalac postupi prema pogrešnom podatku.'],
]

function tvrdnje(topicSlug: string, stavke: readonly Tvrdnja[]): BankaPitanje5[] {
  return stavke.map(([id, porodica, text, value, explanation]) => ({
    topicSlug, porodica, type: 'truefalse', difficulty: 5, text, options: null,
    correct: { value }, explanation, hint: null, points: 5, source: 'manual',
    gen_signature: `${topicSlug}:banka:${id}`, manual_review: false,
  }))
}

function unosi(topicSlug: string, stavke: readonly Unos[]): BankaPitanje5[] {
  return stavke.map(([id, porodica, text, accept, explanation]) => ({
    topicSlug, porodica, type: 'text', difficulty: 5, text, options: null,
    correct: { accept: [...accept] }, explanation, hint: null, points: 5, source: 'manual',
    gen_signature: `${topicSlug}:banka:${id}`, manual_review: false,
  }))
}

export const SRPSKI5_BANKA: BankaPitanje5[] = [
  ...tvrdnje('srpski-pravopis-5', PRAVOPIS),
  ...unosi('srpski-knjizevnost-5', KNJIZEVNOST),
  ...tvrdnje('srpski-jezicka-kultura-5', KULTURA_TVRDNJE),
  ...unosi('srpski-jezicka-kultura-5', KULTURA_UNOSI),
]
