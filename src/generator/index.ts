// Glavni ulaz generatora: registar modula po oblastima + petlja generisanja
import { napraviRng } from './random'
import type { GeneratorConfig, GenerisanoPitanje, RezultatGenerisanja, TopicGenerator } from './types'
import { deljenje } from './moduli/deljenje'
import { jednacine } from './moduli/jednacine'
import { jedinice } from './moduli/jedinice'
import { kombinovane } from './moduli/kombinovane'
import { mnozenje } from './moduli/mnozenje'
import { nejednacine } from './moduli/nejednacine'
import { nizovi } from './moduli/nizovi'
import { novac } from './moduli/novac'
import { obim } from './moduli/obim'
import { oduzimanje } from './moduli/oduzimanje'
import { poredjenje } from './moduli/poredjenje'
import { rimski } from './moduli/rimski'
import { sabiranje } from './moduli/sabiranje'

const MODULI: TopicGenerator[] = [
  sabiranje, oduzimanje, mnozenje, deljenje, kombinovane,
  poredjenje, nizovi, obim, jedinice, novac,
  rimski, jednacine, nejednacine,
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
  const taken = new Set<string>()

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
