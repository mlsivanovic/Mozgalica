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
