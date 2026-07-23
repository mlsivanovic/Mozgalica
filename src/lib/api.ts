// Tipizirani pozivi ka Supabase-u: tabele za admina, RPC funkcije za dete
import type {
  AdminPodesavanja, AvatarDeteta, FiksnoImeDeteta, Kviz, KvizLink, KvizPitanje,
  NivoTitule, Oblast, OdgovorDeteta, Pitanje, Pokusaj, PokusajOdgovor, Predmet,
  ProfilDeteta, Razred,
} from '../types/db'
import type {
  JavniProfilPayload, KvizMeta, NapredakTitule, PokusajPayload, PotvrdaTajmera,
  RezultatPayload, SavePotvrda, SavetPayload,
} from '../types/kviz'
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

export async function dodajOblast(name: string, slug: string, subject: Predmet = 'matematika'): Promise<Oblast> {
  const { data, error } = await supabase()
    .from('topics').insert({ name, slug, sort_order: 100, subject }).select('*').single()
  if (error) throw new Error(opisiGresku(error)!)
  return data as Oblast
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
      points: p.points, source: 'manual' as const, gen_signature: null, manual_review: false,
    }]
  })
  const { data, error } = await supabase().from('questions').insert(redovi).select('id')
  if (error) throw new Error(opisiGresku(error)!)
  return data?.length ?? 0
}

// ---------- Pitanja ----------
export interface FilterPitanja {
  topicId?: string
  // Skup tema (npr. sve teme jednog predmeta) — ignoriše se ako je topicId postavljen
  topicIds?: string[]
  type?: string
  difficulty?: number
  source?: string
  pretraga?: string
}

export async function listajPitanja(filter: FilterPitanja): Promise<Pitanje[]> {
  let upit = supabase().from('questions').select('*').order('created_at', { ascending: false })
  if (filter.topicId) upit = upit.eq('topic_id', filter.topicId)
  else if (filter.topicIds) upit = upit.in('topic_id', filter.topicIds)
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
//
// Napomena: uq_questions_signature je PARCIJALNI unique indeks (where gen_signature
// is not null), a PostgREST .upsert(onConflict) uvek generiše ON CONFLICT bez WHERE
// dela — Postgres to odbija jer se ne poklapa sa parcijalnim indeksom. Zato se
// duplikati proveravaju ručno (SELECT pa filter), umesto oslanjanja na upsert.
export async function upisiGenerisana(pitanja: NovoPitanje[]): Promise<number> {
  const potpisi = pitanja.map((p) => p.gen_signature).filter((s): s is string => !!s)
  const { data: postojeci, error: erSelect } = await supabase()
    .from('questions').select('gen_signature').in('gen_signature', potpisi)
  if (erSelect) throw new Error(opisiGresku(erSelect)!)

  const zauzeti = new Set((postojeci ?? []).map((p) => p.gen_signature))
  const nova = pitanja.filter((p) => !p.gen_signature || !zauzeti.has(p.gen_signature))
  if (nova.length === 0) return 0

  const { data, error } = await supabase().from('questions').insert(nova).select('id')
  if (error) throw new Error(opisiGresku(error)!)
  return data?.length ?? 0
}

// Grupni upis pitanja uvezenih iz CSV-a (uvozUvoz.ts već je validirao redove).
export async function upisiPitanjaUvoz(rows: NovoPitanje[]): Promise<number> {
  if (rows.length === 0) return 0
  const { data, error } = await supabase().from('questions').insert(rows).select('id')
  if (error) throw new Error(opisiGresku(error)!)
  return data?.length ?? 0
}

export async function obrisiPitanje(id: string): Promise<void> {
  const { error } = await supabase().from('questions').delete().eq('id', id)
  if (error) throw new Error(opisiGresku(error)!)
}

// Grupno brisanje pitanja iz banke. Bezbedno i za pitanja koja su već korišćena
// u kvizovima — quiz_questions.source_question_id je „on delete set null".
export async function obrisiPitanja(ids: string[]): Promise<void> {
  const { error } = await supabase().from('questions').delete().in('id', ids)
  if (error) throw new Error(opisiGresku(error)!)
}

// ---------- Kvizovi ----------
export type NoviKviz = Omit<Kviz, 'id' | 'owner_id' | 'created_at' | 'updated_at' | 'deleted_at'>

export async function listajKvizove(ukljuciObrisane = false): Promise<Kviz[]> {
  let upit = supabase().from('quizzes').select('*')
  if (!ukljuciObrisane) upit = upit.is('deleted_at', null)
  const { data, error } = await upit.order('created_at', { ascending: false })
  if (error) throw new Error(opisiGresku(error)!)
  return data as Kviz[]
}

export async function ucitajKviz(id: string): Promise<Kviz> {
  const { data, error } = await supabase()
    .from('quizzes').select('*').eq('id', id).is('deleted_at', null).single()
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
  const { data, error } = await supabase().rpc('soft_delete_quiz', { p_quiz_id: id })
  if (error) throw new Error(opisiGresku(error)!)
  const rezultat = data as { ok: boolean, error?: string }
  if (!rezultat.ok) throw new Error(rezultat.error ?? 'Kviz nije moguće obrisati.')
}

export interface StatusArhiveKviza {
  quiz_id: string
  in_progress_count: number
  submitted_count: number
  last_submitted_at: string | null
  open_link_count: number
}

export async function listajStatuseArhiveKvizova(): Promise<StatusArhiveKviza[]> {
  const { data, error } = await supabase().from('v_quiz_archive_status').select('*')
  if (error) throw new Error(opisiGresku(error)!)
  return data as StatusArhiveKviza[]
}

export interface KategorijaKviza {
  quiz_id: string
  subject: Predmet
  grade: Razred
}

export async function listajKategorijeKvizova(): Promise<KategorijaKviza[]> {
  const [{ data: pitanja, error: greskaPitanja }, { data: oblasti, error: greskaOblasti }] = await Promise.all([
    supabase().from('quiz_questions').select('quiz_id, topic_id').limit(10000),
    supabase().from('topics').select('id, subject, grade'),
  ])
  if (greskaPitanja) throw new Error(opisiGresku(greskaPitanja)!)
  if (greskaOblasti) throw new Error(opisiGresku(greskaOblasti)!)

  const oblastPoId = new Map((oblasti ?? []).map((oblast) => [oblast.id, oblast]))
  const jedinstvene = new Map<string, KategorijaKviza>()

  for (const pitanje of pitanja ?? []) {
    const oblast = pitanje.topic_id ? oblastPoId.get(pitanje.topic_id) : null
    if (!oblast) continue
    const kategorija = {
      quiz_id: pitanje.quiz_id,
      subject: oblast.subject as Predmet,
      grade: oblast.grade as Razred,
    }
    jedinstvene.set(`${kategorija.quiz_id}:${kategorija.subject}:${kategorija.grade}`, kategorija)
  }

  return [...jedinstvene.values()]
}

// ---------- Pitanja u kvizu (snapshot) ----------
export async function listajPitanjaKviza(quizId: string): Promise<KvizPitanje[]> {
  const { data, error } = await supabase()
    .from('quiz_questions').select('*').eq('quiz_id', quizId).order('position')
  if (error) throw new Error(opisiGresku(error)!)
  return data as KvizPitanje[]
}

export type SnapshotUnos = Omit<KvizPitanje, 'id'>

// Zameni kompletan sastav kviza novim snapshot-om.
// VAŽNO: proverava PRE brisanja da li kviz već ima pokušaje — guard trigger sad
// dozvoljava DELETE (za pojedinačno brisanje pitanja iz zaključanog kviza), pa bi
// bez ove provere delete-pa-insert obrisao ceo sastav, a INSERT bi potom pao na
// guardu i ostavio kviz BEZ pitanja. Provera mora biti pre brisanja, ne posle.
export async function postaviPitanjaKviza(quizId: string, unosi: SnapshotUnos[]): Promise<void> {
  const imaPokusaje = await kvizImaPokusaje(quizId)
  if (imaPokusaje) {
    throw new Error('Kviz već ima pokušaje — sastav se ne može menjati ni dodavati. Pojedinačna pitanja i dalje mogu da se obrišu iz kviza.')
  }
  const { error: erBrisanje } = await supabase().from('quiz_questions').delete().eq('quiz_id', quizId)
  if (erBrisanje) throw new Error(opisiGresku(erBrisanje)!)
  if (unosi.length === 0) return
  const { error } = await supabase().from('quiz_questions').insert(unosi)
  if (error) throw new Error(opisiGresku(error)!)
}

// Obriši JEDNO pitanje iz kviza (dozvoljeno i kad kviz već ima pokušaje —
// preračun predatih pokušaja se dešava automatski preko DB trigera).
export async function obrisiPitanjeKviza(quizQuestionId: string): Promise<void> {
  const { error } = await supabase().from('quiz_questions').delete().eq('id', quizQuestionId)
  if (error) throw new Error(opisiGresku(error)!)
}

// Dodaje nova pitanja NA KRAJ postojećeg sastava kviza (ne briše ništa postojeće).
// Koriste je i generator-pregled i banka pitanja za "dodaj u postojeći kviz".
// Ako kviz već ima pokušaje, guard trigger unutar postaviPitanjaKviza baca jasnu grešku.
export async function dodajPitanjaUKviz(
  quizId: string,
  noviUnosi: Array<Omit<SnapshotUnos, 'quiz_id' | 'position'>>,
): Promise<void> {
  const postojeci = await listajPitanjaKviza(quizId)
  const pocetnaPozicija = postojeci.length ? Math.max(...postojeci.map((p) => p.position)) + 1 : 0
  const kombinovano: SnapshotUnos[] = [
    ...postojeci.map(({ id: _id, ...rest }) => rest),
    ...noviUnosi.map((u, i) => ({ ...u, quiz_id: quizId, position: pocetnaPozicija + i })),
  ]
  await postaviPitanjaKviza(quizId, kombinovano)
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

export async function dodeliKvizProfilu(quizId: string, childProfileId: string): Promise<KvizLink> {
  const { data, error } = await supabase()
    .from('quiz_links')
    .insert({
      quiz_id: quizId,
      child_profile_id: childProfileId,
      max_attempts: 1,
      label: null,
      expires_at: null,
    })
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

export async function listajPokusajeKviza(quizId: string): Promise<Pokusaj[]> {
  const { data, error } = await supabase()
    .from('attempts').select('*').eq('quiz_id', quizId).order('started_at', { ascending: false })
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

export interface ZbirZvezdica {
  child_name: FiksnoImeDeteta
  total_stars: number
}

export async function listajZbiroveZvezdica(): Promise<ZbirZvezdica[]> {
  const { data, error } = await supabase().from('v_child_star_totals').select('*')
  if (error) throw new Error(opisiGresku(error)!)
  return data as ZbirZvezdica[]
}

export interface StatusTituleDeteta {
  childName: FiksnoImeDeteta
  totalStars: number
  seasonStartedAt: string
  titleProgress: NapredakTitule
}

interface StatusiTitulaPayload {
  ok: boolean
  error?: string
  children?: StatusTituleDeteta[]
}

export async function ucitajStatuseTitula(): Promise<StatusTituleDeteta[]> {
  const { data, error } = await supabase().rpc('admin_get_child_title_statuses')
  if (error) throw new Error(opisiGresku(error)!)
  const rezultat = data as StatusiTitulaPayload
  if (!rezultat.ok || !rezultat.children) throw new Error(rezultat.error ?? 'Status titula nije dostupan.')
  return rezultat.children
}

export async function zapocniNovuSezonuTitula(dete: FiksnoImeDeteta): Promise<StatusTituleDeteta> {
  const { data, error } = await supabase().rpc('admin_start_new_title_season', { p_child_name: dete })
  if (error) throw new Error(opisiGresku(error)!)
  const rezultat = data as StatusTituleDeteta & { ok?: boolean; error?: string }
  if (!rezultat.ok || !rezultat.titleProgress) throw new Error(rezultat.error ?? 'Nova sezona nije pokrenuta.')
  return rezultat
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

// ---------- Profili dece i titule ----------
export async function listajProfileDeteta(): Promise<ProfilDeteta[]> {
  const { data, error } = await supabase()
    .from('child_profiles').select('*').order('created_at')
  if (error) throw new Error(opisiGresku(error)!)
  return data as ProfilDeteta[]
}

export interface NoviProfilDeteta {
  owner_id: string
  name: string
  birth_date: string | null
  avatar: AvatarDeteta
}

export async function sacuvajProfilDeteta(profil: NoviProfilDeteta, id?: string): Promise<void> {
  if (id) {
    const izmene = {
      name: profil.name,
      birth_date: profil.birth_date,
      avatar: profil.avatar,
    }
    const { error } = await supabase().from('child_profiles').update(izmene).eq('id', id)
    if (error) throw new Error(opisiGresku(error)!)
    return
  }
  const { error } = await supabase().from('child_profiles').insert(profil)
  if (error) throw new Error(opisiGresku(error)!)
}

export async function listajNivoeTitula(): Promise<NivoTitule[]> {
  const { data, error } = await supabase()
    .from('title_levels').select('*').order('min_stars')
  if (error) throw new Error(opisiGresku(error)!)
  return data as NivoTitule[]
}

export async function sacuvajNivoeTitula(nivoi: Array<{ name: string; min_stars: number }>): Promise<void> {
  const { data, error } = await supabase().rpc('save_title_levels', { p_levels: nivoi })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error('Titule nisu ispravne. Potreban je početni nivo od 0 zvezdica i jedinstveni pragovi.')
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

export async function potvrdiTajmer(attemptToken: string, remainingSeconds: number): Promise<PotvrdaTajmera> {
  const { data, error } = await supabase().rpc('checkpoint_attempt_timer', {
    p_attempt_token: attemptToken,
    p_remaining_seconds: Math.max(0, Math.floor(remainingSeconds)),
  })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as PotvrdaTajmera
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

// Otključaj savet za jedno pitanje (max 3 po pokušaju, proverava se na serveru).
// Ponovni poziv za već otključano pitanje je besplatan.
export async function iskoristiSavet(attemptToken: string, quizQuestionId: string): Promise<SavetPayload> {
  const { data, error } = await supabase().rpc('use_hint', {
    p_attempt_token: attemptToken, p_quiz_question_id: quizQuestionId,
  })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as SavetPayload
}

export async function ucitajJavniProfil(profileToken: string): Promise<JavniProfilPayload> {
  const { data, error } = await supabase().rpc('get_child_profile', { p_profile_token: profileToken })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as JavniProfilPayload
}
