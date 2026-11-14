package io.github.mlsivanovic.mozgalica.sah

import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.PieceType
import io.github.mlsivanovic.mozgalica.podaci.SahPotez
import io.github.mlsivanovic.mozgalica.podaci.SahStanjeOdgovor
import io.github.mlsivanovic.mozgalica.podaci.sah.IshodSaha
import io.github.mlsivanovic.mozgalica.podaci.sah.SahAkcija
import io.github.mlsivanovic.mozgalica.podaci.sah.SahPotezUnos
import io.github.mlsivanovic.mozgalica.podaci.sah.protumaciSah
import io.github.mlsivanovic.mozgalica.podaci.sah.sahZahtev
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SahLogikaTest {
    @Test
    fun formatSataPrikazujeMinuteISekunde() {
        assertEquals("∞", formatSat(null))
        assertEquals("0:00", formatSat(0))
        assertEquals("0:01", formatSat(1))
        assertEquals("1:00", formatSat(60_000))
        assertEquals("10:00", formatSat(600_000))
        assertEquals("0:00", formatSat(-5))
    }

    @Test
    fun poljaPotezaRadiZaUciSaPromocijom() {
        assertEquals(PotezPolja("e2", "e4"), poljaPoteza("e2e4"))
        assertEquals(PotezPolja("e7", "e8"), poljaPoteza("e7e8q"))
        assertEquals(null, poljaPoteza(null))
        assertEquals(null, poljaPoteza("e2"))
    }

    @Test
    fun pregledPocetkaIKraja() {
        val potezi = listOf(
            potez(1, "e2e4", "e4", "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"),
            potez(2, "e7e5", "e5", "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"),
        )
        val pocetak = pozicijaPregleda(potezi, 0)
        assertEquals(POCETNI_FEN, pocetak.fen)
        assertEquals(null, pocetak.lastMove)

        val kraj = pozicijaPregleda(potezi, 2)
        assertEquals("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", kraj.fen)
        assertEquals(PotezPolja("e7", "e5"), kraj.lastMove)
        assertEquals("e5", kraj.san)

        assertEquals(0, ogranicenPlyPregleda(-1, 2))
        assertEquals(0, ogranicenPlyPregleda(-3, 2))
        assertEquals(2, ogranicenPlyPregleda(9, 2))
    }

    @Test
    fun ponovniPokusajNudiSamoIstuIliSlabijuJacinu() {
        assertEquals(listOf(1100, 900, 700), dozvoljeniEloZaPokusaj(1100))
        assertEquals(listOf(700), dozvoljeniEloZaPokusaj(700))
        assertEquals(emptyList<Int>(), dozvoljeniEloZaPokusaj(500))
        assertEquals(3, preostaloPokusaja(0))
        assertEquals(1, preostaloPokusaja(2))
        assertEquals(0, preostaloPokusaja(5))
    }

    @Test
    fun satPostujeOdlaganjeStarta() {
        val osnovno = sahStanje(
            status = "in_progress",
            turnColor = "black",
            clockSeconds = 300,
            whiteRemainingMs = 300_000,
            blackRemainingMs = 300_000,
            serverNow = "2026-11-14T12:00:00Z",
            turnStartedAt = "2026-11-14T12:00:01Z",
        )
        val primljeno = 1_000_000L
        val rano = satovi(osnovno, primljeno, primljeno + 500)
        assertEquals(300_000L, rano.black)
        val kasnije = satovi(osnovno, primljeno, primljeno + 3_500)
        assertEquals(297_500L, kasnije.black)
        assertEquals(300_000L, kasnije.white)
    }

    @Test
    fun porukePokrivajuKljucneGreske() {
        assertTrue(porukaSaha("illegal_move").contains("dozvoljen"))
        assertTrue(porukaSaha("undo_unavailable").contains("poništiti"))
        assertTrue(porukaSaha("nepoznato").isNotBlank())
    }

    @Test
    fun uciSeCitaBezObziraNaVelicinuSlova() {
        assertEquals(Square.E4, square("e4"))
        assertEquals(Square.E4, square("E4"))
        assertEquals(null, square("z9"))
        assertEquals(null, square(null))
    }

    @Test
    fun zahtevSaljeMalaSlovaIPromociju() {
        val telo = sahZahtev(
            playToken = "token",
            akcija = SahAkcija.DETE_POTEZ,
            expectedRevision = 3,
            potez = SahPotezUnos("e7", "e8", "q"),
            requestId = "req",
        )
        assertEquals("child_move", telo["action"]!!.jsonPrimitive.content)
        assertEquals("e7", telo["move"]!!.jsonObject["from"]!!.jsonPrimitive.content)
        assertEquals("q", telo["move"]!!.jsonObject["promotion"]!!.jsonPrimitive.content)
        assertEquals(3, telo["expectedRevision"]!!.jsonPrimitive.content.toInt())
    }

    @Test
    fun greskaSaServeraSePretvaraUKod() {
        val ishod = protumaciSah("""{"ok":false,"error":"stale"}""")
        assertTrue(ishod is IshodSaha.Odbijen)
        assertEquals("stale", (ishod as IshodSaha.Odbijen).kod)
    }

    @Test
    fun chesslibPrihvataPocetnuPozicijuIPromociju() {
        val tabla = Board()
        assertEquals(20, tabla.legalMoves().size)
        val e4 = tabla.legalMoves().first { it.from == Square.E2 && it.to == Square.E4 }
        assertTrue(tabla.doMove(e4))

        val promocija = Board()
        promocija.loadFromFen("8/P7/8/8/8/8/8/K6k w - - 0 1")
        val potezi = promocija.legalMoves().filter { it.from == Square.A7 && it.to == Square.A8 }
        assertTrue(potezi.any { it.promotion?.pieceType == PieceType.QUEEN })
        assertTrue(potezi.any { it.promotion?.pieceType == PieceType.KNIGHT })
        val dama = potezi.first { it.promotion?.pieceType == PieceType.QUEEN }
        assertNotNull(dama)
        assertTrue(promocija.doMove(dama))
    }

    @Test
    fun chesslibPrepoznajeSah() {
        val tabla = Board()
        tabla.loadFromFen("7k/8/8/8/8/8/4r3/4K3 w - - 0 1")
        assertTrue(tabla.isKingAttacked())
        assertFalse(tabla.isMated())
    }

    private fun potez(ply: Int, uci: String, san: String, fen: String) = SahPotez(
        ply = ply,
        player = if (ply % 2 == 1) "child" else "engine",
        color = if (ply % 2 == 1) "white" else "black",
        uci = uci,
        san = san,
        fenAfter = fen,
        movedAt = "2026-11-14T12:00:00Z",
        whiteRemainingMs = null,
        blackRemainingMs = null,
    )

    private fun sahStanje(
        status: String,
        turnColor: String,
        clockSeconds: Int?,
        whiteRemainingMs: Long?,
        blackRemainingMs: Long?,
        serverNow: String,
        turnStartedAt: String?,
    ) = SahStanjeOdgovor(
        ok = true,
        status = status,
        revision = 1,
        playToken = "token-token-token-token",
        profileToken = "profil-token",
        childName = "Proba",
        childColor = "white",
        approximateElo = 700,
        clockSeconds = clockSeconds,
        fen = POCETNI_FEN,
        turnColor = turnColor,
        turnStartedAt = turnStartedAt,
        whiteRemainingMs = whiteRemainingMs,
        blackRemainingMs = blackRemainingMs,
        serverNow = serverNow,
        result = null,
        termination = null,
        starsAwarded = null,
        retriesUsed = 0,
        retryAvailable = false,
        undoAvailable = false,
        moves = emptyList(),
    )
}
