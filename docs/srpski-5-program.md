# Srpski jezik — 5. razred

Sadržaj prati novi program iz **Prosvetnog glasnika 1/2026**, koji se primenjuje
od **školske 2027/2028. godine**. Dostupan je unapred, a administratorske forme
za generator, banku, standardni kviz i dnevni raspored prikazuju napomenu o programu.
Izvor: [ZUOV — program za peti razred](https://zuov.gov.rs/preuzimanje/2281/prosvetni-glasnik-2026-1/603007/pg-2026-1-6-os5),
odeljak „Srpski jezik i književnost”, strane 12–17 dokumenta.

## Oblasti

| Oblast | Izvor | Početni obim |
|---|---|---|
| `srpski-gramatika-5` | generator | 117 zadataka |
| `srpski-recnik-5` | generator | 64 zadatka |
| `srpski-citanje-5` | generator | 12 tekstova sa po 5 pitanja |
| `srpski-pravopis-5` | banka | 40 pitanja |
| `srpski-knjizevnost-5` | banka | 40 pitanja |
| `srpski-jezicka-kultura-5` | banka | 40 pitanja |

Gramatika obuhvata svih sedam padeža u rečenicama, vrste i podvrste reči,
gramatičku osnovu i nastavak, kongruenciju, komparaciju, zamenice, brojeve,
glagolski vid i rod, infinitiv i prezentsku/infinitivnu osnovu, radni glagolski
pridev, prezent, perfekat, futur I, pomoćne glagole i rečenične članove,
uključujući apoziciju, imenski predikat i pravi/nepravi objekat.

Rečnik proverava sinonime i antonime u kontekstu, prenesena značenja i izbor
neutralnog izraza. Čitanje uključuje priče, obaveštenje, uputstvo, pismo,
informativni tekst i jednostavnu tekstualnu tabelu. Pitanja proveravaju
pronalaženje podataka, redosled, uzroke i posledice, zaključivanje, likove,
pripovedača, svrhu teksta i primenu pročitanog.

Književnost se proverava kroz pojmove i sopstvene primere, **bez konkretne
lektire**. Nema pitanja o autorima, naslovima ili radnjama obaveznih dela.
Nema AI poziva, mrežnih izvora niti automatskog ocenjivanja sastava i govora.
Ova verzija ne zamenjuje proveru čitanja lektire, slušanja, recitovanja,
akcenta, rukopisa i dužeg pisanog izražavanja.

## Generisanje i ocenjivanje

Gramatika i rečnik podržavaju ukucavanje i tačno/netačno, a čitanje samo
ukucavanje. U automatskom režimu gramatika i rečnik povremeno biraju tvrdnju.
Pitanje i njegove tačna/netačna varijanta dele isti potpis: promena prikaza
ne stvara novu sadržajnu jedinicu. Generator bira samo preostale potpise,
pa vraća čitav dostupni skup pre upozorenja o iscrpljenom sadržaju.

Sva nova pitanja imaju težinu 5 i pet poena. Pravopis koristi samo
tačno/netačno, jer postojeće SQL ocenjivanje teksta zanemaruje velika slova
i dijakritike. Nova bankarska pitanja imaju `manual_review=false`; odgovor
ocenjuje postojeća serverska funkcija. Prihvaćene varijante kratkih odgovora
navedene su u sadržaju. Opšta pravila ocenjivanja nisu menjana.

U kombinovanom kvizu prve tri oblasti koriste generator, a preostale banku.
Režim „Banka pitanja” koristi samo stvarno sačuvana pitanja; generatori se
ne pretvaraju automatski u trajna bankarska pitanja. Postojeći dnevni rasporedi
ne dobijaju nove oblasti automatski.

## Uvoz i objavljivanje

Migracija `20260830170000_srpski_5_razred.sql` dodaje oblasti i proširuje
validaciju postojećeg RPC-a za dnevne rasporede. Banka je odvojena od migracije,
jer njen vlasnik mora biti stvarni administrator. Podaci su u
`src/data/srpski5Banka.ts`, a skripta koristi isključivo Supabase CLI.
Potreban je Node.js 22.18+ sa podrškom za učitavanje TypeScript tipova.

```bash
node scripts/uvoz-srpski5.mjs --dry-run
node scripts/uvoz-srpski5.mjs --apply
supabase db query --linked -f scripts/provera-srpski5.sql
```

Bez argumenta radi se provera sa rollback-om. Opcija `--sql` prikazuje SQL
za istu proveru bez izvršavanja. Skripta traži tačno jednog vlasnika banke
srpskog za 3. i 4. razred, proverava oblasti, unosi samo nedostajuće potpise
i odbija neslaganje sa postojećim sadržajem. Nema brisanja niti prepisivanja.
Ponovljen uvoz je idempotentan. Za novu instalaciju bez postojeće srpske
banke treba prvo eksplicitno odrediti vlasnika, a ne nasumično izabrati nalog.

Nakon migracije i uvoza ponovo objaviti `process-daily-quizzes`, jer koristi
iste module kao frontend. Objavljivanje frontenda ide preko `main` i
GitHub Pages workflow-a. Ne menjati postojeće snapshot-e i rasporede.

## Provere

```bash
npx vitest run
npm run build
```

Namenski testovi pokrivaju minimalni sadržaj, porodice zadataka, padeže,
determinizam, prihvaćene odgovore, granicu od 2000 znakova, ponavljanja,
filtriranje razreda, raspodelu izvora, banku i nepromenjen ostatak RPC-a.
Serverske upisne probe izvršavati u transakciji sa rollback-om, bez pokretanja
slanja obaveštenja ili produkcionog dnevnog procesa.
