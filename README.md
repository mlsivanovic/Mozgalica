# 🧠 Mozgalica

PWA aplikacija za kvizove iz matematike i srpskog jezika, uz partije šaha protiv
računara, namenjena deci koja su završila 3. ili 4. razred osnovne škole. Cilj je
da tokom letnjeg raspusta na zabavan način obnove gradivo.

Živa verzija: **https://mlsivanovic.github.io/Mozgalica/**

## Kako radi

- **Administrator** (roditelj/nastavnik) se prijavljuje lozinkom ili magic linkom, kreira
  pitanja i kvizove, dodeljuje šahovske partije, dnevne rasporede i aktivne kvizove,
  uređuje profile dece. Po potrebi može da napravi i generički link sa više pokušaja.
- **Dete** ne otvara nalog — preko stalnog profilnog linka vidi aktivne kvizove i partije,
  zvezdice, titulu i prethodne rezultate. Započeti profilni kviz nastavlja tamo gde je
  prekinut, uključujući povratak sa drugog uređaja.
- **Šah protiv računara:** dete igra na jednom od pet ELO nivoa, sa satom ili bez njega.
  Posle poraza ili predaje može najviše tri puta da ponovi partiju — protiv istog ili
  slabijeg protivnika.
- Netačni zadaci imaju objašnjenje, a dete može jednom da ih reši ponovo — sa novim,
  istovrsnim zadacima; ako tada sve bude tačno, zvezdice se dopune do pune kvote.
- Odgovori se čuvaju i offline, a predaja je moguća tek kad server potvrdi da su sačuvani.
- Kada dete završi kviz, administrator dobija mejl sa rezultatom.

## Tehnologije

- **Frontend:** React 19 + TypeScript + Vite (SPA), `react-router-dom` sa `HashRouter`
  (radi na GitHub Pages podputanji bez servera).
- **Backend:** [Supabase](https://supabase.com) — Postgres baza, autentifikacija
  (lozinka + magic link), Edge Functions, Row Level Security. Besplatan paket, bez kartice.
- **Obaveštenja:** trajni inbox, standardni Web Push sa VAPID ključevima i
  [Brevo](https://www.brevo.com/) transakcioni mejlovi preko Supabase Edge Function-a.
  API i privatni ključevi nikad nisu izloženi u frontendu.
- **PWA:** `vite-plugin-pwa` (manifest + service worker, instalabilna aplikacija,
  offline shell, obaveštenje o novoj verziji).
- **Hosting:** GitHub Pages, automatski deploy preko GitHub Actions pri svakom
  push-u na `main`.
- **Testovi:** Vitest (generator pitanja, šahovski engine, offline red, seed podaci
  i pomoćni moduli).

Kompletan spisak arhitekturnih odluka i faza razvoja nalazi se u planu projekta;
koraci za povezivanje Supabase/Brevo naloga i Web Push-a su u [SETUP.md](./SETUP.md).

## Pokretanje lokalno

```bash
npm install
cp .env.example .env.local   # popuni sa svojim Supabase podacima — vidi SETUP.md
npm run dev
```

Aplikacija radi i bez popunjenog `.env.local` (prikazaće poruku da backend nije
podešen), što je dovoljno za rad na frontend delu bez baze.

## Testovi

```bash
npx vitest run
```

## Struktura projekta

```
supabase/migrations/   SQL migracije (šema, RLS, RPC funkcije, ocenjivanje, cron zakazivanja)
supabase/functions/    Edge funkcije: play-chess (šahovska partija),
                       dispatch-notifications (mejlovi/push), process-daily-quizzes
                       (dnevni kvizovi i šahovske partije)
src/generator/         Deterministički generator pitanja — matematika i srpski jezik (bez AI)
src/sah/               Šahovski engine, nagrade, ELO nivoi, ponovni pokušaji
src/routes/admin/      Administratorski panel (kvizovi, šah, podešavanja, statistika)
src/routes/dete/       Javni profil deteta: napredovanje, aktivni kvizovi i partije, istorija
src/routes/kviz/       Dečji tok kviza: ulaz, rešavanje, rezultat
src/routes/sah/        Dečja stranica šahovske partije
src/lib/               Supabase klijent, tipizirani API pozivi, offline red, pomoćne funkcije
src/data/              Početni skup od 30 primera pitanja
```

## Deployment

Svaki push na `main` granu automatski builduje i objavljuje aplikaciju na GitHub
Pages (`.github/workflows/deploy.yml`). Detaljno uputstvo za prvo podešavanje
(Supabase projekat, Brevo nalog, Web Push i GitHub Variables/Secrets) je u
[SETUP.md](./SETUP.md).
