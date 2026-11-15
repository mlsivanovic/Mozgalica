# Native dečja aplikacija — UI/UX rework

Plan i obrazloženje za potpuni vizuelni rework `android-app/`. Funkcionalnost, ugovori sa
serverom i pravila (serversko ocenjivanje, autoritativni šah) se **ne menjaju** — menja se
samo prikaz.

## Problem (stanje pre reworka)

- Ikone su emoji znaci u tekstu (🏠 📅 ⭐ 📊 ⚙️ 🔔 ← ↻ ⏮ ▶). Sitne su, izgledaju različito
  na svakom telefonu i ne prate Material 3.
- Ikona aplikacije je PWA PNG umanjen na belu pozadinu (TWA ostatak) — na početnom
  ekranu deluje sitno i bledo, nema monohromni sloj za „themed icons".
- Šahovske figure su ručno crtane geometrijske putanje — ne liče na šah. Tabla nema
  koordinate, igrači nemaju „traku" sa satom, lista poteza je dugačka kolona teksta.
- Raspored je dugačak tekstualni spisak; nedelja je jedna dugačka kolona, bez izbora dana.
- Rezultati: nesortirana lista (šah pa kvizovi), bez filtera, bez sažetka.
- Ekrani su „naslov + kartica sa tekstom"; nema hijerarhije, ikonica, boja ni stanja.

## Pravac

Moderni Material 3 (Android 15/16 izgled, kao Google aplikacije: Fit, Classroom, Files),
prilagođen deci: krupni dodirni ciljevi (≥ 48–56 dp), Nunito, jasne boje, maskota.

### 1. Dizajn sistem (`core/dizajn`)
- Nova M3 paleta iz brend ljubičaste sa svim ulogama (`surfaceContainer*`, `inverse*`)
  za svetlu i tamnu temu + proširene boje (`uspeh`, `upozorenje`, `zvezda`).
- Kompletna tipografska skala (display → label) u Nunitu, uključujući ExtraBold za brojeve.
- Veći radijusi (12/16/20/28/32 dp).
- Zajedničke komponente: `EkranZaglavlje`, `IkonaZnak`, `Znacka`, `SekcijaNaslov`,
  `StatPlocica`, `PraznoStanje`, `TrakaNapretka`.

### 2. Ikone
- Material Symbols (Rounded) preko `material-icons-extended` — popunjene za izabran tab,
  obrisne za neizabran.
- Šah koristi pravu figuru (skakač) kao ikonu.
- Nova adaptivna ikona aplikacije: vektorski prednji sloj + pozadina + monohromni sloj.

### 3. Navigacija
- `NavigationBar` sa pravim ikonama i bedžom aktivnih zadataka na „Početna".
- Obaveštenja u `ModalBottomSheet` umesto kartice koja gura sadržaj.

### 4. Početna
- Pozdrav sa avatarom, zvonce sa bedžom, podešavanja kao `IconButton`.
- „Hero" kartica: zvezdice, raspoloživo, titula i napredak do sledeće titule.
- „Danas u školi": trenutni/sledeći čas umesto generičke kartice.
- Kartice zadataka sa ikonom, statusom, napretkom i jasnim CTA dugmetom.

### 5. Raspored
- `SegmentedButton` Danas / Sutra / Nedelja; bedž smene.
- Vremenska linija časova: vreme levo, kartica u boji predmeta, „Sada" (sa napretkom
  časa) i „Sledeći".
- Nedelja: birač dana (Pon–Sub) umesto dugačke kolone.

### 6. Rezultati
- Sažetak: broj aktivnosti, osvojene zvezdice, prosečan uspeh, šah P/R/I.
- Filteri (`FilterChip`): vrsta (Sve / Kvizovi / Šah), period (Sve / 7 dana / 30 dana),
  ishod šaha, sortiranje (najnovije / najbolji rezultat).
- Lista sortirana po datumu i grupisana (Danas, Juče, datum). Logika filtera je čista
  funkcija pokrivena testovima.

### 7. Šah
- Klasične cburnett figure (iste kao u PWA, vektorski), klasična braon tabla,
  koordinate na ivici, isticanje legalnih poteza (tačka / prsten za uzimanje), šah.
- Trake igrača iznad i ispod table (računar / dete) sa satom i uzetim figurama
  + materijalna prednost.
- Statusna traka („Tvoj potez", „Računar razmišlja…"), akcije sa ikonama
  (Poništi, Predaj), horizontalna lista poteza, kontrole pregleda sa ikonama.
- Rezultat: velika kartica sa ikonom ishoda i zvezdicama.

### 8. Ostalo
- Podešavanja: liste sa ikonama, `SegmentedButton` za temu.
- Nagrade, prodavnica, povezivanje i kviz: zaglavlja, ikone umesto emoji/strelica.

## Šta se namerno ne menja
- Ugovori sa serverom, ViewModel-i, offline red, šahovska i kviz logika.
- Informaciona arhitektura (4 taba + fokusirani kviz/šah).
- Pristupačnost: zadržani `contentDescription`/`customActions` (TalkBack za šah).

## Provera
- `./gradlew :app:testDebugUnitTest :core:podaci:test` i `:app:assembleDebug`.
- Vizuelna provera na emulatoru preko „Prikaži probni profil" (bogatiji probni podaci
  u `src/debug/assets/probno/`), svetla i tamna tema.
