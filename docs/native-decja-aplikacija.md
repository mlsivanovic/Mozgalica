# Native dečja aplikacija — plan razvoja

Plan prelaska dečje Mozgalice sa Android omotača (Bubblewrap / TWA) na native Android
aplikaciju. Roditeljski deo ostaje web/PWA. Baza i serverska logika ostaju iste, osim
male dodatne migracije za FCM push (videti [Push](#7-push-fcm-umesto-web-push)).

Prvo izdanje ide kao APK na GitHub Release, kao i danas. Play Store je posebna, kasnija faza.

## Sažetak

| | |
|---|---|
| **Obim** | Svi dečji ekrani: povezivanje profila, Početna, Raspored, Nagrade, Prodavnica, Rezultati, Podešavanja, kviz (ulaz, rešavanje, rezultat, ponovni pokušaj) i šah |
| **Stek** | Kotlin, Jetpack Compose, Material 3, supabase-kt, Room, DataStore, WorkManager, FCM |
| **Paket** | `io.github.mlsivanovic.mozgalica` (isti kao TWA) i isti potpisni ključ, pa se aplikacija instalira preko postojeće, a Family Link podešavanja ostaju |
| **Procena** | **45–57 radnih dana**: ~32–40 za funkcionalni paritet i ~13–17 za brzinu, fluidnost i modernizaciju |
| **Play Store kasnije** | 5–8 dana rada i najmanje 14 dana zatvorenog testa sa 12 testera |

## Šta se ne menja

Ovo su granice koje native klijent mora da poštuje isto kao web:

- **Ocenjivanje je isključivo na serveru.** Aplikacija nikad ne zna da li je odgovor tačan
  pre nego što to vrati `submit_attempt` ili `submit_retry`. Za vreme kviza nema povratne
  informacije o tačnosti.
- **Šah je autoritativan na serveru** (`play-chess` + `commit_chess_state`). Klijent sme
  samo da proveri legalnost poteza radi brzog prikaza. Server ima poslednju reč.
- **Snapshot pitanja je nepromenjiv** i model tokena ostaje isti: profilni token, token kviza,
  token pokušaja i play token za šah.
- **Pravila tajmera:** `deadlineAt` + `serverNow` offset za link kvizove, pauzirani tajmer sa
  `checkpoint_attempt_timer` za profilne kvizove, i automatska predaja na isteku.
- **Predaja se otključava tek kad server potvrdi sve odgovore**, isto kao u
  [`KvizResavanje.tsx`](../src/routes/kviz/KvizResavanje.tsx).
- **Dečje web rute ostaju** (iOS, pregledač, rezerva). Native i web koriste iste RPC funkcije.

## Ugovor sa serverom

Native aplikacija koristi isti skup poziva kao dečji web:

| Oblast | RPC / funkcija |
|---|---|
| Profil | `get_child_profile`, `get_child_school_timetable` |
| Obaveštenja | `get_child_notifications`, `mark_child_notifications_read` |
| Kviz | `get_quiz_by_token`, `start_attempt`, `resume_attempt`, `save_answers`, `checkpoint_attempt_timer`, `use_hint`, `submit_attempt`, `mark_explanations_seen` |
| Ponovni pokušaj | `start_retry`, `resume_retry`, `submit_retry` (+ nova Edge funkcija, videti fazu 4) |
| Prodavnica | `get_shop`, `purchase_shop_item` |
| Šah | Edge funkcija `play-chess`, akcije `state`, `start`, `child_move`, `engine`, `undo`, `resign`, `retry` |
| Push | `register_child_push`, `unregister_child_push`, `get_child_push_status` (proširuje se za FCM) |

**Ugovorni testovi:** za svaki RPC se jednom snimi stvarni JSON odgovor
(`supabase db query --linked`, sa probnim profilom) u
`android-app/core/podaci/src/test/resources/ugovori/`.
Kotlin testovi proveravaju da se svaki snimak parsira, i to strogo: novo polje obara test.
Kada se RPC promeni u migraciji, test pada i podseća da se ažurira i native klijent.

Snimci su uzeti 2026-11-14. RPC pozivi su išli nad probnim profilom „Proba Native“
u transakciji koja je poništena, pa u bazi ništa nije ostalo i obaveštenja nisu poslata.
`play-chess` akcija `state` je snimljena kratkotrajnim redom koji je odmah obrisan;
nije bilo redova u `notification_deliveries`.

`supabase-kt` 3.9 (`KotlinXSerializer`) parsira sve snimke. Polja `options`, `answer` i
`correct` su unije bez diskriminatora, pa imaju poseban serializer. Jedna obična
data klasa ih ne pokriva.

Živi JSON se razlikuje od nekih opcionih polja u `src/types/kviz.ts`. Native modeli
prate snimak, ne stariji TypeScript tip:

- `submit_attempt` ne vraća `childName`, `starsEarned`, `totalStars`, `titleProgress`
  ni `newlyUnlockedTitle`. Vraća `starsAwarded`.
- `get_quiz_by_token` za profilni link ne vraća `titleProgress`, `totalStars`,
  `fixedChildName` ni `labelName`.

## Arhitektura

```
android-app/
  app/                    Application, MainActivity, navigacija, DI
  core/dizajn/            Tema (tokeni iz theme.css), tipografija, komponente za decu
  core/podaci/            supabase-kt klijent, DTO-ovi, repozitorijumi, Room, DataStore
  core/sinhronizacija/    WorkManager poslovi: slanje odgovora, osvežavanje profila, FCM token
  funkcije/povezivanje/   QR i nalepljeni link
  funkcije/pocetna/       Početna, obaveštenja
  funkcije/kviz/          ulaz, rešavanje, rezultat, ponovni pokušaj
  funkcije/sah/           tabla, partija, pregled poteza
  funkcije/nagrade/       titule, prodavnica
  funkcije/raspored/      raspored časova
  funkcije/podesavanja/   tema, zvuk, push, promena profila
  vidzet/                 Glance vidžet za početni ekran
  baselineprofile/        Macrobenchmark i Baseline Profile
```

Moduli po funkcijama ubrzavaju inkrementalni build i drže granice čistim. Faza 0 otvara
`app`, `core/dizajn` i `core/podaci`. Ostali moduli se dodaju kad dobiju kod.

Faza 1 nije otvorila `funkcije/povezivanje`. Ekrani povezivanja i ljuska su u `app`
(paketi `povezivanje`, `navigacija`, `profil`), a klijent, Room, DataStore i Tink u
`core/podaci`. Tako Hilt i KSP ostaju na jednom application modulu. Tok za dete je isti.

| Sloj | Izbor | Zašto |
|---|---|---|
| UI | Jetpack Compose + Material 3 | Moderan standard, animacije i prelazi bez muke |
| Navigacija | Navigation Compose, type-safe rute | Deep linkovi iz push-a i vidžeta |
| DI | Hilt | Standard, dobro dokumentovan |
| Mreža | supabase-kt (`postgrest-kt`, `functions-kt`) + Ktor OkHttp | `rpc()` i `functions.invoke()` kao u webu |
| Serijalizacija | kotlinx.serialization | DTO-ovi kao u `src/types/kviz.ts` |
| Lokalno | Room (keš profila, red odgovora), DataStore (podešavanja) | Offline i trenutan prikaz |
| Tajne | Profilni token šifrovan ključem iz Android Keystore-a (Tink) | Token je bearer pristup profilu |
| Pozadina | WorkManager | Pouzdano slanje odgovora i kad se aplikacija zatvori |
| Šah | `chesslib` (bhlangonijr) za legalne poteze | Optimističan prikaz poteza bez čekanja servera |
| Push | Firebase Cloud Messaging | Native kanali, data poruke za tiho osvežavanje |
| Min / target SDK | 24 / 36 | Isto kao TWA, da niko ne ostane bez nadogradnje. Core library desugaring za `java.time`. `compileSdk` ostaje 36. Compose BOM 2026.09 i `core-ktx` 1.19 traže API 37, pa skelet koristi BOM 2026.06 i `core-ktx` 1.18 |

Obrazac je **UDF**: `ViewModel` izlaže `StateFlow<UiStanje>`, a ekrani su čiste Compose
funkcije. Repozitorijumi rade po principu **keš pa mreža**: odmah emituju Room podatke,
zatim osvežavaju sa servera.

## Brzina i fluidnost (planirano od prvog dana)

Ovo je glavni razlog prelaska, pa ulazi u sve faze, a ne tek na kraju.

### Pokretanje
- **SplashScreen API** bez veštačkog čekanja. Prvi ekran se crta iz Room keša, bez mreže.
- **Baseline Profile + Startup Profile**, generisani Macrobenchmark-om u CI-ju. Hladan start
  postaje 20–40% brži jer kritični kod nije interpretiran.
- **R8 full mode**, uklanjanje neiskorišćenih resursa, bez nepotrebnih biblioteka.
- **Lenja inicijalizacija:** Firebase, WorkManager i Supabase klijent preko App Startup-a ili
  na prvu upotrebu, ne u `Application.onCreate`.
- **Zagrejana veza:** pri startu se paralelno pokrene `get_child_profile`. OkHttp drži HTTP/2
  vezu otvorenom, pa sledeći pozivi ne plaćaju TLS ponovo.
- **Cilj:** hladan start ispod 800 ms do korisnog sadržaja na srednjem telefonu i ispod
  1,5 s na slabom (2–3 GB RAM-a).

### Podaci bez čekanja
- **Keš pa mreža** za profil, raspored, prodavnicu i rezultate. Dete odmah vidi poslednje
  stanje, a sveži podaci se uklope bez treptanja.
- **Bez prozivanja na 30 s** kao u webu. Osvežava se na povratak u aplikaciju (lifecycle
  `ON_START`), na FCM data poruku i na povlačenje nadole.
- **Prefetch:** sa Početne se u pozadini učita `get_quiz_by_token` za aktivne kvizove, pa je
  ulaz u kviz trenutan. `start_attempt` se ne zove unapred, jer pokreće tajmer.
- **Optimistični UI:**
  - Šah: potez deteta se odmah prikaže i animira (lokalna provera legalnosti), a zatim se
    potvrdi sa serverom. Ako server odbije, potez se animirano vraća.
  - Odgovori u kvizu: upis u Room je trenutan, a slanje ide kroz red (debounce 2 s, kao danas).
  - Obaveštenja „pročitano": odmah lokalno, a na server u pozadini.

### Fluidnost
- Compose strong skipping (podrazumevano), stabilni modeli (`@Immutable`), `key` u listama,
  bez alokacija u `draw` fazi.
- Animacije preko `animate*AsState` / `Animatable` sa `spring` specifikacijama, 60/120 Hz.
- **Shared element prelazi:** kartica kviza ili šaha na Početnoj se proširi u ekran zadatka.
- **Predictive back** gest (podrazumevan za target 36) i **edge-to-edge** (obavezno od target 35).
- Šahovska tabla se crta jednim `Canvas`-om, a figure su vektori. Prevlačenje radi kroz
  `pointerInput` bez rekompozicije cele table.

### Merenje (da ne bude „čini mi se")
- Macrobenchmark: `StartupBenchmark` (hladan i topao start) i `FrameTimingBenchmark` za
  skrol Početne, rešavanje kviza i šahovsku partiju.
- JankStats u debug buildu.
- Ručni test na jednom slabom telefonu u svakoj fazi, ne samo na kraju.

## UI/UX — procena i modernizacija

**Preporuka: zadržati identitet, a promeniti obrasce.** Deca već znaju četiri odredišta
(Početna, Raspored, Nagrade, Rezultati), maskotu, zvezdice i titule. To ostaje. Menja se
osećaj i ergonomija, jer web obrasci (padajući meniji, sistemska tastatura, `<details>`,
mali tasteri) nisu prilagođeni dečjim prstima.

### Šta zadržati
- Informacionu arhitekturu sa 4 taba i fokusiran prikaz kviza i šaha bez navigacije.
- Brend: indigo `#4F46E5` kao primarnu, ćilibar kao akcenat, boje predmeta
  (matematika, srpski, priroda, šah), maskotu, titule i ekonomiju zvezdica.
- Svetlu, tamnu i sistemsku temu.

### Šta unaprediti

| Oblast | Danas (web) | Native |
|---|---|---|
| **Povezivanje profila** | Nalepi se ceo profilni link | **Skeniraj QR** sa roditeljskog ekrana preko Google Code Scanner-a, bez dozvole za kameru. Nalepljeni link ostaje kao rezerva |
| **Numerički odgovor** | Sistemska tastatura iskače i pomera sadržaj | **Ugrađeni veliki numpad** (0–9, zarez, minus, briši) u dnu ekrana. Bez skakanja rasporeda |
| **Uparivanje** | `<select>` za svaki par | **Dodirni levo, pa desno.** Parovi dobijaju istu boju i liniju, a dodir na par ga raskida |
| **Jedan i više izbora** | Radio i checkbox liste | Velike kartice (min. 64 dp), jasno stanje izbora, haptika |
| **Tačno / netačno** | Dva dugmeta | Dve velike kartice sa ikonama |
| **Pregled pitanja** | Modal | Bottom sheet sa mrežom brojeva: odgovoreno, preskočeno, trenutno |
| **Kretanje kroz kviz** | Dugmad Napred / Nazad | Dugmad + prevlačenje (`HorizontalPager`), sa zaštitom od slučajnog prevlačenja tokom unosa |
| **Predaja** | Upozorenje u stranici | Bottom sheet: „Ostalo je 3 neodgovorena", sa skokom na prvo |
| **Rezultat** | Statičan prikaz | Animirano brojanje procenta i zvezdica, maskota reaguje, konfete za ≥ 90% |
| **Titule** | Traka napretka | Animirano punjenje i poseban ekran „Nova titula!" kada server javi prelaz |
| **Prodavnica** | Lista sa potvrdom | Mreža kartica, bottom sheet potvrda, animacija odbrojavanja zvezdica |
| **Šah** | react-chessboard | Native tabla: prevlačenje i dodir, isticanje legalnih polja, animacija poteza, zvuk i haptika na potez i uzimanje, okretanje table za crne |
| **Obaveštenja** | Zvonce + web push „preko Chrome-a" | Native obaveštenja sa kanalima, bedž na ikoni, dodir vodi pravo na zadatak |
| **Prazna stanja i greške** | Tekst | Maskota sa porukom i dugmetom „Pokušaj ponovo" |
| **Offline** | Traka upozorenja | Nenametljiv indikator i jasna poruka samo kada nešto zaista ne može |

### Nove mogućnosti koje web nema
- **Vidžet za početni ekran (Glance):** „Danas: 2 zadatka · ⭐ 135", a dodir otvara aplikaciju.
  Osvežava se preko FCM data poruke i periodičnog WorkManager posla.
- **Haptika** na izbor odgovora, potez u šahu, kupovinu i završetak kviza.
- **Zvučni efekti** (kratki, lokalni): uključeni ili isključeni u podešavanjima, isključeni u
  tihom režimu telefona.
- **Prečice na ikoni** (dugi pritisak): „Nastavi kviz", „Šah".
- **Animirana maskota** (Compose Canvas): treptanje, mahanje, slavlje. Ista vektorska osnova
  kao [`Maskota.tsx`](../src/components/Maskota.tsx).

### Tipografija i veličine za decu
- Osnovna veličina teksta 18 sp (web ima 16 px). Tekst pitanja 22–24 sp.
- Dodirne površine najmanje 56 dp, a za odgovore 64 dp.
- Zaobljeni, čitljivi font sa punom podrškom za č, ć, ž, š, đ, npr. **Nunito** (OFL),
  ugrađen u aplikaciju.
- Poštovanje sistemske veličine fonta i opcije „Ukloni animacije".

### Pristupačnost
- TalkBack semantika za sve kontrole, uključujući šahovska polja („e4, beli pešak").
- Kontrast najmanje 4,5:1 u obe teme. Tokeni iz [`theme.css`](../src/styles/theme.css) su već
  usklađeni.
- Uparivanje i šah moraju da rade i bez prevlačenja, samo dodirima.

### Šta namerno ne dodajemo
- Povratnu informaciju o tačnosti tokom kviza (krši pravilo serverskog ocenjivanja).
- Dnevne nizove, kazne i pritisak na vraćanje u aplikaciju. Motivacija ostaje kroz
  zvezdice, titule i nagrade koje roditelj kontroliše.
- Reklame, analitiku trećih strana i praćenje. To je važno i za Play Families pravila.

## Faze i procena

Procena je za jednog programera sa AI pomoći, u radnim danima.

### Faza 0 — Priprema (2–3 dana)
- Snimiti JSON ugovore za sve RPC funkcije iz tabele iznad.
- Prevesti dizajn tokene iz `theme.css` u Compose `ColorScheme` (svetla i tamna) i tipografiju.
- Napraviti Firebase projekat za FCM (samo Messaging, bez Analytics-a).
  Urađeno: projekat `mozgalica-decja`, Android aplikacija sa istim `applicationId`,
  uključen Firebase Cloud Messaging API. Google Analytics nije povezan.
  Klijentski `google-services.json` je u `android-app/app/`. Service account ključ
  nije pravljen i ne ide u git.
- Postaviti skelet projekta `android-app/`, Gradle version catalog, CI za build, lint i testove.
- **Gotovo kada:** prazna aplikacija sa temom se gradi u CI-ju, a ugovorni testovi prolaze.

### Faza 1 — Osnova i povezivanje (4–5 dana)
- Supabase klijent, Hilt, Room, DataStore, šifrovano čuvanje tokena.
- Navigacija sa 4 taba, fokusirane rute za kviz i šah, edge-to-edge, predictive back, splash.
- Povezivanje: QR skener + nalepljeni link, provera preko `get_child_profile`, promena profila.
- **Roditeljski web:** u upravljanju decom dodati prikaz QR koda profilnog linka.
- **Gotovo kada:** nova instalacija se poveže QR-om, a ponovno pokretanje otvara profil bez mreže.

**Urađeno u fazi 1:**

- `core/podaci` je Android biblioteka (više nije čist JVM modul). Ugovorni testovi i dalje
  rade kao JVM unit testovi. supabase-kt ide preko `postgrest-kt` i Ktor Android engine-a.
  `ktor-client-okhttp` 3.6 vuče `okhttp-android` 5.5, a taj artefakt traži compileSdk 37.
  Plan drži 36, pa je engine `ktor-client-android`. HTTP/2 zagrevanje veze ostaje za kad
  compileSdk sme na 37. Isti razlog drži lifecycle na 2.9.4: BOM bi uzeo 2.11, a taj traži
  API 37. `functions-kt` nije dodat.
- Profilni token je u Tink skladištu, ključ je u Android Keystore-u. DataStore čuva samo
  lokalnu oznaku izabranog profila (`aktivan`), ne bearer token. Room čuva ime, avatar,
  zvezdice i titulu za offline prikaz. Supabase i Tink se ne dižu u `Application.onCreate`.
- URL i anon ključ se pri gradnji čitaju iz `.env.local` (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) u `BuildConfig`. Ne idu u git i ne smeju u log. CI bez tog
  fajla i dalje gradi aplikaciju; povezivanje tada javlja da baza nije podešena.
- Navigacija je type-safe (Navigation Compose 2.9): četiri taba i fokusirane rute kviza i
  šaha bez donje trake. U debug gradnji postoje probni ulazi samo da se vidi da traka
  nestaje. To nisu kviz ni šah.
- QR skener je Google Code Scanner, bez dozvole `CAMERA`. Ako je zavisnost doda u spojeni
  manifest, aplikacija je uklanja. Isto važi za `AD_ID`.
- Roditeljski QR crta se u pregledaču (`qrcode`) od istog stringa kao „Kopiraj link“:
  `BAZA_URL + #/dete/ + public_token`.

### Faza 2 — Početna, Raspored, Rezultati, Podešavanja (5–6 dana)
- Početna: zaglavlje profila, aktivni kvizovi i šah, prazno stanje, zvonce sa obaveštenjima.
- Raspored časova (paritet sa [`RasporedCasovaPregled.tsx`](../src/routes/dete/RasporedCasovaPregled.tsx)).
- Rezultati: istorija kvizova i šaha, „Čeka pregled".
- Podešavanja: tema, zvuk, haptika, push, promena profila.
- Keš pa mreža, osvežavanje na `ON_START`, povlačenje nadole.
- **Gotovo kada:** svi prikazi rade offline sa poslednjim podacima, bez prozivanja.

**Urađeno u fazi 2:**

- Ekrani su i dalje u `app` (paketi `profil` i `navigacija`), kao u fazi 1, da Hilt ostane
  na jednom modulu. `funkcije/*` nije otvoren.
- Room je verzija 2. Postojeći red profila ostaje; dodata je kolona `listoviJson` (aktivni
  kvizovi, partije i istorija) i tabela `snimak` za raspored i obaveštenja. Migracija ne
  briše sačuvano ime i zvezdice.
- Prvi kadar ide iz Room-a. Osvežavanje je na `ON_START` i na povlačenje nadole. Nema
  tajmera od 30 sekundi. Traka osvežavanja se vidi samo kad dete povuče; povratak u
  aplikaciju ne treperi.
- Zvonce čita `get_child_notifications`. Oznaka pročitanog je odmah lokalna. Ako
  `mark_child_notifications_read` ne uspe, stavka ostaje pročitana, a ponovo slanje čeka
  sledeći `ON_START`. WorkManager nije dodat: čeka se jedan RPC, a stanje je već u Room-u.
- Bedž je broj nepročitanih redova u lokalnom inboxu (najviše 50), ne poseban brojač.
- `get_child_school_timetable` bez unetog rasporeda vraća samo `ok` i `exists: false`.
  To nije pun `RasporedOdgovor`, pa se parsira posebno. Izvoz rasporeda nije prenet.
- Nedelja je uspravna lista dana, ne zbijena tabela. Čas i dalje ima predmet, vreme,
  učionicu, nastavnika i boju.
- Podešavanja su zupčanik na Početnoj, ne peti tab. Tema (svetla, tamna, sistem), zvuk i
  haptika stoje u istom DataStore-u kao oznaka profila, ne pored tokena. Zvuk i haptika su
  podrazumevano uključeni. Sistemsko „ukloni animacije" gasi samo animacije, preko
  `LocalEfekti`. Zvučni fajlovi nisu dodati.
- Push kontrole sa weba nisu kopirane. Nema FCM-a, nema `register_child_push`.
- Tab Nagrade je i dalje prazan. Na Početnoj je samo ime titule iz profila.
- `get_quiz_by_token` se ne učitava unapred. Dodir na kviz ili šah otvara fokusiranu rutu
  sa tokenom, ali ne rešava zadatak i ne zove `start_attempt`. Istorija rezultata je samo
  lista; ne otvara detalj.
- Debug gradnja može lokalno da napuni keš ugovornim snimkom, bez upisa u bazu:
  `adb shell am start -n io.github.mlsivanovic.mozgalica/.MainActivity --ez probni true`.
  Dok je taj prikaz uključen, osvežavanje ne ide na mrežu. Gašenje:
  `--ez kraj_probnog true`.

### Faza 3 — Kviz (9–11 dana)
- Ulaz (`get_quiz_by_token`, `start_attempt`) i nastavak (`resume_attempt`) sa spajanjem lokalnih
  i serverskih odgovora. Logika iz [`offlineQueue.ts`](../src/lib/offlineQueue.ts) se prenosi
  1:1 i pokriva testovima.
- Šest tipova pitanja u novom dizajnu: kartice, numpad, uparivanje dodirom.
- Tajmeri: rok + offset servera i pauzirani profilni tajmer sa checkpoint-om. Automatska predaja.
- Saveti (`use_hint`, limit 3, offline poruka).
- Red slanja: Room + WorkManager (`save_answers`), debounce, slanje pri izlasku i povratku mreže.
- Predaja: poslednji flush, potvrda servera, `submit_attempt`.
- Rezultat: procenat, zvezdice, pregled odgovora, objašnjenja (`mark_explanations_seen`),
  stanje „poslato na pregled", animacije.
- **Gotovo kada:** kviz se reši u avionskom režimu, predaje se po povratku mreže, a rezultat se
  poklapa sa web prikazom za isti pokušaj.

### Faza 4 — Ponovni pokušaj (3–4 dana)
Danas web generiše nove verzije netačnih zadataka u pregledaču
([`ponovni.ts`](../src/lib/ponovni.ts)) i šalje ih zajedno sa tačnim odgovorima u `start_retry`.
Native ne treba da nosi generator od ~10.000 linija.

- Nova Edge funkcija `pripremi-ponovni`: prima token pokušaja, učitava netačne zadatke,
  generiše nove verzije **istim TypeScript generatorom** i sama poziva `start_retry`.
  Provera iz faze 0: produkcijski `play-chess` već uvozi `../../../src/sah/engine.ts`, van
  `supabase/functions/`, i `state` je vratio 200. `deno check` prolazi i za uvoz
  `src/generator/index.ts`. Naivna kopija u `_shared/generator` ne prolazi, jer
  `../types/db.ts` i `../../types/db.ts` posle kopiranja ne pokazuju na isti fajl.
  Faza 4 zato uvozi generator iz `src/generator`, isto kao što šah uvozi engine.
  Kopija u `_shared` ostaje rezerva ako bundler prestane da prati spoljne uvoze, uz
  prepravku tih putanja.
- Web prelazi na istu funkciju. Usput se zatvara slabost: tačni odgovori za ponovni pokušaj
  više ne dolaze od klijenta.
- Native: rešavanje ponovnog pokušaja (`resume_retry`, `submit_retry`) koristi komponente iz faze 3.
- **Gotovo kada:** ponovni pokušaj radi identično na webu i u native aplikaciji, a postojeći
  `vitest` testovi generatora prolaze nad `_shared` kopijom.

### Faza 5 — Šah (7–9 dana)
- Compose tabla: prevlačenje i dodir, legalna polja (`chesslib`), promocija, okretanje za crne,
  isticanje poslednjeg poteza i šaha.
- Tok sa serverom: `state`, `start`, `child_move` (optimistično), `engine`, `undo`, `resign`,
  `retry`. Provera `expectedRevision` kao u [`SahPartija.tsx`](../src/routes/sah/SahPartija.tsx).
- Tempo računara: najava i animacija poteza, sa istim konstantama kao na webu.
- Sat (kada postoji), rezultat, zvezdice, pregled poteza (`pregledPly`).
- Zvuk i haptika na potez, uzimanje i šah.
- **Gotovo kada:** cela partija, poništavanje i ponovni pokušaj rade, a prekid mreže usred
  partije se oporavlja preko `state`.

### Faza 6 — Nagrade, titule, prodavnica (4–5 dana)
- Port [`TitleAvatar.tsx`](../src/components/TitleAvatar.tsx) u Compose Canvas (8 fabričkih
  titula, rangovi, palete).
- Napredak do sledeće titule, ekran „Nova titula!".
- Prodavnica: `get_shop`, `purchase_shop_item`, potvrda, statusi kupovina.
- **Gotovo kada:** kupovina umanji raspoložive zvezdice odmah i ostane dosledna posle osvežavanja.

### Faza 7 — Push preko FCM-a (4–5 dana)

Videti [Push](#7-push-fcm-umesto-web-push) ispod.

- **Gotovo kada:** novi kviz dodeljen u roditeljskom webu stigne kao obaveštenje za par sekundi,
  a dodir otvara taj kviz.

### Faza 8 — Brzina, polish, vidžet (5–6 dana)
- Baseline Profile u CI-ju, Macrobenchmark izveštaji, R8.
- Shared element prelazi, konfete, animacije maskote, zvukovi.
- Glance vidžet i prečice na ikoni.
- Prolaz kroz pristupačnost (TalkBack, veliki font, kontrast).
- Test na slabom telefonu i ispravke.
- **Gotovo kada:** postignuti ciljevi iz odeljka o brzini, bez janka u benchmark-u.

### Faza 9 — Izdanje na GitHub-u (2–3 dana)
- Workflow [`android.yml`](../.github/workflows/android.yml) prelazi sa `android/` (TWA) na
  `android-app/`. Potpisivanje i GitHub Release ostaju isti.
- `versionCode` nastavlja od 2, pa se instalira preko TWA verzije 1.0.0.
- **Jednokratno ponovno povezivanje:** TWA je čuvao token u Chrome skladištu, koje native
  aplikacija ne može da pročita. Posle nadogradnje dete jednom skenira QR.
- Ažurirati README, AGENTS.md i tekst za preuzimanje na profilu deteta.
- `android/` (TWA) se briše iz repozitorijuma kada native verzija prođe testiranje.
  Ostaje u git istoriji.

| Faza | Dani |
|---|---|
| 0 Priprema | 2–3 |
| 1 Osnova i povezivanje | 4–5 |
| 2 Početna, Raspored, Rezultati, Podešavanja | 5–6 |
| 3 Kviz | 9–11 |
| 4 Ponovni pokušaj | 3–4 |
| 5 Šah | 7–9 |
| 6 Nagrade i prodavnica | 4–5 |
| 7 Push (FCM) | 4–5 |
| 8 Brzina, polish, vidžet | 5–6 |
| 9 Izdanje na GitHub-u | 2–3 |
| **Ukupno** | **45–57** |

Faze 3, 5 i 6 su međusobno nezavisne kad je faza 2 gotova i mogu se raditi bilo kojim redom.
Faza 7 (serverski deo) može da počne paralelno sa fazom 3.

## 7. Push: FCM umesto Web Push

Web Push danas ide preko VAPID-a i tabele `push_subscriptions` (`endpoint`, `p256dh`,
`auth_key` su obavezni). FCM koristi jedan registracioni token.

**Migracija (aditivna, primenjuje se Supabase CLI-jem):**
- Kolona `transport text not null default 'webpush' check (transport in ('webpush', 'fcm'))`.
- Kolona `fcm_token text`. `endpoint`, `p256dh` i `auth_key` postaju obavezni samo za `webpush`
  (zamena `not null` i `check` ograničenja uslovnim `check`-om).
- Jedinstveni indeks `(child_profile_id, fcm_token) where transport = 'fcm'`.
- `register_child_push`, `unregister_child_push` i `get_child_push_status` dobijaju `p_transport`, sa
  podrazumevanom vrednošću `webpush`, pa postojeći web klijent radi bez izmene.
- Pre migracije: `CREATE TABLE push_subscriptions_backup_<datum> AS SELECT * FROM push_subscriptions;`

**`dispatch-notifications`:**
- Grananje po `transport`. FCM ide preko HTTP v1 API-ja, a OAuth token se dobija iz service
  account ključa u Supabase Edge secrets (`FCM_SERVICE_ACCOUNT`). Nikad u git.
- Poruka nosi `notification` (naslov, tekst) i `data` (`eventType`, `targetUrl`, `refresh=1`).
- Neispravan token (`UNREGISTERED`) deaktivira pretplatu, isto kao trajne Web Push greške danas.

**Native:**
- Kanali: „Novi zadaci" (visok prioritet) i „Rezultati i nagrade".
- `POST_NOTIFICATIONS` dozvola (Android 13+) se traži posle kratkog objašnjenja, ne pri prvom
  pokretanju.
- `targetUrl` (npr. `#/kviz/<token>`) se mapira na native rutu. Postojeći format ostaje, pa web
  i native dele obaveštenja.
- Data poruka osvežava Room keš i vidžet i kad je aplikacija u pozadini.
- `onNewToken` → WorkManager posao za registraciju.

## Rizici

| Rizik | Ublažavanje |
|---|---|
| Dva dečja klijenta (web i native) se razilaze | Ugovorni testovi, tačka „native" u kontrolnoj listi za svaku migraciju koja menja dečji RPC |
| Edge funkcija ne može da uveze generator | Provereno u fazi 0: bundler prati uvoz van `supabase/functions/` (`play-chess` → `src/sah/engine.ts`, a `deno check` prolazi i za `src/generator`). Naivna kopija u `_shared` lomi relativne uvoze `types/db.ts`. Rezerva i dalje: esbuild bundle ili kopija uz prepravku putanja |
| FCM service account ključ | Samo u Supabase secrets, uz najuža ovlašćenja (Firebase Cloud Messaging API) |
| Ponovno povezivanje posle prelaska sa TWA | QR je brz. Napomena u release notes-u i na profilu deteta |
| Tajmer se razlikuje od weba | Testovi za oba režima, sa veštačkim satom (`TestScheduler`) |
| Slab telefon i dalje sporiji od očekivanja | Benchmark od faze 1, a ne tek u fazi 8 |
| Obim modernizacije raste | Sve iz „Nove mogućnosti" je odvojivo. Vidžet, zvuci i prečice mogu posle prvog izdanja |

## Kasnije: Play Store (5–8 dana rada + čekanje)

- Lični developer nalog (25 USD, verifikacija identiteta).
- `bundleRelease` (AAB) i **Play App Signing sa postojećim ključem** kao upload ključem, pa
  korisnici sa GitHub APK-a dobijaju nadogradnje iz Play-a.
- Politika privatnosti na javnom URL-u (npr. GitHub Pages), Data safety formular, IARC
  ocena sadržaja.
- **Families Policy:** ciljna grupa uključuje decu, nema reklama ni SDK-ova koji nisu odobreni
  za porodice. Firebase Messaging je dozvoljen, a Analytics se ne uključuje.
- **Zatvoreni test: najmanje 12 testera, 14 dana bez prekida**, tek onda zahtev za produkciju.
- Objava iz CI-ja (`gradle-play-publisher` ili GitHub akcija) na interni ili zatvoreni track.

## Prvi korak

Faza 0: snimanje RPC ugovora i skelet `android-app/` sa temom i CI-jem. To odmah pokazuje
da li supabase-kt i postojeći JSON oblici idu zajedno bez iznenađenja.
