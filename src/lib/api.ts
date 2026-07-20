// Tipizirani pozivi ka Supabase-u: tabele za admina, RPC funkcije za dete
import type {
  AdminPodesavanja, Kviz, KvizLink, KvizPitanje, Oblast, OdgovorDeteta, Pitanje, Pokusaj,
  PokusajOdgovor,
} from '../types/db'
import type { KvizMeta, PokusajPayload, RezultatPayload, SavePotvrda } from '../types/kviz'
import { SEED_PITANJA } from '../data/seedPitanja'
import { supabase } from './supabase'

// Pretvori Supabase grešku u čitljivu srpsku poruku
function opisiGresku(error: { message: string } | null): string | null {
  if (!error) return null
  if (error.message.includes('Failed to fetch')) return 'Nema veze sa serverom — proveri internet.'
  return error.message
}

// ---------- Oblasti ----------
export async function listajOblasti(): Promise<Oblast[]> {
  const { data, error } = await supabase().from('topics').select('*').order('sort_order')
  if (error) throw new Error(opisiGresku(error)!)
  return data as Oblast[]
}

export async function dodajOblast(name: string, slug: string): Promise<void> {
  const { error } = await supabase().from('topics').insert({ name, slug, sort_order: 100 })
  if (error) throw new Error(opisiGresku(error)!)
}

// Umeće početnih 30 primera pitanja (po dva za svaku oblast), vlasnik = trenutni admin.
// Namenjeno za jednokratno pokretanje sa prve stranice banke pitanja.
export async function ucitajPocetnaPitanja(oblasti: Oblast[]): Promise<number> {
  const mapaSlugova = new Map(oblasti.map((o) => [o.slug, o.id]))
  const redovi: NovoPitanje[] = SEED_PITANJA.flatMap((p) => {
    const topicId = mapaSlugova.get(p.topicSlug)
    if (!topicId) return []
    return [{
      topic_id: topicId, type: p.type, difficulty: p.difficulty, text: p.text,
      options: p.options, correct: p.correct, explanation: p.explanation, hint: p.hint,
      points: p.points, source: 'manual' as const, gen_signature: null,
    }]
  })
  const { data, error } = await supabase().from('questions').insert(redovi).select('id')
  if (error) throw new Error(opisiGresku(error)!)
  return data?.length ?? 0
}

// ---------- Pitanja ----------
export interface FilterPitanja {
  topicId?: string
  type?: string
  difficulty?: number
  source?: string
  pretraga?: string
}

export async function listajPitanja(filter: FilterPitanja): Promise<Pitanje[]> {
  let upit = supabase().from('questions').select('*').order('created_at', { ascending: false })
  if (filter.topicId) upit = upit.eq('topic_id', filter.topicId)
  if (filter.type) upit = upit.eq('type', filter.type)
  if (filter.difficulty) upit = upit.eq('difficulty', filter.difficulty)
  if (filter.source) upit = upit.eq('source', filter.source)
  if (filter.pretraga) upit = upit.ilike('text', `%${filter.pretraga}%`)
  const { data, error } = await upit.limit(500)
  if (error) throw new Error(opisiGresku(error)!)
  return data as Pitanje[]
}

export type NovoPitanje = Omit<Pitanje, 'id' | 'owner_id' | 'created_at' | 'updated_at'>

export async function sacuvajPitanje(pitanje: NovoPitanje, id?: string): Promise<void> {
  if (id) {
    const { error } = await supabase().from('questions').update(pitanje).eq('id', id)
    if (error) throw new Error(opisiGresku(error)!)
    return
  }
  const { error } = await supabase().from('questions').insert(pitanje)
  if (error) throw new Error(opisiGresku(error)!)
}

// Grupni upis generisanih pitanja; duplikati po potpisu se tiho preskaču.
// Vraća broj stvarno upisanih.
export async function upisiGenerisana(pitanja: NovoPitanje[]): Promise<number> {
  const { data, error } = await supabase()
    .from('questions')
    .upsert(pitanja, { onConflict: 'owner_id,gen_signature', ignoreDuplicates: true })
    .select('id')
  if (error) throw new Error(opisiGresku(error)!)
  return data?.length ?? 0
}

export async function obrisiPitanje(id: string): Promise<void> {
  const { error } = await supabase().from('questions').delete().eq('id', id)
  if (error) throw new Error(opisiGresku(error)!)
}

// ---------- Kvizovi ----------
export type NoviKviz = Omit<Kviz, 'id' | 'owner_id' | 'created_at' | 'updated_at'>

export async function listajKvizove(): Promise<Kviz[]> {
  const { data, error } = await supabase().from('quizzes').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(opisiGresku(error)!)
  return data as Kviz[]
}

export async function ucitajKviz(id: string): Promise<Kviz> {
  const { data, error } = await supabase().from('quizzes').select('*').eq('id', id).single()
  if (error) throw new Error(opisiGresku(error)!)
  return data as Kviz
}

export async function sacuvajKviz(kviz: NoviKviz, id?: string): Promise<string> {
  if (id) {
    const { error } = await supabase().from('quizzes').update(kviz).eq('id', id)
    if (error) throw new Error(opisiGresku(error)!)
    return id
  }
  const { data, error } = await supabase().from('quizzes').insert(kviz).select('id').single()
  if (error) throw new Error(opisiGresku(error)!)
  return (data as { id: string }).id
}

export async function obrisiKviz(id: string): Promise<void> {
  const { error } = await supabase().from('quizzes').delete().eq('id', id)
  if (error) throw new Error(opisiGresku(error)!)
}

// ---------- Pitanja u kvizu (snapshot) ----------
export async function listajPitanjaKviza(quizId: string): Promise<KvizPitanje[]> {
  const { data, error } = await supabase()
    .from('quiz_questions').select('*').eq('quiz_id', quizId).order('position')
  if (error) throw new Error(opisiGresku(error)!)
  return data as KvizPitanje[]
}

export type SnapshotUnos = Omit<KvizPitanje, 'id'>

// Zameni kompletan sastav kviza novim snapshot-om (guard trigger brani ako ima pokušaja)
export async function postaviPitanjaKviza(quizId: string, unosi: SnapshotUnos[]): Promise<void> {
  const { error: erBrisanje } = await supabase().from('quiz_questions').delete().eq('quiz_id', quizId)
  if (erBrisanje) throw new Error(opisiGresku(erBrisanje)!)
  if (unosi.length === 0) return
  const { error } = await supabase().from('quiz_questions').insert(unosi)
  if (error) throw new Error(opisiGresku(error)!)
}

// ---------- Linkovi ----------
export async function listajLinkove(quizId: string): Promise<KvizLink[]> {
  const { data, error } = await supabase()
    .from('quiz_links').select('*').eq('quiz_id', quizId).order('created_at', { ascending: false })
  if (error) throw new Error(opisiGresku(error)!)
  return data as KvizLink[]
}

export async function napraviLink(quizId: string, label: string | null, maxAttempts: number, expiresAt: string | null): Promise<KvizLink> {
  const { data, error } = await supabase()
    .from('quiz_links')
    .insert({ quiz_id: quizId, label, max_attempts: maxAttempts, expires_at: expiresAt })
    .select('*')
    .single()
  if (error) throw new Error(opisiGresku(error)!)
  return data as KvizLink
}

export async function izmeniLink(id: string, izmene: Partial<Pick<KvizLink, 'is_active' | 'expires_at' | 'max_attempts' | 'label'>>): Promise<void> {
  const { error } = await supabase().from('quiz_links').update(izmene).eq('id', id)
  if (error) throw new Error(opisiGresku(error)!)
}

export interface StatusLinka {
  link_id: string
  quiz_id: string
  token: string
  label: string | null
  is_active: boolean
  expires_at: string | null
  max_attempts: number
  attempts_count: number
  in_progress_count: number
  submitted_count: number
  last_submitted_at: string | null
}

export async function statusLinkovaKviza(quizId: string): Promise<StatusLinka[]> {
  const { data, error } = await supabase().from('v_link_status').select('*').eq('quiz_id', quizId)
  if (error) throw new Error(opisiGresku(error)!)
  return data as StatusLinka[]
}

// Da li kviz već ima bar jedan pokušaj (snapshot pitanja je tada zamrznut)
export async function kvizImaPokusaje(quizId: string): Promise<boolean> {
  const { count, error } = await supabase()
    .from('attempts').select('id', { count: 'exact', head: true }).eq('quiz_id', quizId)
  if (error) throw new Error(opisiGresku(error)!)
  return (count ?? 0) > 0
}

// ---------- Rezultati (admin) ----------
export async function listajPokusaje(): Promise<Pokusaj[]> {
  const { data, error } = await supabase()
    .from('attempts').select('*').order('started_at', { ascending: false }).limit(1000)
  if (error) throw new Error(opisiGresku(error)!)
  return data as Pokusaj[]
}

export async function ucitajPokusaj(id: string): Promise<Pokusaj> {
  const { data, error } = await supabase().from('attempts').select('*').eq('id', id).single()
  if (error) throw new Error(opisiGresku(error)!)
  return data as Pokusaj
}

export async function listajOdgovorePokusaja(attemptId: string): Promise<PokusajOdgovor[]> {
  const { data, error } = await supabase()
    .from('attempt_answers').select('*').eq('attempt_id', attemptId)
  if (error) throw new Error(opisiGresku(error)!)
  return data as PokusajOdgovor[]
}

export async function overrideOcene(answerId: string, isCorrect: boolean, awardedPoints: number): Promise<void> {
  const { error } = await supabase().rpc('admin_override_grade', {
    p_answer_id: answerId,
    p_is_correct: isCorrect,
    p_awarded_points: awardedPoints,
  })
  if (error) throw new Error(opisiGresku(error)!)
}

export async function obrisiPokusaj(id: string): Promise<void> {
  const { error } = await supabase().from('attempts').delete().eq('id', id)
  if (error) throw new Error(opisiGresku(error)!)
}

// ---------- Statistika (view-ovi) ----------
export interface StatistikaKviza {
  quiz_id: string
  title: string
  attempts_count: number
  avg_pct: number | null
  passed_count: number
}

export async function statistikaKvizova(): Promise<StatistikaKviza[]> {
  const { data, error } = await supabase().from('v_quiz_stats').select('*')
  if (error) throw new Error(opisiGresku(error)!)
  return data as StatistikaKviza[]
}

export interface StatistikaPitanja {
  quiz_question_id: string
  quiz_id: string
  text: string
  topic_name: string
  answers_count: number
  wrong_count: number
}

export async function najcesceGresna(): Promise<StatistikaPitanja[]> {
  const { data, error } = await supabase()
    .from('v_question_stats').select('*').order('wrong_count', { ascending: false }).limit(20)
  if (error) throw new Error(opisiGresku(error)!)
  return data as StatistikaPitanja[]
}

export interface StatistikaOblasti {
  topic_name: string
  answers_count: number
  correct_count: number
  success_pct: number | null
}

export async function uspesnostPoOblastima(): Promise<StatistikaOblasti[]> {
  const { data, error } = await supabase().from('v_topic_stats').select('*')
  if (error) throw new Error(opisiGresku(error)!)
  return data as StatistikaOblasti[]
}

// ---------- Podešavanja ----------
export async function ucitajPodesavanja(): Promise<AdminPodesavanja | null> {
  const { data, error } = await supabase().from('admin_settings').select('*').maybeSingle()
  if (error) throw new Error(opisiGresku(error)!)
  return data as AdminPodesavanja | null
}

export async function postaviEmailObavestenja(userId: string, ukljucena: boolean): Promise<void> {
  const { error } = await supabase()
    .from('admin_settings').update({ email_notifications: ukljucena }).eq('user_id', userId)
  if (error) throw new Error(opisiGresku(error)!)
}

// ---------- RPC za dete (bez prijave) ----------
export async function kvizMeta(token: string): Promise<KvizMeta> {
  const { data, error } = await supabase().rpc('get_quiz_by_token', { p_token: token })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as KvizMeta
}

export async function zapocniPokusaj(token: string, childName: string, childLabel: string | null): Promise<PokusajPayload> {
  const { data, error } = await supabase().rpc('start_attempt', {
    p_token: token, p_child_name: childName, p_child_label: childLabel,
  })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as PokusajPayload
}

export async function nastaviPokusaj(attemptToken: string): Promise<PokusajPayload> {
  const { data, error } = await supabase().rpc('resume_attempt', { p_attempt_token: attemptToken })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as PokusajPayload
}

export async function posaljiOdgovore(attemptToken: string, answers: Record<string, OdgovorDeteta>): Promise<SavePotvrda> {
  const { data, error } = await supabase().rpc('save_answers', {
    p_attempt_token: attemptToken, p_answers: answers,
  })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as SavePotvrda
}

export async function predajKviz(attemptToken: string, answers: Record<string, OdgovorDeteta> | null): Promise<RezultatPayload> {
  const { data, error } = await supabase().rpc('submit_attempt', {
    p_attempt_token: attemptToken, p_answers: answers,
  })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as RezultatPayload
}
