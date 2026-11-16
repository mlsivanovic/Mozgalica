package io.github.mlsivanovic.mozgalica.kviz

import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.kviz.LokalnaBelezka
import io.github.mlsivanovic.mozgalica.podaci.kviz.LokalniOdgovor
import io.github.mlsivanovic.mozgalica.podaci.kviz.StanjePokusaja
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TekstPoljeStanjeTest {
    @Test
    fun kucanjeCuvaPozicijuKursoraBezResetovanja() {
        val poslato = mutableListOf<String>()
        val stanje = TekstPoljeStanje(pocetni = "", maks = 2000) { poslato += it }

        stanje.naPromenu(TextFieldValue("2", selection = TextRange(1), composition = TextRange(0, 1)))
        assertEquals("2", stanje.vrednost.text)
        assertEquals(TextRange(1), stanje.vrednost.selection)
        assertEquals(TextRange(0, 1), stanje.vrednost.composition)

        // Simulacija asinhronog povratka iste vrednosti iz baze ne sme da pomeri kursor
        stanje.uskladiSpolja("2")
        assertEquals(TextRange(1), stanje.vrednost.selection)
        assertEquals(TextRange(0, 1), stanje.vrednost.composition)

        stanje.naPromenu(TextFieldValue("24", selection = TextRange(2)))
        assertEquals("24", stanje.vrednost.text)
        assertEquals(TextRange(2), stanje.vrednost.selection)
        assertEquals(listOf("2", "24"), poslato)
    }

    @Test
    fun umetanjeUSredinuCuvaKursorIPomeraj() {
        val stanje = TekstPoljeStanje(pocetni = "24", maks = 2000) {}
        stanje.naPromenu(TextFieldValue("24", selection = TextRange(1)))
        stanje.naPromenu(TextFieldValue("204", selection = TextRange(2)))

        assertEquals("204", stanje.vrednost.text)
        assertEquals(TextRange(2), stanje.vrednost.selection)
    }

    @Test
    fun prekoracenjeDuzineSkracujeTekstIKursor() {
        val skraceno = ograniciUnos(
            TextFieldValue("123456", selection = TextRange(6), composition = TextRange(2, 6)),
            maks = 4,
        )
        assertEquals("1234", skraceno.text)
        assertEquals(TextRange(4), skraceno.selection)
        assertEquals(TextRange(2, 4), skraceno.composition)

        val praznaKompozicija = ograniciUnos(
            TextFieldValue("123456", selection = TextRange(6), composition = TextRange(4, 6)),
            maks = 4,
        )
        assertNull(praznaKompozicija.composition)
    }

    @Test
    fun brisanjeIsprazniPoljeISpoljnaPromenaSeUskladjuje() {
        val poslato = mutableListOf<String>()
        val stanje = TekstPoljeStanje(pocetni = "24 + 17", maks = 2000) { poslato += it }
        assertEquals(TextRange(7), stanje.vrednost.selection)

        stanje.postavi("")
        assertEquals("", stanje.vrednost.text)
        assertEquals(TextRange(0), stanje.vrednost.selection)
        assertEquals(listOf(""), poslato)

        // Spoljna promena (npr. nastavak pokusaja sa servera) menja polje i stavlja kursor na kraj
        stanje.uskladiSpolja("10 + 5")
        assertEquals("10 + 5", stanje.vrednost.text)
        assertEquals(TextRange(6), stanje.vrednost.selection)
    }

    @Test
    fun spojiSvezijeStanjeNeVracaStarijiSnimakIzBaze() {
        val novije = StanjePokusaja(
            attemptToken = "att-1",
            childName = "Luka",
            answers = mapOf("q1" to LokalniOdgovor(OdgovorDeteta.Tekst("pet"), changedAt = 200L, synced = false)),
            belezke = mapOf("q1" to LokalnaBelezka("24 + 17", changedAt = 200L, synced = false)),
        )
        val starije = StanjePokusaja(
            attemptToken = "att-1",
            childName = "Luka",
            answers = mapOf("q1" to LokalniOdgovor(OdgovorDeteta.Tekst("pe"), changedAt = 100L, synced = false)),
            belezke = mapOf("q1" to LokalnaBelezka("24", changedAt = 100L, synced = false)),
        )

        val spojeno = spojiSvezijeStanje(novije, starije)!!
        assertEquals("24 + 17", spojeno.belezke?.get("q1")?.tekst)
        assertEquals(OdgovorDeteta.Tekst("pet"), spojeno.answers["q1"]?.answer)

        // Potvrda sinhronizacije sa istim changedAt se prihvata
        val sinhronizovano = novije.copy(
            belezke = mapOf("q1" to LokalnaBelezka("24 + 17", changedAt = 200L, synced = true)),
        )
        val posleSync = spojiSvezijeStanje(novije, sinhronizovano)!!
        assertTrue(posleSync.belezke?.get("q1")?.synced == true)
    }
}
