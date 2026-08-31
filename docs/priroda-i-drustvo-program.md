# Priroda i društvo — pokrivenost programa

Generatori za 3. i 4. razred zasnovani su na važećim programima nastave i učenja
na koje upućuje [ZUOV registar propisa](https://zuov.gov.rs/zakoni-i-pravilnici/).
Sadržaj je statičan i proverljiv: tokom generisanja nema AI poziva niti pristupa mreži.

## Treći razred

| Generator | Programske celine |
|---|---|
| `pid-priroda-covek-drustvo-3` | reljef i vode; stanovništvo, delatnosti, naselja i saobraćaj; voda, vazduh i temperatura; životne zajednice i lanci ishrane; zaštita prirode i zdravlja |
| `pid-orijentacija-3` | glavne i sporedne strane sveta; orijentacija; plan naselja; kartografski znaci i boje; vremenske odrednice |
| `pid-proslost-3` | istorijski izvori; preci i potomci; godina, decenija i vek; redosled događaja; život nekad i danas |
| `pid-kretanje-3` | putanja i sila; Zemljina teža i padanje tela; svetlost i senka; nastanak i jačina zvuka; zaštita od buke |
| `pid-materijali-3` | povratne i nepovratne promene; agregatna stanja; tečnosti i rastvaranje; toplotni provodnici i izolatori; reciklaža i racionalna potrošnja |
| `pid-beograd-3` | Beograd — moj grad: položaj i vode; reljef i izletišta; znamenitosti; prošlost grada; kultura; orijentacija u gradu; saobraćaj; zaštita prirode |

Oblast „Beograd — moj grad” lokalno dopunjuje program trećeg razreda za decu iz
Beograda. Sadrži 24 pitanja sa izborom odgovora, njihove tačne i netačne tvrdnje
i 12 pojmova od kojih nastaju zadaci povezivanja po četiri para. Svaki zadatak ima
objašnjenje i pomoć. Dostupna je u generatoru i pri izboru oblasti dnevnih kvizova;
postojećim rasporedima se ne dodaje automatski.

Sadržaj ne traži pamćenje datuma, broja stanovnika, cena ili linija prevoza.
Kalemegdan se razlikuje od tvrđave, a smer ulivanja Save u Dunav je izričito naveden.
Izvori za proveru lokalnih činjenica:

- [Grad Beograd — znamenitosti](https://www.beograd.rs/lat/upoznajte-beograd/a88112/Znamenitosti.html): tvrđava, Kalemegdan, Singidunum i Knez Mihailova.
- [Beogradska tvrđava](https://www.beogradskatvrdjava.co.rs/?lang=la): kompleks tvrđave i parka, Pobednik i čuvanje kulturnog nasleđa.
- [Turistička organizacija Beograda — Avala](https://www.tob.rs/rs/sta-videti/atrakcije/avala), [Ada Ciganlija](https://www.tob.rs/en/what-to-see/belgrade-attractions/ada-ciganlija) i [Trg republike](https://www.tob.rs/rs/sta-videti/atrakcije/trg-republike): izletišta, jezero i spomenik knezu Mihailu.
- [Narodni muzej — centralna zgrada](https://www.narodnimuzej.rs/about-museum/locations-of-the-national-museum/the-national-museum-in-belgrade-central-building/?lang=en): položaj muzeja na Trgu republike.
- [Grad Beograd — Košutnjak](https://www.beograd.rs/lat/beoinfo-vesti/a103139/Nove-sadnice-na-podrucju-Kosutnjaka.html) i [Veliko ratno ostrvo](https://www.beograd.rs/lat/zivot-u-beogradu/beogradska-riznica/a85876/Veliko-ratno-ostrvo-poslednja-oaza-netaknute-prirode-izmedju-dva-gradska-jezgra.html): šuma i očuvanje prirode u gradu.

## Četvrti razred

| Generator | Programske celine |
|---|---|
| `pid-odlike-srbije-4` | položaj, simboli i valuta Srbije; reljef, vode, šume i nacionalni parkovi; zaštićene vrste; stanovništvo, naselja i građani; privreda, resursi i održiva upotreba |
| `pid-covek-4` | čovek kao prirodno, društveno i svesno biće; odrastanje; ravnoteža dnevnih aktivnosti; digitalna ravnoteža i bezbednost |
| `pid-materijali-4` | smeše i postupci razdvajanja; naelektrisavanje; električni provodnici i izolatori; racionalna potrošnja; magneti; sagorevanje i zaštita od požara |
| `pid-proslost-srbije-4` | doseljavanje Slovena; Nemanjići; život i otpor pod turskom vlašću; Prvi i Drugi srpski ustanak; moderna i savremena Srbija; hronologija |

Manifest u `src/generator/moduliPid/index.ts` povezuje svaku programsku celinu sa
stabilnom porodicom potpisa. Testovi koriste manifest da otkriju izostavljenu celinu.

## Granice tekstualne verzije

V1 ne postavlja pitanja čiji odgovor zavisi od nepoznate opštine ili mesta stanovanja deteta,
ne upućuje na nepostojeću sliku ili kartu i ne tvrdi da proverava praktično izvođenje
ogleda. Može da proverava razumevanje opisanog postupka, ogleda ili kartografskog
pojma. U beogradskoj oblasti mesto je imenovano u samom pitanju, pa odgovor ne
zavisi od detetove adrese. Lokalna procena koja zahteva obilazak, rad na prikazanoj
karti, slike i praktični zadaci ostavljeni su za medijski V2.

## Dopunska banka — 31. avgust 2026.

Verzionisana banka `src/data/prirodaDrustvoBanka.ts` objedinjuje podatke za oba
razreda. Svaka od deset postojećih oblasti dobija 30 originalnih pitanja:
20 sa jednim odgovorom, pet tačno/netačno i pet povezivanja po četiri para.
Ukupno: 180 pitanja za treći i 120 za četvrti razred. Sva imaju objašnjenje,
pomoć, `difficulty=5`, `points=5`, `source='manual'` i `manual_review=false`.
Težina 5 je postojeća tehnička konvencija ovog predmeta, a ne oznaka da je sadržaj
izvan uzrasta. Nema novih oblasti niti dodatnih zahteva za slikama ili ogledima.

Pre dopune pregledani su svi podaci u `treci.ts`, `cetvrti.ts` i `beograd.ts`:
133 pitanja sa izborom, 266 tačnih/netačnih tvrdnji i 102 osnovna para.
Dopuna ne prepisuje njihove zadatke. Ponegde koristi poznat pojam kao predznanje
za novu primenu: na primer, magnetno privlačenje za izdvajanje gvožđa iz smeše.
Povezivanje može ponoviti poznat pojam uz nove parove, ali ne reprodukuje ceo
četvoroparni zadatak generatora. Kratki izvori, razgovori i opisi ogleda u banci
su originalni primeri, ne preuzeti odlomci istorijskih dokumenata.

| Oblast | Dopuna u odnosu na generator | Porodice potpisa banke |
|---|---|---|
| Priroda, čovek i društvo — 3 | Izvor, korito, obale i smer toka; uslovi staništa; delovi biljaka; grane poljoprivrede i put sirovine; vodovod i zemljište | `vode`, `zajednice`, `delatnosti`, `naselja`, `zemljiste` |
| Orijentacija — 3 | Sporedni pravci; okretanje, povratak i međusobni položaji; primena zadate legende; meseci, kalendar i trajanja | `pravci`, `polozaj`, `putanja`, `plan`, `kalendar`, `vreme` |
| Prošlost — 3 | Arhiv, kustos, restauracija i čuvanje nalaza; čitanje kratkih zapisa; preslica, razboj, vodenica i stari zanati | `cuvanje`, `izvor`, `svakodnevica`, `redosled` |
| Kretanje — 3 | Podloga i nagib; promene kretanja; poređenje uslova ogleda; položaj senke, odbijanje svetlosti, visina tona, odjek i prenošenje zvuka | `podloga`, `nagib`, `putanja`, `ogled`, `senka`, `svetlost`, `zvuk`, `kretanje` |
| Materijali — 3 | Upijanje; zapremina pri presipanju i tečenje; izbor materijala prema nameni; opažanje, pretpostavka i zaključak | `upijanje`, `tecnosti`, `izbor`, `ogled`, `promene` |
| Beograd — moj grad — 3 | Zemun i Gardoš; Jevremovac, staklenik i herbarijum; Muzej Nikole Tesle; Vinča; dodatni muzeji, konaci i pristupačnost | `zemun`, `basta`, `tesla`, `vinca`, `kultura`, `grad`, `poseta` |
| Odlike Srbije — 4 | Morave, Tisa, Drina i gradske reke; Đerdap, pećine i peščara; banje; konkretne veze sirovina i proizvodnje; kulturno nasleđe | `reke`, `predeli`, `banje`, `privreda`, `nasledje`, `gradjani`, `resursi` |
| Čovek — 4 | Higijena odrastanja; podrška pri promenama; imenovanje osećanja, sukobi, lične granice, privatnost i pristupačno učešće | `higijena`, `odrastanje`, `emocije`, `podrska`, `granice`, `razlike`, `saradnja`, `navike` |
| Materijali — 4 | Zatvoreno baterijsko kolo, prekidač i provera delova; magnet na daljinu; višekoračne smeše, ograničenja filtera i bezbednost | `struja`, `magnet`, `smese`, `bezbednost` |
| Prošlost Srbije — 4 | Sava, Prvovenčani i zakonik; rukopisi i zadužbine; svakodnevica, zanati, seobe; Orašac, Takovo, Vuk i Dositej | `nemanjici`, `kultura`, `svakodnevica`, `osmansko`, `obnova`, `poredjenje`, `nasledje`, `licnosti`, `izvori` |

### Programska i činjenična provera

Polazište je [ZUOV registar programa i propisa](https://zuov.gov.rs/zakoni-i-pravilnici/).
Sadržaji i ishodi upoređeni su sa objavljenim programima:

- [Školski program OŠ Žarko Zrenjanin za 2025–2030](https://www.zarko.edu.rs/wp-content/uploads/2022/01/Skolski-program-OS-Zarko-Zrenjanin-Apatin-01-09-2025-do-31-08-2030.pdf), odeljci Priroda i društvo za treći i četvrti razred: živa priroda i zajednice, orijentacija, prošlost, kretanje, materijali, Srbija i odrastanje. Školski program služi proveri nastavne primene; registar ZUOV ostaje polazište za propise.
- [Program četvrtog razreda](https://www.zarko.edu.rs/wp-content/uploads/2020/09/4-razred-program-min.pdf), odeljak Priroda i društvo, strane PDF-a 41–44: električna provodljivost, jednostavno strujno kolo sa baterijom, magneti, smeše, pubertet i prošlost Srbije.

Posebne geografske, istorijske i lokalne činjenice proverene su preko sledećih
ustanova. Pitanja ne ispituju radno vreme, cene, aktuelne funkcije niti druge
promenljive podatke iz turističkih najava.

- Turistička organizacija Beograda: [Zemun i Gardoš](https://www.tob.rs/sr/sta-videti/atrakcije/zemun), [Jevremovac](https://www.tob.rs/sr/sta-videti/atrakcije/botanicka-basta), [Vinča](https://www.tob.rs/sr/sta-videti/muzeji-i-galerije/arheoloski-lokalitet-vinca), [Muzej Nikole Tesle](https://www.tob.rs/en/what-to-see/museums-and-arts/the-nikola-tesla-museum), [Konak kneginje Ljubice](https://www.tob.rs/sr/sta-videti/muzeji-i-galerije/konak-kneginje-ljubice) i [pregled ustanova i znamenitosti](https://www.tob.rs/sr/sta-videti). Koriste se položaj i namena ustanova, bez preuzimanja turističkog teksta.
- Turistička organizacija Srbije: [turistička karta Srbije](https://www.serbia.travel/wp-content/uploads/2025/03/08-TURISTICKA-KARTA-srp.pdf), [banje](https://www.serbia.travel/sr-lat/banje/) i [Resavska pećina](https://www.serbia.travel/sr-lat/resavska-pecina/): reke, predeli, banjska mesta i prirodne znamenitosti.
- UNESCO: [Studenica](https://whc.unesco.org/en/list/389/), za graditeljsko i umetničko nasleđe.
- Vlada Srbije: [znameniti Srbi](https://www.srbija.gov.rs/znameniti_srbi/329906), za Savu i Prvovenčanog; [digitalizovano Zakonodavstvo Stefana Dušana](https://uzzpro.gov.rs/doc/biblioteka/digitalna-biblioteka/1928-zakonodavstvo-stefana-dusana.pdf), za zakonik kao pravni spomenik. Ne ispituju se pojedinačne srednjovekovne kazne.
- Narodni muzej: [Muzej Vuka i Dositeja](https://www.narodnimuzej.rs/o-muzeju/izlozbeni-prostori/muzej-vuka-i-dositeja/); Republički zavod za statistiku: [istorijski pregled kulture, Miroslavljevo jevanđelje](https://pod2.stat.gov.rs/objavljenepublikacije/g2009/pdf/g20092004.pdf).
- UNICEF Srbija: [prava i položaj dece i adolescenata](https://www.unicef.org/serbia/publikacije/situaciona-analiza-prava-i-polozaja-dece-i-adolescenata-u-srbiji) i [oblici nasilja nad decom](https://www.unicef.org/serbia/nasilje-nad-decom-u-srbiji-pregled-nalaza), za uvažavanje, podršku i zaštitu. Pitanja ne postavljaju dijagnoze niti propisuju lečenje; podstiču razgovor sa pouzdanim odraslim ili zdravstvenim radnikom.

### Izbor kombinovanih pitanja

`src/lib/kombinovaniPid.ts` koriste standardna forma i `process-daily-quizzes`.
Najpre se planira broj pitanja po oblasti: ravnomerno za standardni kviz,
prema postojećem pametnom planu za pametnu vežbu. Ponovljene oblasti u planu
sabiraju se pre podele. Svaka oblast dobija polovinu iz banke i polovinu iz
generatora, a neparni višak se naizmenično dodeljuje izvorima; seed bira početak.

Ako nema dovoljno pitanja jednog izvora, drugi popunjava istu oblast i isti
izabrani tip. Prednost ranije nekorišćenih pitanja u dnevnim kvizovima ima
prednost nad odnosom 50:50: istorijska ponavljanja dozvoljena su tek nakon
iscrpljenja novih kandidata oba izvora. Konačni fond generatora se pregleda u
celosti, uključujući sve kombinacije četiri para, pa slučajno promašeno pitanje
ne izaziva prerano ponavljanje. Izbor i redosled su deterministički po seed-u;
banka se prethodno stabilno uređuje po ID-ju.

Potpisi, bankarski ID-jevi i normalizovan sadržaj sprečavaju ponavljanje unutar
kviza. Kod povezivanja se porede i pojmovi, nezavisno od ID-jeva i redosleda.
Nedovoljan zbir kandidata prekida sastavljanje uz naziv oblasti i nedostajući
broj; nepotpun kviz se ne upisuje. Snapshot bankarskog pitanja čuva
`source_question_id`, odgovor, objašnjenje i pomoć. Ocenjivanje ostaje serversko.

Čisti generator, čista banka i kombinacije drugih predmeta zadržavaju postojeću
logiku. Ne menjaju se RPC ugovori, podrazumevani izvor, postojeći dnevni rasporedi
niti istorijski kvizovi. Obe forme zadržavaju sačuvani PID izbor `combined` i
prikazuju oznake „generator + banka”.

### Uvoz i provere

```bash
npx vitest run
npm run build
node scripts/uvoz-priroda-drustvo.mjs --dry-run
node scripts/uvoz-priroda-drustvo.mjs --apply
node scripts/uvoz-priroda-drustvo.mjs --apply
```

CLI koristi povezani projekat kroz `supabase db query --linked -f` i privremeni
SQL fajl koji briše posle izvršavanja. Bez opcije radi `--dry-run` sa rollback-om;
`--sql` samo ispisuje isti probni SQL. Uvoz je transakcioni i prekida se ako ne
postoji tačno jedan vlasnik postojeće banke koji je administrator ili ako
nedostaju očekivane oblasti. Stabilni potpisi imaju oblik
`<topicSlug>:banka:<id>`. Ponovni uvoz preskače identične redove; razlika u
postojećem pitanju prekida transakciju bez prepisivanja ručnih izmena.
Nema brisanja, migracije šeme ili izmena oblasti.

U istoj transakciji `fn_grade_answer` proverava svih 300 tačnih odgovora,
pogrešne ponuđene odgovore, obrnute tvrdnje, zamenjena dva para i prazne odgovore.
Testovi dodatno proveravaju raspodelu, latinicu, potpise, jednoznačnost parova,
objašnjenja, pomoć, poređenje sa generatorima, neparne kvote, grupisanje pametnog
plana, prazne izvore, dopunjavanje, filtere, determinizam i poslednjeg preostalog
kandidata. Semantička primerenost zahteva i čitanje sadržaja; test jednakosti
tekstova sam po sebi nije zamena za taj pregled.

Za proveru formi korišćene su stvarne React komponente sa probnim API podacima i
onemogućenim mrežnim upisima: obnova standardne konfiguracije, obnova dnevnog
rasporeda sa pametnom vežbom, promena razreda, oznake oblasti i snapshot 5+5 za
kviz od deset pitanja. Nijedan probni kviz niti obaveštenje nije poslato deci.

Potvrda uvoza 31. avgusta 2026: u produkciji je po oblasti potvrđeno 30 pitanja
(20/5/5), ukupno 300. Ponovljeni `--apply` nije promenio ID-jeve niti sadržaj.
Probni sukob verzije sa namerno izmenjenim ulaznim tekstom pravilno je odbijen;
postojeći red ostao je netaknut. Kontrolni potpisi svih ostalih pitanja, oblasti,
dnevnih rasporeda, veza rasporeda i oblasti i svih snapshot-a bili su jednaki
pre i posle uvoza. Prošlo je svih 380 testova, produkcioni build i Deno provera.
`process-daily-quizzes` je objavljen kao verzija 13, sa uključenom JWT proverom.
