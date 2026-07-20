# 🧠 Mozgalica

PWA aplikacija za kreiranje i rešavanje matematičkih kvizova, namenjena deci koja su
završila 3. razred osnovne škole. Cilj je da tokom letnjeg raspusta na zabavan način
obnove gradivo iz matematike.

Živa verzija: **https://mlsivanovic.github.io/Mozgalica/**

## Kako radi

- **Administrator** (roditelj/nastavnik) se prijavljuje lozinkom ili magic linkom, kreira
  pitanja ručno ili ih automatski generiše (uz obavezan pregled pre objave), pravi
  kvizove i šalje jedinstven link detetu.
- **Dete** ne otvara nalog — pristupa kvizu preko dobijenog linka, unosi ime i rešava.
  Odgovori se čuvaju i offline, a predaja je moguća tek kad server potvrdi da su sačuvani.
- Kada dete završi kviz, administrator dobija mejl sa rezultatom.

## Tehnologije

- **Frontend:** React 18 + TypeScript + Vite (SPA), `react-router-dom` sa `HashRouter`
  (radi na GitHub Pages podputanji bez servera).
- **Backend:** [Supabase](https://supabase.com) — Postgres baza, autentifikacija
  (lozinka + magic link), Edge Functions, Row Level Security. Besplatan paket, bez kartice.
- **Mejl:** [Resend](https://resend.com) preko Supabase Edge Function-a — API ključ
  nikad nije izložen u frontendu.
- **PWA:** `vite-plugin-pwa` (manifest + service worker, instalabilna aplikacija,
  offline shell, obaveštenje o novoj verziji).
- **Hosting:** GitHub Pages, automatski deploy preko GitHub Actions pri svakom
  push-u na `main`.
- **Testovi:** Vitest (generator pitanja, offline red, seed podaci).

Kompletan spisak arhitekturnih odluka i faza razvoja nalazi se u planu projekta;
koraci za povezivanje sopstvenog Supabase/Resend naloga su u [SETUP.md](./SETUP.md).

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
supabase/migrations/   SQL migracije (šema, RLS, RPC funkcije za dete, ocenjivanje)
supabase/functions/    Edge funkcija za slanje mejlova
src/generator/         Deterministički generator matematičkih pitanja (bez AI)
src/routes/admin/      Administratorski panel
src/routes/kviz/       Dečji tok: ulaz, rešavanje, rezultat
src/lib/               Supabase klijent, tipizirani API pozivi, offline red, pomoćne funkcije
src/data/               Početni skup od 30 primera pitanja
```

## Deployment

Svaki push na `main` granu automatski builduje i objavljuje aplikaciju na GitHub
Pages (`.github/workflows/deploy.yml`). Detaljno uputstvo za prvo podešavanje
(Supabase projekat, Resend nalog, GitHub Variables/Secrets) je u [SETUP.md](./SETUP.md).
