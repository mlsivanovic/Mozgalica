// Glavni ulaz generatora: registar modula po oblastima + petlja generisanja
import { napraviRng } from './random.ts'
import type { GeneratorConfig, GenerisanoPitanje, RezultatGenerisanja, TopicGenerator } from './types.ts'
import { deljenje } from './moduli/deljenje.ts'
import { jednacine } from './moduli/jednacine.ts'
import { jedinice } from './moduli/jedinice.ts'
import { kombinovane } from './moduli/kombinovane.ts'
import { mnozenje } from './moduli/mnozenje.ts'
import { nejednacine } from './moduli/nejednacine.ts'
import { nizovi } from './moduli/nizovi.ts'
import { novac } from './moduli/novac.ts'
import { obim } from './moduli/obim.ts'
import { oduzimanje } from './moduli/oduzimanje.ts'
import { poredjenje } from './moduli/poredjenje.ts'
import { rimski } from './moduli/rimski.ts'
import { sabiranje } from './moduli/sabiranje.ts'
import { srpskiCitanje } from './moduli/srpskiCitanje.ts'
import { srpskiGramatika } from './moduli/srpskiGramatika.ts'
import { srpskiPravopis } from './moduli/srpskiPravopis.ts'
import { srpskiRecnik } from './moduli/srpskiRecnik.ts'
import { srpskiVrsteReci } from './moduli/srpskiVrsteReci.ts'
import { sabiranje4 } from './moduli4/sabiranje4.ts'
import { oduzimanje4 } from './moduli4/oduzimanje4.ts'
import { mnozenje4 } from './moduli4/mnozenje4.ts'
import { deljenje4 } from './moduli4/deljenje4.ts'
import { veliki4 } from './moduli4/veliki4.ts'
import { kombinovane4 } from './moduli4/kombinovane4.ts'
import { jednacine4 } from './moduli4/jednacine4.ts'
import { nejednacine4 } from './moduli4/nejednacine4.ts'
import { povrsina4 } from './moduli4/povrsina4.ts'
import { zapremina4 } from './moduli4/zapremina4.ts'
import { razlomci4 } from './moduli4/razlomci4.ts'
import { tela4 } from './moduli4/tela4.ts'
import { decimal4 } from './moduli4/decimal4.ts'

const MODULI: TopicGenerator[] = [
  sabiranje, oduzimanje, mnozenje, deljenje, kombinovane,
  poredjenje, nizovi, obim, jedinice, novac,
  rimski, jednacine, nejednacine,
  // 4. razred
  sabiranje4, oduzimanje4, mnozenje4, deljenje4, veliki4, kombinovane4,
  jednacine4, nejednacine4, povrsina4, zapremina4, razlomci4, tela4, decimal4,
  // Srpski jezik, 3. razred
  srpskiVrsteReci, srpskiGramatika, srpskiPravopis, srpskiCitanje, srpskiRecnik,
]

export const REGISTAR = new Map<string, TopicGenerator>(MODULI.map((m) => [m.slug, m]))

// Oblasti za koje postoji automatski generator
export function podrzaneOblasti(): string[] {
  return MODULI.map((m) => m.slug)
}

// Maksimalan broj pokušaja generisanja po jednom pitanju (izbegavanje duplikata)
const MAX_POKUSAJA = 30

export function generisi(cfg: GeneratorConfig): RezultatGenerisanja {
  const modul = REGISTAR.get(cfg.topicSlug)
  if (!modul) {
    return { questions: [], warning: `Za oblast „${cfg.topicSlug}" ne postoji automatski generator.` }
  }

  const rng = napraviRng(cfg.seed ?? Math.floor(Math.random() * 2 ** 31))
  const questions: GenerisanoPitanje[] = []
  const taken = new Set<string>(cfg.excludedSignatures ?? [])

  for (let i = 0; i < cfg.count; i++) {
    let pitanje: GenerisanoPitanje | null = null
    for (let pokusaj = 0; pokusaj < MAX_POKUSAJA && !pitanje; pokusaj++) {
      // Kada su ponavljanja dozvoljena, potpisi se ne blokiraju
      pitanje = modul.generateOne(cfg, rng, cfg.allowRepeats ? new Set() : taken)
    }
    if (!pitanje) break // prostor bez ponavljanja je iscrpljen
    taken.add(pitanje.signature)
    questions.push(pitanje)
  }

  const warning =
    questions.length < cfg.count
      ? `Generisano je ${questions.length} od traženih ${cfg.count} pitanja — prostor različitih zadataka za izabrana podešavanja je iscrpljen.`
      : null

  return { questions, warning }
}

// Ponovo generiši JEDNO pitanje, izbegavajući date potpise (za dugme „Regeneriši")
export function regenerisiJedno(
  cfg: GeneratorConfig,
  postojeciPotpisi: Set<string>,
): GenerisanoPitanje | null {
  const modul = REGISTAR.get(cfg.topicSlug)
  if (!modul) return null
  const rng = napraviRng(cfg.seed ?? Math.floor(Math.random() * 2 ** 31))
  for (let pokusaj = 0; pokusaj < MAX_POKUSAJA; pokusaj++) {
    const pitanje = modul.generateOne(cfg, rng, postojeciPotpisi)
    if (pitanje) return pitanje
  }
  return null
}
