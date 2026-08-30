# Roditeljska aplikacija

## Navigacija i kontekst

Četiri odredišta su **Danas**, **Vežbanje**, **Napredak** i **Nagrade**. Na širinama manjim od 1024 px navigacija je pri dnu, a na većim u bočnoj traci. Podešavanja aplikacije sadrže izgled, obaveštenja i odjavu. Profili su u „Upravljaj decom“.

Izbor deteta živi u URL parametru `dete`. Odsustvo parametra znači svu decu. Nepoznat ili nedostupan profil prikazuje grešku. Zajednički alati (pitanja, generator, katalog, pravila i profili) čuvaju parametar, ali umesto birača prikazuju oznaku zajedničkog sadržaja. Forme dodele i rasporeda imaju svoj izbor primaoca, nezavisan od globalnog filtera. Detalj konkretnog pokušaja ne prikazuje globalni birač.

`RoditeljskiLink` i `useRoditeljskiNavigate` čuvaju kontekst pri navigaciji. Period i filteri napretka prenose se u detalj i nazad, a arhiva zadržava svoj prikaz. Stare rute rezultata, statistike, generatora, kvizova i šaha ostaju dostupne ili preusmeravaju na odgovarajuće odredište.

## Podaci i bezbednost

- `admin_parent_tasks(p_child_profile_id)` vraća preostale kvizove i šahovske partije. Aktivne dodele koriste ista pravila dostupnosti kao postojeći prikaz arhive.
- `admin_parent_overview(p_child_profile_id)` koristi iste zadatke za brojače. Posebno računa aktivnosti završene danas, preglede koji čekaju ocenu i nagrade za isporuku; vraća najviše pet poslednjih događaja.
- Oba RPC-a su `STABLE`, dostupna samo prijavljenom administratoru i ograničena na vlasnika. Ne vraćaju tokene dečjih profila.
- Granica dana za početnu, period i arhivu je `Europe/Belgrade`. Početna se osvežava na fokus, push i jednom u minutu.
- Kupovine imaju `childProfileId`; filter ne poredi imena dece.
- Standardni kviz priprema sva potrebna pitanja pre prvog upisa. Nedovoljan broj pitanja je greška, bez automatskog dopunjavanja. Ponovni pokušaj koristi isti UUID kviza, isti pripremljeni snapshot i isti identifikator zahteva za dodelu. Posle započetog upisa potvrđeni primalac i opcije ostaju zaključani.
- Ocenjivanje, šahovska logika, dodela zvezdica i zaštita snapshot-a ostaju na postojećim serverskim funkcijama.

## Provere

```bash
npx vitest run
npm run build
supabase db query --linked -f supabase/tests/roditeljski_pregled.sql
```

Integracioni SQL test proverava pristup, vlasništvo, nepoznat profil, ograničenje događaja, dnevnu zonu i slaganje brojača sa zadacima. Radi u transakciji koja se završava sa `ROLLBACK` i ne menja poslovne podatke.

Pri uvođenju su provereni DOM i dimenzije glavnih prikaza u lokalnoj aplikaciji sa probnim podacima na širinama 320, 390, 768 i 1440 px, uz svetlu i tamnu temu. Provereni su i izbor profila, zajedničke stranice, stari link statistike i greška za nedostupan profil. Snimanje ekrana i automatizovani klikovi nisu bili pouzdano dostupni u in-app browseru; vizuelni pregled snimaka i kompletan tok dodele klikovima nisu time potvrđeni. Nisu slati probni zadaci ni obaveštenja stvarnoj deci.
