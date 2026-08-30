// Generator: vrste reči predviđene programom za 2. razred.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

type VrstaReci = 'imenica' | 'glagol' | 'opisni pridev' | 'broj'

const PRIMERI: Array<{ rec: string; recenica: string; vrsta: VrstaReci }> = [
  { rec: 'škola', recenica: 'Nova škola ima veliko dvorište.', vrsta: 'imenica' },
  { rec: 'lopta', recenica: 'Crvena lopta leži u travi.', vrsta: 'imenica' },
  { rec: 'reka', recenica: 'Bistra reka teče kroz selo.', vrsta: 'imenica' },
  { rec: 'ptica', recenica: 'Mala ptica peva na grani.', vrsta: 'imenica' },
  { rec: 'čita', recenica: 'Mina pažljivo čita priču.', vrsta: 'glagol' },
  { rec: 'trči', recenica: 'Dečak brzo trči stazom.', vrsta: 'glagol' },
  { rec: 'crta', recenica: 'Lena lepo crta kuću.', vrsta: 'glagol' },
  { rec: 'peva', recenica: 'Dete veselo peva pesmu.', vrsta: 'glagol' },
  { rec: 'crvena', recenica: 'Crvena lopta leži u travi.', vrsta: 'opisni pridev' },
  { rec: 'visoka', recenica: 'Visoka trava raste uz ogradu.', vrsta: 'opisni pridev' },
  { rec: 'topla', recenica: 'Topla čorba stoji na stolu.', vrsta: 'opisni pridev' },
  { rec: 'vesela', recenica: 'Vesela devojčica skače.', vrsta: 'opisni pridev' },
  { rec: 'tri', recenica: 'Na stolu stoje tri sveske.', vrsta: 'broj' },
  { rec: 'pet', recenica: 'U korpi ima pet jabuka.', vrsta: 'broj' },
  { rec: 'prvi', recenica: 'Prvi učenik otvara vrata.', vrsta: 'broj' },
  { rec: 'drugi', recenica: 'Drugi red je prazan.', vrsta: 'broj' },
]

const IMENICE = [
  { rec: 'dečak', recenica: 'Dečak nosi ranac.', podvrsta: 'zajednička imenica' },
  { rec: 'škola', recenica: 'Škola počinje ujutru.', podvrsta: 'zajednička imenica' },
  { rec: 'reka', recenica: 'Reka teče kroz polje.', podvrsta: 'zajednička imenica' },
  { rec: 'ptica', recenica: 'Ptica sedi na grani.', podvrsta: 'zajednička imenica' },
  { rec: 'knjiga', recenica: 'Knjiga je na polici.', podvrsta: 'zajednička imenica' },
  { rec: 'selo', recenica: 'Selo ima malu školu.', podvrsta: 'zajednička imenica' },
  { rec: 'Milica', recenica: 'Milica čita knjigu.', podvrsta: 'vlastita imenica' },
  { rec: 'Luka', recenica: 'Luka crta brod.', podvrsta: 'vlastita imenica' },
  { rec: 'Beograd', recenica: 'Beograd je veliki grad.', podvrsta: 'vlastita imenica' },
  { rec: 'Sava', recenica: 'Sava teče kroz ravnicu.', podvrsta: 'vlastita imenica' },
  { rec: 'Ana', recenica: 'Ana zaliva cveće.', podvrsta: 'vlastita imenica' },
  { rec: 'Niš', recenica: 'Niš je stari grad.', podvrsta: 'vlastita imenica' },
] as const

const BROJEVI = [
  { rec: 'jedan', recenica: 'Imam jedan ranac.', vrsta: 'osnovni broj' },
  { rec: 'dva', recenica: 'Na stolu su dva pera.', vrsta: 'osnovni broj' },
  { rec: 'tri', recenica: 'Videla sam tri ptice.', vrsta: 'osnovni broj' },
  { rec: 'pet', recenica: 'U kutiji je pet kuglica.', vrsta: 'osnovni broj' },
  { rec: 'deset', recenica: 'Razred ima deset klupa.', vrsta: 'osnovni broj' },
  { rec: 'prvi', recenica: 'Prvi čas je matematika.', vrsta: 'redni broj' },
  { rec: 'drugi', recenica: 'Drugi dečak čeka u redu.', vrsta: 'redni broj' },
  { rec: 'treći', recenica: 'Treći sprat ima terasu.', vrsta: 'redni broj' },
  { rec: 'peti', recenica: 'Peti dan je petak.', vrsta: 'redni broj' },
  { rec: 'deseti', recenica: 'Deseti učenik otvara vrata.', vrsta: 'redni broj' },
] as const

const ANALIZE = [
  { tekst: 'Mala ptica peva.', imenice: 1, glagoli: 1, pridevi: 1, brojevi: 0 },
  { tekst: 'Crvena lopta skače.', imenice: 1, glagoli: 1, pridevi: 1, brojevi: 0 },
  { tekst: 'Tri ptice lete.', imenice: 1, glagoli: 1, pridevi: 0, brojevi: 1 },
  { tekst: 'Visoka trava raste.', imenice: 1, glagoli: 1, pridevi: 1, brojevi: 0 },
  { tekst: 'Pet knjiga stoji.', imenice: 1, glagoli: 1, pridevi: 0, brojevi: 1 },
  { tekst: 'Prvi učenik čita.', imenice: 1, glagoli: 1, pridevi: 0, brojevi: 1 },
] as const

const VRSTE: VrstaReci[] = ['imenica', 'glagol', 'opisni pridev', 'broj']
const BROJ_NAZIV = { imenice: 'imenica', glagoli: 'glagola', pridevi: 'opisnih prideva', brojevi: 'brojeva' } as const

export const srpskiVrsteReci2: TopicGenerator = {
  slug: 'srpski-vrste-reci-2', supportedTypes: ['text', 'numeric', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.type === 'numeric' || (cfg.type === 'auto' && rng() < 0.2)) {
      const analiza = izaberi(rng, ANALIZE)
      const vrsta = izaberi(rng, ['imenice', 'glagoli', 'pridevi', 'brojevi'] as const)
      const signature = `srpski-vrste-reci-2:brojanje:${analiza.tekst}:${vrsta}`
      if (taken.has(signature)) return null
      return {
        type: 'numeric', text: `Koliko ${BROJ_NAZIV[vrsta]} ima u rečenici „${analiza.tekst}“?`, options: null,
        correct: { value: analiza[vrsta] }, explanation: `Tačan odgovor je ${analiza[vrsta]}.`,
        hint: 'Razvrstaj reči, pa prebroj samo traženu vrstu.',
        points: 5, topicSlug: cfg.topicSlug, difficulty: 5, signature,
      }
    }
    const izbor = rng()
    if (izbor < 0.35) {
      const primer = izaberi(rng, IMENICE)
      const signature = `srpski-vrste-reci-2:imenica:${primer.rec}`
      if (taken.has(signature)) return null
      if (hoceTvrdnju(cfg, rng)) {
        const pogresna = primer.podvrsta === 'vlastita imenica' ? 'zajednička imenica' : 'vlastita imenica'
        return upakujSrpskiTvrdnju(cfg, rng, {
          tvrdnjaTacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${primer.podvrsta}.`,
          tvrdnjaNetacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${pogresna}.`,
          explanation: `Reč „${primer.rec}“ je ${primer.podvrsta}.`, hint: null, signature,
        })
      }
      return upakujSrpskiTekst(cfg, {
        pitanje: `Da li je reč „${primer.rec}“ u rečenici „${primer.recenica}“ vlastita ili zajednička imenica?`,
        tacan: primer.podvrsta, prihvaceni: primer.podvrsta === 'vlastita imenica' ? ['vlastita'] : ['zajednička'],
        explanation: `Reč „${primer.rec}“ je ${primer.podvrsta}.`,
        hint: 'Vlastita imenica je ime jednog bića ili mesta i piše se velikim slovom.', signature,
      })
    }
    if (izbor < 0.55) {
      const primer = izaberi(rng, BROJEVI)
      const signature = `srpski-vrste-reci-2:broj:${primer.rec}`
      if (taken.has(signature)) return null
      if (hoceTvrdnju(cfg, rng)) {
        const pogresna = primer.vrsta === 'osnovni broj' ? 'redni broj' : 'osnovni broj'
        return upakujSrpskiTvrdnju(cfg, rng, {
          tvrdnjaTacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${primer.vrsta}.`,
          tvrdnjaNetacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${pogresna}.`,
          explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`, hint: null, signature,
        })
      }
      return upakujSrpskiTekst(cfg, {
        pitanje: `Da li je reč „${primer.rec}“ u rečenici „${primer.recenica}“ osnovni ili redni broj?`,
        tacan: primer.vrsta, prihvaceni: primer.vrsta === 'osnovni broj' ? ['osnovni'] : ['redni'],
        explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`,
        hint: 'Osnovni broj kaže koliko, a redni koji po redu.', signature,
      })
    }
    const primer = izaberi(rng, PRIMERI)
    const signature = `srpski-vrste-reci-2:vrsta:${primer.rec}:${primer.recenica}`
    if (taken.has(signature)) return null
    if (hoceTvrdnju(cfg, rng)) {
      const pogresna = izaberi(rng, VRSTE.filter((vrsta) => vrsta !== primer.vrsta))
      return upakujSrpskiTvrdnju(cfg, rng, {
        tvrdnjaTacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${primer.vrsta}.`,
        tvrdnjaNetacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${pogresna}.`,
        explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`, hint: null, signature,
      })
    }
    return upakujSrpskiTekst(cfg, {
      pitanje: `Kojoj vrsti reči pripada reč „${primer.rec}“ u rečenici „${primer.recenica}“?`,
      tacan: primer.vrsta, prihvaceni: primer.vrsta === 'opisni pridev' ? ['pridev'] : undefined,
      explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`,
      hint: 'Imenica imenuje, glagol kaže šta se dešava, opisni pridev opisuje, a broj kaže koliko ili koji po redu.',
      signature,
    })
  },
}
