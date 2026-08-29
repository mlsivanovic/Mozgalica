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

V1 ne postavlja pitanja čiji odgovor zavisi od opštine ili mesta stanovanja deteta,
ne upućuje na nepostojeću sliku ili kartu i ne tvrdi da proverava praktično izvođenje
ogleda. Može da proverava razumevanje opisanog postupka, ogleda ili kartografskog
pojma. Lokalna procena, rad na prikazanoj karti, slike i praktični zadaci ostavljeni
su za medijski V2.
