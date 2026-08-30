// Dopuna banke srpskog za 3. razred: oblasti bez generatora koje su tanke
// (jezička kultura, književnost). Pravopis već ima stotine pitanja.
// Sadržaj prati program 3. razreda: prepričavanje, pričanje, opisivanje,
// izveštavanje, obrazac, formalno/neformalno; književni pojmovi lirska/epska
// pesma, himna, bajka, roman, poređenje, personifikacija, dijalog, opis,
// pripovedanje, epski junak, dramska radnja. Bez subjekta, predikata i padeža.
import type { Pitanje } from '../types/db.ts'

export type BankaPitanjeSrpski3 = Pick<Pitanje, 'type' | 'difficulty' | 'text' | 'options' | 'correct' | 'explanation' | 'hint' | 'points' | 'source' | 'gen_signature' | 'manual_review'> & {
  topicSlug: string
  porodica: string
}

type Tvrdnja = readonly [id: string, porodica: string, tekst: string, tacno: boolean, objasnjenje: string]
type Unos = readonly [id: string, porodica: string, tekst: string, prihvaceni: readonly string[], objasnjenje: string]

function tvrdnje(topicSlug: string, stavke: readonly Tvrdnja[]): BankaPitanjeSrpski3[] {
  return stavke.map(([id, porodica, text, value, explanation]) => ({
    topicSlug, porodica, type: 'truefalse', difficulty: 5, text, options: null,
    correct: { value }, explanation, hint: null, points: 5, source: 'manual',
    gen_signature: `${topicSlug}:banka:${id}`, manual_review: false,
  }))
}

function unosi(topicSlug: string, stavke: readonly Unos[]): BankaPitanjeSrpski3[] {
  return stavke.map(([id, porodica, text, accept, explanation]) => ({
    topicSlug, porodica, type: 'text', difficulty: 5, text, options: null,
    correct: { accept: [...accept] }, explanation, hint: null, points: 5, source: 'manual',
    gen_signature: `${topicSlug}:banka:${id}`, manual_review: false,
  }))
}

const KULTURA_TVRDNJE: readonly Tvrdnja[] = [
  ['prepricaj-sadrzaj', 'oblici', 'Kad prepričavamo, svojim rečima prenosimo šta se dogodilo u pročitanom tekstu.', true, 'Prepričavanje prenosi sadržaj teksta, ne izmišlja novi kraj.'],
  ['prepricaj-kraj', 'oblici', 'Kad prepričavamo basnu, smemo da izmislimo novi kraj koji nije bio u tekstu.', false, 'Prepričavanje prati sadržaj pročitanog teksta.'],
  ['pricanje-izmisli', 'oblici', 'Pričanje može biti i o izmišljenom događaju, ne samo o stvarnom.', true, 'Pričamo i o doživljenom i o onome što zamišljamo.'],
  ['opis-nije-red', 'oblici', 'Opisivanje je isto što i nabrajanje događaja redom kako su se desili.', false, 'Red događaja pripada pričanju ili prepričavanju, a opis pokazuje izgled.'],
  ['izvestaj-tacan', 'oblici', 'Izveštavanje treba da bude tačno, kratko i bez izmišljanja.', true, 'Izveštaj prenosi šta se stvarno dogodilo, sažeto i objektivno.'],
  ['formalno-uciteljica', 'formalno', 'Sa učiteljicom u školi govorimo ljubaznije i pažljivije nego kad se šalimo sa drugom na igralištu.', true, 'Sa odraslima u školi koristimo formalniji govor.'],
  ['neformalno-drugar', 'formalno', 'U poruci drugu sa trećeg razreda obavezno je pisati kao u molbi direktoru.', false, 'Sa vršnjacima govorimo neformalnije, a u zvaničnim situacijama formalnije.'],
  ['slusa-sagovornik', 'razgovor', 'U razgovoru treba sačekati sagovornika da završi rečenicu pre nego što odgovorimo.', true, 'Pažljivo slušanje je pravilo učtivog razgovora.'],
  ['prekid-stalno', 'razgovor', 'Učtivo je stalno prekidati sagovornika da bismo brže rekli svoje.', false, 'Sagovornika slušamo do kraja, pa tek onda govorimo.'],
  ['obrazac-tacan', 'obrazac', 'U obrazac za biblioteku unosimo tačne lične podatke, na primer ime i prezime.', true, 'Obrazac traži tačne osnovne podatke.'],
  ['obrazac-izmisli', 'obrazac', 'U obrazac za sportski klub sme da se upiše izmišljeno ime radi šale.', false, 'U obrazac se unose tačni lični podaci.'],
  ['pozivnica-svaha', 'obrasci', 'Pozivnica služi da nekoga pozovemo na rođendan, priredbu ili sličan događaj.', true, 'Pozivnica obaveštava koga, kuda i kada zovemo.'],
  ['kratko-opsirno', 'oblici', 'Isti događaj možemo ispričati kratko ili opširnije, sa više pojedinosti.', true, 'U trećem razredu vežbamo i sažeto i opširnije kazivanje.'],
  ['telefon-predstavi', 'razgovor', 'Na početku telefonskog razgovora treba da se predstavimo.', true, 'Sagovornik treba da zna ko zove.'],
  ['cestitanje-glasno', 'obrasci', 'Kad čestitamo, kažemo želju, na primer „Srećan rođendan”.', true, 'Čestitanje je kratka učtiva želja.'],
]

const KULTURA_UNOSI: readonly Unos[] = [
  ['prepricaj-naziv', 'oblici', 'Pročitao si priču i sada svojim rečima kažeš šta se u njoj dogodilo, bez novog kraja. Kako se zove taj oblik kazivanja?', ['prepričavanje', 'prepričavanje teksta'], 'Prenos sadržaja pročitanog teksta jeste prepričavanje.'],
  ['pricanje-naziv', 'oblici', 'Pričaš drugovima šta ti se desilo na izletu, ili šta zamišljaš da bi se desilo. Kako se zove taj oblik kazivanja?', ['pričanje'], 'Kazivanje doživljaja ili izmišljenog događaja jeste pričanje.'],
  ['opis-naziv', 'oblici', 'Kazuješ kako izgleda školsko dvorište: boje, veličina, drveće. Kako se zove taj oblik kazivanja?', ['opisivanje', 'opis'], 'Kazivanje izgleda jeste opisivanje.'],
  ['izvestaj-naziv', 'oblici', 'Učiteljici kratko i tačno kažeš šta se desilo na odmoru, bez izmišljanja. Kako se zove taj oblik kazivanja?', ['izveštavanje', 'izveštaj'], 'Sažeto i tačno prenošenje događaja jeste izveštavanje.'],
  ['pozivnica-naziv', 'obrasci', 'Kako se zove kratka pismena poruka kojom nekoga zovemo na rođendan ili priredbu?', ['pozivnica', 'pozivnica za rođendan'], 'To je pozivnica.'],
  ['obrazac-naziv', 'obrazac', 'Kako se zove papir ili ekran u koji upisujemo ime, prezime i druge lične podatke?', ['obrazac', 'formular'], 'To je obrazac.'],
  ['formalno-kome', 'formalno', 'Da li sa učiteljicom u hodniku govorimo formalnije ili kao sa drugom na odmoru? Napiši formalnije ili neformalnije.', ['formalnije', 'formalno'], 'Sa učiteljicom koristimo formalniji govor.'],
  ['neformalno-kome', 'formalno', 'Da li se sa drugom na igralištu obično razgovara formalnije ili neformalnije?', ['neformalnije', 'neformalno'], 'Sa vršnjacima govorimo neformalnije.'],
  ['opis-zivotinja', 'oblici', '„Pas je malen, riđ i ima mek dlaku.” Da li ova rečenica prepričava ili opisuje?', ['opisuje', 'opisivanje', 'opis'], 'Rečenica pokazuje izgled psa.'],
  ['prepricaj-basna', 'oblici', 'Pročitao si basnu o cvrčku i mravu. Da li sadržaj sada treba prepričati ili popuniti obrazac za biblioteku?', ['prepričati', 'prepričavanje'], 'Sadržaj pročitanog teksta prepričavamo.'],
  ['pricanje-rodjendan', 'oblici', 'Pričaš kako si proslavio rođendan. Da li je to pričanje ili izveštavanje o utakmici koju nisi gledao?', ['pričanje'], 'Govoriš o svom doživljaju — to je pričanje.'],
  ['izvestaj-ko', 'oblici', 'Izveštaj odgovara na pitanja ko, šta, gde i kada. Koje od tih pitanja kaže mesto događaja?', ['gde', 'gde se dogodilo'], 'Pitanje gde traži mesto.'],
  ['pozivnica-kada', 'obrasci', 'Na pozivnici piše: „U subotu u 16 sati, u školskoj sali.” Šta nam taj deo poručuje: kada i gde, ili ko je napisao basnu?', ['kada i gde', 'vreme i mesto', 'kad i gde'], 'Pozivnica kaže vreme i mesto događaja.'],
  ['slusanje-sta', 'razgovor', 'Šta radimo dok drug govori: pažljivo slušamo ili ga prekidamo na svaku reč?', ['pažljivo slušamo', 'slušamo', 'slušamo ga'], 'Sagovornika slušamo do kraja.'],
  ['telefon-prvo', 'razgovor', 'Šta kažemo na početku telefonskog razgovora posle pozdrava: ko smo ili ko je napisao pesmu?', ['ko smo', 'predstavimo se', 'ime', 'predstavimo se imenom'], 'Najpre se predstavimo.'],
]

const KNJIZEVNOST_TVRDNJE: readonly Tvrdnja[] = [
  ['lirska-stih', 'lirika', 'Pesma o radosti proleća, napisana u stihovima, spada u lirsku poeziju.', true, 'Lirska pesma izražava osećanja i piše se u stihovima.'],
  ['lirska-proza', 'lirika', 'Lirska pesma o jeseni mora biti napisana u poglavljima, kao roman.', false, 'Lirska pesma ide u stihovima, ne u proznim poglavljima romana.'],
  ['himna-sava', 'himna', 'Pesma „Sveti Savo” koju đaci pevaju na školskoj slavi jeste himna.', true, 'Himna je svečana pesma posvećena važnoj ličnosti ili prazniku.'],
  ['epska-marko', 'epika', 'Pesma u kojoj Marko Kraljević ora drumove spada u epsku poeziju.', true, 'Narodna epska pesma peva o junaku i njegovim delima.'],
  ['bajka-pocetak', 'bajka', 'Rečenica „Bio jednom jedan car” često otvara narodnu bajku.', true, 'Narodne bajke obično tako počinju i prenosile su se usmeno.'],
  ['bajka-samo-pisac', 'bajka', 'Bajku može da ispriča samo pisac čije ime stoji na koricama, nikad narod.', false, 'Postoje i narodne bajke, bez poznatog prvog pripovedača.'],
  ['opis-nije-radnja', 'kazivanje', 'Rečenica „Dvorište je usko i zelenilo se” opisuje prostor, a ne niže događaje.', true, 'Opis slika izgled, pripovedanje prenosi radnju.'],
  ['dijalog-dva', 'kazivanje', 'Kad u priči Ana kaže: „Pođi sa mnom”, a Luka odgovori: „Idem”, to je dijalog.', true, 'Dijalog je razmena replika među licima.'],
  ['personifikacija', 'figure', 'U stihu „Vetar je šaputao travi” vetar dobija ljudsku osobinu.', true, 'To je personifikacija, na nivou prepoznavanja.'],
  ['poredjenje-kao', 'figure', 'U izrazu „brz kao srna” dve stvari se porede po sličnosti.', true, 'Poređenje često koristi reč kao.'],
  ['humor-smeh', 'dozivljaj', 'Ako nas priča nasmeje postupcima lika, u delu ima humora.', true, 'Humor je odlika koju u trećem razredu uočavamo u tekstu.'],
  ['glavni-sporedni', 'likovi', 'Ako se priča skoro sav vreme bavi dečakom, a pas se samo ponekad pojavi, dečak je glavni lik.', true, 'Glavni lik je u središtu, sporedni se pojavljuju uz njega.'],
]

const KNJIZEVNOST_UNOSI: readonly Unos[] = [
  ['lirska-naziv', 'lirika', 'Pesma u stihovima peva o tuzi i radosti, bez niza bojeva. Da li je lirska ili epska?', ['lirska', 'lirska pesma'], 'Osećanja u stihovima odaju lirsku pesmu.'],
  ['himna-slava', 'himna', 'Na školskoj slavi đaci svečano pevaju pesmu Svetom Savi. Kako se zove takva svečana pesma?', ['himna', 'himna Svetom Savi'], 'Svečana pesma posvećena svecu ili otadžbini jeste himna.'],
  ['epska-naziv', 'epika', 'Narodna pesma niže Markove bojeve i junaštvo. Da li je to lirska ili epska pesma?', ['epska', 'epska pesma'], 'Događaji i junak odaju epsku pesmu.'],
  ['bajka-cudo', 'bajka', 'U priči čarobni prsten pomaže junaku, a na kraju se venčava. Koja je to književna vrsta?', ['bajka'], 'Čuda, čarobni predmeti i srećan kraj odaju bajku.'],
  ['autorska-bajka', 'bajka', 'Na knjizi piše „Oskar Vajld”. Da li je ta bajka narodna ili autorska?', ['autorska', 'autorska bajka'], 'Poznat pisac znači autorsku bajku.'],
  ['narodna-bajka', 'bajka', 'Bajka se pričala uz vatru, a prvi pripovedač nije poznat. Da li je narodna ili autorska?', ['narodna', 'narodna bajka'], 'Usmeno prenošenje bez poznatog autora odaje narodnu bajku.'],
  ['poglavlja-roman', 'vrste', 'Priča o mačku ima više poglavlja i mnogo događaja. Da li je to pre basna ili roman?', ['roman'], 'Duža proza sa poglavljima jeste roman.'],
  ['poredjenje-srna', 'figure', 'U stihu „tih kao miš” dve stvari se porede uz reč kao. Koja je to figura?', ['poređenje'], 'Poređenje koristi sličnost, često uz kao.'],
  ['sunce-smeje', 'figure', 'U stihu „Sunce se smeje nad njivom” sunce radi nešto ljudsko. Koja je to figura?', ['personifikacija'], 'Neživom se daju ljudske osobine.'],
  ['replike', 'kazivanje', 'Dve osobe u tekstu razmenjuju rečenice pod navodnicima. Kako se zove taj razgovor?', ['dijalog'], 'Razmena replika jeste dijalog.'],
  ['kuca-izgled', 'kazivanje', '„Kuća je bela, sa zelenim kapcima.” Da li ova rečenica opisuje ili pripoveda?', ['opisuje', 'opis', 'opisivanje'], 'Rečenica slika izgled, ne niže radnje.'],
  ['niz-radnji', 'kazivanje', '„Ušao je, skinuo kapu i seo.” Da li ova rečenica opisuje ili pripoveda?', ['pripoveda', 'pripovedanje'], 'Nižu se radnje lika — pripovedanje.'],
  ['marko-ko', 'epika', 'U narodnoj pesmi Marko Kraljević je u središtu zbivanja. Kako nazivamo takvog junaka?', ['epski junak', 'junak', 'glavni junak'], 'Junak narodne epske pesme jeste epski junak.'],
  ['scena-sta', 'drama', 'U dramskom tekstu se na sceni odvija svađa, pa pomirenje. Kako se zove to zbivanje?', ['dramska radnja', 'radnja', 'radnja drame'], 'Zbivanje na sceni jeste dramska radnja.'],
  ['cetiri-reda', 'lirika', 'Pesma ima četiri odvojena reda. Koliko ima stihova? Napiši cifrom ili rečju.', ['4', 'četiri', 'četiri stiha'], 'Svaki red je jedan stih.'],
  ['odvojena-celina', 'lirika', 'Četiri stiha stoje zajedno, pa prazan red, pa nova četiri. Kako se zove ta celina stihova?', ['strofa'], 'Strofa je izdvojena celina stihova.'],
  ['zavrsetak-stih', 'lirika', 'Stihovi se završavaju sa „šuma” i „tuma”. Kako se zove to podudaranje?', ['rima'], 'Glasovno podudaranje završetaka jeste rima.'],
  ['srediste-price', 'likovi', 'Priča skoro sav vreme prati devojčicu Milu, a sused se pominje jednom. Ko je glavni lik? Napiši ime.', ['Mila', 'Mila je glavni lik'], 'Glavni lik je u središtu priče.'],
  ['mesto-sela', 'tema', 'Priča se dešava u selu pored reke. Da li je to vreme ili mesto dešavanja? Napiši mesto ili vreme.', ['mesto', 'mesto dešavanja'], 'Gde se radnja zbiva jeste mesto dešavanja.'],
  ['vreme-zima', 'tema', 'Događaji u priči zbivaju se zimi, pred praznik. Da li je to vreme ili mesto dešavanja?', ['vreme', 'vreme dešavanja'], 'Kad se radnja zbiva jeste vreme dešavanja.'],
  ['pouka-kraj', 'basna', 'Na kraju basne stoji: „Ko radi, ne gladuje.” Kako nazivamo tu rečenicu?', ['pouka', 'nauka', 'pouka basne'], 'Basna se završava poukom.'],
  ['lisica-gavran', 'basna', 'Lisica i gavran razgovaraju i na kraju se čuje pouka. Koja je to književna vrsta?', ['basna'], 'Govoreće životinje i pouka odaju basnu.'],
  ['pomaze-istina', 'likovi', 'Junak pomaže slabijima i govori istinu. Da li su to pozitivne ili negativne osobine?', ['pozitivne', 'pozitivne osobine'], 'Pomaganje i istinoljubivost su pozitivne osobine.'],
]

export const SRPSKI3_BANKA: BankaPitanjeSrpski3[] = [
  ...tvrdnje('srpski-jezicka-kultura', KULTURA_TVRDNJE),
  ...unosi('srpski-jezicka-kultura', KULTURA_UNOSI),
  ...tvrdnje('srpski-knjizevnost', KNJIZEVNOST_TVRDNJE),
  ...unosi('srpski-knjizevnost', KNJIZEVNOST_UNOSI),
]

export const SRPSKI3_SLUGS = ['srpski-jezicka-kultura', 'srpski-knjizevnost'] as const
