// Ručna banka matematike za 3. razred: oblasti koje generator ne pokriva.
// Brojevi do 1000; razlomci oblika m/n (m ≤ n ≤ 10); bez površine po formuli,
// zapremine, tela, decimalnih brojeva (izuzev vremena) i operacija sa razlomcima.
import type { Opcija, Pitanje, Tezina } from '../types/db.ts'

export type BankaPitanje3 = Pick<Pitanje, 'type' | 'difficulty' | 'text' | 'options' | 'correct' | 'explanation' | 'hint' | 'points' | 'source' | 'gen_signature' | 'manual_review'> & {
  topicSlug: string
  porodica: string
}

type Tvrdnja = readonly [id: string, porodica: string, tezina: Tezina, text: string, tacno: boolean, objasnjenje: string, hint: string]
type Broj = readonly [id: string, porodica: string, tezina: Tezina, text: string, value: number, objasnjenje: string, hint: string]
type Unos = readonly [id: string, porodica: string, tezina: Tezina, text: string, accept: readonly string[], objasnjenje: string, hint: string]
type Ponudjeno = readonly [id: string, porodica: string, tezina: Tezina, text: string, opcije: readonly [string, string, string, string], tacan: 0 | 1 | 2 | 3, objasnjenje: string, hint: string]

function pakuj(slug: string, p: BankaPitanje3): BankaPitanje3 {
  return { ...p, topicSlug: slug, gen_signature: `${slug}:banka:${p.gen_signature}`, points: p.difficulty, source: 'manual', manual_review: false }
}

function tvrdnje(slug: string, stavke: readonly Tvrdnja[]): BankaPitanje3[] {
  return stavke.map(([id, porodica, difficulty, text, value, explanation, hint]) => pakuj(slug, {
    topicSlug: slug, porodica, type: 'truefalse', difficulty, text, options: null,
    correct: { value }, explanation, hint, points: difficulty, source: 'manual',
    gen_signature: id, manual_review: false,
  }))
}

function brojevi(slug: string, stavke: readonly Broj[]): BankaPitanje3[] {
  return stavke.map(([id, porodica, difficulty, text, value, explanation, hint]) => pakuj(slug, {
    topicSlug: slug, porodica, type: 'numeric', difficulty, text, options: null,
    correct: { value }, explanation, hint, points: difficulty, source: 'manual',
    gen_signature: id, manual_review: false,
  }))
}

function unosi(slug: string, stavke: readonly Unos[]): BankaPitanje3[] {
  return stavke.map(([id, porodica, difficulty, text, accept, explanation, hint]) => pakuj(slug, {
    topicSlug: slug, porodica, type: 'text', difficulty, text, options: null,
    correct: { accept: [...accept] }, explanation, hint, points: difficulty, source: 'manual',
    gen_signature: id, manual_review: false,
  }))
}

function ponudjena(slug: string, stavke: readonly Ponudjeno[]): BankaPitanje3[] {
  return stavke.map(([id, porodica, difficulty, text, opcije, tacan, explanation, hint]) => {
    const options: Opcija[] = opcije.map((t, i) => ({ id: ['a', 'b', 'c', 'd'][i], text: t }))
    return pakuj(slug, {
      topicSlug: slug, porodica, type: 'single', difficulty, text, options,
      correct: { optionId: options[tacan].id }, explanation, hint, points: difficulty,
      source: 'manual', gen_signature: id, manual_review: false,
    })
  })
}

const GEOMETRIJA_TF: readonly Tvrdnja[] = [
  ['par-seku', 'prave', 1, 'Paralelne prave se nikada ne seku.', true, 'Paralelne prave su stalno na istom rastojanju i ne seku se.', 'Zamisli šine voza.'],
  ['seku-par', 'prave', 1, 'Ako se dve prave seku, one su paralelne.', false, 'Prave koje se seku nisu paralelne.', 'Paralelne prave se ne dodiruju.'],
  ['ugao-teme', 'ugao', 1, 'Ugao čine dve poluprave sa zajedničkom početnom tačkom.', true, 'Ta zajednička tačka je teme ugla, a poluprave su kraci.', 'Potraži gde se kraci sastaju.'],
  ['kvadrat-ugao', 'ugao', 1, 'Svi uglovi kvadrata su pravi.', true, 'Kvadrat ima četiri prava ugla.', 'Uporedi sa uglom sveske.'],
  ['krug-centar', 'krug', 1, 'Svaki krug ima tačku koja se zove centar.', true, 'Centar je tačka od koje su sve tačke kružnice jednako udaljene.', 'Centar je u sredini.'],
  ['trougao-4', 'trougao', 1, 'Trougao ima četiri stranice.', false, 'Trougao ima tri stranice, tri temena i tri ugla.', 'Već ime kaže „tro".'],
  ['prav-manji', 'ugao', 2, 'Oštar ugao je manji od pravog ugla.', true, 'Oštar ugao je manji, a tup veći od pravog.', 'Prav ugao izgleda kao ugao kvadrata.'],
  ['tup-manji', 'ugao', 2, 'Tup ugao je manji od pravog ugla.', false, 'Tup ugao je veći od pravog ugla.', 'Tup ugao je „širok".'],
  ['kvadrat-pravougaonik', 'figure', 3, 'Kvadrat je pravougaonik čije su sve stranice jednake.', true, 'Kvadrat ima četiri prava ugla kao pravougaonik, a uz to i jednake stranice.', 'Kvadrat ispunjava sve osobine pravougaonika.'],
  ['precnik-kroz-centar', 'krug', 3, 'Prečnik kružnice uvek prolazi kroz centar.', true, 'Prečnik je duž koja spaja dve tačke kružnice i prolazi kroz centar.', 'Prečnik je kao dva poluprečnika u liniji.'],
  ['dva-prava', 'trougao', 4, 'Trougao može da ima dva prava ugla.', false, 'Dva prava ugla ne mogu da se zatvore trećom stranicom u trougao.', 'Nacrtaj dva prava ugla i pokušaj da zatvoriš trougao.'],
  ['kruznica-krug', 'krug', 4, 'Kružnica i krug označavaju istu stvar.', false, 'Kružnica je linija, a krug je figura koju ta linija omeđuje.', 'Kružnica je „ivica", krug je „unutrašnjost sa ivicom".'],
  ['ostrougli', 'trougao', 5, 'Oštrougli trougao ima sva tri ugla oštra.', true, 'Kod oštrouglog trougla svaki ugao je manji od pravog.', 'Nijedan ugao nije prav ni tup.'],
  ['normalne-prav', 'prave', 5, 'Normalne (upravne) prave se seku pod pravim uglom.', true, 'Upravan položaj pravi znači da obrazuju prav ugao.', 'Zamisli plus: +'],
]

const GEOMETRIJA_BROJ: readonly Broj[] = [
  ['strane-trougao', 'trougao', 1, 'Koliko stranica ima trougao?', 3, 'Trougao ima tri stranice.', 'Ime figure počinje sa „tro".'],
  ['temena-kvadrat', 'figure', 1, 'Koliko temena ima kvadrat?', 4, 'Kvadrat ima četiri temena i četiri stranice.', 'Prebroj uglove kvadrata.'],
  ['prava-ugao-kvadrat', 'figure', 2, 'Koliko pravih uglova ima kvadrat?', 4, 'Sva četiri ugla kvadrata su prava.', 'Svaki ugao kvadrata izgleda kao ugao sveske.'],
  ['precnik-od-4', 'krug', 3, 'Poluprečnik kružnice je 4 cm. Koliki je prečnik u centimetrima?', 8, 'Prečnik je dva poluprečnika: 2 · 4 = 8 cm.', 'Prečnik = 2 · poluprečnik.'],
  ['poluprecnik-od-10', 'krug', 4, 'Prečnik kružnice je 10 cm. Koliki je poluprečnik u centimetrima?', 5, 'Poluprečnik je polovina prečnika: 10 : 2 = 5 cm.', 'Poluprečnik je pola prečnika.'],
  ['pokrivanje', 'merenje', 5, 'Pravougaonik je pokriven sa 12 jednakih kvadratića, bez praznina i preklapanja. Kolika je njegova površina merena tim kvadratićem?', 12, 'Površina se u trećem razredu meri brojem jednakih merila kojima se figura pokrije. Ovde je to 12 kvadratića.', 'Prebroj kvadratiće koji popunjavaju figuru.'],
]

const GEOMETRIJA_UNOS: readonly Unos[] = [
  ['teme-naziv', 'ugao', 2, 'Kako se zove zajednička početna tačka kraka ugla?', ['teme', 'teme ugla'], 'Kraci polaze iz temena ugla.', 'To je „špic" ugla.'],
  ['krak-naziv', 'ugao', 2, 'Kako se zovu poluprave koje čine ugao?', ['kraci', 'krakovi', 'kraci ugla'], 'Dva kraka i teme čine ugao.', 'Izgledaju kao dve poluge iz jedne tačke.'],
  ['jednakostranicni', 'trougao', 3, 'Kako se zove trougao čije su sve tri stranice jednake?', ['jednakostranični', 'jednakostraničan', 'jednakostranični trougao'], 'Jednakostranični trougao ima sve stranice jednake.', 'Sve tri strane su iste dužine.'],
  ['jednakokraki', 'trougao', 3, 'Kako se zove trougao koji ima tačno dve jednake stranice?', ['jednakokraki', 'jednakokraki trougao'], 'Jednakokraki trougao ima dve jednake stranice (krake).', 'Dve strane iste, treća drugačija.'],
  ['centar-naziv', 'krug', 2, 'Kako se zove tačka od koje su sve tačke kružnice jednako udaljene?', ['centar', 'centar kružnice', 'središte', 'središte kružnice'], 'Ta tačka je centar kružnice.', 'Nalazi se u sredini.'],
]

const GEOMETRIJA_SINGLE: readonly Ponudjeno[] = [
  ['figura-3', 'figure', 1, 'Koja figura ima tačno tri stranice?', ['Trougao', 'Kvadrat', 'Pravougaonik', 'Krug'], 0, 'Trougao ima tri stranice.', 'Broj u imenu pomaže.'],
  ['paralelne', 'prave', 2, 'Kako se zovu prave koje se ne seku i stalno su na istom rastojanju?', ['Paralelne prave', 'Normalne prave', 'Krive linije', 'Duži'], 0, 'Takve prave su paralelne.', 'Kao šine ili ivice lenjira.'],
  ['normalne', 'prave', 2, 'Kako se zovu prave koje se seku pod pravim uglom?', ['Normalne prave', 'Paralelne prave', 'Kružnice', 'Poluprave'], 0, 'Prave upravne jedna na drugu zovemo normalnim (upravnim).', 'Obrazuju ugao kao ugao sveske.'],
  ['prav-ugao', 'ugao', 2, 'Koji ugao izgleda kao ugao kvadrata ili sveske?', ['Prav ugao', 'Oštar ugao', 'Tup ugao', 'Poluprava'], 0, 'Ugao kvadrata je prav ugao.', 'Ivice sveske se sastaju pod pravim uglom.'],
  ['kvadrat-osobina', 'figure', 2, 'Koja figura ima sve stranice jednake i četiri prava ugla?', ['Kvadrat', 'Pravougaonik koji nije kvadrat', 'Trougao', 'Krug'], 0, 'Samo kvadrat ima i jednake stranice i četiri prava ugla.', 'Pravougaonik može imati različite susedne stranice.'],
  ['pravougaonik-osobina', 'figure', 3, 'Šta uvek važi za pravougaonik?', ['Naspramne stranice su jednake i svi uglovi su pravi.', 'Sve stranice su jednake.', 'Ima tri temena.', 'Nema pravih uglova.'], 0, 'Pravougaonik ima četiri prava ugla i jednake naspramne stranice.', 'Kvadrat je poseban pravougaonik, ali ne mora svaki pravougaonik imati sve stranice jednake.'],
  ['raznostranicni', 'trougao', 3, 'Kako se zove trougao čije su sve tri stranice različite dužine?', ['Raznostranični', 'Jednakostranični', 'Jednakokraki', 'Krug'], 0, 'Raznostranični trougao ima sve stranice različite.', 'Nijedna stranica nije jednaka drugoj.'],
  ['pravougli', 'trougao', 3, 'Kako se zove trougao koji ima jedan prav ugao?', ['Pravougli trougao', 'Oštrougli trougao', 'Tupougli trougao', 'Krug'], 0, 'Pravougli trougao ima tačno jedan prav ugao.', 'Jedan ugao izgleda kao ugao sveske.'],
  ['tupougli', 'trougao', 4, 'Kako se zove trougao koji ima jedan tup ugao?', ['Tupougli trougao', 'Pravougli trougao', 'Oštrougli trougao', 'Kvadrat'], 0, 'Tupougli trougao ima jedan ugao veći od pravog.', 'Jedan ugao je „širok".'],
  ['poluprecnik', 'krug', 3, 'Šta je poluprečnik?', ['Duž od centra do tačke na kružnici', 'Duž koja spaja dve tačke kružnice a ne prolazi kroz centar', 'Stranica kvadrata', 'Teme ugla'], 0, 'Poluprečnik spaja centar sa tačkom na kružnici.', 'To je „pola puta" preko kruga.'],
  ['krug-def', 'krug', 4, 'Šta je krug?', ['Ravna figura ograničena kružnicom', 'Samo linija svih tačaka jednako udaljenih od centra', 'Trougao sa jednakim stranicama', 'Prav ugao'], 0, 'Krug je figura unutar kružnice, a kružnica je njena ivica.', 'Kružnica je linija, krug je „popunjena" figura.'],
  ['jednakokraki-primer', 'trougao', 5, 'Trougao ima stranice 6 cm, 6 cm i 9 cm. Koje je vrste prema stranicama?', ['Jednakokraki', 'Jednakostranični', 'Raznostranični', 'Krug'], 0, 'Dve stranice su jednake, treća je drugačija — jednakokraki.', 'Uporedi dužine sve tri stranice.'],
  ['pokrivanje-izbor', 'merenje', 5, 'Kvadrat je pokriven sa 9 jednakih manjih kvadratića. Kolika je površina merena tim kvadratićem?', ['9', '3', '12', '6'], 0, 'Broj jednakih merila kojima je figura pokrivena jeste mera površine u trećem razredu.', 'Prebroj kvadratiće, ne množi stranice formulom četvrtog razreda.'],
]

const VREME_TF: readonly Tvrdnja[] = [
  ['sat-60', 'jedinice', 1, 'Jedan sat ima 60 minuta.', true, 'U satu je 60 minuta.', 'Pogledaj brojčanik sata.'],
  ['dan-100', 'jedinice', 1, 'Jedan dan ima 100 sati.', false, 'Jedan dan ima 24 sata.', 'Od ponoći do ponoći.'],
  ['nedelja-7', 'kalendar', 1, 'Jedna nedelja ima 7 dana.', true, 'Nedelja ima sedam dana.', 'Prebroj dane od ponedeljka do nedelje.'],
  ['godina-12', 'kalendar', 1, 'Jedna godina ima 12 meseci.', true, 'Godina ima dvanaest meseci.', 'Od januara do decembra.'],
  ['vek-10', 'jedinice', 2, 'Jedan vek traje 10 godina.', false, 'Vek traje 100 godina. Deset godina je decenija.', 'Vek je sto godina.'],
  ['decenija-10', 'jedinice', 2, 'Jedna decenija traje 10 godina.', true, 'Decenija je razdoblje od deset godina.', '„Deca" podseća na deset.'],
  ['april-31', 'kalendar', 3, 'April uvek ima 31 dan.', false, 'April ima 30 dana.', 'April, jun, septembar i novembar imaju 30 dana.'],
  ['vek-10-dec', 'jedinice', 4, 'U jednom veku ima 10 decenija.', true, '100 : 10 = 10, pa vek ima deset decenija.', 'Vek = 100 godina, decenija = 10 godina.'],
  ['februar-uvek-28', 'kalendar', 4, 'Februar uvek ima tačno 28 dana.', false, 'Obično ima 28, a prestupne godine 29 dana.', 'Svaka četvrta godina je prestupna.'],
  ['minut-60s', 'jedinice', 1, 'Jedan minut ima 60 sekundi.', true, 'Minut se deli na 60 sekundi.', 'Sekunda je kraća od minuta.'],
]

const VREME_BROJ: readonly Broj[] = [
  ['min-u-satu', 'jedinice', 1, 'Koliko minuta ima u jednom satu?', 60, '1 sat = 60 minuta.', 'Puni krug na satu.'],
  ['sati-u-danu', 'jedinice', 1, 'Koliko sati ima u jednom danu?', 24, '1 dan = 24 sata.', 'Od ponoći do ponoći.'],
  ['dani-nedelja', 'kalendar', 1, 'Koliko dana ima jedna nedelja?', 7, 'Nedelja ima 7 dana.', 'Ponedeljak do nedelje.'],
  ['meseci-godina', 'kalendar', 1, 'Koliko meseci ima jedna godina?', 12, 'Godina ima 12 meseci.', 'Januar do decembar.'],
  ['s-u-2min', 'pretvaranje', 2, 'Koliko sekundi ima u 2 minuta?', 120, '1 min = 60 s, pa 2 · 60 = 120 s.', 'Pomnoži minute sa 60.'],
  ['min-u-3h', 'pretvaranje', 2, 'Koliko minuta ima u 3 sata?', 180, '1 h = 60 min, pa 3 · 60 = 180 min.', 'Pomnoži sate sa 60.'],
  ['sati-u-2dana', 'pretvaranje', 2, 'Koliko sati ima u 2 dana?', 48, '1 dan = 24 h, pa 2 · 24 = 48 h.', 'Pomnoži dane sa 24.'],
  ['dani-3ned', 'pretvaranje', 2, 'Koliko dana ima u 3 nedelje?', 21, '1 nedelja = 7 dana, pa 3 · 7 = 21 dan.', 'Pomnoži nedelje sa 7.'],
  ['sat-i-po', 'pretvaranje', 2, 'Koliko minuta ima u jednom satu i po?', 90, '60 + 30 = 90 minuta.', 'Pola sata je 30 minuta.'],
  ['odmor', 'trajanje', 3, 'Odmor traje od 10:00 do 10:15. Koliko minuta traje?', 15, 'Od 10:00 do 10:15 prođe 15 minuta.', 'Oduzmi početak od kraja.'],
  ['5h10', 'pretvaranje', 3, 'Koliko minuta ima u 5 sati i 10 minuta?', 310, '5 · 60 + 10 = 300 + 10 = 310 min.', 'Sate pretvori u minute, pa dodaj ostatak.'],
  ['90min-sati', 'pretvaranje', 3, 'Koliko punih sati ima u 90 minuta?', 1, '90 minuta = 1 sat i 30 minuta, dakle 1 pun sat.', '1 sat = 60 minuta.'],
  ['film-minuti', 'trajanje', 4, 'Film traje 1 sat i 45 minuta. Koliko je to minuta?', 105, '1 · 60 + 45 = 105 min.', 'Sat pretvori u minute, pa dodaj 45.'],
  ['9do1130', 'trajanje', 4, 'Od 9:00 do 11:30 prošlo je koliko minuta?', 150, 'Od 9 do 11 je 2 sata = 120 min, plus 30 min = 150 min.', 'Pretvori sate u minute pa saberi.'],
  ['36meseci', 'kalendar', 4, 'Koliko godina ima u 36 meseci?', 3, '12 meseci = 1 godina, 36 : 12 = 3 godine.', 'Podeli sa 12.'],
  ['3dana-sati', 'pretvaranje', 5, 'Koliko sati ima u 3 dana?', 72, '3 · 24 = 72 sata.', 'Dan ima 24 sata.'],
  ['skola-trajanje', 'trajanje', 3, 'Nastava traje od 8:00 do 13:00. Koliko sati traje?', 5, 'Od 8 do 13 prođe 5 sati.', 'Oduzmi 8 od 13.'],
  ['2h35plus25', 'trajanje', 5, 'Putovanje je trajalo 2 sata i 35 minuta, pa još 25 minuta čekanja. Koliko minuta je prošlo ukupno?', 180, '2 · 60 + 35 + 25 = 120 + 60 = 180 min.', 'Sve pretvori u minute.'],
  ['4decenije', 'jedinice', 5, 'Koliko godina ima u 4 decenije?', 40, '1 decenija = 10 godina, 4 · 10 = 40.', 'Pomnoži sa 10.'],
  ['2veka', 'jedinice', 5, 'Koliko godina ima u 2 veka?', 200, '1 vek = 100 godina, 2 · 100 = 200.', 'Pomnoži sa 100.'],
]

const VREME_SINGLE: readonly Ponudjeno[] = [
  ['pola-sata', 'jedinice', 1, 'Koliko minuta ima u pola sata?', ['30', '15', '45', '60'], 0, 'Pola od 60 minuta je 30 minuta.', 'Sat ima 60 minuta.'],
  ['cetvrt-sata', 'jedinice', 2, 'Koliko minuta ima u četvrt sata?', ['15', '25', '20', '45'], 0, 'Četvrtina od 60 minuta je 15 minuta.', 'Sat podeli na četiri jednaka dela.'],
  ['januar', 'kalendar', 2, 'Koliko dana ima januar?', ['31', '30', '28', '29'], 0, 'Januar ima 31 dan.', 'Januar, mart, maj, jul, avgust, oktobar i decembar imaju 31.'],
  ['jun', 'kalendar', 3, 'Koliko dana ima jun?', ['30', '31', '28', '29'], 0, 'Jun ima 30 dana.', 'April, jun, septembar, novembar — 30.'],
  ['godina-dana', 'kalendar', 3, 'Koliko dana ima obična (neprestupna) godina?', ['365', '360', '366', '300'], 0, 'Obična godina ima 365 dana.', 'Prestupna ima 366.'],
  ['kraj-casa', 'trajanje', 4, 'Čas počinje u 11:20 i traje 40 minuta. Kada se završava?', ['12:00', '11:50', '12:20', '11:60'], 0, '11:20 + 40 min = 12:00.', '20 + 40 = 60 minuta, to je tačno jedan sat.'],
  ['cas-815', 'trajanje', 2, 'Čas počinje u 8:15 i traje 45 minuta. Kada se završava?', ['9:00', '8:45', '9:15', '8:60'], 0, '8:15 + 45 min = 9:00.', 'Dodaj 45 minuta na 8:15.'],
  ['film-kraj', 'trajanje', 5, 'Film počinje u 18:00 i traje 1 sat i 45 minuta. Kada se završava?', ['19:45', '19:00', '18:45', '20:45'], 0, '18:00 + 1 h = 19:00, pa još 45 min = 19:45.', 'Dodaj prvo sate, zatim minute.'],
]

const RAZLOMCI_TF: readonly Tvrdnja[] = [
  ['pola-pola', 'celina', 1, 'Razlomak 1/2 označava polovinu celine.', true, '1/2 znači jedan od dva jednaka dela.', 'Broj ispod crte kaže na koliko je delova podeljeno.'],
  ['pet-pet', 'celina', 2, 'Razlomak 5/5 označava celu jedinicu.', true, 'Kad su brojilac i imenilac jednaki, uzet je ceo.', 'Svi delovi su uzeti.'],
  ['1-3-vece-1-2', 'poredjenje', 3, 'Razlomak 1/3 je veći od razlomka 1/2.', false, 'Polovina je veća od trećine iste celine.', 'Zamisli istu tortu: veći komad je 1/2.'],
  ['2-5-manje', 'poredjenje', 2, 'Razlomak 2/5 je manji od razlomka 4/5.', true, 'Isti imenilac: veći brojilac znači veći razlomak. 2 < 4, pa je 2/5 < 4/5.', 'Uporedi brojeve iznad crte.'],
  ['1-4-torta', 'celina', 1, 'Ako je torta isečena na 4 jednaka dela, jedan deo je 1/4.', true, 'Jedan od četiri jednaka dela zapisujemo kao 1/4.', 'Imenilac je 4.'],
  ['3-3-nije-ceo', 'celina', 3, 'Razlomak 3/3 nije ceo, jer je imenilac 3.', false, '3/3 = 1, to je cela jedinica.', 'Svi delovi su uzeti.'],
]

const RAZLOMCI_BROJ: readonly Broj[] = [
  ['pola-od-8', 'deo-skupa', 1, 'Koliko je 1/2 od 8?', 4, 'Polovina od 8 je 8 : 2 = 4.', 'Podeli na dva jednaka dela.'],
  ['cetvrt-od-12', 'deo-skupa', 2, 'Koliko je 1/4 od 12?', 3, '12 : 4 = 3.', 'Podeli na četiri jednaka dela.'],
  ['petina-od-10', 'deo-skupa', 2, 'Koliko je 1/5 od 10?', 2, '10 : 5 = 2.', 'Podeli na pet jednakih delova.'],
  ['dve-petine-10', 'deo-skupa', 3, 'Koliko je 2/5 od 10?', 4, '1/5 od 10 je 2, pa su 2/5 = 2 · 2 = 4.', 'Najpre nađi jednu petinu, pa uzmi dve.'],
  ['tri-cetvrtine-8', 'deo-skupa', 3, 'Čokolada ima 8 jednakih kockica. Koliko kockica je 3/4 čokolade?', 6, '1/4 od 8 je 2, pa 3/4 = 3 · 2 = 6 kockica.', 'Četvrtina je 2 kockice.'],
  ['desetina-20', 'deo-skupa', 3, 'Koliko je 1/10 od 20?', 2, '20 : 10 = 2.', 'Podeli na deset jednakih delova.'],
  ['tri-desetina-20', 'deo-skupa', 4, 'Koliko je 3/10 od 20?', 6, '1/10 od 20 je 2, pa 3/10 = 6.', 'Najpre jednu desetinu, pa tri takve.'],
  ['sestina-18', 'deo-skupa', 4, 'Koliko je 1/6 od 18?', 3, '18 : 6 = 3.', 'Podeli na šest jednakih delova.'],
  ['cetvrt-jabuka', 'deo-skupa', 4, 'Ima 8 jabuka. Pojedeno je 1/4. Koliko jabuka je pojedeno?', 2, '1/4 od 8 = 2.', 'Podeli 8 na četiri jednaka dela.'],
  ['ostalo-jabuke', 'deo-skupa', 5, 'Ima 8 jabuka. Pojedeno je 1/4. Koliko jabuka je ostalo?', 6, 'Pojedene su 2, ostalo je 8 − 2 = 6.', 'Od celine oduzmi pojedeni deo.'],
  ['pola-plus-jedan', 'deo-skupa', 5, 'Koliko je 1/2 od 10, uvećano za 1?', 6, '1/2 od 10 je 5, 5 + 1 = 6.', 'Najpre polovinu, pa dodaj 1.'],
]

const RAZLOMCI_UNOS: readonly Unos[] = [
  ['zapis-cetvrt', 'zapis', 1, 'Torta je isečena na 4 jednaka dela. Kojim razlomkom zapisujemo jedan deo? (upiši kao a/b)', ['1/4'], 'Jedan od četiri jednaka dela je 1/4.', 'Imenilac je broj delova.'],
  ['zapis-trecina', 'zapis', 1, 'Celina je podeljena na 3 jednaka dela. Kojim razlomkom zapisujemo jedan deo? (upiši kao a/b)', ['1/3'], 'Jedan od tri jednaka dela je 1/3.', 'Imenilac je 3.'],
  ['zapis-3-8', 'zapis', 2, 'Pica je isečena na 8 jednakih komada. Pojedena su 3 komada. Kojim razlomkom to zapisujemo? (upiši kao a/b)', ['3/8'], 'Uzeta su 3 od 8 jednakih delova, dakle 3/8.', 'Brojilac je koliko je uzeto, imenilac koliko ima delova.'],
  ['zapis-2-5', 'zapis', 2, 'Traka je podeljena na 5 jednakih delova, obojena su 2. Kojim razlomkom to zapisujemo? (upiši kao a/b)', ['2/5'], '2 od 5 jednakih delova je 2/5.', 'Brojilac 2, imenilac 5.'],
  ['zapis-3-4', 'zapis', 3, 'Od 4 jednaka dela uzeta su 3. Kojim razlomkom to zapisujemo? (upiši kao a/b)', ['3/4'], 'Tri četvrtine zapisujemo 3/4.', 'Nisu uzeti svi delovi, pa nije 4/4.'],
]

const RAZLOMCI_SINGLE: readonly Ponudjeno[] = [
  ['koji-pola', 'zapis', 1, 'Koji razlomak označava polovinu?', ['1/2', '1/4', '1/3', '1/10'], 0, '1/2 je jedan od dva jednaka dela — polovina.', 'Imenilac 2 znači dva jednaka dela.'],
  ['koji-veci-5', 'poredjenje', 2, 'Koji razlomak je veći?', ['4/5', '1/5', '2/5', '3/5'], 0, 'Isti imenilac: veći brojilac daje veći razlomak. 4/5 je najveći.', 'Uporedi brojeve iznad crte.'],
  ['koji-manji-8', 'poredjenje', 3, 'Koji razlomak je najmanji?', ['1/8', '3/8', '5/8', '7/8'], 0, 'Isti imenilac 8: najmanji brojilac je 1, pa je 1/8 najmanji.', 'Manji brojilac — manji deo.'],
  ['koji-veci-jedinicni', 'poredjenje', 3, 'Koji komad iste pice je veći?', ['1/2', '1/3', '1/4', '1/5'], 0, 'Što je imenilac manji, jedinični razlomak je veći. 1/2 je najveći komad.', 'Manje delova znači veći svaki deo.'],
  ['sest-sest', 'celina', 4, 'Koji razlomak označava ceo?', ['6/6', '5/6', '1/6', '2/6'], 0, '6/6 znači da su uzeti svi delovi — cela jedinica.', 'Brojilac jednak imeniocu.'],
  ['tri-deset-crvenih', 'deo-skupa', 4, 'Od 10 olovaka 3 su crvene. Kojim razlomkom zapisujemo crvene olovke?', ['3/10', '10/3', '3/7', '1/3'], 0, '3 od 10 jednako važnih predmeta je 3/10.', 'Imenilac je ukupan broj olovaka.'],
  ['dve-osmine', 'poredjenje', 5, 'Koji razlomak je najveći: 6/8, 2/8, 1/8 ili 3/8?', ['6/8', '2/8', '1/8', '3/8'], 0, 'Isti imenilac 8: 6 > 3 > 2 > 1, pa je 6/8 najveći.', 'Veći brojilac uz isti imenilac.'],
  ['pola-ili-cetvrt', 'poredjenje', 5, 'Ana je pojela 1/2 pice, a Luka 1/4 iste veličine pice. Ko je pojeo više?', ['Ana', 'Luka', 'Pojeli su jednako', 'Ne može da se zna'], 0, '1/2 je veće od 1/4 iste celine, pa je Ana pojela više.', 'Polovina je dva puta veća od četvrtine.'],
]

const TEKST_BROJ: readonly Broj[] = [
  ['zajedno-145', 'sabiranje', 1, 'Ana ima 145 sličica, a Marko ima 90 sličica više od nje. Koliko sličica ima Marko?', 235, '145 + 90 = 235.', 'Saberi Aninu količinu i razliku.'],
  ['ucenici-32', 'sabiranje', 1, 'U razredu ima 18 dečaka i 14 devojčica. Koliko učenika ima u razredu?', 32, '18 + 14 = 32 učenika.', 'Saberi dečake i devojčice.'],
  ['ostalo-170', 'oduzimanje', 1, 'U korpi je bilo 250 trešanja. Pojedeno je 80. Koliko je trešanja ostalo?', 170, '250 − 80 = 170.', 'Od ukupnog oduzmi pojedeno.'],
  ['kutije-48', 'mnozenje', 1, 'U 6 kutija ima po 8 boja. Koliko je boja ukupno?', 48, '6 · 8 = 48.', 'Pomnoži broj kutija brojem u svakoj.'],
  ['deljenje-9', 'deljenje', 1, '36 bombona podeli se jednako na 4 deteta. Koliko bombona dobije svako dete?', 9, '36 : 4 = 9.', 'Podeli ukupno na 4 jednaka dela.'],
  ['tri-zbroj', 'sabiranje', 2, 'Na tri police ima 120, 85 i 40 knjiga. Koliko je knjiga ukupno?', 245, '120 + 85 = 205, 205 + 40 = 245.', 'Saberi sva tri broja.'],
  ['kusur-325', 'oduzimanje', 2, 'Imaš 500 dinara i kupiš svesku od 175 dinara. Koliko dinara ostaje?', 325, '500 − 175 = 325.', 'Od novčanice oduzmi cenu.'],
  ['paketi-90', 'mnozenje', 2, 'Petar spakuje 15 kesa po 6 keksova. Koliko je keksova spakovao?', 90, '15 · 6 = 90.', 'Pomnoži broj kesa i keksova u kesi.'],
  ['grupe-9', 'deljenje', 2, '72 učenika treba podeliti u 8 jednakih grupa. Koliko učenika ide u svaku grupu?', 9, '72 : 8 = 9.', 'Podeli ukupan broj brojem grupa.'],
  ['police-72', 'mnozenje', 2, 'Na 3 police stoji po 24 slikovnice. Koliko je slikovnica ukupno?', 72, '3 · 24 = 72.', 'Tri jednake grupe.'],
  ['dao-ostalo', 'oduzimanje', 2, 'Lena je imala 360 sličica i dala je 125. Koliko joj je ostalo?', 235, '360 − 125 = 235.', 'Oduzmi dati deo.'],
  ['razredi-200', 'mnozenje', 3, 'U 8 odeljenja ima po 25 učenika. Koliko učenika ima ukupno?', 200, '8 · 25 = 200.', 'Pomnoži 8 i 25.'],
  ['sveske-gumica', 'kombinovano', 3, 'Tri sveske koštaju po 40 dinara, a gumica 25 dinara. Koliko dinara treba za sve?', 145, '3 · 40 = 120, 120 + 25 = 145.', 'Najpre sveske, pa dodaj gumicu.'],
  ['kolaci-80', 'deljenje', 3, '480 kolača pakuje se jednako u 6 kutija. Koliko kolača ide u jednu kutiju?', 80, '480 : 6 = 80.', 'Podeli ukupno na 6.'],
  ['vise-212', 'sabiranje', 3, 'Ujutru je palo 125 litara kiše u burad, a popodne 87 litara više nego ujutru. Koliko je pala popodne?', 212, '125 + 87 = 212.', '„Više" znači sabiranje.'],
  ['strane-36', 'oduzimanje', 3, 'Knjiga ima 64 strane. Pročitano je 28. Koliko strana je ostalo?', 36, '64 − 28 = 36.', 'Oduzmi pročitano.'],
  ['olovke-108', 'mnozenje', 3, 'Devet pakovanja ima po 12 olovaka. Koliko je olovaka ukupno?', 108, '9 · 12 = 108.', 'Pomnoži 9 i 12.'],
  ['kusur-sveske', 'kombinovano', 4, 'Mina ima 210 dinara. Kupi 3 sveske po 50 dinara. Koliko dinara joj ostaje?', 60, '3 · 50 = 150, 210 − 150 = 60.', 'Najpre utrošak, pa ostatak.'],
  ['pet-dana', 'mnozenje', 3, 'Luka čita po 18 strana pet dana zaredom. Koliko strana je pročitao?', 90, '5 · 18 = 90.', 'Pet jednakih grupa.'],
  ['dva-oduzimanja', 'kombinovano', 4, 'U školi je bilo 1000 svezaka. Prvog dana podeljeno je 450, drugog 280. Koliko je svezaka ostalo?', 270, '1000 − 450 = 550, 550 − 280 = 270.', 'Oduzmi oba dana.'],
  ['vuk-duplo', 'kombinovano', 4, 'Lena ima 36 nalepnica, a Vuk ima duplo više od nje. Koliko nalepnica imaju zajedno?', 108, 'Vuk: 2 · 36 = 72. Zajedno: 36 + 72 = 108.', 'Najpre Vukovu količinu, pa zbir.'],
  ['tri-kutije', 'sabiranje', 4, 'U kutijama je 120, 80 i 95 kuglica. Koliko je kuglica ukupno?', 295, '120 + 80 = 200, 200 + 95 = 295.', 'Saberi sve tri kutije.'],
  ['put-ostalo', 'oduzimanje', 4, 'Staza je dugačka 640 m. Pređeno je 275 m. Koliko metara je ostalo?', 365, '640 − 275 = 365.', 'Oduzmi pređeni put.'],
  ['cetiri-police', 'mnozenje', 2, 'Na 4 police stoji po 18 svezaka. Koliko je svezaka ukupno?', 72, '4 · 18 = 72.', 'Četiri jednake grupe.'],
  ['flomasteri', 'deljenje', 4, '96 flomastera pakuje se jednako u 8 pernica. Koliko flomastera ide u jednu pernicu?', 12, '96 : 8 = 12.', 'Podeli 96 sa 8.'],
  ['zbir-80', 'sabiranje', 3, 'Saberi 15, 27 i 38.', 80, '15 + 27 = 42, 42 + 38 = 80.', 'Saberi redom.'],
  ['knjiga-8dana', 'deljenje', 5, 'Knjiga ima 248 strana i čita se jednako 8 dana. Koliko strana treba pročitati svakog dana?', 31, '248 : 8 = 31.', 'Podeli ukupne strane na 8 dana.'],
  ['zbir-oduzmi', 'kombinovano', 5, 'U kasici je bilo 350 dinara, ubačeno je još 280, pa je potrošeno 125. Koliko dinara je ostalo?', 505, '350 + 280 = 630, 630 − 125 = 505.', 'Najpre dodaj, pa oduzmi.'],
  ['sest-dece', 'mnozenje', 5, 'Šestoro dece ima po 14 sličica. Koliko sličica imaju zajedno?', 84, '6 · 14 = 84.', 'Šest jednakih grupa.'],
  ['paketi-plus', 'kombinovano', 5, 'Pet paketa ima po 16 keksova, a još je ostalo 8 keksova van paketa. Koliko je keksova ukupno?', 88, '5 · 16 = 80, 80 + 8 = 88.', 'Najpre pakete, pa dodaj ostatak.'],
]

const TEKST_SINGLE: readonly Ponudjeno[] = [
  ['sta-radimo', 'oduzimanje', 1, 'U korpi je bilo 40 jabuka. Pojedeno je 12. Koji račun daje koliko je ostalo?', ['40 − 12', '40 + 12', '40 · 12', '12 − 40'], 0, '„Ostalo" posle uzimanja traži oduzimanje.', 'Od ukupnog oduzmi pojedeno.'],
  ['duplo-izbor', 'mnozenje', 3, 'Iva ima 16 kuglica, a Ognjen ima duplo više. Koliko kuglica ima Ognjen?', ['32', '18', '24', '8'], 0, 'Duplo više znači 2 · 16 = 32.', '„Duplo" je puta dva.'],
  ['podela-grupe', 'deljenje', 4, '45 učenika treba podeliti u grupe od po 5. Koliko grupa će biti?', ['9', '5', '40', '8'], 0, '45 : 5 = 9 grupa.', 'Podeli ukupno veličinom grupe.'],
  ['redosled', 'kombinovano', 5, 'Sara je imala 80 nalepnica. Kupila je još 3 paketića po 10, pa je dala 15. Koliko joj je ostalo?', ['95', '110', '65', '85'], 0, '3 · 10 = 30, 80 + 30 = 110, 110 − 15 = 95.', 'Najpre dodaj kupljeno, pa oduzmi dato.'],
]

const LOGIKA_TF: readonly Tvrdnja[] = [
  ['par-nepar', 'osobine', 1, 'Broj 7 je paran.', false, 'Parni brojevi su deljivi sa 2. 7 nije paran.', 'Parni se završavaju cifrom 0, 2, 4, 6 ili 8.'],
  ['100-najmanji-3', 'osobine', 2, 'Najmanji trocifreni broj je 100.', true, 'Najmanji broj sa tri cifre je 100.', 'Prvi trocifreni je sto.'],
  ['99-najveci-2', 'osobine', 2, 'Najveći dvocifreni broj je 99.', true, '99 je poslednji dvocifreni broj.', 'Posle 99 sledi 100, koji je trocifren.'],
  ['sreda-petak', 'redosled', 2, 'Ako je danas sreda, prekosutra je petak.', true, 'Sutra je četvrtak, prekosutra petak.', 'Prekosutra znači za dva dana.'],
  ['razlika-starosti', 'odnosi', 4, 'Otac ima 32 godine, sin 8. Za 5 godina razlika njihovih godina biće veća.', false, 'Obojica stare jednako, pa razlika ostaje 24 godine.', 'Obojica dodaju iste godine.'],
]

const LOGIKA_BROJ: readonly Broj[] = [
  ['veci-od-zbir-razlike', 'zbir-razlika', 2, 'Zbir dva broja je 20, a njihova razlika je 4. Koji je veći broj?', 12, 'Veći = (20 + 4) : 2 = 12. Provera: 12 + 8 = 20, 12 − 8 = 4.', 'Saberi zbir i razliku, pa podeli sa 2.'],
  ['manji-od-zbir-razlike', 'zbir-razlika', 3, 'Zbir dva broja je 20, a njihova razlika je 4. Koji je manji broj?', 8, 'Manji = (20 − 4) : 2 = 8.', 'Od zbira oduzmi razliku, pa podeli sa 2.'],
  ['duplo-mislim', 'pogodi', 1, 'Mislim na broj. Kad ga pomnožim sa 2, dobijem 16. Koji je broj?', 8, 'Traženi broj je 16 : 2 = 8.', 'Uradi obrnutu računicu.'],
  ['plus-5', 'pogodi', 1, 'Mislim na broj. Kad mu dodam 5, dobijem 17. Koji je broj?', 12, 'Traženi broj je 17 − 5 = 12.', 'Oduzmi ono što je dodato.'],
  ['325-cifre', 'zapis', 2, 'Broj ima 3 stotine, 2 desetice i 5 jedinica. Koji je to broj?', 325, '3 · 100 + 2 · 10 + 5 = 325.', 'Stotine, desetice, jedinice.'],
  ['noge-4', 'model', 2, 'Četiri mačke imaju po 4 noge. Koliko nogu imaju ukupno?', 16, '4 · 4 = 16.', 'Četiri grupe po četiri.'],
  ['pola-pa-4', 'kombinovano', 3, 'Polovina broja 18 uvećana za 4 je koliko?', 13, '18 : 2 = 9, 9 + 4 = 13.', 'Najpre polovinu, pa dodaj.'],
  ['zbir-razlika-30-6', 'zbir-razlika', 4, 'Zbir dva broja je 30, razlika je 6. Koji je veći broj?', 18, '(30 + 6) : 2 = 18. Manji je 12. Provera: 18 + 12 = 30, 18 − 12 = 6.', 'Saberi zbir i razliku, pa prepolovi.'],
  ['slicice-novo', 'odnosi', 3, 'Ana, Iva i Marko imaju 36 sličica. Ana i Iva imaju po jednako, a Marko ima duplo više od Ane. Koliko sličica ima Marko?', 18, 'Ana i Iva imaju isto, a Marko duplo više — to su četiri jednaka dela. 36 : 4 = 9, pa Marko ima 2 · 9 = 18.', 'Četiri jednaka dela, Marko uzima dva.'],
  ['autobus', 'kombinovano', 3, 'U autobusu je bilo 12 putnika. Na stanici je ušlo 9, a izašlo 5. Koliko putnika je ostalo u autobusu?', 16, '12 + 9 = 21, 21 − 5 = 16.', 'Dodaj one koji ulaze, oduzmi one koji izlaze.'],
  ['red-brojeva', 'pogodi', 4, 'Tri uzastopna broja daju zbir 24. Koji je srednji broj?', 8, 'Srednji je 24 : 3 = 8. Brojevi su 7, 8 i 9.', 'Srednji je trećina zbira.'],
  ['ostalo-deljenje', 'deljenje', 4, '23 olovke pakuju se u kutije od po 5. Koliko olovaka ostane nespakovano?', 3, '4 · 5 = 20, ostane 23 − 20 = 3.', 'Koliko nedostaje do sledeće petice.'],
  ['mreza-kvadrat', 'model', 5, 'Kvadratna mreža ima 6 redova i 6 kolona polja. Koliko polja ima?', 36, '6 · 6 = 36.', 'Pomnoži broj redova i kolona.'],
  ['novcic', 'odnosi', 5, 'Ana ima 3 novčića više od Luke, a zajedno imaju 27 novčića. Koliko novčića ima Luka?', 12, 'Zajedno imaju 27, a Ana ima 3 više. Od 27 oduzmemo 3, ostane 24 za dvoje jednako, pa Luka ima 12.', 'Od zbira oduzmi 3, pa prepolovi.'],
  ['pola-ostalo', 'kombinovano', 5, 'Od 20 keksova pojedena je polovina, pa još 3. Koliko keksova je ostalo?', 7, 'Polovina od 20 je 10, 10 − 3 = 7.', 'Najpre polovinu, pa oduzmi još 3.'],
]

const LOGIKA_SINGLE: readonly Ponudjeno[] = [
  ['ne-pripada', 'osobine', 1, 'Koji broj ne pripada nizu parnih brojeva: 2, 4, 6, 7, 8?', ['7', '2', '4', '8'], 0, '7 je neparan, ostali su parni.', 'Parni su deljivi sa 2.'],
  ['ko-visi', 'odnosi', 2, 'Ana je viša od Bare, a Bara je viša od Cice. Ko je najviši?', ['Ana', 'Bara', 'Cica', 'Ne može da se zna'], 0, 'Ana > Bara > Cica, pa je Ana najviša.', 'Prati lanac „viši od".'],
  ['najmanji-nepar', 'osobine', 3, 'Koji je najmanji dvocifreni neparni broj?', ['11', '10', '13', '21'], 0, '10 je paran, 11 je prvi dvocifreni neparni.', 'Dvocifreni počinju od 10.'],
  ['marko-slicice', 'odnosi', 3, 'Tri druga imaju 28 sličica. Marko ima duplo više od Ane, a Ana ima isto koliko i Iva. Koliko sličica ima Marko?', ['14', '7', '10', '21'], 0, 'Ana i Iva imaju isto, a Marko duplo više — četiri jednaka dela. 28 : 4 = 7, pa Marko ima 14.', 'Četiri jednaka dela, Marko uzima dva.'],
  ['ko-stariji', 'odnosi', 4, 'Mila ima 9 godina, a brat je 3 godine stariji od nje. Sestra je 2 godine mlađa od brata. Koliko godina ima sestra?', ['10', '9', '12', '7'], 0, 'Brat ima 12, sestra 12 − 2 = 10.', 'Najpre brata, pa sestru.'],
  ['vaga', 'odnosi', 5, 'Na levoj strani vage stoje 3 jednake kocke, na desnoj 1 ista kocka i teg od 10 g. Vaga je u ravnoteži. Koliko grama ima jedna kocka?', ['5', '10', '3', '15'], 0, 'Tri kocke teže kao jedna kocka plus 10 g, pa dve kocke teže 10 g. Jedna kocka je 5 g.', 'Oduzmi jednu kocku sa obe strane.'],
  ['susedi', 'redosled', 1, 'U nizu stolova sede Ana, pa Bara, pa Cica. Ko sedi u sredini?', ['Bara', 'Ana', 'Cica', 'Niko'], 0, 'Redosled je Ana, Bara, Cica, pa je Bara u sredini.', 'Pogledaj ko je između.'],
  ['manje-vise', 'odnosi', 2, 'Luka ima 7 kuglica, a Mina 4 više od Luke. Koliko kuglica ima Mina?', ['11', '3', '7', '4'], 0, '7 + 4 = 11 kuglica.', '„Više" znači sabiranje.'],
  ['preostalo-jaja', 'kombinovano', 5, 'U gajbici je 18 jaja. Pola je iskorišćeno za kolač, a još 2 su se slomila. Koliko jaja je ostalo?', ['7', '9', '8', '6'], 0, 'Pola od 18 je 9, 9 − 2 = 7.', 'Najpre polovinu, pa oduzmi slomljena.'],
  ['broj-pre-posle', 'pogodi', 4, 'Broj koji stoji tačno između 14 i 18 je?', ['16', '15', '17', '32'], 0, '14, 15, 16, 17, 18 — sredina je 16.', 'Od 14 do 18 korak je 4, pola koraka je 2.'],
]

export const MATEMATIKA3_BANKA: BankaPitanje3[] = [
  ...tvrdnje('geometrija', GEOMETRIJA_TF),
  ...brojevi('geometrija', GEOMETRIJA_BROJ),
  ...unosi('geometrija', GEOMETRIJA_UNOS),
  ...ponudjena('geometrija', GEOMETRIJA_SINGLE),
  ...tvrdnje('vreme-i-sat', VREME_TF),
  ...brojevi('vreme-i-sat', VREME_BROJ),
  ...ponudjena('vreme-i-sat', VREME_SINGLE),
  ...tvrdnje('razlomci', RAZLOMCI_TF),
  ...brojevi('razlomci', RAZLOMCI_BROJ),
  ...unosi('razlomci', RAZLOMCI_UNOS),
  ...ponudjena('razlomci', RAZLOMCI_SINGLE),
  ...brojevi('tekstualni-zadaci', TEKST_BROJ),
  ...ponudjena('tekstualni-zadaci', TEKST_SINGLE),
  ...tvrdnje('logicki-zadaci', LOGIKA_TF),
  ...brojevi('logicki-zadaci', LOGIKA_BROJ),
  ...ponudjena('logicki-zadaci', LOGIKA_SINGLE),
]

export const MATEMATIKA3_SLUGS = [
  'geometrija', 'vreme-i-sat', 'razlomci', 'tekstualni-zadaci', 'logicki-zadaci',
] as const
