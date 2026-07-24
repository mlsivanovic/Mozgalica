# Uputstvo za podešavanje — Mozgalica

Ovo uputstvo vodi te kroz **jednokratno** povezivanje aplikacije sa besplatnim
Supabase i Brevo nalozima. Traje oko 30 minuta. Sve što se radi je besplatno
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

## 4. Brevo nalog (slanje mejlova)

1. Napravi besplatan nalog na [brevo.com](https://www.brevo.com/).
2. U **Senders & IP → Senders** dodaj adresu sa koje Mozgalica šalje i potvrdi
   šestocifreni kod koji stigne na tu adresu. Sopstveni domen nije obavezan za
   početak, ali je preporučen za bolju isporučivost.
3. U **SMTP & API → API Keys** napravi API ključ. Ne upisuj ga u `.env.local`,
   GitHub ili bilo koji fajl repozitorijuma.

## 5. VAPID ključevi i Edge secrets

Generiši jedan VAPID par (radi se samo jednom):

```bash
npx web-push generate-vapid-keys
```

Sačuvaj privatni ključ isključivo kao Supabase secret. Javni ključ će biti i
frontend promenljiva:

```bash
supabase secrets set \
  BREVO_API_KEY=xkeysib-tvoj-kljuc \
  BREVO_SENDER_EMAIL=tvoja-potvrdjena-adresa@example.com \
  BREVO_SENDER_NAME=Mozgalica \
  APP_BASE_URL=https://mlsivanovic.github.io/Mozgalica/ \
  VAPID_SUBJECT=mailto:tvoja-adresa@example.com \
  VAPID_PUBLIC_KEY=tvoj-javni-vapid-kljuc \
  VAPID_PRIVATE_KEY=tvoj-privatni-vapid-kljuc
```

Zatim deploy-uj funkciju sa uključenom JWT proverom:

```bash
supabase functions deploy dispatch-notifications
```

## 6. Poveži outbox sa Edge funkcijom

U Supabase Dashboard-u otvori **Database → Webhooks** i napravi webhook:

- tabela: `public.notification_deliveries`;
- događaj: `INSERT`;
- cilj: Supabase Edge Function `dispatch-notifications`;
- metod: `POST`;
- uključi ugrađeni **Add auth header with service key**.

Webhook odmah pokreće slanje. Za ponovne pokušaje u **Integrations → Cron**
koriste se dve šifrovane Vault tajne:

- `notification_dispatch_project_url`: URL Supabase projekta;
- `notification_dispatch_service_role_key`: legacy `service_role` JWT iz
  **Project Settings → API Keys → Legacy API Keys**.

Vrednosti unesi kroz **Integrations → Vault → Secrets** i nikad ih ne dodaj u
SQL ili repozitorijum. Migracije automatski uključuju `pg_cron`/`pg_net` i
kreiraju posao `dispatch_notification_deliveries_retry`, koji na svakih pet
minuta pokreće istu Edge funkciju. Funkcija obrađuje samo već postojeće,
serverski napravljene outbox redove i bezbedna je za ponovljene pozive.

## 7. Podesi frontend environment promenljive

Lokalno (za `npm run dev`):

```bash
cp .env.example .env.local
```

Popuni `.env.local` sa `Project URL` i `anon public` ključem iz koraka 1.
Dodaj i javni VAPID ključ iz koraka 5.

Za GitHub Pages deploy: u repozitorijumu na GitHubu idi na
**Settings → Secrets and variables → Actions → Variables** i dodaj:

- `VITE_SUPABASE_URL` = tvoj Project URL
- `VITE_SUPABASE_ANON_KEY` = tvoj anon ključ
- `VITE_VAPID_PUBLIC_KEY` = javni VAPID ključ

(Ovo su **Variables**, ne Secrets — anon ključ je javan po dizajnu i RLS ga štiti,
pa ne treba da bude sakriven, samo van git istorije radi lakše rotacije.)

## 8. Proveri da sve radi

```bash
npm install
npm run dev
```

Push service worker se generiše samo u produkcionom buildu. Za punu proveru
pokreni:

```bash
npm run build
npm run preview
```

Otvori prikazani HTTPS/localhost URL, prijavi se svojom email adresom i lozinkom iz
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
# Očekivano: {"code":"42501",...,"message":"permission denied for table questions"}
# (RLS + REVOKE u potpunosti blokiraju anonimni pristup, bez izuzetka)

curl "https://<project-ref>.supabase.co/rest/v1/attempts?select=*" \
  -H "apikey: <anon-key>"
# Očekivano: ista "permission denied" greška
```

To je sve — aplikacija je spremna za korišćenje! 🎉
