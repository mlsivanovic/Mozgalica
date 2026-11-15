package io.github.mlsivanovic.mozgalica.sah

import com.github.bhlangonijr.chesslib.Square
import io.github.mlsivanovic.mozgalica.podaci.SahPotez
import io.github.mlsivanovic.mozgalica.podaci.SahStanjeOdgovor

enum class SahFaza {
    MIRUJE,
    CUVANJE,
    RAZMISLJANJE,
    NAJAVA,
    ANIMACIJA,
    PONISTAVANJE,
}

data class PotezPolja(val from: String, val to: String)

const val PAUZA_PRE_RACUNARA_MS = 6_000L
const val PAUZA_PRE_RACUNARA_SEKUNDI = PAUZA_PRE_RACUNARA_MS / 1000
const val NAJAVA_POTEZA_MS = 800L
const val ANIMACIJA_RACUNARA_MS = 1_000L
const val PODRAZUMEVANA_ANIMACIJA_MS = 180L
const val MAKSIMALNO_PONOVNIH_SAHA = 3
val SAH_ELO_NIVOI = listOf(700, 900, 1100, 1300, 1500)
const val POCETNI_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

fun square(ime: String?): Square? =
    ime?.let { runCatching { Square.fromValue(it.uppercase()) }.getOrNull() }

fun poljaPoteza(uci: String?): PotezPolja? =
    if (uci != null && uci.length >= 4) PotezPolja(uci.substring(0, 2), uci.substring(2, 4)) else null

fun formatSat(ms: Long?): String {
    if (ms == null) return "∞"
    val ukupno = (ms.coerceAtLeast(0) + 999) / 1000
    return "${ukupno / 60}:${(ukupno % 60).toString().padStart(2, '0')}"
}

fun rezultatTekst(result: String?): String = when (result) {
    "child_win" -> "Pobeda!"
    "draw" -> "Nerešeno"
    "child_loss" -> "Računar je pobedio"
    else -> "Partija je završena"
}

fun razlogTekst(razlog: String?): String = when (razlog) {
    "checkmate" -> "mat"
    "stalemate" -> "pat"
    "threefold_repetition" -> "trostruko ponavljanje"
    "fifty_move" -> "pravilo 50 poteza"
    "insufficient_material" -> "nedovoljno materijala"
    "timeout" -> "istek vremena"
    "resignation" -> "Predaja"
    "draw" -> "remi po pravilima"
    null, "" -> ""
    else -> razlog
}

fun porukaSaha(kod: String?): String = when (kod) {
    "not_found" -> "Partija nije pronađena."
    "invalid_request" -> "Zahtev nije ispravan."
    "not_in_progress" -> "Partija nije u toku."
    "not_child_turn" -> "Sačekaj potez računara."
    "not_engine_turn" -> "Računar sada nije na potezu."
    "invalid_move" -> "Izaberi početno i završno polje."
    "invalid_promotion" -> "Izbor figure za promociju nije ispravan."
    "illegal_move" -> "Taj potez nije dozvoljen."
    "undo_unavailable" -> "Ovaj potez više nije moguće poništiti."
    "retry_not_allowed" -> "Ovu partiju više nije moguće ponoviti."
    "invalid_elo" -> "Izabrana jačina protivnika nije ispravna."
    "elo_too_high" -> "Možeš izabrati samo istu ili slabiju jačinu protivnika."
    "retries_exhausted" -> "Nemaš više pravo na ponovni pokušaj."
    "server_error", null -> "Partija trenutno nije dostupna. Pokušaj ponovo."
    else -> kod
}

fun ogranicenPlyPregleda(ply: Int, brojPoteza: Int): Int {
    if (brojPoteza <= 0) return 0
    return ply.coerceIn(0, brojPoteza)
}

data class PozicijaPregleda(
    val fen: String,
    val lastMove: PotezPolja?,
    val san: String?,
)

fun pozicijaPregleda(potezi: List<SahPotez>, ply: Int): PozicijaPregleda {
    val n = ogranicenPlyPregleda(ply, potezi.size)
    if (n == 0) return PozicijaPregleda(POCETNI_FEN, null, null)
    val potez = potezi[n - 1]
    return PozicijaPregleda(potez.fenAfter, poljaPoteza(potez.uci), potez.san)
}

fun plyZaBrojPoteza(broj: Int, brojPoteza: Int): Int {
    val beli = broj * 2 - 1
    val crni = broj * 2
    return if (crni <= brojPoteza) crni else ogranicenPlyPregleda(beli, brojPoteza)
}

fun dozvoljeniEloZaPokusaj(porazeniElo: Int): List<Int> =
    SAH_ELO_NIVOI.filter { it <= porazeniElo }.sortedDescending()

fun preostaloPokusaja(retriesUsed: Int?): Int =
    (MAKSIMALNO_PONOVNIH_SAHA - (retriesUsed ?: 0)).coerceAtLeast(0)

data class Satovi(val white: Long?, val black: Long?)

// Isti obračun kao web: sat teče od trenutka prijema stanja, uz odlaganje
// `turnStartedAt - serverNow` koje server koristi da sačeka animaciju poteza.
fun satovi(stanje: SahStanjeOdgovor, primljenoAt: Long, sada: Long): Satovi {
    var white = stanje.whiteRemainingMs
    var black = stanje.blackRemainingMs
    if (stanje.status == "in_progress" && stanje.clockSeconds != null) {
        val startTekst = stanje.turnStartedAt
        val odlaganje = if (startTekst != null) {
            val start = isoMillis(startTekst)
            val server = isoMillis(stanje.serverNow)
            if (start != null && server != null) (start - server).coerceAtLeast(0) else 0L
        } else {
            0L
        }
        val proteklo = (sada - primljenoAt - odlaganje).coerceAtLeast(0)
        if (stanje.turnColor == "white" && white != null) white = (white - proteklo).coerceAtLeast(0)
        if (stanje.turnColor == "black" && black != null) black = (black - proteklo).coerceAtLeast(0)
    }
    return Satovi(white, black)
}

private fun isoMillis(tekst: String): Long? =
    runCatching { java.time.Instant.parse(tekst).toEpochMilli() }.getOrNull()

fun tekstFaze(faza: SahFaza, deteNaPotezu: Boolean): String = when (faza) {
    SahFaza.CUVANJE -> "Čuvam potez…"
    SahFaza.PONISTAVANJE -> "Poništavam potez…"
    SahFaza.NAJAVA -> "Računar će odigrati…"
    SahFaza.ANIMACIJA -> "Računar igra…"
    SahFaza.RAZMISLJANJE -> "Računar razmišlja…"
    SahFaza.MIRUJE -> if (deteNaPotezu) "Tvoj potez" else "Kratka pauza"
}

/** Figure koje je strana uzela (redom od najvrednije) i materijalna prednost belog u pešacima. */
data class UzeteFigure(
    val uzeoBeli: List<Char>,
    val uzeoCrni: List<Char>,
    val prednostBelog: Int,
)

private val POCETNO = mapOf('p' to 8, 'n' to 2, 'b' to 2, 'r' to 2, 'q' to 1)
private val VREDNOST = mapOf('p' to 1, 'n' to 3, 'b' to 3, 'r' to 5, 'q' to 9)
private val REDOSLED = listOf('q', 'r', 'b', 'n', 'p')

// Brojimo figure iz FEN-a; promocija može da „vrati" figuru, pa negativne razlike odsecamo.
fun uzeteFigure(fen: String): UzeteFigure {
    val raspored = fen.substringBefore(' ')
    fun broj(c: Char) = raspored.count { it == c }
    fun nedostaje(beli: Boolean) = REDOSLED.flatMap { tip ->
        val c = if (beli) tip.uppercaseChar() else tip
        List((POCETNO.getValue(tip) - broj(c)).coerceAtLeast(0)) { tip }
    }
    fun materijal(beli: Boolean) = VREDNOST.entries.sumOf { (tip, v) -> v * broj(if (beli) tip.uppercaseChar() else tip) }
    return UzeteFigure(
        uzeoBeli = nedostaje(beli = false),
        uzeoCrni = nedostaje(beli = true),
        prednostBelog = materijal(true) - materijal(false),
    )
}
