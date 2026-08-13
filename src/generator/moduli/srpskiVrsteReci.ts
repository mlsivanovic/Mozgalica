// Generator: vrste reči — imenice, glagoli i pridevi u jasnom kontekstu.
import { ceoBroj, izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujSrpskiIzbor } from './srpskiZajednicko.ts'

type VrstaReci = 'imenica' | 'glagol' | 'pridev'

interface PrimerReci {
  rec: string
  recenica: string
  vrsta: VrstaReci
}

const PRIMERI: PrimerReci[] = [
  { rec: 'škola', recenica: 'Nova škola ima veliko dvorište.', vrsta: 'imenica' },
  { rec: 'lastavica', recenica: 'Lastavica leti iznad krova.', vrsta: 'imenica' },
  { rec: 'olovka', recenica: 'Plava olovka je na stolu.', vrsta: 'imenica' },
  { rec: 'prijatelj', recenica: 'Moj prijatelj čuva psa.', vrsta: 'imenica' },
  { rec: 'reka', recenica: 'Hladna reka protiče kroz selo.', vrsta: 'imenica' },
  { rec: 'prozor', recenica: 'Otvoren prozor gleda na ulicu.', vrsta: 'imenica' },
  { rec: 'čita', recenica: 'Mina pažljivo čita priču.', vrsta: 'glagol' },
  { rec: 'skače', recenica: 'Veseli zec skače po livadi.', vrsta: 'glagol' },
  { rec: 'peva', recenica: 'Mala ptica peva na grani.', vrsta: 'glagol' },
  { rec: 'crta', recenica: 'Luka crta visoku kuću.', vrsta: 'glagol' },
  { rec: 'spava', recenica: 'Umorni mačak spava kraj peći.', vrsta: 'glagol' },
  { rec: 'raste', recenica: 'Mlado drvo raste u parku.', vrsta: 'glagol' },
  { rec: 'veseo', recenica: 'Veseo dečak nosi ranac.', vrsta: 'pridev' },
  { rec: 'mirisna', recenica: 'Mirisna ruža cveta u bašti.', vrsta: 'pridev' },
  { rec: 'duboko', recenica: 'Duboko jezero je veoma hladno.', vrsta: 'pridev' },
  { rec: 'drvena', recenica: 'Drvena klupa stoji ispod lipe.', vrsta: 'pridev' },
  { rec: 'brzi', recenica: 'Brzi voz prolazi kroz tunel.', vrsta: 'pridev' },
  { rec: 'zlatna', recenica: 'Zlatna zvezda sija na ukrasu.', vrsta: 'pridev' },
]

interface AnalizaRecenice {
  tekst: string
  imenice: number
  glagoli: number
  pridevi: number
  redosled: string
}

const ANALIZE: AnalizaRecenice[] = [
  { tekst: 'Mala ptica peva.', imenice: 1, glagoli: 1, pridevi: 1, redosled: 'pridev — imenica — glagol' },
  { tekst: 'Veseli pas trči.', imenice: 1, glagoli: 1, pridevi: 1, redosled: 'pridev — imenica — glagol' },
  { tekst: 'Ana čita zanimljivu knjigu.', imenice: 2, glagoli: 1, pridevi: 1, redosled: 'imenica — glagol — pridev — imenica' },
  { tekst: 'Stari hrast zaklanja kuću.', imenice: 2, glagoli: 1, pridevi: 1, redosled: 'pridev — imenica — glagol — imenica' },
  { tekst: 'Hladan vetar njiše grane.', imenice: 2, glagoli: 1, pridevi: 1, redosled: 'pridev — imenica — glagol — imenica' },
  { tekst: 'Miloš nosi težak ranac.', imenice: 2, glagoli: 1, pridevi: 1, redosled: 'imenica — glagol — pridev — imenica' },
  { tekst: 'Crvena jabuka miriše.', imenice: 1, glagoli: 1, pridevi: 1, redosled: 'pridev — imenica — glagol' },
  { tekst: 'Učenici pišu kratke priče.', imenice: 2, glagoli: 1, pridevi: 1, redosled: 'imenica — glagol — pridev — imenica' },
  { tekst: 'Sunce greje zelenu livadu.', imenice: 2, glagoli: 1, pridevi: 1, redosled: 'imenica — glagol — pridev — imenica' },
  { tekst: 'Spretna veverica skuplja orahe.', imenice: 2, glagoli: 1, pridevi: 1, redosled: 'pridev — imenica — glagol — imenica' },
]

const VRSTE = ['imenica', 'glagol', 'pridev', 'zamenica']

export const srpskiVrsteReci: TopicGenerator = {
  slug: 'srpski-vrste-reci',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty <= 3) {
      const primer = izaberi(rng, PRIMERI)
      const uKontekstu = cfg.difficulty >= 2
      const signature = `srpski-vrste-reci:${uKontekstu ? 'kontekst' : 'rec'}:${primer.rec}`
      if (taken.has(signature)) return null
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: uKontekstu
          ? `Kojoj vrsti reči pripada istaknuta reč u rečenici „${primer.recenica}“ — „${primer.rec}“?`
          : `Kojoj vrsti reči pripada reč „${primer.rec}“?`,
        tacan: primer.vrsta,
        netacni: VRSTE.filter((vrsta) => vrsta !== primer.vrsta),
        tvrdnja: (odgovor) => `Reč „${primer.rec}“ u rečenici „${primer.recenica}“ jeste ${odgovor}.`,
        explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`,
        hint: primer.vrsta === 'imenica'
          ? 'Imenice imenuju bića, predmete i pojave.'
          : primer.vrsta === 'glagol'
            ? 'Glagoli označavaju radnju, stanje ili zbivanje.'
            : 'Pridevi bliže opisuju imenice.',
        signature,
      })
    }

    const analiza = izaberi(rng, ANALIZE)
    if (cfg.difficulty === 4) {
      const vrsta = izaberi(rng, ['imenice', 'glagoli', 'pridevi'] as const)
      const tacanBroj = String(analiza[vrsta])
      const signature = `srpski-vrste-reci:broj:${analiza.tekst}:${vrsta}`
      if (taken.has(signature)) return null
      return upakujSrpskiIzbor(cfg, rng, {
        pitanje: `Koliko ${vrsta} ima u rečenici „${analiza.tekst}“?`,
        tacan: tacanBroj,
        netacni: ['0', '1', '2', '3'].filter((broj) => broj !== tacanBroj),
        tvrdnja: (odgovor) => `U rečenici „${analiza.tekst}“ ima ${odgovor} ${vrsta}.`,
        explanation: `U rečenici ima ${tacanBroj} ${vrsta}.`,
        hint: 'Najpre razvrstaj svaku reč, pa prebroj samo traženu vrstu.',
        signature,
      })
    }

    const signature = `srpski-vrste-reci:redosled:${analiza.tekst}`
    if (taken.has(signature)) return null
    const netacni = [
      'imenica — pridev — glagol',
      'imenica — glagol — imenica — pridev',
      'pridev — glagol — imenica',
      'glagol — imenica — pridev — imenica',
    ].filter((odgovor) => odgovor !== analiza.redosled)
    while (netacni.length < 3) netacni.push(`imenica — glagol — ${ceoBroj(rng, 2, 4)} prideva`)
    return upakujSrpskiIzbor(cfg, rng, {
      pitanje: `Koji niz pravilno opisuje vrste reči redom u rečenici „${analiza.tekst}“?`,
      tacan: analiza.redosled,
      netacni,
      tvrdnja: (odgovor) => `Niz vrsta reči u rečenici „${analiza.tekst}“ glasi: ${odgovor}.`,
      explanation: `Tačan redosled je: ${analiza.redosled}.`,
      hint: 'Odredi vrstu svake reči redom, s leva nadesno.',
      signature,
    })
  },
}
