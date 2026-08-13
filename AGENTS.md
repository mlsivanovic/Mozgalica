# AGENTS.md — Mozgalica

Uputstva za rad na ovom projektu (ljudski saradnici i AI agenti).

## Važna pravila za AI agente

- **Za svaki rad sa Supabase-om koristi Supabase CLI u terminalu.** Ne obavljaj
  Supabase izmene preko kontrolne table, osim ako terminalska alternativa zaista
  ne postoji.
- **Samostalno izvrši akciju kad god je to moguće.** Ne prebacuj korisniku korake
  kroz administratorske panele ako se isti rezultat može postići iz terminala.
  Ako nedostaje potreban alat, zatraži dozvolu za njegovu instalaciju, zatim ga
  instaliraj i dovrši posao samostalno.
- **Po završetku svake implementirane izmene objavi je na `main`.** Agent treba
  da proveri izmene, stage-uje samo relevantne fajlove, napravi smislen commit i
  samostalno uradi `git push origin main`, bez čekanja posebnog zahteva. Izuzetak
  važi samo kada korisnik izričito traži da se ne commit-uje/ne šalje ili navede
  drugu granu.

### Pristup Supabase bazi (CLI)

Anon ključ iz `.env.local` **ne može** da čita/piše tabele direktno — RLS dozvoljava
samo `authenticated` (admin) preko SECURITY DEFINER RPC funkcija. Za direktan rad
sa bazom iz terminala koristi Management API preko linkovanog projekta:

```bash
# Read-only upit (odlično za analizu/verifikaciju stanja baze)
supabase db query --linked "SELECT ... ;"

# Izvršavanje SQL fajla (za INSERT/UPDATE veće količine podataka)
supabase db query --linked -f /tmp/skripta.sql

# Read-only sa transakcijom za bezbedno testiranje write operacija
supabase db query --linked "BEGIN; UPDATE ... ; ROLLBACK;"
```

`--linked` koristi `supabase/.temp/linked-project.json` (project ref) i
autentifikuje se preko Management API-ja, **zaobilazeći anon ključ i RLS** —
radi i za `SELECT` i za `INSERT`/`UPDATE`/`DELETE`.

**Bezbednost write operacija:** Pre bilo koje destruktivne izmene (DELETE, masovni
UPDATE) napravi backup tabelu: `CREATE TABLE x_backup_datum AS SELECT * FROM x;`.

**Poštuj arhitekturu snapshot-a:** Pitanja i oblasti korišćene u istorijskim
kvizovima (referencirane u `quiz_questions` preko `source_question_id` FK) ne mogu
da se obrišu — `trg_quiz_questions_guard` trigger blokira. Njihov tekst/odgovor
može da se menja (snapshot u `quiz_questions` ima sopstveni `text` i ostaje
netaknut), ali brisanje pada. Pre brisanja uvek proveri:
`SELECT count(*) FROM quiz_questions WHERE source_question_id = '<id>';`

## Konvencije

- **Komentari u kodu, README i dokumentacija: srpski (latinica).** UI tekst za
  korisnike takođe srpski — engleski se koristi samo za imena promenljivih/funkcija
  kad je to prirodnije (npr. tipovi iz baze), ali javni API srpskih pomoćnih
  funkcija (npr. `formatDatum`, `napraviDistraktore`) ostaje srpski.
- **Bez nepotrebnih komentara.** Piši komentar samo kad objašnjava NEOČIGLEDNO
  (zašto, ne šta) — skriveno ograničenje, suptilan bag koji je izbegnut, workaround.
- **Nema hardkodovanih tajni.** Supabase anon ključ ide u `VITE_*` env promenljive
  (javan po dizajnu). Service role ključ, Resend API ključ i hook secret žive
  ISKLJUČIVO u Supabase Edge Function secrets — nikad u frontend kodu ili gitu.
- **Ocenjivanje odgovora je isključivo server-side** (SQL funkcije u
  `supabase/migrations/`). Frontend nikad ne odlučuje da li je odgovor tačan —
  samo prikazuje ono što RPC vrati.
- **Snapshot pitanja u kvizu je nepromenjiv** čim kviz ima bar jedan pokušaj
  (garantovano `trg_quiz_questions_guard` trigger-om). Izmena banke pitanja
  nikad ne sme retroaktivno da promeni već poslat kviz.

## Arhitektura (kratko)

```
supabase/migrations/   SQL: šema, RLS, SECURITY DEFINER RPC funkcije, ocenjivanje
supabase/functions/    Deno Edge Function za slanje mejlova (Resend)
src/generator/         Deterministički generator matematičkih pitanja (bez AI)
src/lib/                Supabase klijent, tipizirani API pozivi, offline red
src/routes/admin/      Administratorski panel (zaštićen AuthContext-om)
src/routes/kviz/       Dečji tok bez naloga: ulaz → rešavanje → rezultat
```

Detaljan opis modela baze, bezbednosnog modela i faza razvoja: videti plan
projekta (`Context`/`Arhitektura` odeljci pisani pre implementacije).

## Testiranje

```bash
npx vitest run    # generator pitanja, offline red, seed podaci
npm run build     # tsc -b && vite build — hvata tipske greške
```

Kada dodaješ novi modul u `src/generator/moduli/`, dodaj test koji proverava:
matematička pravila (opseg, bez negativnih/ostatka), determinizam po seed-u,
i da distraktori nikad ne pogađaju tačan odgovor.

## Dodavanje nove oblasti generatora

1. Dodaj red u `topics` SQL migracijom, a primeni je Supabase CLI-jem u terminalu.
2. Napravi `src/generator/moduli/<oblast>.ts` koji implementira `TopicGenerator`
   iz `src/generator/types.ts`.
3. Registruj modul u `src/generator/index.ts` (`MODULI` niz).
4. Dodaj naziv u `NAZIVI_OBLASTI` mapu u `src/routes/admin/Generator.tsx`.
5. Napiši testove po uzoru na `src/generator/generator.test.ts`.

## Buduće proširenje na druge razrede/predmete

Oblasti (`topics`) i nivoi težine su namerno odvojeni od koda generatora —
dodavanje novog razreda znači nove redove u `topics` i nove module u
`src/generator/moduli/`, bez menjanja šeme baze.
