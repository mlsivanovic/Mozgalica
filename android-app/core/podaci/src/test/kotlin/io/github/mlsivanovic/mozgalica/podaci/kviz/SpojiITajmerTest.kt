package io.github.mlsivanovic.mozgalica.podaci.kviz

import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SpojiITajmerTest {
    @Test
    fun lokalniNesinhronizovanOstajeIakoServerImaDrugiOdgovor() {
        val lokalno = StanjePokusaja(
            attemptToken = "t",
            childName = "Lena",
            answers = mapOf("q1" to LokalniOdgovor(OdgovorDeteta.Broj("7"), changedAt = 50, synced = false)),
            hintsUsed = 1,
            hintovi = mapOf("q9" to "lokalni"),
        )
        val spojeno = spojiOdgovore(
            lokalno = lokalno,
            accessMode = "profile",
            profileToken = "profil",
            childName = "Lena",
            hintsUsed = 2,
            savedAnswers = mapOf(
                "q1" to OdgovorDeteta.Broj("1"),
                "q2" to OdgovorDeteta.Jedan("a"),
            ),
            hintoviSaPitanja = mapOf("q3" to "sa servera"),
        )
        assertEquals(OdgovorDeteta.Broj("7"), spojeno.answers.getValue("q1").answer)
        assertFalse(spojeno.answers.getValue("q1").synced)
        assertEquals(0L, spojeno.answers.getValue("q2").changedAt)
        assertTrue(spojeno.answers.getValue("q2").synced)
        assertEquals(OdgovorDeteta.Jedan("a"), spojeno.answers.getValue("q2").answer)
        assertEquals("lokalni", spojeno.hintovi?.get("q9"))
        assertEquals("sa servera", spojeno.hintovi?.get("q3"))
        assertEquals(2, spojeno.hintsUsed)
    }

    @Test
    fun prazanServerNePrepisujePostojeciKljuc() {
        val lokalno = StanjePokusaja(
            attemptToken = "t",
            childName = "A",
            accessMode = "generic",
            answers = mapOf("q1" to LokalniOdgovor(OdgovorDeteta.Tekst("beograd"), 10, synced = true)),
        )
        val spojeno = spojiOdgovore(lokalno, null, null, null, null, emptyMap(), emptyMap())
        assertEquals("generic", spojeno.accessMode)
        assertEquals("A", spojeno.childName)
        assertEquals(0, spojeno.hintsUsed)
        assertEquals(OdgovorDeteta.Tekst("beograd"), spojeno.answers.getValue("q1").answer)
        assertTrue(spojeno.answers.getValue("q1").synced)
    }

    @Test
    fun spojiSaSnimkomResumeNeGubiLokalniOdgovor() {
        val telo = ucitajUgovor("resume_attempt.json")
        val server = (protumaciPokusaj(telo) as IshodPokusaja.Uspesan).pokusaj
        val lokalno = StanjePokusaja(
            attemptToken = server.attemptToken,
            childName = "Staro ime",
            answers = mapOf(server.questions.first().id to LokalniOdgovor(OdgovorDeteta.Jedan("b"), 80, synced = false)),
        )
        val spojeno = spojiSaServerom(lokalno, server)
        assertEquals(OdgovorDeteta.Jedan("b"), spojeno.answers.getValue(server.questions.first().id).answer)
        assertFalse(spojeno.answers.getValue(server.questions.first().id).synced)
        assertTrue(spojeno.answers.size > 1)
        assertEquals("Zbroj dva para.", spojeno.hintovi?.get(server.questions.first().id))
        assertEquals(server.childName, spojeno.childName)
    }

    @Test
    fun generickiRokKoristiOffsetServera() {
        val deadline = 1_000_000L
        val lokalno = 960_000L
        val offset = 900_000L - lokalno
        assertEquals(100, preostaloDoRoka(deadline, offset, lokalno))
        assertEquals(40, preostaloDoRoka(deadline, 0, lokalno))
        assertTrue(istekaoRok(deadline, offset, lokalno + 100_000))
        assertFalse(istekaoRok(deadline, offset, lokalno + 99_000))
    }

    @Test
    fun profilniSatStajeDokJeSakrivenITraziPredajuNaNuli() {
        val sat = ProfilniSat(5)
        assertEquals(5, sat.otkucaj(0, vidljivo = true).preostalo)
        assertEquals(3, sat.otkucaj(2_000, vidljivo = true).preostalo)
        val sakriven = sat.otkucaj(12_000, vidljivo = false)
        assertEquals(3, sakriven.preostalo)
        assertNull(sakriven.checkpoint)
        val nastavak = sat.otkucaj(20_000, vidljivo = true)
        assertEquals(3, nastavak.preostalo)
        val kraj = sat.otkucaj(23_000, vidljivo = true)
        assertTrue(kraj.istekao)
        assertEquals(0, kraj.checkpoint)
        assertEquals(0, kraj.preostalo)
    }

    @Test
    fun profilniCheckpointIdeNaPetSekundiSamoDokJeVidljiv() {
        val sat = ProfilniSat(30)
        sat.otkucaj(0, true)
        val posle = sat.otkucaj(5_000, true)
        assertEquals(25, posle.preostalo)
        assertEquals(25, posle.checkpoint)
    }

    @Test
    fun checkpointSeNeSaljeBezMreze() {
        assertTrue(odlukaCheckpointa(40, naMrezi = false) is OdlukaCheckpointa.Sacuvaj)
        assertEquals(40, (odlukaCheckpointa(40, true) as OdlukaCheckpointa.Posalji).sekunde)
    }

    @Test
    fun rezimPratiProfilIRok() {
        assertEquals(RezimTajmera.PROFILNI, rezimTajmera("profile", null, 600))
        assertEquals(RezimTajmera.ROK, rezimTajmera("generic", "2026-11-14T11:00:00Z", null))
        assertEquals(RezimTajmera.NEMA, rezimTajmera("generic", null, null))
    }

    @Test
    fun lokalnoPotrosenoVremeNeRasteSaServerom() {
        assertEquals(20, spojiPreostalo(20, 40))
        assertEquals(40, spojiPreostalo(null, 40))
    }

    @Test
    fun isoIzSnimkaSeCita() {
        val ms = isoUMilisekunde("2026-11-14T11:08:09.73283+00:00")
        assertTrue(ms > 0)
    }

    @Test
    fun swipeNeIdePrekoNumpadaNiFokusaTeksta() {
        assertFalse(dozvoljenSwipe("numeric", false))
        assertFalse(dozvoljenSwipe("text", true))
        assertTrue(dozvoljenSwipe("text", false))
        assertTrue(dozvoljenSwipe("single", false))
    }

    @Test
    fun uparivanjeRadiDodiromBezPovlacenja() {
        var stanje = UparivanjeStanje()
        stanje = dodirLevo(stanje, "l1")
        stanje = dodirDesno(stanje, "r1")
        assertEquals("r1", stanje.parovi["l1"])
        assertEquals(0, bojaPara(stanje.parovi, "l1"))
        stanje = dodirLevo(stanje, "l2")
        stanje = dodirDesno(stanje, "r1")
        assertEquals("r1", stanje.parovi["l2"])
        assertFalse(stanje.parovi.containsKey("l1"))
        stanje = dodirLevo(UparivanjeStanje(stanje.parovi), "l2")
        assertTrue(stanje.parovi.isEmpty())
    }

    @Test
    fun numpadNeOtvaraSlovaIZadrzavaZarez() {
        assertEquals("12", numpadUnos(numpadUnos("", "1"), "2"))
        assertEquals("12,", numpadUnos("12", ","))
        assertEquals("12,", numpadUnos("12,", ","))
        assertEquals("-12", numpadUnos("12", "-"))
        assertEquals("1", numpadUnos("12", "briši"))
    }

}

private fun ucitajUgovor(ime: String): String =
    checkNotNull(SpojiITajmerTest::class.java.getResourceAsStream("/ugovori/$ime")).bufferedReader().readText()
