// Tipovi redova iz baze i jsonb oblika — ogledalo šeme u supabase/migrations

export type TipPitanja = 'single' | 'multi' | 'numeric' | 'text' | 'truefalse' | 'matching'
export type Tezina = 1 | 2 | 3 | 4 | 5
export type IzvorPitanja = 'manual' | 'generated'
export type StatusPokusaja = 'in_progress' | 'submitted' | 'expired'
export type Predmet = 'matematika' | 'srpski'
export type Razred = 3 | 4

// ---------- jsonb oblici opcija ----------
export interface Opcija {
  id: string
  text: string
}

export interface MatchingOpcije {
  left: Opcija[]
  right: Opcija[]
}

// options kolona: niz opcija (single/multi) ili parovi (matching), null za ostale
export type OpcijeJson = Opcija[] | MatchingOpcije | null

// ---------- jsonb oblici tačnog odgovora ----------
export type TacanOdgovor =
  | { optionId: string }            // single
  | { optionIds: string[] }         // multi
  | { value: boolean }              // truefalse
  | { value: number }               // numeric
  | { accept: string[] }            // text — lista prihvaćenih odgovora
  | { pairs: Record<string, string> } // matching — levoId → desnoId

// ---------- jsonb oblik odgovora deteta ----------
export type OdgovorDeteta =
  | { optionId: string | null }
  | { optionIds: string[] }
  | { value: boolean | null }
  | { value: string }               // numeric unos ostaje string dok server ne parsira
  | { text: string }
  | { pairs: Record<string, string> }
  | null

// ---------- redovi tabela ----------
export interface Oblast {
  id: string
  slug: string
  name: string
  sort_order: number
  subject: Predmet
  grade: Razred
}

export interface Pitanje {
  id: string
  owner_id: string
  topic_id: string
  type: TipPitanja
  difficulty: Tezina
  text: string
  options: OpcijeJson
  correct: TacanOdgovor
  explanation: string | null
  hint: string | null
  points: number
  source: IzvorPitanja
  gen_signature: string | null
  manual_review: boolean
  created_at: string
  updated_at: string
}

export interface Kviz {
  id: string
  owner_id: string
  title: string
  description: string | null
  time_limit_seconds: number | null
  default_max_attempts: number
  shuffle_questions: boolean
  shuffle_answers: boolean
  show_result: boolean
  show_correct: boolean
  pass_threshold_pct: number
  require_name: boolean
  require_label: boolean
  label_name: string
  created_at: string
  updated_at: string
}

// Snapshot pitanja unutar kviza (kopija u trenutku dodavanja)
export interface KvizPitanje {
  id: string
  quiz_id: string
  source_question_id: string | null
  position: number
  topic_id: string | null
  topic_name: string
  type: TipPitanja
  text: string
  options: OpcijeJson
  correct: TacanOdgovor
  explanation: string | null
  hint: string | null
  points: number
  manual_review: boolean
}

export interface KvizLink {
  id: string
  quiz_id: string
  token: string
  label: string | null
  is_active: boolean
  expires_at: string | null
  max_attempts: number
  created_at: string
}

export interface Pokusaj {
  id: string
  quiz_link_id: string
  quiz_id: string
  attempt_no: number
  child_name: string
  child_label: string | null
  status: StatusPokusaja
  started_at: string
  deadline_at: string | null
  submitted_at: string | null
  duration_sec: number | null
  total_points: number | null
  max_points: number | null
  score_pct: number | null
  correct_count: number | null
  incorrect_count: number | null
  passed: boolean | null
  review_pending: boolean
}

export interface PokusajOdgovor {
  id: string
  attempt_id: string
  quiz_question_id: string
  answer: OdgovorDeteta
  answered_at: string | null
  is_correct: boolean | null
  awarded_points: number | null
  graded_by: 'auto' | 'manual' | 'pending'
}

export interface AdminPodesavanja {
  user_id: string
  email_notifications: boolean
}

// ---------- pomoćne konstante ----------
export const NAZIVI_TIPOVA: Record<TipPitanja, string> = {
  single: 'Jedan tačan odgovor',
  multi: 'Više tačnih odgovora',
  numeric: 'Brojčani odgovor',
  text: 'Kratak tekstualni odgovor',
  truefalse: 'Tačno / netačno',
  matching: 'Povezivanje pojmova',
}

export const NAZIVI_TEZINA: Record<Tezina, string> = {
  1: 'Lako',
  2: 'Srednje',
  3: 'Teško',
  4: 'Vrlo teško',
  5: 'Ekspert',
}

export const NAZIVI_PREDMETA: Record<Predmet, string> = {
  matematika: 'Matematika',
  srpski: 'Srpski jezik',
}

export const NAZIVI_RAZREDA: Record<Razred, string> = {
  3: '3. razred',
  4: '4. razred',
}
