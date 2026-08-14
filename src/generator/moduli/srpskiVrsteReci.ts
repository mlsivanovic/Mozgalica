// Generator: vrste reči — određivanje vrste (ukucavanjem) i prebrojavanje
// u rečenici (brojčanim unosom). Povremeno tačno/netačno tvrdnja o vrsti.
import { izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from './srpskiZajednicko.ts'

type VrstaReci = 'imenica' | 'glagol' | 'pridev'

interface PrimerReci {
  rec: string
  recenica: string
  vrsta: VrstaReci
}

const PRIMERI: PrimerReci[] = [
  // Imenice
  { rec: 'škola', recenica: 'Nova škola ima veliko dvorište.', vrsta: 'imenica' },
  { rec: 'lastavica', recenica: 'Lastavica leti iznad krova.', vrsta: 'imenica' },
  { rec: 'olovka', recenica: 'Plava olovka je na stolu.', vrsta: 'imenica' },
  { rec: 'prijatelj', recenica: 'Moj prijatelj čuva psa.', vrsta: 'imenica' },
  { rec: 'reka', recenica: 'Hladna reka protiče kroz selo.', vrsta: 'imenica' },
  { rec: 'prozor', recenica: 'Otvoren prozor gleda na ulicu.', vrsta: 'imenica' },
  { rec: 'lekar', recenica: 'Dežurni lekar pregleda pacijenta.', vrsta: 'imenica' },
  { rec: 'pesak', recenica: 'Mokri pesak leži pored vode.', vrsta: 'imenica' },
  { rec: 'planina', recenica: 'Visoka planina je prekrivena snegom.', vrsta: 'imenica' },
  { rec: 'radost', recenica: 'Iskrena radost vidi se na njihovim licima.', vrsta: 'imenica' },
  { rec: 'sveska', recenica: 'Nova sveska stoji na polici.', vrsta: 'imenica' },
  { rec: 'torba', recenica: 'Teška torba je na podu.', vrsta: 'imenica' },
  { rec: 'sunce', recenica: 'Toplo sunce sija na nebu.', vrsta: 'imenica' },
  { rec: 'drvo', recenica: 'Staro drvo raste pored ograde.', vrsta: 'imenica' },
  { rec: 'knjiga', recenica: 'Zanimljiva knjiga je otvorena.', vrsta: 'imenica' },

  // Glagoli
  { rec: 'čita', recenica: 'Mina pažljivo čita priču.', vrsta: 'glagol' },
  { rec: 'skače', recenica: 'Veseli zec skače po livadi.', vrsta: 'glagol' },
  { rec: 'peva', recenica: 'Mala ptica peva na grani.', vrsta: 'glagol' },
  { rec: 'crta', recenica: 'Luka crta visoku kuću.', vrsta: 'glagol' },
  { rec: 'spava', recenica: 'Umorni mačak spava kraj peći.', vrsta: 'glagol' },
  { rec: 'raste', recenica: 'Mlado drvo raste u parku.', vrsta: 'glagol' },
  { rec: 'misli', recenica: 'Dečak dugo misli o zadatku.', vrsta: 'glagol' },
  { rec: 'putuje', recenica: 'Moja porodica sutra putuje na more.', vrsta: 'glagol' },
  { rec: 'trči', recenica: 'Brzi konj trči preko poljane.', vrsta: 'glagol' },
  { rec: 'kuva', recenica: 'Vredna baka kuva ukusan ručak.', vrsta: 'glagol' },
  { rec: 'piše', recenica: 'Učenik pažljivo piše domaći zadatak.', vrsta: 'glagol' },
  { rec: 'svira', recenica: 'Devojčica lepo svira klavir.', vrsta: 'glagol' },
  { rec: 'pliva', recenica: 'Mali pas veselo pliva u reci.', vrsta: 'glagol' },
  { rec: 'leti', recenica: 'Šareni avion visoko leti iznad oblaka.', vrsta: 'glagol' },
  { rec: 'gradi', recenica: 'Vredni zidar gradi novu zgradu.', vrsta: 'glagol' },

  // Pridevi
  { rec: 'veseo', recenica: 'Veseo dečak nosi ranac.', vrsta: 'pridev' },
  { rec: 'mirisna', recenica: 'Mirisna ruža cveta u bašti.', vrsta: 'pridev' },
  { rec: 'duboko', recenica: 'Duboko jezero je veoma hladno.', vrsta: 'pridev' },
  { rec: 'drvena', recenica: 'Drvena klupa stoji ispod lipe.', vrsta: 'pridev' },
  { rec: 'brzi', recenica: 'Brzi voz prolazi kroz tunel.', vrsta: 'pridev' },
  { rec: 'zlatna', recenica: 'Zlatna zvezda sija na ukrasu.', vrsta: 'pridev' },
  { rec: 'pametan', recenica: 'Pametan pas lako uči trikove.', vrsta: 'pridev' },
  { rec: 'hrabar', recenica: 'Hrabar vatrogasac gasi šumski požar.', vrsta: 'pridev' },
  { rec: 'čista', recenica: 'Čista voda teče iz planinskog izvora.', vrsta: 'pridev' },
  { rec: 'hladna', recenica: 'Hladna zima donosi puno snega.', vrsta: 'pridev' },
  { rec: 'šareni', recenica: 'Šareni leptir sleće na cvet.', vrsta: 'pridev' },
  { rec: 'stari', recenica: 'Stari sat kuca na zidu.', vrsta: 'pridev' },
  { rec: 'zelena', recenica: 'Zelena trava raste posle kiše.', vrsta: 'pridev' },
  { rec: 'težak', recenica: 'Težak džak leži na kolicima.', vrsta: 'pridev' },
  { rec: 'slatka', recenica: 'Slatka kruška je pala sa grane.', vrsta: 'pridev' },
]

interface AnalizaRecenice {
  tekst: string
  imenice: number
  glagoli: number
  pridevi: number
}

const ANALIZE: AnalizaRecenice[] = [
  { tekst: 'Mala ptica peva.', imenice: 1, glagoli: 1, pridevi: 1 },
  { tekst: 'Veseli pas trči.', imenice: 1, glagoli: 1, pridevi: 1 },
  { tekst: 'Ana čita zanimljivu knjigu.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Stari hrast zaklanja kuću.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Hladan vetar njiše grane.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Miloš nosi težak ranac.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Crvena jabuka miriše.', imenice: 1, glagoli: 1, pridevi: 1 },
  { tekst: 'Učenici pišu kratke priče.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Sunce greje zelenu livadu.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Spretna veverica skuplja orahe.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Hrabar vojnik brani zemlju.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Baka kuva toplu supu.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Vredni mravi nose hranu.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Milica crta šareni cvet.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Mlad dečak vozi bicikl.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Marko sluša glasnu muziku.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Visok toranj krasi grad.', imenice: 2, glagoli: 1, pridevi: 1 },
  { tekst: 'Plavi kit roni.', imenice: 1, glagoli: 1, pridevi: 1 },
]

const VRSTE = ['imenica', 'glagol', 'pridev', 'zamenica']

// Genitivni oblik za pitanje „Koliko … ima…“
const VRSTA_U_PITANJU = { imenice: 'imenica', glagoli: 'glagola', pridevi: 'prideva' } as const

export const srpskiVrsteReci: TopicGenerator = {
  slug: 'srpski-vrste-reci',
  supportedTypes: ['text', 'numeric', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.type === 'numeric' || (cfg.type === 'auto' && rng() < 0.3)) {
      const analiza = izaberi(rng, ANALIZE)
      const vrsta = izaberi(rng, ['imenice', 'glagoli', 'pridevi'] as const)
      const tacanBroj = analiza[vrsta]
      const signature = `srpski-vrste-reci:broj:${analiza.tekst}:${vrsta}`
      if (taken.has(signature)) return null
      return {
        type: 'numeric',
        text: `Koliko ${VRSTA_U_PITANJU[vrsta]} ima u rečenici „${analiza.tekst}“?`,
        options: null,
        correct: { value: tacanBroj },
        explanation: `Tačan odgovor je ${tacanBroj}.`,
        hint: 'Najpre razvrstaj svaku reč, pa prebroj samo traženu vrstu.',
        points: 5,
        topicSlug: cfg.topicSlug,
        difficulty: 5,
        signature,
      }
    }

    const primer = izaberi(rng, PRIMERI)
    const signature = `srpski-vrste-reci:kontekst:${primer.rec}`
    if (taken.has(signature)) return null

    if (hoceTvrdnju(cfg, rng)) {
      const pogresnaVrsta = izaberi(rng, VRSTE.filter((vrsta) => vrsta !== primer.vrsta))
      return upakujSrpskiTvrdnju(cfg, rng, {
        tvrdnjaTacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${primer.vrsta}.`,
        tvrdnjaNetacna: `U rečenici „${primer.recenica}“ reč „${primer.rec}“ je ${pogresnaVrsta}.`,
        explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`,
        hint: null,
        signature,
      })
    }

    return upakujSrpskiTekst(cfg, {
      pitanje: `Kojoj vrsti reči pripada reč „${primer.rec}“ u rečenici „${primer.recenica}“? (upiši vrstu)`,
      tacan: primer.vrsta,
      explanation: `Reč „${primer.rec}“ je ${primer.vrsta}.`,
      hint: primer.vrsta === 'imenica'
        ? 'Imenice imenuju bića, predmete i pojave.'
        : primer.vrsta === 'glagol'
          ? 'Glagoli označavaju radnju, stanje ili zbivanje.'
          : 'Pridevi bliže opisuju imenice.',
      signature,
    })
  },
}
