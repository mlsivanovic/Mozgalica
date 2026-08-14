// Generator: rečnik 4. razred — složene i izvedene reči se ukucaju;
// značenja homonima se proveravaju tačno/netačno tvrdnjama.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

interface SlozenaRec {
  rec: string
  deo1: string
  deo2: string
  // Prirodni oblici drugog dela (npr. glagolska imenica uz infinitiv)
  deo2Prihvaceni?: string[]
}

const SLOZENE_RECI: SlozenaRec[] = [
  { rec: 'Beograd', deo1: 'beo', deo2: 'grad' },
  { rec: 'suncokret', deo1: 'sunce', deo2: 'okret', deo2Prihvaceni: ['okretati', 'okretanje'] },
  { rec: 'bubamara', deo1: 'buba', deo2: 'mara' },
  { rec: 'čuvarkuća', deo1: 'čuvar', deo2: 'kuća' },
  { rec: 'zemljotres', deo1: 'zemlja', deo2: 'tresati', deo2Prihvaceni: ['tresti', 'tresanje'] },
  { rec: 'crvenkapa', deo1: 'crven', deo2: 'kapa' },
  { rec: 'vatrogasac', deo1: 'vatra', deo2: 'gasiti', deo2Prihvaceni: ['gasi', 'gašenje'] },
  { rec: 'samouk', deo1: 'sam', deo2: 'učiti', deo2Prihvaceni: ['učenje'] },
  { rec: 'ledolomac', deo1: 'led', deo2: 'lomiti', deo2Prihvaceni: ['lomi', 'lomljenje'] },
  { rec: 'jednorog', deo1: 'jedan', deo2: 'rog' },
  { rec: 'kratkotrajno', deo1: 'kratko', deo2: 'trajati', deo2Prihvaceni: ['trajanje'] },
  { rec: 'mnogobrojan', deo1: 'mnogo', deo2: 'broj' },
]

const IZVEDENE_RECI = [
  { osnova: 'zid', izvedena: 'zidar' },
  { osnova: 'riba', izvedena: 'ribar' },
  { osnova: 'drvo', izvedena: 'drvar' },
  { osnova: 'magla', izvedena: 'maglovit' },
  { osnova: 'šum', izvedena: 'šumar' },
  { osnova: 'voda', izvedena: 'vodeni' },
  { osnova: 'kamen', izvedena: 'kamenit' },
  { osnova: 'sneg', izvedena: 'snežan' },
  { osnova: 'zlato', izvedena: 'zlatan' },
  { osnova: 'vetar', izvedena: 'vetrovit' },
  { osnova: 'zima', izvedena: 'zimski' },
  { osnova: 'cvet', izvedena: 'cvetni' },
  { osnova: 'zvezda', izvedena: 'zvezdani' },
  { osnova: 'račun', izvedena: 'računar' },
]

interface HomonimZnacenje {
  kontekst: string
  znacenje: string
}

interface Homonim {
  rec: string
  znacenja: HomonimZnacenje[]
}

const HOMONIMI: Homonim[] = [
  {
    rec: 'kosa',
    znacenja: [
      { kontekst: 'Devojčica ima dugu plavu kosu.', znacenje: 'dlake na glavi' },
      { kontekst: 'Deda oštri kosu za travu.', znacenje: 'poljoprivredna alatka' },
      { kontekst: 'Spustili smo se niz planinsku kosu.', znacenje: 'nagnuta strana brda' },
    ],
  },
  {
    rec: 'luk',
    znacenja: [
      { kontekst: 'Za ručak smo jeli crni luk.', znacenje: 'vrsta povrća' },
      { kontekst: 'Strelac je zategao luk i strelu.', znacenje: 'oružje za gađanje' },
      { kontekst: 'Vojnici su ušli kroz slavoluk tvrđave.', znacenje: 'polukružni svod' },
    ],
  },
  {
    rec: 'grad',
    znacenja: [
      { kontekst: 'Kupili smo stan u velikom gradu.', znacenje: 'naselje' },
      { kontekst: 'Snažan grad je uništio useve.', znacenje: 'vremenska nepogoda (led)' },
    ],
  },
  {
    rec: 'jezik',
    znacenja: [
      { kontekst: 'Ugrizla sam se za jezik.', znacenje: 'deo tela (organ u usnoj duplji)' },
      { kontekst: 'Srpski jezik mi je maternji.', znacenje: 'sredstvo za sporazumevanje' },
      { kontekst: 'Jezik zvona se pokvario pa zvono ne zvoni.', znacenje: 'deo aparata koji udara' },
    ],
  },
  {
    rec: 'list',
    znacenja: [
      { kontekst: 'Jesenji list je pao sa drveta.', znacenje: 'deo biljke' },
      { kontekst: 'Otvorio je svesku na prvom listu.', znacenje: 'strana knjige ili sveske' },
      { kontekst: 'Riba je mahnula repom, a pas svojim listom.', znacenje: 'deo tela životinje' },
    ],
  },
  {
    rec: 'glava',
    znacenja: [
      { kontekst: 'Glava me boli od učenja.', znacenje: 'deo tela' },
      { kontekst: 'Glava sela je sazvala sastanak.', znacenje: 'predsednik, vođa' },
      { kontekst: 'Češalj je izgubio jednu glavu.', znacenje: 'gornji deo predmeta' },
    ],
  },
  {
    rec: 'pero',
    znacenja: [
      { kontekst: 'Upravio je domaći hemijskim perom.', znacenje: 'sredstvo za pisanje' },
      { kontekst: 'Paun je raširio svoja šarena pera.', znacenje: 'pokrovče na telu ptice' },
      { kontekst: 'Vetar je zaigrao perom drveta.', znacenje: 'list drveta (pesnički)' },
    ],
  },
  {
    rec: 'noga',
    znacenja: [
      { kontekst: 'Noga mi je zaspala od sedenja.', znacenje: 'deo tela' },
      { kontekst: 'Stolica se klati jer je jedna noga kratka.', znacenje: 'deo nameštaja' },
    ],
  },
]

export const srpskiRecnik4: TopicGenerator = {
  slug: 'srpski-recnik-4',
  supportedTypes: ['text', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    // Značenje homonima ne može da se ukuca kratkim odgovorom, pa je taj tip
    // pitanja uvek tačno/netačno tvrdnja.
    const kategorija = cfg.type === 'truefalse'
      ? 'homonim'
      : cfg.type === 'text'
        ? izaberi(rng, ['slozena', 'izvedena'] as const)
        : izaberi(rng, ['slozena', 'izvedena', 'homonim'] as const)

    if (kategorija === 'slozena') {
      const slozena = izaberi(rng, SLOZENE_RECI)
      const traziPrvi = rng() < 0.5
      const signature = `srpski-recnik-4:slozena:${slozena.rec}:${traziPrvi ? 'deo1' : 'deo2'}`
      if (taken.has(signature)) return null

      if (traziPrvi) {
        return upakujSrpskiTekst(cfg, {
          pitanje: `Složenica „${slozena.rec}“ nastala je od koje reči i reči „${slozena.deo2}“? (upiši prvi deo)`,
          tacan: slozena.deo1,
          explanation: `Složenica „${slozena.rec}“ je spoj reči „${slozena.deo1}“ i „${slozena.deo2}“.`,
          hint: 'Složene reči nastaju spajanjem dve posebne reči u jednu novu reč.',
          signature,
        })
      }
      return upakujSrpskiTekst(cfg, {
        pitanje: `Složenica „${slozena.rec}“ nastala je od reči „${slozena.deo1}“ i koje reči još? (upiši drugi deo)`,
        tacan: slozena.deo2,
        prihvaceni: slozena.deo2Prihvaceni,
        explanation: `Složenica „${slozena.rec}“ je spoj reči „${slozena.deo1}“ i „${slozena.deo2}“.`,
        hint: 'Složene reči nastaju spajanjem dve posebne reči u jednu novu reč.',
        signature,
      })
    }

    if (kategorija === 'izvedena') {
      const izvedena = izaberi(rng, IZVEDENE_RECI)
      const signature = `srpski-recnik-4:izvedena:${izvedena.osnova}`
      if (taken.has(signature)) return null
      return upakujSrpskiTekst(cfg, {
        pitanje: `Od koje reči je izvedena reč „${izvedena.izvedena}“? (upiši tu reč)`,
        tacan: izvedena.osnova,
        explanation: `Reč „${izvedena.izvedena}“ izvedena je od reči „${izvedena.osnova}“ dodavanjem nastavka.`,
        hint: 'Izvedene reči nastaju dodavanjem nastavaka na osnovnu reč.',
        signature,
      })
    }

    const homonim = izaberi(rng, HOMONIMI)
    const znacenje = izaberi(rng, homonim.znacenja)
    const signature = `srpski-recnik-4:homonim:${homonim.rec}:${znacenje.kontekst}`
    if (taken.has(signature)) return null
    // Pogrešno značenje uzimamo iz OSTALIH značenja iste reči — tako se
    // proverava razumevanje konkretnog konteksta, ne tuđe reči.
    const pogresno = izaberi(rng, homonim.znacenja.filter((zn) => zn.znacenje !== znacenje.znacenje))
    return upakujSrpskiTvrdnju(cfg, rng, {
      tvrdnjaTacna: `U rečenici „${znacenje.kontekst}“ reč „${homonim.rec}“ znači: ${znacenje.znacenje}.`,
      tvrdnjaNetacna: `U rečenici „${znacenje.kontekst}“ reč „${homonim.rec}“ znači: ${pogresno.znacenje}.`,
      explanation: `U ovom kontekstu „${homonim.rec}“ znači: ${znacenje.znacenje}.`,
      hint: 'Reči koje se isto pišu i izgovaraju mogu imati potpuno različita značenja zavisno od rečenice.',
      signature,
    })
  },
}
