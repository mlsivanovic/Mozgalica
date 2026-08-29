import { izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import type { Opcija, TipPitanja } from '../../types/db.ts'

export interface PidCinjenica {
  id: string
  porodica: string
  pitanje: string
  tacan: string
  netacni: readonly string[]
  tacnaTvrdnja: string
  netacnaTvrdnja: string
  objasnjenje: string
  hint: string
}

export interface PidPar {
  id: string
  levo: string
  desno: string
}

export interface PidOblast {
  slug: string
  povezivanjeTekst: string
  cinjenice: readonly PidCinjenica[]
  parovi: readonly PidPar[]
}

const FIKSNA_TEZINA = 5

function tipPitanja(cfg: GeneratorConfig, rng: Rng): TipPitanja {
  if (cfg.type === 'single' || cfg.type === 'truefalse' || cfg.type === 'matching') return cfg.type
  const vrednost = rng()
  if (vrednost < 0.6) return 'single'
  if (vrednost < 0.85) return 'truefalse'
  return 'matching'
}

function napraviIzbor(
  oblast: PidOblast, cfg: GeneratorConfig, rng: Rng, taken: Set<string>,
): GenerisanoPitanje | null {
  const cinjenica = izaberi(rng, oblast.cinjenice)
  const signature = `${oblast.slug}:single:${cinjenica.porodica}:${cinjenica.id}`
  if (taken.has(signature)) return null
  const tekstovi = promesaj(rng, [cinjenica.tacan, ...cinjenica.netacni.slice(0, 3)])
  const options: Opcija[] = tekstovi.map((text, i) => ({ id: `o${i + 1}`, text }))
  return {
    type: 'single', text: cinjenica.pitanje, options,
    correct: { optionId: options[tekstovi.indexOf(cinjenica.tacan)].id },
    explanation: cinjenica.objasnjenje, hint: cinjenica.hint,
    points: FIKSNA_TEZINA, topicSlug: cfg.topicSlug,
    difficulty: FIKSNA_TEZINA, signature,
  }
}

function napraviTvrdnju(
  oblast: PidOblast, cfg: GeneratorConfig, rng: Rng, taken: Set<string>,
): GenerisanoPitanje | null {
  const cinjenica = izaberi(rng, oblast.cinjenice)
  const tacno = rng() < 0.5
  const signature = `${oblast.slug}:truefalse:${cinjenica.porodica}:${cinjenica.id}:${tacno ? 't' : 'n'}`
  if (taken.has(signature)) return null
  return {
    type: 'truefalse', text: tacno ? cinjenica.tacnaTvrdnja : cinjenica.netacnaTvrdnja,
    options: null, correct: { value: tacno }, explanation: cinjenica.objasnjenje,
    hint: cinjenica.hint, points: FIKSNA_TEZINA, topicSlug: cfg.topicSlug,
    difficulty: FIKSNA_TEZINA, signature,
  }
}

function napraviPovezivanje(
  oblast: PidOblast, cfg: GeneratorConfig, rng: Rng, taken: Set<string>,
): GenerisanoPitanje | null {
  const izabrani = promesaj(rng, oblast.parovi).slice(0, 4)
  const kljuc = izabrani.map((par) => par.id).sort().join('-')
  const signature = `${oblast.slug}:matching:${kljuc}`
  if (taken.has(signature)) return null
  const left: Opcija[] = izabrani.map((par) => ({ id: `l-${par.id}`, text: par.levo }))
  const right: Opcija[] = promesaj(rng, izabrani).map((par) => ({ id: `r-${par.id}`, text: par.desno }))
  const pairs = Object.fromEntries(izabrani.map((par) => [`l-${par.id}`, `r-${par.id}`]))
  return {
    type: 'matching', text: oblast.povezivanjeTekst, options: { left, right },
    correct: { pairs },
    explanation: `Tačni parovi su: ${izabrani.map((par) => `${par.levo} — ${par.desno}`).join('; ')}.`,
    hint: 'Pronađi najpre parove u koje si potpuno siguran/sigurna, pa zatim poveži preostale.',
    points: FIKSNA_TEZINA, topicSlug: cfg.topicSlug,
    difficulty: FIKSNA_TEZINA, signature,
  }
}

export function napraviPidGenerator(oblast: PidOblast): TopicGenerator {
  return {
    slug: oblast.slug,
    supportedTypes: ['single', 'truefalse', 'matching'],
    supportsWordProblems: false,
    generateOne(cfg, rng, taken) {
      const tip = tipPitanja(cfg, rng)
      if (tip === 'truefalse') return napraviTvrdnju(oblast, cfg, rng, taken)
      if (tip === 'matching') return napraviPovezivanje(oblast, cfg, rng, taken)
      return napraviIzbor(oblast, cfg, rng, taken)
    },
  }
}
