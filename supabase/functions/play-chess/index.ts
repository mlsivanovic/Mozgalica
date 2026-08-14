import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js'
import { izaberiPotezRacunara, type SahElo } from '../../../src/sah/engine.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Akcija = 'state' | 'start' | 'move' | 'resign'
type Boja = 'white' | 'black'
type Rezultat = 'child_win' | 'draw' | 'child_loss'
type Zavrsetak =
  | 'checkmate' | 'stalemate' | 'threefold_repetition' | 'fifty_move'
  | 'insufficient_material' | 'timeout' | 'resignation' | 'draw'

interface Zahtev {
  action?: Akcija
  playToken?: string
  expectedRevision?: number
  requestId?: string
  move?: { from?: string; to?: string; promotion?: string }
}

interface PartijaRed {
  id: string
  child_profile_id: string
  play_token: string
  approximate_elo: number
  child_color: Boja
  clock_seconds: number | null
  white_remaining_ms: number | null
  black_remaining_ms: number | null
  turn_color: Boja
  turn_started_at: string | null
  fen: string
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  result: Rezultat | null
  termination: Zavrsetak | null
  stars_awarded: number | null
  revision: number
  last_request_id: string | null
  started_at: string | null
}

interface PotezRed {
  ply: number
  player: 'child' | 'engine'
  color: Boja
  uci: string
  san: string
  fen_after: string
  moved_at: string
  white_remaining_ms: number | null
  black_remaining_ms: number | null
}

interface NoviPotez extends PotezRed {}

type SupabaseServis = ReturnType<typeof createClient>

function json(telo: unknown, status = 200): Response {
  return Response.json(telo, { status, headers: CORS })
}

function suprotna(boja: Boja): Boja {
  return boja === 'white' ? 'black' : 'white'
}

function bojaTekst(boja: 'w' | 'b'): Boja {
  return boja === 'w' ? 'white' : 'black'
}

function jeUuid(vrednost: string | undefined): vrednost is string {
  return !!vrednost && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vrednost)
}

function efektivniSat(partija: PartijaRed, sadaMs = Date.now()) {
  let white = partija.white_remaining_ms
  let black = partija.black_remaining_ms
  if (partija.status !== 'in_progress' || !partija.turn_started_at || partija.clock_seconds == null) {
    return { white, black }
  }
  const proteklo = Math.max(0, sadaMs - new Date(partija.turn_started_at).getTime())
  if (partija.turn_color === 'white' && white != null) white = Math.max(0, white - proteklo)
  if (partija.turn_color === 'black' && black != null) black = Math.max(0, black - proteklo)
  return { white, black }
}

async function ucitajPartiju(supabase: SupabaseServis, token: string) {
  const { data: partija, error } = await supabase
    .from('chess_games').select('*').eq('play_token', token).single()
  if (error || !partija) return null
  const [{ data: potezi, error: greskaPoteza }, { data: profil, error: greskaProfila }] = await Promise.all([
    supabase.from('chess_moves').select('*').eq('game_id', partija.id).order('ply'),
    supabase.from('child_profiles').select('name, public_token').eq('id', partija.child_profile_id).single(),
  ])
  if (greskaPoteza || greskaProfila || !profil) throw new Error('Stanje partije nije potpuno.')
  return {
    partija: partija as PartijaRed,
    potezi: (potezi ?? []) as PotezRed[],
    profil: profil as { name: string; public_token: string },
  }
}

function rekonstruiši(potezi: PotezRed[]): Chess {
  const igra = new Chess()
  for (const potez of potezi) {
    const promotion = potez.uci.length === 5 ? potez.uci[4] as PieceSymbol : undefined
    igra.move({
      from: potez.uci.slice(0, 2) as Square,
      to: potez.uci.slice(2, 4) as Square,
      promotion,
    })
  }
  return igra
}

function stanjePayload(
  partija: PartijaRed,
  potezi: PotezRed[],
  profil: { name: string; public_token: string },
  dodatno: Record<string, unknown> = {},
) {
  const sat = efektivniSat(partija)
  return {
    ok: true,
    status: partija.status,
    revision: partija.revision,
    profileToken: profil.public_token,
    childName: profil.name,
    childColor: partija.child_color,
    approximateElo: partija.approximate_elo,
    clockSeconds: partija.clock_seconds,
    fen: partija.fen,
    turnColor: partija.turn_color,
    turnStartedAt: partija.turn_started_at,
    whiteRemainingMs: sat.white == null ? null : Math.round(sat.white),
    blackRemainingMs: sat.black == null ? null : Math.round(sat.black),
    serverNow: new Date().toISOString(),
    result: partija.result,
    termination: partija.termination,
    starsAwarded: partija.stars_awarded,
    moves: potezi.map((potez) => ({
      ply: potez.ply,
      player: potez.player,
      color: potez.color,
      uci: potez.uci,
      san: potez.san,
      fenAfter: potez.fen_after,
      movedAt: potez.moved_at,
      whiteRemainingMs: potez.white_remaining_ms,
      blackRemainingMs: potez.black_remaining_ms,
    })),
    ...dodatno,
  }
}

function zavrsetakIgre(igra: Chess): Zavrsetak | null {
  if (igra.isCheckmate()) return 'checkmate'
  if (igra.isStalemate()) return 'stalemate'
  if (igra.isThreefoldRepetition()) return 'threefold_repetition'
  if (igra.isDrawByFiftyMoves()) return 'fifty_move'
  if (igra.isInsufficientMaterial()) return 'insufficient_material'
  if (igra.isDraw()) return 'draw'
  return null
}

function rezultatZavršeneIgre(igra: Chess, childColor: Boja): Rezultat {
  if (!igra.isCheckmate()) return 'draw'
  return bojaTekst(igra.turn()) === childColor ? 'child_loss' : 'child_win'
}

function uci(potez: Move): string {
  return `${potez.from}${potez.to}${potez.promotion ?? ''}`
}

function noviPotez(
  igra: Chess,
  potez: Move,
  player: 'child' | 'engine',
  ply: number,
  white: number | null,
  black: number | null,
  vreme: string,
): NoviPotez {
  return {
    ply,
    player,
    color: bojaTekst(potez.color),
    uci: uci(potez),
    san: potez.san,
    fen_after: igra.fen(),
    moved_at: vreme,
    white_remaining_ms: white == null ? null : Math.round(white),
    black_remaining_ms: black == null ? null : Math.round(black),
  }
}

async function commit(
  supabase: SupabaseServis,
  partija: PartijaRed,
  requestId: string,
  stanje: {
    igra: Chess
    status: PartijaRed['status']
    result: Rezultat | null
    termination: Zavrsetak | null
    white: number | null
    black: number | null
    turnStartedAt: string | null
    startedAt: string | null
    moves: NoviPotez[]
  },
) {
  const { data, error } = await supabase.rpc('commit_chess_state', {
    p_game_id: partija.id,
    p_expected_revision: partija.revision,
    p_request_id: requestId,
    p_fen: stanje.igra.fen(),
    p_status: stanje.status,
    p_result: stanje.result,
    p_termination: stanje.termination,
    p_white_remaining_ms: stanje.white == null ? null : Math.round(stanje.white),
    p_black_remaining_ms: stanje.black == null ? null : Math.round(stanje.black),
    p_turn_color: bojaTekst(stanje.igra.turn()),
    p_turn_started_at: stanje.turnStartedAt,
    p_started_at: stanje.startedAt,
    p_moves: stanje.moves,
  })
  if (error) throw new Error(error.message)
  return data as { ok: boolean; error?: string; duplicate?: boolean; revision?: number }
}

async function svežeStanje(
  supabase: SupabaseServis,
  token: string,
  dodatno: Record<string, unknown> = {},
) {
  const ucitano = await ucitajPartiju(supabase, token)
  if (!ucitano) return { ok: false, error: 'not_found' }
  return stanjePayload(ucitano.partija, ucitano.potezi, ucitano.profil, dodatno)
}

async function proveriIstek(
  supabase: SupabaseServis,
  token: string,
  ucitano: NonNullable<Awaited<ReturnType<typeof ucitajPartiju>>>,
  requestId: string,
) {
  const { partija, potezi } = ucitano
  if (partija.status !== 'in_progress' || partija.clock_seconds == null) return null
  const sat = efektivniSat(partija)
  const aktivno = partija.turn_color === 'white' ? sat.white : sat.black
  if (aktivno == null || aktivno > 0) return null
  const igra = rekonstruiši(potezi)
  const result: Rezultat = partija.turn_color === partija.child_color ? 'child_loss' : 'child_win'
  const ishod = await commit(supabase, partija, requestId, {
    igra,
    status: 'completed',
    result,
    termination: 'timeout',
    white: partija.turn_color === 'white' ? 0 : sat.white,
    black: partija.turn_color === 'black' ? 0 : sat.black,
    turnStartedAt: null,
    startedAt: partija.started_at,
    moves: [],
  })
  if (!ishod.ok && ishod.error !== 'stale') throw new Error(ishod.error ?? 'Istek vremena nije sačuvan.')
  return svežeStanje(supabase, token, ishod.error === 'stale' ? { stale: true } : {})
}

async function pokreni(
  supabase: SupabaseServis,
  token: string,
  ucitano: NonNullable<Awaited<ReturnType<typeof ucitajPartiju>>>,
  requestId: string,
) {
  const { partija, potezi } = ucitano
  if (partija.status !== 'assigned') return stanjePayload(partija, potezi, ucitano.profil)
  const igra = new Chess()
  const startMs = Date.now()
  const startIso = new Date(startMs).toISOString()
  let white = partija.white_remaining_ms
  let black = partija.black_remaining_ms
  const novi: NoviPotez[] = []

  if (partija.child_color === 'black') {
    const engineStart = performance.now()
    const izbor = izaberiPotezRacunara(igra, partija.approximate_elo as SahElo, `${partija.id}:0`)
    const potez = igra.move({ from: izbor.from, to: izbor.to, promotion: izbor.promotion })
    const trajanje = performance.now() - engineStart
    if (white != null) white = Math.max(0, white - trajanje)
    novi.push(noviPotez(igra, potez, 'engine', 1, white, black, new Date().toISOString()))
  }

  const ishod = await commit(supabase, partija, requestId, {
    igra,
    status: 'in_progress',
    result: null,
    termination: null,
    white,
    black,
    turnStartedAt: new Date().toISOString(),
    startedAt: startIso,
    moves: novi,
  })
  if (!ishod.ok) return svežeStanje(supabase, token, { stale: ishod.error === 'stale' })
  return svežeStanje(supabase, token, { duplicate: ishod.duplicate === true })
}

async function odigraj(
  supabase: SupabaseServis,
  token: string,
  ucitano: NonNullable<Awaited<ReturnType<typeof ucitajPartiju>>>,
  requestId: string,
  zahtev: Zahtev,
) {
  const { partija, potezi } = ucitano
  if (partija.status !== 'in_progress') return { ok: false, error: 'not_in_progress' }
  if (partija.turn_color !== partija.child_color) return { ok: false, error: 'not_child_turn' }

  const sat = efektivniSat(partija)
  const childRemaining = partija.child_color === 'white' ? sat.white : sat.black
  if (childRemaining != null && childRemaining <= 0) {
    return proveriIstek(supabase, token, ucitano, requestId)
  }

  const from = zahtev.move?.from
  const to = zahtev.move?.to
  const promotion = zahtev.move?.promotion
  if (!from || !to || !/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
    return { ok: false, error: 'invalid_move' }
  }
  if (promotion && !/^[qrbn]$/.test(promotion)) return { ok: false, error: 'invalid_promotion' }

  const igra = rekonstruiši(potezi)
  if (igra.fen() !== partija.fen) throw new Error('Sačuvani potezi i pozicija se ne poklapaju.')
  let childMove: Move
  try {
    childMove = igra.move({ from: from as Square, to: to as Square, promotion: promotion as PieceSymbol | undefined })
  } catch {
    return { ok: false, error: 'illegal_move' }
  }

  let white = sat.white
  let black = sat.black
  const sada = new Date().toISOString()
  const novi: NoviPotez[] = [noviPotez(
    igra, childMove, 'child', potezi.length + 1, white, black, sada,
  )]
  let termination = zavrsetakIgre(igra)
  if (termination) {
    const ishod = await commit(supabase, partija, requestId, {
      igra, status: 'completed', result: rezultatZavršeneIgre(igra, partija.child_color),
      termination, white, black, turnStartedAt: null, startedAt: partija.started_at, moves: novi,
    })
    if (!ishod.ok) return svežeStanje(supabase, token, { stale: ishod.error === 'stale' })
    return svežeStanje(supabase, token)
  }

  const engineColor = suprotna(partija.child_color)
  const engineStartMs = Date.now()
  const izbor = izaberiPotezRacunara(
    igra, partija.approximate_elo as SahElo, `${partija.id}:${potezi.length + 1}`,
  )
  const engineElapsed = Date.now() - engineStartMs
  if (engineColor === 'white' && white != null) white = Math.max(0, white - engineElapsed)
  if (engineColor === 'black' && black != null) black = Math.max(0, black - engineElapsed)
  const engineRemaining = engineColor === 'white' ? white : black
  if (engineRemaining != null && engineRemaining <= 0) {
    const ishod = await commit(supabase, partija, requestId, {
      igra, status: 'completed', result: 'child_win', termination: 'timeout',
      white, black, turnStartedAt: null, startedAt: partija.started_at, moves: novi,
    })
    if (!ishod.ok) return svežeStanje(supabase, token, { stale: ishod.error === 'stale' })
    return svežeStanje(supabase, token)
  }

  const engineMove = igra.move({ from: izbor.from, to: izbor.to, promotion: izbor.promotion })
  novi.push(noviPotez(
    igra, engineMove, 'engine', potezi.length + 2, white, black, new Date().toISOString(),
  ))
  termination = zavrsetakIgre(igra)
  const ishod = await commit(supabase, partija, requestId, {
    igra,
    status: termination ? 'completed' : 'in_progress',
    result: termination ? rezultatZavršeneIgre(igra, partija.child_color) : null,
    termination,
    white,
    black,
    turnStartedAt: termination ? null : new Date().toISOString(),
    startedAt: partija.started_at,
    moves: novi,
  })
  if (!ishod.ok) return svežeStanje(supabase, token, { stale: ishod.error === 'stale' })
  return svežeStanje(supabase, token, { duplicate: ishod.duplicate === true })
}

async function predaj(
  supabase: SupabaseServis,
  token: string,
  ucitano: NonNullable<Awaited<ReturnType<typeof ucitajPartiju>>>,
  requestId: string,
) {
  const { partija, potezi } = ucitano
  if (partija.status !== 'in_progress') return { ok: false, error: 'not_in_progress' }
  const sat = efektivniSat(partija)
  const igra = rekonstruiši(potezi)
  const ishod = await commit(supabase, partija, requestId, {
    igra, status: 'completed', result: 'child_loss', termination: 'resignation',
    white: sat.white, black: sat.black, turnStartedAt: null,
    startedAt: partija.started_at, moves: [],
  })
  if (!ishod.ok) return svežeStanje(supabase, token, { stale: ishod.error === 'stale' })
  return svežeStanje(supabase, token)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  try {
    const zahtev = await req.json() as Zahtev
    const action = zahtev.action ?? 'state'
    const token = zahtev.playToken?.trim()
    if (!token || token.length < 20 || !['state', 'start', 'move', 'resign'].includes(action)) {
      return json({ ok: false, error: 'invalid_request' }, 400)
    }
    const requestId = jeUuid(zahtev.requestId) ? zahtev.requestId : crypto.randomUUID()
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const ucitano = await ucitajPartiju(supabase, token)
    if (!ucitano) return json({ ok: false, error: 'not_found' }, 404)

    if (ucitano.partija.last_request_id === requestId) {
      return json(stanjePayload(ucitano.partija, ucitano.potezi, ucitano.profil, { duplicate: true }))
    }
    if (action !== 'state' && zahtev.expectedRevision !== ucitano.partija.revision) {
      return json(stanjePayload(ucitano.partija, ucitano.potezi, ucitano.profil, { stale: true }))
    }

    const istek = await proveriIstek(supabase, token, ucitano, requestId)
    if (istek) return json(istek)
    if (action === 'state') return json(stanjePayload(ucitano.partija, ucitano.potezi, ucitano.profil))
    if (action === 'start') return json(await pokreni(supabase, token, ucitano, requestId))
    if (action === 'resign') return json(await predaj(supabase, token, ucitano, requestId))
    return json(await odigraj(supabase, token, ucitano, requestId, zahtev))
  } catch (greska) {
    console.error(greska)
    return json({ ok: false, error: 'server_error' }, 500)
  }
})
