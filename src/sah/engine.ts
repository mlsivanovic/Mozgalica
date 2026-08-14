import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'

export type SahElo = 700 | 900 | 1100 | 1300 | 1500

interface KonfiguracijaNivoa {
  maxDepth: number
  rootCandidates: number
  tacticalDepth: number
  safetyDepth: number
  materialTolerance: number
  bookPlies: number
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
  700: { maxDepth: 2, rootCandidates: 18, tacticalDepth: 1, safetyDepth: 1, materialTolerance: 260, bookPlies: 0, tolerance: 260, maxNodes: 4_000, maxMs: 65, quiescence: false },
  900: { maxDepth: 3, rootCandidates: 16, tacticalDepth: 1, safetyDepth: 1, materialTolerance: 110, bookPlies: 4, tolerance: 100, maxNodes: 10_000, maxMs: 105, quiescence: false },
  1100: { maxDepth: 4, rootCandidates: 12, tacticalDepth: 2, safetyDepth: 2, materialTolerance: 80, bookPlies: 6, tolerance: 45, maxNodes: 18_000, maxMs: 145, quiescence: true },
  1300: { maxDepth: 5, rootCandidates: 10, tacticalDepth: 3, safetyDepth: 2, materialTolerance: 40, bookPlies: 8, tolerance: 15, maxNodes: 26_000, maxMs: 160, quiescence: true },
  1500: { maxDepth: 6, rootCandidates: 8, tacticalDepth: 3, safetyDepth: 2, materialTolerance: 20, bookPlies: 10, tolerance: 5, maxNodes: 30_000, maxMs: 160, quiescence: true },
}

interface KontekstPretrage {
  engineColor: Color
  nodes: number
  deadline: number
  maxNodes: number
  quiescence: boolean
  prekinuto: boolean
}

interface PotezIzKnjige {
  from: Square
  to: Square
  promotion?: PieceSymbol
  san: string
}

function kljucPozicije(game: Chess): string {
  return game.fen().split(' ').slice(0, 4).join(' ')
}

function brojPolupoteza(game: Chess): number {
  const [, potez, , , , punPotez] = game.fen().split(' ')
  return (Number(punPotez) - 1) * 2 + (potez === 'b' ? 1 : 0)
}

function napraviKnjiguOtvaranja(): Map<string, PotezIzKnjige> {
  const knjiga = new Map<string, PotezIzKnjige>()
  const linije = [
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'],
    ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'],
    ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
    ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4'],
    ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3'],
    ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'Be7'],
    ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6'],
    ['d4', 'd5', 'e3', 'Nf6', 'Nf3', 'e6', 'Bd3', 'Bd6'],
    ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'],
    ['Nf3', 'd5', 'd4', 'Nf6', 'c4', 'e6'],
  ]

  for (const linija of linije) {
    const igra = new Chess()
    for (const san of linija) {
      const kljuc = kljucPozicije(igra)
      const potez = igra.move(san)
      if (!knjiga.has(kljuc)) {
        knjiga.set(kljuc, {
          from: potez.from,
          to: potez.to,
          promotion: potez.promotion,
          san: potez.san,
        })
      }
    }
  }
  return knjiga
}

const KNJIGA_OTVARANJA = napraviKnjiguOtvaranja()

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

function evaluirajMaterijal(game: Chess, engineColor: Color): number {
  if (game.isCheckmate()) return game.turn() === engineColor ? -MAT_VREDNOST : MAT_VREDNOST
  if (game.isGameOver()) return 0

  let score = 0
  for (const red of game.board()) {
    for (const polje of red) {
      if (!polje) continue
      score += polje.color === engineColor ? VREDNOSTI[polje.type] : -VREDNOSTI[polje.type]
    }
  }
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

function pretraziTakticki(
  game: Chess,
  depth: number,
  engineColor: Color,
  kontekst: KontekstPretrage,
  alphaPocetni = -Infinity,
  betaPocetni = Infinity,
  proceni = evaluiraj,
): number {
  kontekst.nodes++
  if (game.isGameOver() || depth <= 0) return proceni(game, engineColor)

  const uSahu = game.inCheck()
  let potezi = game.moves({ verbose: true })
  if (!uSahu) {
    potezi = potezi.filter((potez) => (
      potez.captured || potez.promotion || potez.san.includes('+') || potez.san.includes('#')
    ))
  }
  if (potezi.length === 0) return proceni(game, engineColor)
  potezi.sort((a, b) => potezPrioritet(b) - potezPrioritet(a))

  const maksimizuje = game.turn() === engineColor
  let alpha = alphaPocetni
  let beta = betaPocetni
  // Van šaha strana može da ne nastavi forsiranu razmenu; statička procena
  // predstavlja tu mogućnost. U šahu mora da odigra jedan od legalnih odgovora.
  let najbolji = uSahu ? (maksimizuje ? -Infinity : Infinity) : proceni(game, engineColor)
  if (maksimizuje) alpha = Math.max(alpha, najbolji)
  else beta = Math.min(beta, najbolji)

  for (const potez of potezi) {
    game.move(potez)
    const score = pretraziTakticki(game, depth - 1, engineColor, kontekst, alpha, beta, proceni)
    game.undo()
    if (maksimizuje) {
      najbolji = Math.max(najbolji, score)
      alpha = Math.max(alpha, najbolji)
    } else {
      najbolji = Math.min(najbolji, score)
      beta = Math.min(beta, najbolji)
    }
    if (beta <= alpha) break
  }
  return najbolji
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
  const potezIzKnjige = brojPolupoteza(game) < konfiguracija.bookPlies
    ? KNJIGA_OTVARANJA.get(kljucPozicije(game))
    : undefined
  if (potezIzKnjige) {
    return {
      ...potezIzKnjige,
      score: 0,
      nodes: 0,
      depth: 0,
      elapsedMs: performance.now() - pocetak,
    }
  }
  const osnovniKontekst: KontekstPretrage = {
    engineColor: game.turn(),
    nodes: 0,
    deadline: Infinity,
    maxNodes: Infinity,
    quiescence: false,
    prekinuto: false,
  }

  // Statička procena samo određuje redosled. Materijalna zaštita ispod se radi
  // nad svim legalnim potezima, da prividno dobro uzimanje ne potisne mirnu
  // odbranu pre nego što se proveri odgovor protivnika.
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
  // Nivoi se razlikuju po dubini i pozicionoj preciznosti, ali nijedan od 900
  // naviše ne treba da bira potez koji je materijalno mnogo gori od dostupne
  // alternative u kratkoj forsiranoj sekvenci.
  const pocetniMaterijalniScore = evaluirajMaterijal(game, osnovniKontekst.engineColor)
  const materijalnoProvereni = grubiKandidati.map((kandidat) => {
    game.move(kandidat.potez)
    const materialScore = pretraziTakticki(
      game,
      konfiguracija.safetyDepth,
      osnovniKontekst.engineColor,
      osnovniKontekst,
      -Infinity,
      Infinity,
      evaluirajMaterijal,
    )
    game.undo()
    return { ...kandidat, materialScore }
  })
  const najboljiMaterijalniScore = Math.max(...materijalnoProvereni.map((kandidat) => kandidat.materialScore))
  // Materijalna zaštita je pod, a ne obaveza da se uzme prividno besplatna
  // figura. U suprotnom bi kratka linija forsirala upravo poteze poput Nxd4,
  // pre nego što dublja taktička provera vidi kasniji gubitak skakača.
  const referentniMaterijalniScore = Math.min(pocetniMaterijalniScore, najboljiMaterijalniScore)
  const bezbedniKandidati = materijalnoProvereni.filter(
    (kandidat) => kandidat.materialScore >= referentniMaterijalniScore - konfiguracija.materialTolerance,
  )
  const najboljiGrubiScore = Math.max(...bezbedniKandidati.map((kandidat) => kandidat.score))
  // Na višim nivoima uzimanje može privremeno izgledati odlično, a da dublja
  // forsirana sekvenca pokaže gubitak figure. Zato se mirni kandidati ne
  // odbacuju uskim statičkim prozorom pre taktičke provere.
  const prozorKandidata = elo >= 1300
    ? 1_000
    : elo === 1100 ? 500 : Math.max(200, konfiguracija.tolerance + 120)
  const dodatniKandidati = elo >= 1300 ? 4 : elo === 1100 ? 2 : 0
  let kandidati = bezbedniKandidati
    .filter((kandidat) => kandidat.score >= najboljiGrubiScore - prozorKandidata)
    .slice(0, konfiguracija.rootCandidates + dodatniKandidati)
    .map((kandidat) => {
      game.move(kandidat.potez)
      const score = pretraziTakticki(
        game, konfiguracija.tacticalDepth, osnovniKontekst.engineColor, osnovniKontekst,
      )
      game.undo()
      return { potez: kandidat.potez, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, konfiguracija.rootCandidates)

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
    for (const kandidat of redosled) {
      if (isteklo(kontekst)) break
      game.move(kandidat.potez)
      // Ocene korenskih poteza koriste se za konačan izbor, pa svaka mora biti
      // tačna. Alpha prethodnog kandidata bi ovde dao samo gornju granicu za
      // lošiji potez, koju ne smemo kasnije tretirati kao punu ocenu.
      const score = pretrazi(game, dubina - 1, -Infinity, Infinity, kontekst)
      game.undo()
      if (kontekst.prekinuto) break
      sledeci.push({ potez: kandidat.potez, score })
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
