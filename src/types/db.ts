// Tipovi redova iz baze i jsonb oblika — ogledalo šeme u supabase/migrations

export type TipPitanja = 'single' | 'multi' | 'numeric' | 'text' | 'truefalse' | 'matching'
export type Tezina = 1 | 2 | 3 | 4 | 5
export type IzvorPitanja = 'manual' | 'generated'
export type StatusPokusaja = 'in_progress' | 'submitted' | 'expired'
export type Predmet = 'matematika' | 'srpski'
export type Razred = 3 | 4
export type SahBoja = 'white' | 'black'
export type SahStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type SahRezultat = 'child_win' | 'draw' | 'child_loss'
export type SahZavrsetak =
  | 'checkmate' | 'stalemate' | 'threefold_repetition' | 'fifty_move'
  | 'insufficient_material' | 'timeout' | 'resignation' | 'draw'
export type FiksnoImeDeteta = 'Andrej' | 'Filip'
export type AvatarDeteta = '🧠' | '🚀' | '🦊' | '🦁' | '🤖' | '⭐'

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
  fixed_child_name: FiksnoImeDeteta | null
  require_label: boolean
  label_name: string
  grade: Razred | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  daily_schedule_id?: string | null
  daily_local_date?: string | null
}

export type IzvorDnevnogKviza = 'generator' | 'bank' | 'combined'

// Prikaz jednog trajnog rasporeda. Oblasti ostaju kao ID-jevi radi izmene, a
// slugovi služe za čitljiv rezime bez dodatnih poziva bazi.
export interface DnevniRasporedKviza {
  id: string
  child_profile_id: string
  child_name: string
  child_avatar: string
  subject: Predmet
  grade: Razred
  source: IzvorDnevnogKviza
  topic_ids: string[]
  topic_slugs: string[]
  difficulty: Tezina | null
  question_type: TipPitanja | null
  question_count: number
  time_limit_seconds: number | null
  shuffle_questions: boolean
  shuffle_answers: boolean
  pass_threshold_pct: number
  daily_time: string
  timezone: 'Europe/Belgrade'
  is_active: boolean
  smart_mode: boolean
  weekly_report_enabled: boolean
  next_run_on: string
  last_sent_at: string | null
  last_quiz_id: string | null
  last_error: string | null
  last_weekly_report_at: string | null
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
  child_profile_id: string | null
  notify_child_email: boolean
  assignment_request_id: string | null
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
  child_profile_id: string | null
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
  stars_earned: number | null
  stars_awarded: number | null
  remaining_seconds: number | null
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

// Red tabele attempt_retry_questions — nova verzija netačnog zadatka
// generisana za ponovni pokušaj (vidi migraciju 20260815160000)
export interface PonovniOdgovorPokusaja {
  id: string
  attempt_id: string
  position: number
  source_quiz_question_id: string | null
  type: TipPitanja
  text: string
  options: OpcijeJson
  correct: TacanOdgovor
  explanation: string | null
  points: number
  answer: OdgovorDeteta
  is_correct: boolean | null
  answered_at: string | null
}

export interface SahPartija {
  id: string
  owner_id: string
  child_profile_id: string
  play_token: string
  assignment_request_id: string
  approximate_elo: 700 | 900 | 1100 | 1300 | 1500
  child_color: SahBoja
  clock_seconds: 300 | 600 | 900 | 1800 | null
  white_remaining_ms: number | null
  black_remaining_ms: number | null
  turn_color: 'white' | 'black'
  turn_started_at: string | null
  fen: string
  status: SahStatus
  result: SahRezultat | null
  termination: SahZavrsetak | null
  stars_awarded: number | null
  revision: number
  last_request_id: string | null
  undo_used: boolean
  notify_child_email: boolean
  engine_version: string
  daily_schedule_id: string | null
  daily_local_date: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface DnevniRasporedSaha {
  id: string
  child_profile_id: string
  child_name: string
  child_avatar: string
  approximate_elo: 700 | 900 | 1100 | 1300 | 1500
  child_color: SahBoja
  clock_seconds: 300 | 600 | 900 | 1800 | null
  daily_time: string
  timezone: 'Europe/Belgrade'
  is_active: boolean
  next_run_on: string
  last_sent_at: string | null
  last_game_id: string | null
  last_error: string | null
}

export interface SahPotez {
  id: string
  game_id: string
  ply: number
  player: 'child' | 'engine'
  color: 'white' | 'black'
  uci: string
  san: string
  fen_after: string
  moved_at: string
  white_remaining_ms: number | null
  black_remaining_ms: number | null
}

export interface SahNagradaPodesavanje {
  owner_id: string
  approximate_elo: 700 | 900 | 1100 | 1300 | 1500
  win_stars: number
  draw_stars: number
  updated_at: string
}

export interface AdminPodesavanja {
  user_id: string
  email_notifications: boolean
}

export interface ProfilDeteta {
  id: string
  owner_id: string
  name: string
  birth_date: string | null
  avatar: AvatarDeteta
  email: string | null
  notify_new_quiz_email: boolean
  public_token: string
  created_at: string
  updated_at: string
}

export interface NivoTitule {
  id: string
  owner_id: string
  name: string
  min_stars: number
  avatar?: string | null
  created_at: string
}

export interface StavkaProdavnice {
  id: string
  owner_id: string
  title: string
  description: string | null
  emoji: string
  icon_url: string | null
  cost: number
  repeatable: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Status kupovine nagrade u prodavnici.
//   requested — dete upravo traži nagradu (čeka isporuku).
//   consumed  — admin je ostvario nagradu; kod ponavljajućih stavki oslobađa
//               slot za sledeću kupovinu.
//   cancelled — admin otkazao; vraća potrošene zvezdice u raspoloživi balans.
export type StatusKupovineProdavnice = 'requested' | 'consumed' | 'cancelled'

export interface KupovinaProdavnice {
  id: string
  shop_item_id: string | null
  child_profile_id: string
  owner_id: string
  item_title: string
  item_emoji: string
  item_icon_url: string | null
  cost: number
  is_repeatable: boolean
  status: StatusKupovineProdavnice
  requested_at: string
  consumed_at: string | null
  note: string | null
}

export type TipPrimaocaObavestenja = 'admin' | 'child'
export type TipDogadjajaObavestenja =
  | 'new_quiz' | 'quiz_completed' | 'new_chess_game' | 'chess_game_completed' | 'weekly_report'

export interface Obavestenje {
  id: string
  owner_id?: string
  child_profile_id?: string | null
  recipient_type?: TipPrimaocaObavestenja
  event_type: TipDogadjajaObavestenja
  title: string
  body: string
  target_url: string
  read_at: string | null
  created_at: string
}

export interface InboxObavestenja {
  obavestenja: Obavestenje[]
  neprocitano: number
}

export interface PushPretplata {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export interface StatusPushObavestenja {
  podrzano: boolean
  dozvola: NotificationPermission | 'unsupported'
  aktivno: boolean
  razlog?: string
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

export const AVATARI_DECE: AvatarDeteta[] = ['🧠', '🚀', '🦊', '🦁', '🤖', '⭐']
