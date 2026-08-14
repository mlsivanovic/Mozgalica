// Generator: rečnik 4. razred — složene reči, izvedene reči, homonimi (reči sa više značenja).
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from '../moduli/srpskiZajednicko.ts'

const SLOZENE_RECI = [
  { rec: 'Beograd', delovi: 'beo + grad', uljezi: ['beo + zgrada', 'beo + rad', 'bela + grad'] },
  { rec: 'suncokret', delovi: 'sunce + okret', uljezi: ['sunce + cvet', 'sunce + kretanje', 'suncobran'] },
  { rec: 'bubamara', delovi: 'buba + mara', uljezi: ['buba + švaba', 'buka + mara', 'buba + mrak'] },
  { rec: 'čuvarkuća', delovi: 'čuvar + kuća', uljezi: ['čuvati + kućicu', 'čuvar + pas', 'čuvanje + kuće'] },
  { rec: 'zemljotres', delovi: 'zemlja + tresati', uljezi: ['zemlja + kresati', 'zima + tresati', 'zemlja + plesti'] },
  { rec: 'crvenkapa', delovi: 'crven + kapa', uljezi: ['crvena + kaput', 'crven + kapljica', 'crno + kapa'] },
  { rec: 'vatrogasac', delovi: 'vatra + gasiti', uljezi: ['vatra + gajiti', 'vatra + pasti', 'voda + gasiti'] },
  { rec: 'samouk', delovi: 'sam + učiti', uljezi: ['sam + igrati', 'sam + čuti', 'tvoj + učiti'] },
  { rec: 'ledolomac', delovi: 'led + lomiti', uljezi: ['led + bojati', 'red + lomiti', 'led + topiti'] },
  { rec: 'jednorog', delovi: 'jedan + rog', uljezi: ['jedan + noga', 'dva + rog', 'jedan + rov'] },
  { rec: 'kratkotrajno', delovi: 'kratko + trajati', uljezi: ['kratko + crtati', 'slatko + trajati', 'kratko + tretati'] },
  { rec: 'mnogobrojan', delovi: 'mnogo + broj', uljezi: ['mnogo + boj', 'malo + broj', 'mnogo + brod'] },
]

const IZVEDENE_RECI = [
  { osnova: 'zid', izvedena: 'zidar', uljezi: ['zima', 'zmija', 'zmaj'] },
  { osnova: 'riba', izvedena: 'ribar', uljezi: ['ribizla', 'rob', 'radnik'] },
  { osnova: 'drvo', izvedena: 'drvar', uljezi: ['društvo', 'dva', 'držač'] },
  { osnova: 'magla', izvedena: 'maglovit', uljezi: ['magma', 'magarac', 'marama'] },
  { osnova: 'šum', izvedena: 'šumar', uljezi: ['šala', 'šunka', 'šah'] },
  { osnova: 'voda', izvedena: 'vodeni', uljezi: ['vođa', 'voz', 'volja'] },
  { osnova: 'kamen', izvedena: 'kamenit', uljezi: ['kamion', 'kamera', 'kamp'] },
  { osnova: 'sneg', izvedena: 'snežan', uljezi: ['san', 'snop', 'sok'] },
  { osnova: 'zlato', izvedena: 'zlatan', uljezi: ['zlo', 'zmaj', 'znak'] },
  { osnova: 'vetar', izvedena: 'vetrovit', uljezi: ['vatra', 'vektor', 'večera'] },
  { osnova: 'zima', izvedena: 'zimski', uljezi: ['zid', 'zig', 'zamak'] },
  { osnova: 'cvet', izvedena: 'cvetni', uljezi: ['svet', 'vetar', 'cirkus'] },
  { osnova: 'zvezda', izvedena: 'zvezdani', uljezi: ['znoj', 'zavoj', 'zamajac'] },
  { osnova: 'račun', izvedena: 'računar', uljezi: ['račva', 'ručak', 'rečnik'] },
]

interface HomonimZnacenje {
  kontekst: string
  znacenje: string
  // Težina značenja: osnovna (4) ili ređa/prelazna (5)
  nivo: 4 | 5
}

interface Homonim {
  rec: string
  znacenja: HomonimZnacenje[]
  uljezi: string[]
}

const HOMONIMI: Homonim[] = [
  {
    rec: 'kosa',
    znacenja: [
      { kontekst: 'Devojčica ima dugu plavu kosu.', znacenje: 'dlake na glavi', nivo: 4 },
      { kontekst: 'Deda oštri kosu za travu.', znacenje: 'poljoprivredna alatka', nivo: 4 },
      { kontekst: 'Spustili smo se niz planinsku kosu.', znacenje: 'nagnuta strana brda', nivo: 5 },
    ],
    uljezi: ['ptica letačica', 'vrsta drveta', 'deo nameštaja'],
  },
  {
    rec: 'luk',
    znacenja: [
      { kontekst: 'Za ručak smo jeli crni luk.', znacenje: 'vrsta povrća', nivo: 4 },
      { kontekst: 'Strelac je zategao luk i strelu.', znacenje: 'oružje za gađanje', nivo: 4 },
      { kontekst: 'Vojnici su ušli kroz slavoluk tvrđave.', znacenje: 'polukružni svod', nivo: 5 },
    ],
    uljezi: ['životinja', 'vrsta alata', 'vremenska pojava'],
  },
  {
    rec: 'grad',
    znacenja: [
      { kontekst: 'Kupili smo stan u velikom gradu.', znacenje: 'naselje', nivo: 4 },
      { kontekst: 'Snažan grad je uništio useve.', znacenje: 'vremenska nepogoda (led)', nivo: 5 },
    ],
    uljezi: ['vrsta zgrade', 'životinja', 'poljoprivredna mašina'],
  },
  {
    rec: 'jezik',
    znacenja: [
      { kontekst: 'Ugrizla sam se za jezik.', znacenje: 'deo tela (organ u usnoj duplji)', nivo: 4 },
      { kontekst: 'Srpski jezik mi je maternji.', znacenje: 'sredstvo za sporazumevanje', nivo: 4 },
      { kontekst: 'Jezik zvona se pokvario pa zvono ne zvoni.', znacenje: 'deo aparata koji udara', nivo: 5 },
    ],
    uljezi: ['vrsta obuće', 'životinja', 'vrsta hrane'],
  },
  {
    rec: 'list',
    znacenja: [
      { kontekst: 'Jesenji list je pao sa drveta.', znacenje: 'deo biljke', nivo: 4 },
      { kontekst: 'Otvorio je svesku na prvom listu.', znacenje: 'strana knjige ili sveske', nivo: 4 },
      { kontekst: 'Riba je mahnula repom, a pas svojim listom.', znacenje: 'deo tela životinje', nivo: 5 },
    ],
    uljezi: ['vrsta nameštaja', 'poljoprivredna alatka', 'vrsta hrane'],
  },
  {
    rec: 'glava',
    znacenja: [
      { kontekst: 'Glava me boli od učenja.', znacenje: 'deo tela', nivo: 4 },
      { kontekst: 'Glava sela je sazvala sastanak.', znacenje: 'predsednik, vođa', nivo: 5 },
      { kontekst: 'Češalj je izgubio jednu glavu.', znacenje: 'gornji deo predmeta', nivo: 5 },
    ],
    uljezi: ['vrsta odeće', 'životinja', 'vrsta alata'],
  },
  {
    rec: 'pero',
    znacenja: [
      { kontekst: 'Upravio je domaći hemijskim perom.', znacenje: 'sredstvo za pisanje', nivo: 4 },
      { kontekst: 'Paun je raširio svoja šarena pera.', znacenje: 'pokrovče na telu ptice', nivo: 4 },
      { kontekst: 'Vetar je zaigrao perom drveta.', znacenje: 'list drveta (pesnički)', nivo: 5 },
    ],
    uljezi: ['deo obuće', 'vrsta alata', 'vrsta hrane'],
  },
  {
    rec: 'noga',
    znacenja: [
      { kontekst: 'Noga mi je zaspala od sedenja.', znacenje: 'deo tela', nivo: 4 },
      { kontekst: 'Stolica se klati jer je jedna noga kratka.', znacenje: 'deo nameštaja', nivo: 5 },
    ],
    uljezi: ['deo odeće', 'životinja', 'vrsta alata'],
  },
]

export const srpskiRecnik4: TopicGenerator = {
  slug: 'srpski-recnik-4',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty <= 2) {
      // Složene reči
      const slozena = izaberi(rng, SLOZENE_RECI)
      const traziDelove = rng() < 0.5
      const signature = `srpski-recnik-4:slozena:${slozena.rec}:${traziDelove ? 'delovi' : 'rec'}`
      if (taken.has(signature)) return null

      if (traziDelove) {
        return upakujSrpskiIzbor(cfg, rng, {
          pitanje: `Od kojih reči je nastala složenica „${slozena.rec}“?`,
          tacan: slozena.delovi,
          netacni: slozena.uljezi,
          tvrdnja: (odgovor) => `Složenica „${slozena.rec}“ nastala je od reči: ${odgovor}.`,
          explanation: `Složenica „${slozena.rec}“ je spoj reči ${slozena.delovi}.`,
          hint: 'Složene reči nastaju spajanjem dve posebne reči u jednu novu reč.',
          signature,
        })
      } else {
        return upakujSrpskiIzbor(cfg, rng, {
          pitanje: `Koja složena reč nastaje spajanjem: ${slozena.delovi}?`,
          tacan: slozena.rec,
          netacni: SLOZENE_RECI.filter(s => s.rec !== slozena.rec).map(s => s.rec),
          tvrdnja: (odgovor) => `Spajanjem ovih reči nastaje reč „${odgovor}“.`,
          explanation: `Spajanjem dobijamo reč „${slozena.rec}“.`,
          hint: 'Spoj ove dve reči u jednu.',
          signature,
        })
      }
    }

    if (cfg.difficulty === 3) {
      // Izvedene reči
      const izvedena = izaberi(rng, IZVEDENE_RECI)
      const signature = `srpski-recnik-4:izvedena:${izvedena.osnova}`
      if (taken.has(signature)) return null

      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Koja od navedenih reči pripada porodici reči čija je osnova „${izvedena.osnova}“?`,
        tacan: izvedena.izvedena,
        netacni: izvedena.uljezi,
        tvrdnja: (odgovor) => `Reč „${odgovor}“ pripada ovoj porodici reči.`,
        explanation: `Reč „${izvedena.izvedena}“ izvedena je od osnove „${izvedena.osnova}“.`,
        hint: 'Izvedene reči nastaju dodavanjem nastavaka na osnovnu reč.',
        signature,
      })
    }

    // Nivo 4 i 5: Homonimi (reči sa više značenja) — osnovna, odnosno ređa značenja
    const dostupnaZnacenja = HOMONIMI.map((homonim) => ({
      homonim,
      znacenja: homonim.znacenja.filter((znacenje) => znacenje.nivo === cfg.difficulty),
    })).filter((red) => red.znacenja.length > 0)
    const red = izaberi(rng, dostupnaZnacenja)
    const homonim = red.homonim
    const znacenje = izaberi(rng, red.znacenja)
    const signature = `srpski-recnik-4:homonim:${homonim.rec}:${znacenje.znacenje}`
    if (taken.has(signature)) return null

    const svaOstalaZnacenja = homonim.znacenja.filter(z => z.znacenje !== znacenje.znacenje).map(z => z.znacenje)
    const sviUljezi = [...svaOstalaZnacenja, ...homonim.uljezi]

    return upakujSrpskiIzbor(cfg, rng, {
      pitanje: `Šta znači reč „${homonim.rec}“ u sledećoj rečenici?\n„${znacenje.kontekst}“`,
      tacan: znacenje.znacenje,
      netacni: sviUljezi,
      tvrdnja: (odgovor) => `U ovoj rečenici, reč „${homonim.rec}“ označava ${odgovor}.`,
      explanation: `U ovom kontekstu, „${homonim.rec}“ znači ${znacenje.znacenje}.`,
      hint: 'Reči koje se isto pišu i izgovaraju mogu imati potpuno različita značenja zavisno od rečenice.',
      signature,
    })
  },
}
