// Generator: čitanje i razumevanje za 2. razred — kratki originalni tekstovi.
// Pitanja su doslovna: ko, gde, šta i šta se desilo na kraju.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst } from '../moduli/srpskiZajednicko.ts'

interface Prica {
  id: string
  tekst: string
  ko: string
  gde: string[]
  predmetPitanje: string
  predmet: string[]
  krajPitanje: string
  kraj: string[]
  krajObjasnjenje: string
}

const PRICE: Prica[] = [
  {
    id: 'luka-lopta', tekst: 'Luka je u dvorištu našao plavu loptu. Bacio ju je visoko, pa je uhvatio obema rukama. Zatim je pozvao sestru da se igraju.',
    ko: 'Luka', gde: ['u dvorištu', 'dvorištu'], predmetPitanje: 'Koje je boje bila lopta?', predmet: ['plava', 'plave'],
    krajPitanje: 'Šta je Luka uradio na kraju?', kraj: ['pozvao sestru', 'pozvao je sestru', 'pozvao sestru da se igraju'],
    krajObjasnjenje: 'Na kraju je Luka pozvao sestru da se igraju.',
  },
  {
    id: 'mila-cvece', tekst: 'Mila je u bašti zalivala crvene lale. Kada je zemlja postala mokra, ostavila je kantu pored ograde. Lale su sjajile na suncu.',
    ko: 'Mila', gde: ['u bašti', 'bašti'], predmetPitanje: 'Šta je Mila zalivala?', predmet: ['lale', 'crvene lale'],
    krajPitanje: 'Šta su lale radile na suncu?', kraj: ['sjajile', 'sjajile su', 'sjajile na suncu'],
    krajObjasnjenje: 'Na kraju su lale sjajile na suncu.',
  },
  {
    id: 'jovan-olovka', tekst: 'Jovan je u učionici video crvenu olovku ispod klupe. Podigao ju je i vratio drugu. Drug je zahvalio i nasmešio se.',
    ko: 'Jovan', gde: ['u učionici', 'učionici'], predmetPitanje: 'Šta je Jovan našao ispod klupe?', predmet: ['olovku', 'crvenu olovku'],
    krajPitanje: 'Šta je drug uradio kada je dobio olovku?', kraj: ['zahvalio', 'zahvalio i nasmešio se', 'nasmešio se'],
    krajObjasnjenje: 'Drug je zahvalio i nasmešio se.',
  },
  {
    id: 'sara-kisa', tekst: 'Sara je krenula kući kada je počela kiša. Otvorila je žuti kišobran i koračala pažljivo. Stigla je kući suva.',
    ko: 'Sara', gde: ['na putu kući', 'na putu', 'putu kući'], predmetPitanje: 'Koje je boje bio kišobran?', predmet: ['žuti', 'žut', 'žuta'],
    krajPitanje: 'Kako je Sara stigla kući?', kraj: ['suva', 'stigla je suva', 'suva je stigla'],
    krajObjasnjenje: 'Sara je stigla kući suva jer je otvorila kišobran.',
  },
  {
    id: 'nikola-kolaci', tekst: 'Nikola je u kuhinji pomagao baki da ređa kolače. Pažljivo je stavio svaki kolač na pleh. Baka mu je dala jedan da proba.',
    ko: 'Nikola', gde: ['u kuhinji', 'kuhinji'], predmetPitanje: 'Kome je Nikola pomagao?', predmet: ['baki', 'baka'],
    krajPitanje: 'Šta je baka dala Nikoli na kraju?', kraj: ['kolač', 'jedan kolač', 'kolač da proba'],
    krajObjasnjenje: 'Baka mu je dala jedan kolač da proba.',
  },
  {
    id: 'ema-kapa', tekst: 'Ema je u parku izgubila plavu kapu. Pregledala je klupu i travu pored staze. Kapa je visila na grani drveta.',
    ko: 'Ema', gde: ['u parku', 'parku'], predmetPitanje: 'Koje je boje bila kapa?', predmet: ['plava', 'plave'],
    krajPitanje: 'Gde je kapa na kraju pronađena?', kraj: ['na grani', 'na grani drveta', 'visila na grani'],
    krajObjasnjenje: 'Kapa je visila na grani drveta.',
  },
  {
    id: 'petar-ptica', tekst: 'Petar je na prozoru video vrapca. Sipao je semenke u činiju i ostavio je napolju. Vrabac je brzo sleteo da jede.',
    ko: 'Petar', gde: ['na prozoru', 'prozoru', 'kod prozora'], predmetPitanje: 'Šta je Petar sipao u činiju?', predmet: ['semenke', 'semenke za pticu'],
    krajPitanje: 'Šta je vrabac uradio na kraju?', kraj: ['sleteo', 'sleteo da jede', 'brzo sleteo'],
    krajObjasnjenje: 'Vrabac je brzo sleteo da jede.',
  },
  {
    id: 'una-crtez', tekst: 'Una je za stolom crtala žutu kuću. Dodala je crveni krov i zeleno drvo pored nje. Crtež je okačila na vrata svoje sobe.',
    ko: 'Una', gde: ['za stolom', 'u sobi', 'sobi'], predmetPitanje: 'Koje je boje bila kuća na crtežu?', predmet: ['žuta', 'žute'],
    krajPitanje: 'Gde je Una okačila crtež?', kraj: ['na vrata', 'na vrata sobe', 'na vrata svoje sobe'],
    krajObjasnjenje: 'Una je crtež okačila na vrata svoje sobe.',
  },
  {
    id: 'ilija-brodic', tekst: 'Ilija je pored bare pravio brodić od papira. Pažljivo ga je spustio na vodu. Vetar je odneo brodić do druge obale.',
    ko: 'Ilija', gde: ['pored bare', 'bare'], predmetPitanje: 'Od čega je Ilija pravio brodić?', predmet: ['od papira', 'papira', 'papir'],
    krajPitanje: 'Gde je vetar odneo brodić?', kraj: ['do druge obale', 'na drugu obalu', 'druge obale'],
    krajObjasnjenje: 'Vetar je odneo brodić do druge obale.',
  },
  {
    id: 'teodora-sto', tekst: 'Teodora je u trpezariji pomagala mami da postavi sto. Stavila je tanjire i čaše na stolnjak. Mama ju je zagrlila.',
    ko: 'Teodora', gde: ['u trpezariji', 'trpezariji'], predmetPitanje: 'Šta je Teodora stavila na stolnjak?', predmet: ['tanjire i čaše', 'tanjire', 'čaše'],
    krajPitanje: 'Šta je mama uradila na kraju?', kraj: ['zagrlila je', 'zagrlila', 'mama ju je zagrlila'],
    krajObjasnjenje: 'Mama je Teodoru zagrlila.',
  },
  {
    id: 'anja-bara', tekst: 'Anja je posle kiše skakala u barice na stazi. Čizme su joj bile žute i visoke. Na kraju je sela na klupu da se odmori.',
    ko: 'Anja', gde: ['na stazi', 'stazi'], predmetPitanje: 'Koje je boje bile čizme?', predmet: ['žute', 'žuta'],
    krajPitanje: 'Šta je Anja uradila na kraju?', kraj: ['sela na klupu', 'sela se da se odmori', 'odmorila se na klupi'],
    krajObjasnjenje: 'Anja je sela na klupu da se odmori.',
  },
  {
    id: 'david-sneg', tekst: 'David je u dvorištu pravio sneška. Stavio mu je šargarepu za nos i staru kapu na glavu. Sneško je stajao pored ljuljaške.',
    ko: 'David', gde: ['u dvorištu', 'dvorištu'], predmetPitanje: 'Šta je David stavio snešku za nos?', predmet: ['šargarepu', 'šargarepa'],
    krajPitanje: 'Gde je sneško stajao na kraju?', kraj: ['pored ljuljaške', 'kod ljuljaške', 'ljuljaške'],
    krajObjasnjenje: 'Sneško je stajao pored ljuljaške.',
  },
  {
    id: 'klara-pas', tekst: 'Klara je u dvorištu četkala malog psa. Pas je mahao repom dok ga je češljala. Zatim su oboje seli u hladovinu.',
    ko: 'Klara', gde: ['u dvorištu', 'dvorištu'], predmetPitanje: 'Koga je Klara četkala?', predmet: ['psa', 'malog psa'],
    krajPitanje: 'Gde su Klara i pas seli na kraju?', kraj: ['u hladovinu', 'hladovinu'],
    krajObjasnjenje: 'Na kraju su seli u hladovinu.',
  },
  {
    id: 'vukasin-kocke', tekst: 'Vukašin je na tepihu slagao drvene kocke. Napravio je visoku kulu sa crvenim krovom. Kula je ostala da stoji do večeri.',
    ko: 'Vukašin', gde: ['na tepihu', 'tepihu', 'u sobi'], predmetPitanje: 'Od čega je Vukašin pravio kulu?', predmet: ['od kocki', 'od drvenih kocki', 'kocki'],
    krajPitanje: 'Dokle je kula stajala?', kraj: ['do večeri', 'stajala do večeri'],
    krajObjasnjenje: 'Kula je ostala da stoji do večeri.',
  },
  {
    id: 'lena-jabuka', tekst: 'Lena je u voćnjaku ubrala zrelu jabuku. Oprala ju je na česmi pored kuće. Jabuku je podelila sa bratom.',
    ko: 'Lena', gde: ['u voćnjaku', 'voćnjaku'], predmetPitanje: 'Šta je Lena ubrala?', predmet: ['jabuku', 'zrelu jabuku'],
    krajPitanje: 'Sa kim je Lena podelila jabuku?', kraj: ['sa bratom', 'bratom', 'sa svojim bratom'],
    krajObjasnjenje: 'Lena je jabuku podelila sa bratom.',
  },
  {
    id: 'ognjen-vozic', tekst: 'Ognjen je u dnevnoj sobi vozio drveni vozić. Vozić je prošao ispod stolice i stao kod fotelje. Ognjen ga je tamo i ostavio.',
    ko: 'Ognjen', gde: ['u dnevnoj sobi', 'dnevnoj sobi'], predmetPitanje: 'Šta je Ognjen vozio?', predmet: ['vozić', 'drveni vozić'],
    krajPitanje: 'Gde je Ognjen ostavio vozić?', kraj: ['kod fotelje', 'kod fotelje ga je ostavio', 'fotelje'],
    krajObjasnjenje: 'Ognjen je vozić ostavio kod fotelje.',
  },
]

type Polje = 'ko' | 'gde' | 'predmet' | 'kraj'

function pitanjeZa(prica: Prica, polje: Polje): string {
  if (polje === 'ko') return 'Kako se zove glavni lik priče? (upiši ime)'
  if (polje === 'gde') return 'Gde se priča odvija? (upiši kratak odgovor)'
  if (polje === 'predmet') return prica.predmetPitanje + ' (upiši odgovor)'
  return prica.krajPitanje + ' (upiši odgovor)'
}

function tacanZa(prica: Prica, polje: Polje): { tacan: string; prihvaceni: string[]; objasnjenje: string } {
  if (polje === 'ko') return { tacan: prica.ko, prihvaceni: [], objasnjenje: `Glavni lik zove se ${prica.ko}.` }
  if (polje === 'gde') {
    return { tacan: prica.gde[0], prihvaceni: prica.gde.slice(1), objasnjenje: `Priča se odvija ${prica.gde[0]}.` }
  }
  if (polje === 'predmet') {
    return { tacan: prica.predmet[0], prihvaceni: prica.predmet.slice(1), objasnjenje: `Tačan odgovor je „${prica.predmet[0]}“.` }
  }
  return { tacan: prica.kraj[0], prihvaceni: prica.kraj.slice(1), objasnjenje: prica.krajObjasnjenje }
}

export const srpskiCitanje2: TopicGenerator = {
  slug: 'srpski-citanje-2',
  supportedTypes: ['text'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const prica = izaberi(rng, PRICE)
    const polje = izaberi(rng, ['ko', 'gde', 'predmet', 'kraj'] as const)
    const signature = `srpski-citanje-2:${prica.id}:${polje}`
    if (taken.has(signature)) return null
    const { tacan, prihvaceni, objasnjenje } = tacanZa(prica, polje)
    return upakujSrpskiTekst(cfg, {
      pitanje: `Pročitaj tekst:\n\n${prica.tekst}\n\n${pitanjeZa(prica, polje)}`,
      tacan, prihvaceni, explanation: objasnjenje,
      hint: 'Ponovo pročitaj tekst i pronađi odgovor u njemu.',
      signature,
    })
  },
}
