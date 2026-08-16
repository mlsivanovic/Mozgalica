// Tipizirani pozivi ka Supabase-u: tabele za admina, RPC funkcije za dete
import type {
  AdminPodesavanja, AvatarDeteta, DnevniRasporedSaha, FiksnoImeDeteta, InboxObavestenja,
  Kviz, KvizLink, KvizPitanje, NivoTitule, Oblast, Obavestenje, OdgovorDeteta, Pitanje,
  DnevniRasporedKviza, IzvorDnevnogKviza, Pokusaj, PokusajOdgovor, PonovniOdgovorPokusaja,
  Predmet, ProfilDeteta,
  PushPretplata, Razred, SahBoja, SahNagradaPodesavanje, SahPartija, SahPotez,
  StavkaProdavnice, Tezina, TipPitanja,
} from '../types/db'
import type {
  InboxDetetaPayload, JavniProfilPayload, KupovinaPayload, KvizMeta, NapredakTitule,
  ObjasnjenjePayload, PokusajPayload, PonovniPayload, PonovnoPitanjeUnos, PotvrdaTajmera,
  PregledStatistikeDecePayload, ProdavnicaPayload,
  RezultatPayload, SahStanjePayload, SavePotvrda, SavetPayload, StatistikaDetetaPayload,
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
  // Paginirano čitanje: baza može imati znatno više od 1000 pitanja, a PostgREST
  // inače tiho seče na podrazumevanom limitu. Čitamo u stranicama dok ne prikupimo sve.
  const VELICINA_STRANE = 1000
  const sve: Pitanje[] = []
  let od = 0
  for (;;) {
    let upit = supabase().from('questions').select('*').order('created_at', { ascending: false })
    if (filter.topicId) upit = upit.eq('topic_id', filter.topicId)
    else if (filter.topicIds) upit = upit.in('topic_id', filter.topicIds)
    if (filter.type) upit = upit.eq('type', filter.type)
    if (filter.difficulty) upit = upit.eq('difficulty', filter.difficulty)
    if (filter.source) upit = upit.eq('source', filter.source)
    if (filter.pretraga) upit = upit.ilike('text', `%${filter.pretraga}%`)
    const { data, error } = await upit.range(od, od + VELICINA_STRANE - 1)
    if (error) throw new Error(opisiGresku(error)!)
    if (data) sve.push(...(data as Pitanje[]))
    if (!data || data.length < VELICINA_STRANE) break
    od += VELICINA_STRANE
  }
  return sve
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

// ---------- Dnevni rasporedi kvizova ----------
export interface NoviDnevniRasporedKviza {
  childProfileId: string
  subject: Predmet
  grade: Razred
  source: IzvorDnevnogKviza
  topicIds: string[]
  difficulty: Tezina | null
  questionType: TipPitanja | null
  questionCount: number
  timeLimitSeconds: number | null
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  passThresholdPct: number
  dailyTime: string
}

export async function listajDnevneRasporedeKvizova(): Promise<DnevniRasporedKviza[]> {
  const { data, error } = await supabase().rpc('list_daily_quiz_schedules')
  if (error) throw new Error(opisiGresku(error)!)
  return data as DnevniRasporedKviza[]
}

export async function sacuvajDnevniRasporedKviza(
  raspored: NoviDnevniRasporedKviza,
  id?: string,
): Promise<DnevniRasporedKviza> {
  const { data, error } = await supabase().rpc('save_daily_quiz_schedule', {
    p_schedule_id: id ?? null,
    p_child_profile_id: raspored.childProfileId,
    p_subject: raspored.subject,
    p_grade: raspored.grade,
    p_source: raspored.source,
    p_topic_ids: raspored.topicIds,
    p_difficulty: raspored.difficulty,
    p_question_type: raspored.questionType ?? 'auto',
    p_question_count: raspored.questionCount,
    p_time_limit_seconds: raspored.timeLimitSeconds,
    p_shuffle_questions: raspored.shuffleQuestions,
    p_shuffle_answers: raspored.shuffleAnswers,
    p_pass_threshold_pct: raspored.passThresholdPct,
    p_daily_time: raspored.dailyTime,
  })
  if (error) throw new Error(opisiGresku(error)!)
  return data as DnevniRasporedKviza
}

export async function postaviAktivnostDnevnogRasporeda(id: string, aktivan: boolean): Promise<void> {
  const { error } = await supabase().rpc('set_daily_quiz_schedule_active', {
    p_schedule_id: id,
    p_is_active: aktivan,
  })
  if (error) throw new Error(opisiGresku(error)!)
}

export async function obrisiDnevniRasporedKviza(id: string): Promise<void> {
  const { error } = await supabase().rpc('delete_daily_quiz_schedule', { p_schedule_id: id })
  if (error) throw new Error(opisiGresku(error)!)
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

export async function dodeliKvizProfilu(
  quizId: string,
  childProfileId: string,
  sendEmail: boolean,
  idempotencyKey = crypto.randomUUID(),
): Promise<KvizLink> {
  const { data, error } = await supabase().rpc('assign_quiz_to_profile', {
    p_quiz_id: quizId,
    p_child_profile_id: childProfileId,
    p_send_email: sendEmail,
    p_idempotency_key: idempotencyKey,
  })
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

// Pitanja i odgovori ponovnog pokušaja netačnih zadataka (prazno ako nije korišćen)
export async function listajPonovneOdgovorePokusaja(attemptId: string): Promise<PonovniOdgovorPokusaja[]> {
  const { data, error } = await supabase()
    .from('attempt_retry_questions').select('*').eq('attempt_id', attemptId).order('position')
  if (error) throw new Error(opisiGresku(error)!)
  return data as PonovniOdgovorPokusaja[]
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

// ---------- Šah ----------
export interface NovaSahPartija {
  childProfileId: string
  approximateElo: 700 | 900 | 1100 | 1300 | 1500
  childColor: SahBoja
  clockSeconds: 300 | 600 | 900 | 1800 | null
  sendEmail: boolean
  idempotencyKey?: string
}

export async function listajSahPartije(): Promise<SahPartija[]> {
  const { data, error } = await supabase()
    .from('chess_games').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(opisiGresku(error)!)
  return data as SahPartija[]
}

export async function listajPotezeSahPartije(gameId: string): Promise<SahPotez[]> {
  const { data, error } = await supabase()
    .from('chess_moves').select('*').eq('game_id', gameId).order('ply')
  if (error) throw new Error(opisiGresku(error)!)
  return data as SahPotez[]
}

export async function dodeliSahPartiju(podaci: NovaSahPartija): Promise<SahPartija> {
  const { data, error } = await supabase().rpc('assign_chess_game', {
    p_child_profile_id: podaci.childProfileId,
    p_approximate_elo: podaci.approximateElo,
    p_child_color: podaci.childColor,
    p_clock_seconds: podaci.clockSeconds,
    p_send_email: podaci.sendEmail,
    p_idempotency_key: podaci.idempotencyKey ?? crypto.randomUUID(),
  })
  if (error) throw new Error(opisiGresku(error)!)
  return data as SahPartija
}

export async function otkaziSahPartiju(gameId: string): Promise<void> {
  const { error } = await supabase().rpc('cancel_chess_game', { p_game_id: gameId })
  if (error) throw new Error(opisiGresku(error)!)
}

export interface NoviDnevniRasporedSaha {
  childProfileId: string
  approximateElo: 700 | 900 | 1100 | 1300 | 1500
  childColor: SahBoja
  clockSeconds: 300 | 600 | 900 | 1800 | null
  dailyTime: string
}

export async function listajDnevneRasporedeSaha(): Promise<DnevniRasporedSaha[]> {
  const { data, error } = await supabase().rpc('list_daily_chess_schedules')
  if (error) throw new Error(opisiGresku(error)!)
  return data as DnevniRasporedSaha[]
}

export async function sacuvajDnevniRasporedSaha(
  raspored: NoviDnevniRasporedSaha,
  id?: string,
): Promise<DnevniRasporedSaha> {
  const { data, error } = await supabase().rpc('save_daily_chess_schedule', {
    p_schedule_id: id ?? null,
    p_child_profile_id: raspored.childProfileId,
    p_approximate_elo: raspored.approximateElo,
    p_child_color: raspored.childColor,
    p_clock_seconds: raspored.clockSeconds,
    p_daily_time: raspored.dailyTime,
  })
  if (error) throw new Error(opisiGresku(error)!)
  return data as DnevniRasporedSaha
}

export async function postaviAktivnostDnevnogRasporedaSaha(
  id: string,
  aktivan: boolean,
): Promise<void> {
  const { error } = await supabase().rpc('set_daily_chess_schedule_active', {
    p_schedule_id: id,
    p_is_active: aktivan,
  })
  if (error) throw new Error(opisiGresku(error)!)
}

export async function obrisiDnevniRasporedSaha(id: string): Promise<void> {
  const { error } = await supabase().rpc('delete_daily_chess_schedule', { p_schedule_id: id })
  if (error) throw new Error(opisiGresku(error)!)
}

export async function sahAkcija(
  playToken: string,
  action: 'state' | 'start' | 'move' | 'child_move' | 'engine' | 'undo' | 'resign' | 'retry',
  expectedRevision?: number,
  move?: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' },
  requestId = crypto.randomUUID(),
  elo?: number,
): Promise<SahStanjePayload> {
  const { data, error } = await supabase().functions.invoke('play-chess', {
    body: { playToken, action, expectedRevision, move, requestId, elo },
  })
  if (error) throw new Error(opisiGresku(error)!)
  return data as SahStanjePayload
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

// ---------- Statistika dece (admin) ----------
function opisiGreskuStatistike(greska: string | undefined): string {
  if (greska === 'forbidden') return 'Nemaš dozvolu za pregled statistike.'
  if (greska === 'not_found') return 'Profil deteta nije pronađen.'
  if (greska === 'invalid_period') return 'Izabrani vremenski period nije ispravan.'
  return greska ?? 'Statistika trenutno nije dostupna.'
}

export async function ucitajPregledStatistikeDece(): Promise<PregledStatistikeDecePayload> {
  const { data, error } = await supabase().rpc('admin_get_child_statistics_overview')
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as PregledStatistikeDecePayload
  if (!odgovor.ok) throw new Error(opisiGreskuStatistike(odgovor.error))
  return odgovor
}

export async function ucitajStatistikuDeteta(
  profileId: string,
  from: string | null,
  to: string | null,
): Promise<StatistikaDetetaPayload> {
  const { data, error } = await supabase().rpc('admin_get_child_statistics_detail', {
    p_profile_id: profileId,
    p_from_date: from,
    p_to_date: to,
  })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as StatistikaDetetaPayload
  if (!odgovor.ok) throw new Error(opisiGreskuStatistike(odgovor.error))
  return odgovor
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

export async function ucitajSahNagrade(): Promise<SahNagradaPodesavanje[]> {
  const { data, error } = await supabase()
    .from('chess_reward_settings').select('*').order('approximate_elo')
  if (error) throw new Error(opisiGresku(error)!)
  return data as SahNagradaPodesavanje[]
}

export async function sacuvajSahNagrade(
  nagrade: Array<Pick<SahNagradaPodesavanje, 'approximate_elo' | 'win_stars' | 'draw_stars'>>,
): Promise<void> {
  const { data, error } = await supabase().rpc('save_chess_reward_settings', { p_rewards: nagrade })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error('Šahovske nagrade nisu ispravne. Proveri sve ELO nivoe i broj zvezdica.')
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
  email: string | null
  notify_new_quiz_email: boolean
}

export async function sacuvajProfilDeteta(profil: NoviProfilDeteta, id?: string): Promise<void> {
  if (id) {
    const izmene = {
      name: profil.name,
      birth_date: profil.birth_date,
      avatar: profil.avatar,
      email: profil.email,
      notify_new_quiz_email: profil.notify_new_quiz_email,
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

export async function sacuvajNivoeTitula(nivoi: Array<{ name: string; min_stars: number; avatar?: string | null }>): Promise<void> {
  const { data, error } = await supabase().rpc('save_title_levels', { p_levels: nivoi })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error('Titule nisu ispravne. Potreban je početni nivo od 0 zvezdica i jedinstveni pragovi.')
}

// ---------- Prodavnica (admin) ----------
// Napomena: save_shop_items radi „replace-all” (briše stavke koje nisu u payloadu,
// upisuje preostale). Zato se sve stavke čuvaju odjednom — nema pojedinačnog update.
export type NoviStavkaProdavnice = Omit<StavkaProdavnice, 'id' | 'owner_id' | 'created_at' | 'updated_at'>

export async function listajStavkeProdavnice(): Promise<StavkaProdavnice[]> {
  const { data, error } = await supabase()
    .from('shop_items').select('*').order('sort_order').order('created_at')
  if (error) throw new Error(opisiGresku(error)!)
  return data as StavkaProdavnice[]
}

export async function sacuvajStavkeProdavnice(stavke: NoviStavkaProdavnice[]): Promise<void> {
  const { data, error } = await supabase().rpc('save_shop_items', { p_items: stavke })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error('Stavke nisu ispravne. Proveri naslov (1–60 znakova), cenu (>0), emoji i HTTPS adresu ikonice.')
}

export interface KupovinaAdminPrikaz {
  id: string
  childName: string
  childAvatar: string
  title: string
  emoji: string
  iconUrl: string | null
  cost: number
  isRepeatable: boolean
  status: 'requested' | 'consumed' | 'cancelled'
  requestedAt: string
  consumedAt: string | null
  note: string | null
}

export async function listajKupovineProdavnice(): Promise<KupovinaAdminPrikaz[]> {
  const { data, error } = await supabase().rpc('admin_list_shop_purchases')
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string; purchases?: KupovinaAdminPrikaz[] }
  if (!odgovor.ok || !odgovor.purchases) throw new Error(odgovor.error ?? 'Kupovine nisu dostupne.')
  return odgovor.purchases
}

export async function oznaciKupovinuKonzumiranom(id: string, beleška?: string): Promise<void> {
  const { data, error } = await supabase().rpc('admin_consume_purchase', {
    p_purchase_id: id, p_note: beleška ?? null,
  })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error(odgovor.error ?? 'Kupovina nije mogla da se označi.')
}

export async function otkaziKupovinu(id: string, razlog?: string): Promise<void> {
  const { data, error } = await supabase().rpc('admin_cancel_purchase', {
    p_purchase_id: id, p_reason: razlog ?? null,
  })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error(odgovor.error ?? 'Kupovina nije mogla da se otkaže.')
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

// ---------- RPC za dete — ponovni pokušaj netačnih zadataka ----------

// Dete je otvorilo objašnjenja netačnih zadataka (otključava ponovni pokušaj)
export async function otvoriObjasnjenja(attemptToken: string): Promise<ObjasnjenjePayload> {
  const { data, error } = await supabase().rpc('mark_explanations_seen', {
    p_attempt_token: attemptToken,
  })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as ObjasnjenjePayload
}

// Upisuje nove (klijentski generisane) verzije netačnih zadataka na server
export async function pokreniPonovniPokusaj(
  attemptToken: string,
  pitanja: PonovnoPitanjeUnos[],
): Promise<PonovniPayload> {
  const { data, error } = await supabase().rpc('start_retry', {
    p_attempt_token: attemptToken, p_questions: pitanja,
  })
  if (error) return { ok: false, error: opisiGresku(error)! } as PonovniPayload
  return data as PonovniPayload
}

// Oporavak ponovnog pokušaja posle osvežavanja stranice
export async function nastaviPonovniPokusaj(attemptToken: string): Promise<PonovniPayload> {
  const { data, error } = await supabase().rpc('resume_retry', {
    p_attempt_token: attemptToken,
  })
  if (error) return { ok: false, error: opisiGresku(error)! } as PonovniPayload
  return data as PonovniPayload
}

// Predaja ponovnog pokušaja — server ocenjuje i po potrebi dopuni zvezdice
export async function predajPonovniPokusaj(
  attemptToken: string,
  answers: Record<string, OdgovorDeteta>,
): Promise<PonovniPayload> {
  const { data, error } = await supabase().rpc('submit_retry', {
    p_attempt_token: attemptToken, p_answers: answers,
  })
  if (error) return { ok: false, error: opisiGresku(error)! } as PonovniPayload
  return data as PonovniPayload
}

export async function ucitajJavniProfil(profileToken: string): Promise<JavniProfilPayload> {
  const { data, error } = await supabase().rpc('get_child_profile', { p_profile_token: profileToken })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as JavniProfilPayload
}

// ---------- RPC za dete — prodavnica ----------
export async function ucitajProdavnicu(profileToken: string): Promise<ProdavnicaPayload> {
  const { data, error } = await supabase().rpc('get_shop', { p_profile_token: profileToken })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as ProdavnicaPayload
}

export async function kupiStavku(profileToken: string, itemId: string): Promise<KupovinaPayload> {
  const { data, error } = await supabase().rpc('purchase_shop_item', {
    p_profile_token: profileToken, p_item_id: itemId,
  })
  if (error) return { ok: false, error: opisiGresku(error)! }
  return data as KupovinaPayload
}

// ---------- Obaveštenja i Web Push ----------
export async function listajAdminObavestenja(): Promise<InboxObavestenja> {
  const [lista, broj] = await Promise.all([
    supabase()
      .from('notifications')
      .select('id, owner_id, child_profile_id, recipient_type, event_type, title, body, target_url, read_at, created_at')
      .eq('recipient_type', 'admin')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_type', 'admin')
      .is('read_at', null),
  ])
  if (lista.error) throw new Error(opisiGresku(lista.error)!)
  if (broj.error) throw new Error(opisiGresku(broj.error)!)
  return {
    obavestenja: (lista.data ?? []) as Obavestenje[],
    neprocitano: broj.count ?? 0,
  }
}

export async function oznaciAdminObavestenjaProcitanim(ids?: string[]): Promise<void> {
  if (ids?.length === 0) return
  let upit = supabase().from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_type', 'admin')
    .is('read_at', null)
  if (ids) upit = upit.in('id', ids)
  const { error } = await upit
  if (error) throw new Error(opisiGresku(error)!)
}

export async function listajObavestenjaDeteta(profileToken: string): Promise<InboxObavestenja> {
  const { data, error } = await supabase().rpc('get_child_notifications', {
    p_profile_token: profileToken,
    p_limit: 50,
  })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as InboxDetetaPayload
  if (!odgovor.ok) throw new Error(odgovor.error ?? 'Obaveštenja nisu dostupna.')

  return {
    neprocitano: odgovor.unreadCount ?? 0,
    obavestenja: (odgovor.notifications ?? []).map((n) => ({
      ...n,
      event_type: n.event_type ?? (n as unknown as { eventType: Obavestenje['event_type'] }).eventType,
      target_url: n.target_url ?? (n as unknown as { targetUrl: string }).targetUrl,
      read_at: n.read_at ?? (n as unknown as { readAt: string | null }).readAt,
      created_at: n.created_at ?? (n as unknown as { createdAt: string }).createdAt,
    })),
  }
}

export async function oznaciObavestenjaDetetaProcitanim(
  profileToken: string,
  ids?: string[],
): Promise<void> {
  if (ids?.length === 0) return
  const { data, error } = await supabase().rpc('mark_child_notifications_read', {
    p_profile_token: profileToken,
    p_notification_ids: ids ?? null,
  })
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error(odgovor.error ?? 'Obaveštenja nisu mogla da se označe.')
}

export async function registrujAdminPush(pretplata: PushPretplata): Promise<void> {
  await pozoviPushRpc('register_admin_push', {
    p_subscription: pretplata,
    p_user_agent: navigator.userAgent,
  })
}

export async function ukloniAdminPush(endpoint: string): Promise<void> {
  await pozoviPushRpc('unregister_admin_push', { p_endpoint: endpoint })
}

export async function registrujDetePush(
  profileToken: string,
  pretplata: PushPretplata,
): Promise<void> {
  await pozoviPushRpc('register_child_push', {
    p_profile_token: profileToken,
    p_subscription: pretplata,
    p_user_agent: navigator.userAgent,
  })
}

export async function ukloniDetePush(profileToken: string, endpoint: string): Promise<void> {
  await pozoviPushRpc('unregister_child_push', {
    p_profile_token: profileToken,
    p_endpoint: endpoint,
  })
}

export async function proveriAdminPush(endpoint: string): Promise<boolean> {
  return proveriPushRpc('get_admin_push_status', { p_endpoint: endpoint })
}

export async function proveriDetePush(profileToken: string, endpoint: string): Promise<boolean> {
  return proveriPushRpc('get_child_push_status', {
    p_profile_token: profileToken,
    p_endpoint: endpoint,
  })
}

async function pozoviPushRpc(naziv: string, parametri: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase().rpc(naziv, parametri)
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; error?: string }
  if (!odgovor.ok) throw new Error(odgovor.error ?? 'Push podešavanje nije sačuvano.')
}

async function proveriPushRpc(naziv: string, parametri: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await supabase().rpc(naziv, parametri)
  if (error) throw new Error(opisiGresku(error)!)
  const odgovor = data as { ok: boolean; active?: boolean; error?: string }
  if (!odgovor.ok) throw new Error(odgovor.error ?? 'Push status nije dostupan.')
  return odgovor.active === true
}
