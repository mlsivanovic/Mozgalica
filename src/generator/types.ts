// Zajednički tipovi generatora pitanja
import type { OpcijeJson, TacanOdgovor, Tezina, TipPitanja } from '../types/db'
import type { Rng } from './random'

export interface GeneratorConfig {
  topicSlug: string
  difficulty: Tezina
  count: number
  // 'auto' = modul bira tip koji je prirodan za oblast
  type: TipPitanja | 'auto'
  // Da li račun umotati u tekstualni zadatak (gde modul to podržava)
  wordProblems: boolean
  allowRepeats: boolean
  seed?: number
}

// Generisano pitanje — poklapa se sa kolonama tabele questions
export interface GenerisanoPitanje {
  type: TipPitanja
  text: string
  options: OpcijeJson
  correct: TacanOdgovor
  explanation: string
  hint: string | null
  points: number
  topicSlug: string
  difficulty: Tezina
  // Kanonski potpis zadatka (npr. 'mnozenje:7x8') — osnova za izbegavanje duplikata
  signature: string
}

export interface TopicGenerator {
  slug: string
  // Tipovi pitanja koje modul ume da proizvede
  supportedTypes: TipPitanja[]
  // Da li modul podržava tekstualne zadatke
  supportsWordProblems: boolean
  // Vrati jedno pitanje ili null ako u ovom pokušaju nije uspeo (npr. potpis zauzet)
  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null
}

export interface RezultatGenerisanja {
  questions: GenerisanoPitanje[]
  // Upozorenje ako je vraćeno manje od traženog (iscrpljen prostor bez ponavljanja)
  warning: string | null
}
