# Uputstvo za podešavanje — Mozgalica

Ovo uputstvo vodi te kroz **jednokratno** povezivanje aplikacije sa besplatnim
Supabase i Resend nalozima. Traje oko 20-30 minuta. Sve što se radi je besplatno
i ne zahteva unos podataka kartice.

## 1. Supabase projekat

1. Idi na [supabase.com](https://supabase.com) i napravi besplatan nalog.
2. Klikni **New Project**. Izaberi region blizu tebe (npr. `Central EU`), postavi
   jaku lozinku baze (sačuvaj je negde — treba ti samo ako ikad budeš ručno
   pristupao/la bazi preko `psql`).
3. Kada se projekat kreira, idi na **Settings → API** i zapiši:
   - `Project URL` (npr. `https://abcxyz.supabase.co`)
   - `anon public` ključ (dug tekst — ovo je **javni** ključ, sme da bude u frontendu)
   - `service_role` ključ (**TAJNA** — nikad ne stavljaj u frontend niti u git)
   - Iz URL-a izvuci **project ref** (deo pre `.supabase.co`, npr. `abcxyz`)

## 2. Instaliraj Supabase CLI i primeni migracije

Ako CLI još nije instaliran:

```bash
brew install supabase/tap/supabase
```

Zatim iz foldera projekta:

```bash
supabase login
supabase link --project-ref <tvoj-project-ref>
supabase db push
```

Ovo kreira sve tabele, RLS pravila i RPC funkcije iz `supabase/migrations/`.

## 3. Napravi svoj administratorski nalog

1. U Supabase dashboardu idi na **Authentication → Users → Add user** i napravi
   nalog sa email adresom **mls.ivanovic@gmail.com** (ta adresa je već upisana
   u `admin_allowlist` tabelu preko seed migracije) i lozinkom po izboru.
   - Alternativa: pokreni aplikaciju lokalno i registruj se preko Supabase Auth
     UI-ja (ako ga dodaš) ili preko `supabase.auth.signUp` u SQL editoru:
     ```sql
     -- Najjednostavnije: dodaj korisnika kroz dashboard (gore), ovo je samo za proveru
     select * from admin_allowlist;
     ```
2. Ako želiš da doda administratora sa DRUGOM email adresom, prvo je dodaj u
   `admin_allowlist` tabelu (SQL editor):
   ```sql
   insert into public.admin_allowlist (email) values ('nova-adresa@example.com');
   ```
   pa tek onda napravi nalog sa tom adresom — trigger radi samo pri registraciji.

## 4. Resend nalog (slanje mejlova)

1. Napravi besplatan nalog na [resend.com](https://resend.com) (100 mejlova/dan,
   3000/mesec — bez kartice).
2. Idi na **API Keys** i napravi novi ključ (`Full access` je najjednostavnije za MVP).
3. Bez dodavanja sopstvenog domena, Resend šalje mejlove SAMO na email adresu
   vlasnika naloga — što ovde savršeno odgovara, jer obaveštenja idu tebi kao administratoru.

## 5. Deploy Edge funkcije za mejl

```bash
supabase functions deploy send-result-email --no-verify-jwt
```

Zatim postavi tajne promenljive za funkciju (ne idu u git):

```bash
supabase secrets set RESEND_API_KEY=re_tvoj_kljuc
supabase secrets set HOOK_SECRET=$(openssl rand -hex 32)
```

Zapamti generisanu `HOOK_SECRET` vrednost — treba ti u sledećem koraku.

## 6. Poveži bazu sa Edge funkcijom

U Supabase **SQL Editor**-u pokreni (zameni vrednosti svojima):

```sql
insert into public.app_config (key, value) values
  ('functions_url', 'https://<tvoj-project-ref>.functions.supabase.co'),
  ('hook_secret', '<ista HOOK_SECRET vrednost iz koraka 5>')
on conflict (key) do update set value = excluded.value;
```

## 7. Podesi frontend environment promenljive

Lokalno (za `npm run dev`):

```bash
cp .env.example .env.local
```

Popuni `.env.local` sa `Project URL` i `anon public` ključem iz koraka 1.

Za GitHub Pages deploy: u repozitorijumu na GitHubu idi na
**Settings → Secrets and variables → Actions → Variables** i dodaj:

- `VITE_SUPABASE_URL` = tvoj Project URL
- `VITE_SUPABASE_ANON_KEY` = tvoj anon ključ

(Ovo su **Variables**, ne Secrets — anon ključ je javan po dizajnu i RLS ga štiti,
pa ne treba da bude sakriven, samo van git istorije radi lakše rotacije.)

## 8. Proveri da sve radi

```bash
npm install
npm run dev
```

Otvori `http://localhost:5173`, prijavi se svojom email adresom i lozinkom iz
koraka 3, i klikni **Učitaj početna pitanja** na strani „Banka pitanja" da dobiješ
30 primera pitanja za sve oblasti.

## 9. Keepalive (sprečava pauzu besplatnog Supabase projekta)

Workflow `.github/workflows/keepalive.yml` se pokreće automatski dva puta
nedeljno i „dodiruje" bazu preko istih GitHub Variables iz koraka 7 — nema
dodatnog podešavanja.

**Napomena:** GitHub automatski isključuje scheduled workflow-e ako repozitorijum
60 dana nema nijedan commit. Ako stigne mejl o tome, dovoljno je otići na
**Actions → Supabase keepalive → Enable workflow**.

## 10. Bezbednosna provera (opciono, preporučeno)

Proveri da anonimni korisnik ne može da čita banku pitanja ni rezultate:

```bash
curl "https://<project-ref>.supabase.co/rest/v1/questions?select=*" \
  -H "apikey: <anon-key>"
# Očekivano: prazan niz [] (RLS blokira pristup bez admin prijave)

curl "https://<project-ref>.supabase.co/rest/v1/attempts?select=*" \
  -H "apikey: <anon-key>"
# Očekivano: prazan niz []
```

To je sve — aplikacija je spremna za korišćenje! 🎉
