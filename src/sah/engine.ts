import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'

export type SahElo = 700 | 900 | 1100 | 1300 | 1500

interface KonfiguracijaNivoa {
  maxDepth: number
  rootCandidates: number
  tolerance: number
  maxNodes: number
  maxMs: number
  quiescence: boolean
}

export interface IzborPotezaRacunara {
  from: Square
  to: Square
  promotion?: PieceSymbol
  san: string
  score: number
  nodes: number
  depth: number
  elapsedMs: number
}

const MAT_VREDNOST = 100_000

const VREDNOSTI: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
}

const KONFIGURACIJE: Record<SahElo, KonfiguracijaNivoa> = {
  700: { maxDepth: 2, rootCandidates: 18, tolerance: 260, maxNodes: 4_000, maxMs: 65, quiescence: false },
  900: { maxDepth: 3, rootCandidates: 16, tolerance: 130, maxNodes: 8_000, maxMs: 85, quiescence: false },
  1100: { maxDepth: 4, rootCandidates: 10, tolerance: 55, maxNodes: 14_000, maxMs: 130, quiescence: true },
  1300: { maxDepth: 5, rootCandidates: 12, tolerance: 20, maxNodes: 22_000, maxMs: 135, quiescence: true },
  1500: { maxDepth: 6, rootCandidates: 12, tolerance: 5, maxNodes: 30_000, maxMs: 160, quiescence: true },
}

interface KontekstPretrage {
  engineColor: Color
  nodes: number
  deadline: number
  maxNodes: number
  quiescence: boolean
  prekinuto: boolean
}

function napraviRng(seed: string): () => number {
  let stanje = 2166136261
  for (let i = 0; i < seed.length; i++) {
    stanje ^= seed.charCodeAt(i)
    stanje = Math.imul(stanje, 16777619)
  }
  return () => {
    stanje += 0x6d2b79f5
    let t = stanje
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function centralnost(square: Square): number {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1]) - 1
  const udaljenost = Math.abs(file - 3.5) + Math.abs(rank - 3.5)
  return Math.round(14 - udaljenost * 3)
}

function pozicionaVrednost(piece: PieceSymbol, square: Square, color: Color): number {
  const rank = Number(square[1]) - 1
  const napredak = color === 'w' ? rank : 7 - rank
  switch (piece) {
    case 'p': return napredak * 6 + Math.max(0, centralnost(square))
    case 'n': return centralnost(square) * 2
    case 'b': return centralnost(square)
    case 'r': return napredak >= 6 ? 12 : 0
    case 'q': return Math.round(centralnost(square) / 2)
    case 'k': return napredak < 2 ? -Math.max(0, centralnost(square)) : centralnost(square)
  }
}

function evaluiraj(game: Chess, engineColor: Color): number {
  if (game.isCheckmate()) return game.turn() === engineColor ? -MAT_VREDNOST : MAT_VREDNOST
  if (game.isGameOver()) return 0

  let score = 0
  for (const red of game.board()) {
    for (const polje of red) {
      if (!polje) continue
      const vrednost = VREDNOSTI[polje.type] + pozicionaVrednost(polje.type, polje.square, polje.color)
      score += polje.color === engineColor ? vrednost : -vrednost
    }
  }
  if (game.inCheck()) score += game.turn() === engineColor ? -35 : 35
  return score
}

function potezPrioritet(potez: Move): number {
  return (potez.captured ? VREDNOSTI[potez.captured] * 10 - VREDNOSTI[potez.piece] : 0)
    + (potez.promotion ? VREDNOSTI[potez.promotion] : 0)
    + (potez.san.includes('#') ? MAT_VREDNOST : potez.san.includes('+') ? 50 : 0)
}

function isteklo(kontekst: KontekstPretrage): boolean {
  const kraj = kontekst.nodes >= kontekst.maxNodes || performance.now() >= kontekst.deadline
  if (kraj) kontekst.prekinuto = true
  return kraj
}

function oceniNeposrednePretnje(
  game: Chess,
  engineColor: Color,
  kontekst: KontekstPretrage,
): number {
  if (game.isGameOver()) return evaluiraj(game, engineColor)
  let najgori = evaluiraj(game, engineColor)
  const odgovoriProtivnika = game.moves({ verbose: true }).filter((potez) => (
    potez.captured || potez.promotion || potez.san.includes('+') || potez.san.includes('#')
  ))

  for (const odgovor of odgovoriProtivnika) {
    game.move(odgovor)
    kontekst.nodes++
    let score = evaluiraj(game, engineColor)
    // Brza aproksimacija neposrednog vraćanja izbegava da korektna razmena
    // izgleda kao poklonjena figura, bez generisanja još jednog punog sloja.
    if (!game.isGameOver() && game.isAttacked(odgovor.to, engineColor)) {
      score += VREDNOSTI[odgovor.promotion ?? odgovor.piece]
    }
    game.undo()
    najgori = Math.min(najgori, score)
  }
  return najgori
}

function pretrazi(
  game: Chess,
  depth: number,
  alphaPocetni: number,
  betaPocetni: number,
  kontekst: KontekstPretrage,
  samoTakticki = false,
): number {
  kontekst.nodes++
  if (isteklo(kontekst) || game.isGameOver()) return evaluiraj(game, kontekst.engineColor)

  if (depth <= 0) {
    if (!kontekst.quiescence || samoTakticki) return evaluiraj(game, kontekst.engineColor)
    return pretrazi(game, 1, alphaPocetni, betaPocetni, kontekst, true)
  }

  let potezi = game.moves({ verbose: true })
  if (samoTakticki) potezi = potezi.filter((potez) => potez.captured || potez.promotion || potez.san.includes('+'))
  if (potezi.length === 0) return evaluiraj(game, kontekst.engineColor)
  potezi.sort((a, b) => potezPrioritet(b) - potezPrioritet(a))

  const maksimizuje = game.turn() === kontekst.engineColor
  let alpha = alphaPocetni
  let beta = betaPocetni
  let najbolji = maksimizuje ? -Infinity : Infinity

  for (const potez of potezi) {
    game.move(potez)
    const score = pretrazi(game, depth - 1, alpha, beta, kontekst, samoTakticki)
    game.undo()
    if (maksimizuje) {
      najbolji = Math.max(najbolji, score)
      alpha = Math.max(alpha, najbolji)
    } else {
      najbolji = Math.min(najbolji, score)
      beta = Math.min(beta, najbolji)
    }
    if (beta <= alpha || isteklo(kontekst)) break
  }
  return najbolji
}

export function izaberiPotezRacunara(game: Chess, elo: SahElo, seed: string): IzborPotezaRacunara {
  const konfiguracija = KONFIGURACIJE[elo]
  if (!konfiguracija) throw new Error('Nepodržan ELO nivo.')
  if (game.isGameOver()) throw new Error('Partija je već završena.')

  const pocetak = performance.now()
  const osnovniKontekst: KontekstPretrage = {
    engineColor: game.turn(),
    nodes: 0,
    deadline: Infinity,
    maxNodes: Infinity,
    quiescence: false,
    prekinuto: false,
  }

  // Svaki kandidat se prvo proverava na sva neposredna uzimanja, promocije i
  // šahove. Prethodna verzija je prekidala listu usred pune pretrage, pa je
  // neproveren potez mogao izgledati bolji iako odmah gubi damu.
  const grubiKandidati = game.moves({ verbose: true })
    .sort((a, b) => potezPrioritet(b) - potezPrioritet(a))
    .map((potez) => {
      game.move(potez)
      osnovniKontekst.nodes++
      const score = evaluiraj(game, osnovniKontekst.engineColor)
      game.undo()
      return { potez, score }
    })
    .sort((a, b) => b.score - a.score)
  const najboljiGrubiScore = grubiKandidati[0].score
  let kandidati = grubiKandidati
    .filter((kandidat) => kandidat.score >= najboljiGrubiScore - Math.max(200, konfiguracija.tolerance + 120))
    .slice(0, konfiguracija.rootCandidates)
    .map((kandidat) => {
      game.move(kandidat.potez)
      const score = oceniNeposrednePretnje(game, osnovniKontekst.engineColor, osnovniKontekst)
      game.undo()
      return { potez: kandidat.potez, score }
    })

  const kontekst: KontekstPretrage = {
    engineColor: osnovniKontekst.engineColor,
    nodes: osnovniKontekst.nodes,
    deadline: pocetak + konfiguracija.maxMs,
    maxNodes: Math.max(konfiguracija.maxNodes, osnovniKontekst.nodes),
    quiescence: konfiguracija.quiescence,
    prekinuto: false,
  }
  let zavrsenaDubina = 1

  for (let dubina = 2; dubina <= konfiguracija.maxDepth; dubina++) {
    kontekst.prekinuto = false
    kontekst.quiescence = dubina >= 4 && konfiguracija.quiescence
    const sledeci: typeof kandidati = []
    const redosled = [...kandidati].sort((a, b) => b.score - a.score)
    let alphaKoren = -Infinity
    for (const kandidat of redosled) {
      if (isteklo(kontekst)) break
      game.move(kandidat.potez)
      const score = pretrazi(game, dubina - 1, alphaKoren, Infinity, kontekst)
      game.undo()
      if (kontekst.prekinuto) break
      sledeci.push({ potez: kandidat.potez, score })
      alphaKoren = Math.max(alphaKoren, score)
    }
    // Rezultati nezavršene dubine se odbacuju u celini.
    if (kontekst.prekinuto || sledeci.length !== kandidati.length) break
    kandidati = sledeci
    zavrsenaDubina = dubina
  }

  const najboljiScore = Math.max(...kandidati.map((kandidat) => kandidat.score))
  const prihvatljivi = kandidati.filter((kandidat) => kandidat.score >= najboljiScore - konfiguracija.tolerance)
  const rng = napraviRng(`${seed}:${game.fen()}`)
  const tezine = prihvatljivi.map((kandidat) => {
    const razlika = najboljiScore - kandidat.score
    return Math.max(0.05, 1 - razlika / Math.max(1, konfiguracija.tolerance + 1))
  })
  const zbir = tezine.reduce((sum, tezina) => sum + tezina, 0)
  let izbor = rng() * zbir
  let izabrani = prihvatljivi[0]
  for (let i = 0; i < prihvatljivi.length; i++) {
    izbor -= tezine[i]
    if (izbor <= 0) {
      izabrani = prihvatljivi[i]
      break
    }
  }

  return {
    from: izabrani.potez.from,
    to: izabrani.potez.to,
    promotion: izabrani.potez.promotion,
    san: izabrani.potez.san,
    score: izabrani.score,
    nodes: kontekst.nodes,
    depth: zavrsenaDubina,
    elapsedMs: performance.now() - pocetak,
  }
}

export function jeSahElo(vrednost: number): vrednost is SahElo {
  return vrednost === 700 || vrednost === 900 || vrednost === 1100
    || vrednost === 1300 || vrednost === 1500
}
