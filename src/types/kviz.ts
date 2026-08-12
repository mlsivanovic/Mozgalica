// Tipovi payload-a koje vraćaju SECURITY DEFINER RPC funkcije za dete
import type {
  FiksnoImeDeteta, Obavestenje, OdgovorDeteta, OpcijeJson, TacanOdgovor, TipPitanja,
} from './db'

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
  error?: string // 'not_found' | 'inactive' | 'expired' | 'no_attempts_left' | 'already_completed'
  accessMode?: 'generic' | 'profile'
  profileToken?: string
  childName?: string
  childAvatar?: string
  attemptState?: 'new' | 'in_progress'
  answeredCount?: number
  title?: string
  description?: string | null
  questionCount?: number
  totalPoints?: number
  timeLimitSeconds?: number | null
  requireName?: boolean
  fixedChildName?: FiksnoImeDeteta | null
  totalStars?: number | null
  titleProgress?: NapredakTitule | null
  requireLabel?: boolean
  labelName?: string
  attemptsLeft?: number
  maxAttempts?: number
  remainingSeconds?: number | null
}

// Sezonski napredak titula vraća server samo za dodeljene kvizove.
export interface NapredakTitule {
  seasonStars: number
  currentTitle: string | null
  nextTitle: string | null
  starsToNextTitle: number | null
}

// start_attempt / resume_attempt
export interface PokusajPayload {
  ok: boolean
  error?: string
  resumed?: boolean
  accessMode?: 'generic' | 'profile'
  profileToken?: string
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
  remainingSeconds?: number | null
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
  accessMode?: 'generic' | 'profile'
  profileToken?: string
  showResult?: boolean
  showCorrect?: boolean
  childName?: string
  starsEarned?: number | null
  totalStars?: number | null
  titleProgress?: NapredakTitule | null
  newlyUnlockedTitle?: string | null
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
  starsAwarded?: number | null
  questions?: RezultatPitanja[]
}

export interface PotvrdaTajmera {
  ok: boolean
  error?: string
  remainingSeconds?: number
  serverNow?: string
}

export interface ProfilnaTitula {
  name: string
  minStars: number
  starsNeeded?: number
  avatar?: string | null
}

export interface AktivniKvizProfila {
  quizToken: string
  title: string
  description: string | null
  questionCount: number
  attemptState: 'new' | 'in_progress'
  answeredCount: number
  timeLimitSeconds: number | null
  remainingSeconds: number | null
}

export interface IstorijskiRezultatProfila {
  attemptId: string
  title: string
  submittedAt: string
  scorePct: number | null
  starsAwarded: number | null
  pendingReview: boolean
}

export interface JavniProfilPayload {
  ok: boolean
  error?: string
  name?: string
  avatar?: string
  totalStars?: number
  currentTitle?: ProfilnaTitula | null
  nextTitle?: ProfilnaTitula | null
  activeQuizzes?: AktivniKvizProfila[]
  history?: IstorijskiRezultatProfila[]
}

export interface InboxDetetaPayload {
  ok: boolean
  error?: string
  unreadCount?: number
  notifications?: Obavestenje[]
}
