import type { Pitanje } from '../types/db.ts'

export type BankaPitanje2 = Pick<Pitanje, 'type' | 'difficulty' | 'text' | 'options' | 'correct' | 'explanation' | 'hint' | 'points' | 'source' | 'gen_signature' | 'manual_review'> & {
  topicSlug: string
  porodica: string
}

type Tvrdnja = readonly [id: string, porodica: string, tekst: string, tacno: boolean, objasnjenje: string]
type Unos = readonly [id: string, porodica: string, tekst: string, prihvaceni: readonly string[], objasnjenje: string]

const PRAVOPIS: readonly Tvrdnja[] = [
  ['srbija', 'veliko-slovo', 'Naziv države pravilno je napisan: „Srbija“.', true, 'Imena država pišu se velikim početnim slovom.'],
  ['beograd', 'veliko-slovo', 'Naziv grada pravilno je napisan: „Beograd“.', true, 'Imena gradova pišu se velikim početnim slovom.'],
  ['novi-sad', 'veliko-slovo', 'Naziv grada pravilno je napisan: „Novi Sad“.', true, 'U višečlanom imenu grada svaka glavna reč počinje velikim slovom.'],
  ['novi-sad-malo', 'veliko-slovo', 'Naziv grada pravilno je napisan: „novi sad“.', false, 'Pravilno je Novi Sad, obe reči velikim slovom.'],
  ['sava', 'veliko-slovo', 'Naziv reke pravilno je napisan: „Sava“.', true, 'Jednočlani geografski nazivi pišu se velikim slovom.'],
  ['sava-malo', 'veliko-slovo', 'Naziv reke pravilno je napisan: „sava“.', false, 'Pravilno je Sava, velikim slovom.'],
  ['nis', 'veliko-slovo', 'Naziv grada pravilno je napisan: „Niš“.', true, 'Ime grada počinje velikim slovom.'],
  ['selo', 'veliko-slovo', 'Naziv sela pravilno je napisan: „Kovačevac“.', true, 'Imena sela pišu se velikim početnim slovom.'],
  ['drzava-malo', 'veliko-slovo', 'Naziv države pravilno je napisan: „srbija“.', false, 'Pravilno je Srbija, velikim slovom.'],
  ['beograd-malo', 'veliko-slovo', 'Naziv grada pravilno je napisan: „beograd“.', false, 'Pravilno je Beograd, velikim slovom.'],
  ['ne-znam', 'ne', 'Odrični oblik pravilno je napisan: „ne znam“.', true, 'Rečca ne uz glagol piše se odvojeno.'],
  ['neznam', 'ne', 'Pravilan je zapis: „neznam“.', false, 'Piše se ne znam, odvojeno.'],
  ['ne-cita', 'ne', 'Odrični oblik pravilno je napisan: „ne čita“.', true, 'Rečca ne uz glagol piše se odvojeno.'],
  ['necita', 'ne', 'Pravilan je zapis: „nečita“.', false, 'Piše se ne čita, odvojeno.'],
  ['ne-pise', 'ne', 'Odrični oblik pravilno je napisan: „ne piše“.', true, 'Rečca ne uz glagol piše se odvojeno.'],
  ['nemam', 'ne', 'Pravilan je zapis glagola: „nemam“.', true, 'Nemam je izuzetak i piše se sastavljeno.'],
  ['necu', 'ne', 'Odrični oblik pravilno je napisan: „ne ću“.', false, 'Piše se neću, sastavljeno.'],
  ['nisam', 'ne', 'Pravilan je zapis: „nisam“.', true, 'Nisam je izuzetak i piše se sastavljeno.'],
  ['hoce-li', 'li', 'Pitanje je pravilno napisano: „Hoćeš li da dođeš?“', true, 'Rečca li piše se odvojeno od glagola.'],
  ['hocesli', 'li', 'Pitanje je pravilno napisano: „Hoćešli da dođeš?“', false, 'Piše se Hoćeš li, odvojeno.'],
  ['jesi-li', 'li', 'Pitanje je pravilno napisano: „Jesi li spreman?“', true, 'Rečca li piše se odvojeno.'],
  ['jesili', 'li', 'Pitanje je pravilno napisano: „Jesili spreman?“', false, 'Piše se Jesi li, odvojeno.'],
  ['tacka-kraj', 'tacka', 'Obaveštajna rečenica „Dečak čita knjigu.“ ima pravilno stavljenu tačku na kraju.', true, 'Na kraju obaveštajne rečenice stoji tačka.'],
  ['bez-tacke', 'tacka', 'Rečenica „Dečak čita knjigu“ je pravilno završena i bez tačke.', false, 'Obaveštajna rečenica mora da se završi tačkom.'],
  ['redni-tacka', 'tacka', 'U zapisu „2. razred“ tačka iza cifre 2 pravilno pokazuje da je broj redni.', true, 'Iza rednog broja zapisanog cifrom piše se tačka.'],
  ['osnovni-tacka', 'tacka', 'U rečenici „Imam 3 sveske“ potrebna je tačka odmah iza cifre 3.', false, 'Ovde je 3 osnovni broj, pa se iza cifre ne piše tačka.'],
  ['nabrajanje-zapeta', 'nabrajanje', 'U rečenici „Poneli smo hleb, sir i vodu.“ zapete su pravilno stavljene.', true, 'Pri nabrajanju stavke se odvajaju zapetom.'],
  ['nabrajanje-bez', 'nabrajanje', 'U rečenici „Poneli smo hleb sir i vodu.“ nije potrebna nijedna zapeta.', false, 'Pravilno je: hleb, sir i vodu.'],
  ['datum-arapski', 'datum', 'Datum je pravilno napisan: „12. maj 2026.“', true, 'Dan, mesec i godina pišu se ovim redom, uz tačku iza broja dana.'],
  ['datum-rimski', 'datum', 'Datum je pravilno napisan: „12. V 2026.“', true, 'Mesec može biti zapisan rimskom cifrom.'],
]

const KNJIZEVNOST: readonly Unos[] = [
  ['pesma', 'vrste', 'Kako nazivamo kratak književni tekst napisan u stihovima?', ['pesma'], 'Pesma je napisana u stihovima.'],
  ['prica', 'vrste', 'Kako nazivamo književni tekst koji pripoveda o događajima i likovima?', ['priča'], 'Priča pripoveda o događajima i likovima.'],
  ['stih', 'stih', 'Kako se zove jedan red u pesmi?', ['stih'], 'Stih je jedan red poetskog teksta.'],
  ['naslov', 'delovi', 'Kako se zove ime knjige ili priče, napisano na početku?', ['naslov'], 'Naslov stoji na početku i imenuje delo.'],
  ['pisac', 'delovi', 'Kako nazivamo osobu koja je napisala priču ili pesmu?', ['pisac', 'pesnik', 'autor'], 'Pisac je autor teksta.'],
  ['lik', 'likovi', 'Kako nazivamo biće o kome se govori u priči?', ['lik', 'junak'], 'Lik je biće koje učestvuje u priči.'],
  ['basna', 'vrste', 'Koja kratka priča prikazuje životinje koje se ponašaju kao ljudi i na kraju daje pouku?', ['basna'], 'Basna kroz životinje donosi pouku.'],
  ['basna-zivotinje', 'vrste', 'Da li u basni obično govore životinje ili samo ljudi? Napiši ko govori.', ['životinje', 'životinje koje se ponašaju kao ljudi'], 'U basni životinje govore i postupaju kao ljudi.'],
  ['narodna', 'poreklo', 'Kako nazivamo pesmu koja se prenosila usmeno i čiji prvi pevač obično nije poznat?', ['narodna', 'narodna pesma'], 'Narodna pesma prenosila se usmeno.'],
  ['autorska', 'poreklo', 'Kako nazivamo pesmu koju je napisao poznati pesnik: narodna ili autorska?', ['autorska', 'autorska pesma'], 'Autorsku pesmu vezujemo za određenog pesnika.'],
  ['pouka', 'basna', 'Kako nazivamo pouku koju basna daje na kraju?', ['pouka', 'nauka', 'pouka basne'], 'Basna se završava poukom.'],
  ['junak', 'likovi', 'Kako nazivamo glavno biće u priči, ono o kome se najviše govori?', ['glavni lik', 'junak', 'glavni junak'], 'Glavni lik je u središtu priče.'],
  ['pesma-ili-prica', 'vrste', 'Da li je tekst u stihovima pesma ili priča?', ['pesma'], 'Stihovi čine pesmu.'],
  ['prica-proza', 'vrste', 'Da li je tekst koji pripoveda rečenicama, bez stihova, pesma ili priča?', ['priča'], 'Priča se piše u rečenicama, ne u stihovima.'],
  ['naslov-gde', 'delovi', 'Gde u knjizi obično stoji naslov: na početku ili na kraju?', ['na početku', 'početku'], 'Naslov stoji na početku dela.'],
  ['dva-stiha', 'stih', 'Pesma ima dva reda. Koliko ima stihova? Napiši rečima.', ['dva', 'dva stiha'], 'Svaki red je jedan stih.'],
  ['zivotinja-basna', 'basna', 'U tekstu lisica i gavran razgovaraju, a na kraju se čuje pouka. Koja je to književna vrsta?', ['basna'], 'Govoreće životinje i pouka odaju basnu.'],
  ['ko-pise', 'delovi', 'Ako na knjizi piše „Jovan Jovanović Zmaj“, ko je to: pisac ili lik?', ['pisac', 'pesnik', 'autor'], 'Ime na knjizi označava pisca.'],
  ['ko-u-prici', 'likovi', 'Ako se u priči pojavljuje dečak Marko koji traži loptu, ko je Marko: pisac ili lik?', ['lik', 'junak', 'glavni lik'], 'Marko je lik u priči.'],
  ['usmeno', 'poreklo', 'Da li se narodna pesma prenosila usmeno ili samo u knjigama?', ['usmeno'], 'Narodna pesma prenosila se s kolena na koleno, usmeno.'],
  ['recenice', 'vrste', 'Da li priča ide u stihovima ili u rečenicama?', ['u rečenicama', 'rečenicama'], 'Priča se piše u rečenicama.'],
  ['osecanja', 'pesma', 'Da li pesma često izražava osećanja ili samo nabraja brojeve?', ['osećanja', 'osećanja pesnika'], 'Pesma često izražava osećanja.'],
  ['dogadjaji', 'prica', 'Da li priča prvenstveno niže događaje ili samo nabraja boje?', ['događaje', 'događaji'], 'Priča pripoveda o događajima.'],
  ['naslov-primer', 'delovi', 'Ako na početku stoji „Crvenkapa“, šta je to: naslov ili pouka?', ['naslov'], 'To je naslov priče.'],
  ['pouka-kraj', 'basna', 'Gde u basni obično stoji pouka: na početku ili na kraju?', ['na kraju', 'kraju'], 'Pouka obično stoji na kraju basne.'],
  ['vise-likova', 'likovi', 'Ako u priči učestvuju i dečak i njegov pas, da li priča ima jedan lik ili više likova?', ['više likova', 'više', 'dva lika'], 'Dečak i pas su dva lika.'],
  ['stihovi-broj', 'stih', 'Pesma ima četiri reda. Koliko ima stihova? Napiši cifrom.', ['4', 'četiri'], 'Četiri reda jesu četiri stiha.'],
  ['narodna-nepoznat', 'poreklo', 'Ako ne znamo ko je prvi pevao pesmu, da li je to češće narodna ili autorska pesma?', ['narodna', 'narodna pesma'], 'Narodnoj pesmi prvi pevač obično nije poznat.'],
  ['autorska-ime', 'poreklo', 'Ako znamo da je pesmu napisao Dušan Radović, da li je pesma narodna ili autorska?', ['autorska', 'autorska pesma'], 'Pesma poznatog pesnika je autorska.'],
  ['basna-pouka', 'basna', 'Zašto se čita basna: da čujemo pouku ili da naučimo tablicu množenja?', ['da čujemo pouku', 'pouku', 'zbog pouke'], 'Basna uči kroz pouku.'],
]

const KULTURA_TVRDNJE: readonly Tvrdnja[] = [
  ['prepricavanje', 'oblici', 'Prepričavanje znači da svojim rečima kažemo šta se dogodilo u pročitanom tekstu.', true, 'Prepričavanjem prenosimo sadržaj teksta svojim rečima.'],
  ['pricanje-izmisli', 'oblici', 'Pričanje može biti i o izmišljenom događaju, ne samo o stvarnom.', true, 'Pričamo i o onome što smo doživeli i o onome što zamišljamo.'],
  ['opisivanje', 'oblici', 'Opisivanje govori kako nešto izgleda, a ne šta se redom dogodilo.', true, 'Opis prikazuje izgled, osobine ili prostor.'],
  ['opis-nije-redosled', 'oblici', 'Opisivanje je isto što i nabrajanje događaja redom kako su se desili.', false, 'Red događaja pripada pričanju ili prepričavanju, ne opisu.'],
  ['pismo-kome', 'pismo', 'Pismo pišemo određenoj osobi i na kraju se potpisujemo.', true, 'Pismo ima primaoca i potpis pošiljaoca.'],
  ['cestitka', 'obrasci', 'Čestitka služi da nekome čestitamo praznik ili rođendan.', true, 'Čestitkom izražavamo čestitke i želje.'],
  ['razglednica', 'obrasci', 'Razglednica se šalje s putovanja i obično ima sliku mesta.', true, 'Razglednica spaja kratku poruku i sliku mesta.'],
  ['pismo-bez-adrese', 'pismo', 'Pismo se može poslati poštom i bez imena i adrese primaoca.', false, 'Pošta treba ime i adresu da bi pismo stiglo.'],
  ['redosled', 'redosled', 'U priči događaji idu redom: najpre početak, pa sredina, pa kraj.', true, 'Redosled pomaže da se priča razume.'],
  ['kraj-prvi', 'redosled', 'Priču uvek treba početi od poslednjeg događaja, pa se vratiti na početak.', false, 'Za 2. razred priču nižemo od početka ka kraju.'],
  ['pozdrav', 'pismo', 'Na početku pisma stoji pozdrav ili obraćanje, na primer „Draga bako“.', true, 'Obraćanje pokazuje kome pišemo.'],
  ['potpis', 'pismo', 'Potpis na kraju pisma pokazuje ko šalje poruku.', true, 'Potpis imenuje pošiljaoca.'],
  ['prepricaj-svoje', 'oblici', 'Kad prepričavamo, smemo da izmislimo novi kraj koji nije bio u tekstu.', false, 'Prepričavanje prenosi sadržaj teksta, ne menja ga.'],
  ['pricanje-dozivljaj', 'oblici', 'Pričanje o rođendanu može da krene od toga šta se desilo ujutru.', true, 'Pričanje niže događaje od početka.'],
  ['cestitka-nije-pismo', 'obrasci', 'Čestitka i dugačko pismo uvek su ista stvar i imaju iste delove.', false, 'Čestitka je kratka čestitka, a pismo je duža poruka.'],
]

const KULTURA_UNOSI: readonly Unos[] = [
  ['prepricaj-naziv', 'oblici', 'Kako se zove kada svojim rečima kažemo sadržaj pročitanog teksta?', ['prepričavanje', 'prepričavanje teksta'], 'To je prepričavanje.'],
  ['pricanje-naziv', 'oblici', 'Kako se zove kada kazujemo šta nam se dogodilo ili šta zamišljamo?', ['pričanje'], 'To je pričanje.'],
  ['opis-naziv', 'oblici', 'Kako se zove kada kazujemo kako nešto izgleda?', ['opisivanje', 'opis'], 'To je opisivanje.'],
  ['pismo-primalac', 'pismo', 'U pismu „Draga tetka, ... Voli te Luka“ kome je pismo namenjeno?', ['tetki', 'tetka'], 'Obraćanje pokazuje primaoca.'],
  ['pismo-ko', 'pismo', 'Pismo se završava sa „Pozdrav, Milena“. Ko šalje pismo?', ['Milena'], 'Ime u potpisu je pošiljalac.'],
  ['cestitka-cemu', 'obrasci', 'Šta šaljemo drugu za rođendan: čestitku ili razglednicu sa putovanja?', ['čestitku', 'čestitka'], 'Za rođendan šaljemo čestitku.'],
  ['razglednica-gde', 'obrasci', 'Šta obično šaljemo s mora, uz sliku plaže: razglednicu ili basnu?', ['razglednicu', 'razglednica'], 'S putovanja šaljemo razglednicu.'],
  ['prvo', 'redosled', 'Rečenice: 1. Luka uze loptu. 2. Luka izađe napolje. 3. Luka se probudio. Koja ide prva? Napiši broj.', ['3', 'treća'], 'Najpre se probudio, pa je uzeo loptu i izašao.'],
  ['pozdrav-rec', 'pismo', 'Koja reč na početku pisma „Zdravo, bako“ služi kao pozdrav?', ['zdravo'], 'Zdravo je pozdrav na početku.'],
  ['adresa', 'pismo', 'Šta na koverti pokazuje gde pismo treba da stigne: adresa ili naslov pesme?', ['adresa'], 'Adresa vodi pismo primaocu.'],
  ['kraj-prica', 'redosled', 'U priči dečak najpre izgubi loptu, pa je potraži, pa je nađe. Šta je poslednji događaj?', ['nađe loptu', 'našao je loptu', 'nađe je'], 'Priča se završava pronalaženjem lopte.'],
  ['opis-sta', 'oblici', '„Dvorište je usko, popločano i zeleno.“ Da li ova rečenica prepričava ili opisuje?', ['opisuje', 'opisivanje', 'opis'], 'Rečenica prikazuje izgled dvorišta.'],
  ['prepricaj-sta', 'oblici', 'Pročitao si basnu o lisici. Da li je sada treba prepričati ili opisati krov škole?', ['prepričati', 'prepričavanje'], 'Sadržaj pročitanog teksta prepričavamo.'],
  ['cestitka-zelja', 'obrasci', 'Koja kratka želja stoji na čestitki za rođendan: „Srećan rođendan“ ili „Koja je tema teksta“?', ['Srećan rođendan'], 'Čestitka nosi čestitku i želju.'],
  ['potpis-gde', 'pismo', 'Gde u pismu stoji potpis: na početku ili na kraju?', ['na kraju', 'kraju'], 'Potpis stoji na kraju pisma.'],
]

function tvrdnje(topicSlug: string, stavke: readonly Tvrdnja[]): BankaPitanje2[] {
  return stavke.map(([id, porodica, text, value, explanation]) => ({
    topicSlug, porodica, type: 'truefalse', difficulty: 5, text, options: null,
    correct: { value }, explanation, hint: null, points: 5, source: 'manual',
    gen_signature: `${topicSlug}:banka:${id}`, manual_review: false,
  }))
}

function unosi(topicSlug: string, stavke: readonly Unos[]): BankaPitanje2[] {
  return stavke.map(([id, porodica, text, accept, explanation]) => ({
    topicSlug, porodica, type: 'text', difficulty: 5, text, options: null,
    correct: { accept: [...accept] }, explanation, hint: null, points: 5, source: 'manual',
    gen_signature: `${topicSlug}:banka:${id}`, manual_review: false,
  }))
}

export const SRPSKI2_BANKA: BankaPitanje2[] = [
  ...tvrdnje('srpski-pravopis-2', PRAVOPIS),
  ...unosi('srpski-knjizevnost-2', KNJIZEVNOST),
  ...tvrdnje('srpski-jezicka-kultura-2', KULTURA_TVRDNJE),
  ...unosi('srpski-jezicka-kultura-2', KULTURA_UNOSI),
]
