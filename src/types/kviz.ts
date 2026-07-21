// Tipovi payload-a koje vraćaju SECURITY DEFINER RPC funkcije za dete
import type { OdgovorDeteta, OpcijeJson, TacanOdgovor, TipPitanja } from './db'

// Pitanje kako ga vidi dete — BEZ tačnog odgovora i objašnjenja.
// hint je popunjen SAMO ako je savet za ovo pitanje već otključan (use_hint) —
// hasHint govori da savet postoji, bez otkrivanja teksta pre otključavanja.
export interface PitanjeZaDete {
  id: string // id reda u quiz_questions
  type: TipPitanja
  text: string
  options: OpcijeJson // opcije već izmešane na serveru ako je uključeno mešanje
  hasHint: boolean
  hint: string | null
  points: number
}

// get_quiz_by_token — meta podaci pre početka
export interface KvizMeta {
  ok: boolean
  error?: string // 'not_found' | 'inactive' | 'expired' | 'no_attempts_left'
  title?: string
  description?: string | null
  questionCount?: number
  totalPoints?: number
  timeLimitSeconds?: number | null
  requireName?: boolean
  requireLabel?: boolean
  labelName?: string
  attemptsLeft?: number
  maxAttempts?: number
}

// start_attempt / resume_attempt
export interface PokusajPayload {
  ok: boolean
  error?: string
  attemptToken?: string
  attemptId?: string
  attemptNo?: number
  childName?: string
  deadlineAt?: string | null
  serverNow?: string
  questions?: PitanjeZaDete[]
  savedAnswers?: Record<string, OdgovorDeteta> // samo kod resume
  hintsUsed?: number
  hintsUnlocked?: string[] // id-jevi quiz_questions čiji je savet već otključan
}

// save_answers
export interface SavePotvrda {
  ok: boolean
  error?: string
  saved?: number
  serverNow?: string
}

// use_hint
export interface SavetPayload {
  ok: boolean
  error?: string // 'not_found' | 'not_in_progress' | 'wrong_question' | 'no_hint' | 'limit_reached'
  hint?: string
  hintsUsed?: number
  remaining?: number
}

// Pregled jednog pitanja u rezultatu (posle predaje)
export interface RezultatPitanja {
  id: string
  type: TipPitanja
  text: string
  options: OpcijeJson
  points: number
  answer: OdgovorDeteta
  isCorrect: boolean
  awardedPoints: number
  // correct i explanation stižu SAMO ako kviz dozvoljava prikaz tačnih odgovora
  correct?: TacanOdgovor
  explanation?: string | null
}

// submit_attempt — rezultat filtriran po show_* podešavanjima kviza
export interface RezultatPayload {
  ok: boolean
  error?: string
  alreadySubmitted?: boolean
  showResult?: boolean
  showCorrect?: boolean
  totalPoints?: number
  maxPoints?: number
  scorePct?: number
  correctCount?: number
  incorrectCount?: number
  passed?: boolean
  passThresholdPct?: number
  attemptsLeft?: number
  // true dok bar jedno pitanje (ručno ocenjivanje) čeka administratora — nema ocene do tada
  pendingReview?: boolean
  questions?: RezultatPitanja[]
}
