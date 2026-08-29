// Generator: vrste i podvrste reči predviđene programom za 3. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from './srpskiZajednicko.ts'

type VrstaReci = 'imenica' | 'glagol' | 'pridev' | 'lična zamenica'

const PRIMERI: Array<{ rec: string; recenica: string; vrsta: VrstaReci }> = [
  { rec: 'škola', recenica: 'Nova škola ima veliko dvorište.', vrsta: 'imenica' },
  { rec: 'pesak', recenica: 'Sitni pesak prekriva obalu.', vrsta: 'imenica' },
  { rec: 'lišće', recenica: 'Žuto lišće pada na stazu.', vrsta: 'imenica' },
  { rec: 'čita', recenica: 'Mina pažljivo čita priču.', vrsta: 'glagol' },
  { rec: 'putuju', recenica: 'Oni sutra putuju na more.', vrsta: 'glagol' },
  { rec: 'raste', recenica: 'Mlado drvo raste u parku.', vrsta: 'glagol' },
  { rec: 'drvena', recenica: 'Drvena klupa stoji ispod lipe.', vrsta: 'pridev' },
  { rec: 'Milanov', recenica: 'Milanov ranac je kraj klupe.', vrsta: 'pridev' },
  { rec: 'vesela', recenica: 'Vesela devojčica peva.', vrsta: 'pridev' },
  { rec: 'ja', recenica: 'Ja svakog dana čitam.', vrsta: 'lična zamenica' },
  { rec: 'ona', recenica: 'Ona pažljivo zaliva cveće.', vrsta: 'lična zamenica' },
  { rec: 'mi', recenica: 'Mi uređujemo učionicu.', vrsta: 'lična zamenica' },
]

const PODVRSTE = [
  { rec: 'dečak', recenica: 'Dečak nosi ranac.', podvrsta: 'zajednička imenica' },
  { rec: 'Milica', recenica: 'Milica čita knjigu.', podvrsta: 'vlastita imenica' },
  { rec: 'brašno', recenica: 'Brašno je u posudi.', podvrsta: 'gradivna imenica' },
  { rec: 'pesak', recenica: 'Pesak se prosuo.', podvrsta: 'gradivna imenica' },
  { rec: 'lišće', recenica: 'Lišće šušti pod nogama.', podvrsta: 'zbirna imenica' },
  { rec: 'cveće', recenica: 'Cveće miriše u vazi.', podvrsta: 'zbirna imenica' },
  { rec: 'visoka', recenica: 'Visoka zgrada zaklanja sunce.', podvrsta: 'opisni pridev' },
  { rec: 'veselo', recenica: 'Veselo dete se igra.', podvrsta: 'opisni pridev' },
  { rec: 'Anina', recenica: 'Anina sveska je uredna.', podvrsta: 'prisvojni pridev' },
  { rec: 'dečakov', recenica: 'Dečakov bicikl je plav.', podvrsta: 'prisvojni pridev' },
  { rec: 'staklena', recenica: 'Staklena čaša je na stolu.', podvrsta: 'gradivni pridev' },
  { rec: 'vuneni', recenica: 'Vuneni šal je topao.', podvrsta: 'gradivni pridev' },
] as const

const ANALIZE = [
  { tekst: 'Mala ptica peva.', imenice: 1, glagoli: 1, pridevi: 1, zamenice: 0 },
  { tekst: 'Ona čita zanimljivu knjigu.', imenice: 1, glagoli: 1, pridevi: 1, zamenice: 1 },
  { tekst: 'Mi sadimo mlado drvo.', imenice: 1, glagoli: 1, pridevi: 1, zamenice: 1 },
  { tekst: 'Miloš nosi težak ranac.', imenice: 2, glagoli: 1, pridevi: 1, zamenice: 0 },
  { tekst: 'Vredni učenici pišu kratke priče.', imenice: 2, glagoli: 1, pridevi: 2, zamenice: 0 },
  { tekst: 'Oni pažljivo slušaju novu pesmu.', imenice: 1, glagoli: 1, pridevi: 1, zamenice: 1 },
] as const

const VRSTE: VrstaReci[] = ['imenica', 'glagol', 'pridev', 'lična zamenica']
const BROJ_NAZIV = { imenice: 'imenica', glagoli: 'glagola', pridevi: 'prideva', zamenice: 'ličnih zamenica' } as const

export const srpskiVrsteReci: TopicGenerator = {
  slug: 'srpski-vrste-reci', supportedTypes: ['text', 'numeric', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.type === 'numeric' || (cfg.type === 'auto' && rng() < 0.25)) {
      const analiza = izaberi(rng, ANALIZE)
      const vrsta = izaberi(rng, ['imenice', 'glagoli', 'pridevi', 'zamenice'] as const)
      const signature = `srpski-vrste-reci:brojanje:${analiza.tekst}:${vrsta}`
      if (taken.has(signature)) return null
      return { type: 'numeric', text: `Koliko ${BROJ_NAZIV[vrsta]} ima u rečenici „${analiza.tekst}“?`, options: null,
        correct: { value: analiza[vrsta] }, explanation: `Tačan odgovor je ${analiza[vrsta]}.`, hint: 'Razvrstaj reči, pa prebroj samo traženu vrstu.',
        points: 5, topicSlug: cfg.topicSlug, difficulty: 5, signature }
    }
    if (rng() < 0.45) {
      const primer = izaberi(rng, PODVRSTE)
      const signature = `srpski-vrste-reci:podvrsta:${primer.rec}`
      if (taken.has(signature)) return null
      if (hoceTvrdnju(cfg, rng)) {
        const pogresna = izaberi(rng, PODVRSTE.map((p) => p.podvrsta).filter((p) => p !== primer.podvrsta))
        return upakujSrpskiTvrdnju(cfg, rng, { tvrdnjaTacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${primer.podvrsta}.`,
          tvrdnjaNetacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${pogresna}.`, explanation: `Reč „${primer.rec}“ je ${primer.podvrsta}.`, hint: null, signature })
      }
      return upakujSrpskiTekst(cfg, { pitanje: `Kojoj podvrsti pripada reč „${primer.rec}“ u rečenici „${primer.recenica}“?`, tacan: primer.podvrsta,
        explanation: `Reč „${primer.rec}“ je ${primer.podvrsta}.`, hint: 'Odredi najpre da li je reč imenica ili pridev, pa zatim njenu podvrstu.', signature })
    }
    const primer = izaberi(rng, PRIMERI)
    const signature = `srpski-vrste-reci:vrsta:${primer.rec}:${primer.recenica}`
    if (taken.has(signature)) return null
    if (hoceTvrdnju(cfg, rng)) {
      const pogresna = izaberi(rng, VRSTE.filter((vrsta) => vrsta !== primer.vrsta))
      return upakujSrpskiTvrdnju(cfg, rng, { tvrdnjaTacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${primer.vrsta}.`,
        tvrdnjaNetacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${pogresna}.`, explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`, hint: null, signature })
    }
    return upakujSrpskiTekst(cfg, { pitanje: `Kojoj vrsti reči pripada reč „${primer.rec}“ u rečenici „${primer.recenica}“?`, tacan: primer.vrsta,
      prihvaceni: primer.vrsta === 'lična zamenica' ? ['zamenica'] : undefined, explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`,
      hint: 'Odredi šta reč označava i kakvu ulogu ima uz druge reči.', signature })
  },
}
