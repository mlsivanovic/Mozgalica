// Generator: rečnik 4. razred — složene reči, izvedene reči, homonimi (reči sa više značenja).
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from '../moduli/srpskiZajednicko.ts'

const SLOZENE_RECI = [
  { rec: 'Beograd', delovi: 'beo + grad', uljezi: ['beo + zgrada', 'beo + rad', 'bela + grad'] },
  { rec: 'suncokret', delovi: 'sunce + okret', uljezi: ['sunce + cvet', 'sunce + kretanje', 'suncobran'] },
  { rec: 'bubamara', delovi: 'buba + mara', uljezi: ['buba + švaba', 'buka + mara', 'buba + mrak'] },
  { rec: 'čuvarkuća', delovi: 'čuvar + kuća', uljezi: ['čuvati + kućicu', 'čuvar + pas', 'čuvanje + kuće'] },
  { rec: 'padobran', delovi: 'pad + braniti', uljezi: ['padati + brzo', 'pad + odbrana', 'padati + bran'] },
  { rec: 'crvenkapa', delovi: 'crven + kapa', uljezi: ['crvena + kaput', 'crven + kapljica', 'crno + kapa'] },
]

const IZVEDENE_RECI = [
  { osnova: 'zid', izvedena: 'zidar', uljezi: ['zima', 'zmija', 'zmaj'] },
  { osnova: 'riba', izvedena: 'ribar', uljezi: ['ribizla', 'rob', 'radnik'] },
  { osnova: 'drvo', izvedena: 'drvodelja', uljezi: ['društvo', 'dva', 'držač'] },
  { osnova: 'pek', izvedena: 'pekar', uljezi: ['peć', 'pet', 'perika'] },
  { osnova: 'šum', izvedena: 'šumar', uljezi: ['šumor', 'šala', 'šuma'] },
  { osnova: 'vod', izvedena: 'voden', uljezi: ['vođa', 'voz', 'volja'] },
  { osnova: 'kamen', izvedena: 'kamenit', uljezi: ['kamion', 'kamera', 'kamp'] },
  { osnova: 'sneg', izvedena: 'snežan', uljezi: ['san', 'snop', 'sok'] },
  { osnova: 'zlat', izvedena: 'zlatan', uljezi: ['zlo', 'zmaj', 'znak'] },
]

const HOMONIMI = [
  {
    rec: 'kosa',
    znacenja: [
      { kontekst: 'Devojčica ima dugu plavu kosu.', znacenje: 'dlake na glavi' },
      { kontekst: 'Deda oštri kosu za travu.', znacenje: 'poljoprivredna alatka' },
      { kontekst: 'Spustili smo se niz planinsku kosu.', znacenje: 'nagnuta strana brda' },
    ],
    uljezi: ['ptica letačica', 'vrsta drveta', 'deo nameštaja'],
  },
  {
    rec: 'luk',
    znacenja: [
      { kontekst: 'Za ručak smo jeli crni luk.', znacenje: 'vrsta povrća' },
      { kontekst: 'Strelac je zategao luk i strelu.', znacenje: 'oružje' },
      { kontekst: 'Prošli smo kroz slavoluk (luk).', znacenje: 'polukružni svod' },
    ],
    uljezi: ['životinja', 'vrsta alata', 'vremenska pojava'],
  },
  {
    rec: 'grad',
    znacenja: [
      { kontekst: 'Kupili smo stan u velikom gradu.', znacenje: 'naselje' },
      { kontekst: 'Snažan grad je uništio useve.', znacenje: 'vremenska nepogoda (led)' },
    ],
    uljezi: ['vrsta zgrade', 'životinja', 'poljoprivredna mašina'],
  },
  {
    rec: 'jezik',
    znacenja: [
      { kontekst: 'Ugrizla sam se za jezik.', znacenje: 'deo tela (organ u usnoj duplji)' },
      { kontekst: 'Srpski jezik mi je maternji.', znacenje: 'sredstvo za sporazumevanje' },
    ],
    uljezi: ['vrsta obuće', 'životinja', 'vrsta hrane'],
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
          netacni: SLOZENE_RECI.filter(s => s.rec !== slozena.rec).map(s => s.rec).slice(0, 3),
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

    // Nivo 4 i 5: Homonimi (reči sa više značenja)
    const homonim = izaberi(rng, HOMONIMI)
    const znacenje = izaberi(rng, homonim.znacenja)
    const signature = `srpski-recnik-4:homonim:${homonim.rec}:${znacenje.znacenje}`
    if (taken.has(signature)) return null

    const svaOstalaZnacenja = homonim.znacenja.filter(z => z.znacenje !== znacenje.znacenje).map(z => z.znacenje)
    const sviUljezi = [...svaOstalaZnacenja, ...homonim.uljezi].slice(0, 3)

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
