package io.github.mlsivanovic.mozgalica.podaci.kviz

import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflineRedTest {
    @Test
    fun upisujeIUcitavaStanjePokusaja() {
        val s = memorija()
        zapocniStanje(s, "kviz1", "token-abc", "Lena")
        val ucitano = ucitajStanje(s, "kviz1")
        assertEquals("token-abc", ucitano?.attemptToken)
        assertEquals("Lena", ucitano?.childName)
    }

    @Test
    fun noviOdgovorJeNesinhronizovanDokServerNePotvrdi() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kviz1", "t", "Vuk")
        stanje = upisiOdgovor(s, "kviz1", stanje, "q1", OdgovorDeteta.Broj("42"))
        assertFalse(sveSinhronizovano(stanje))
        assertEquals(listOf("q1"), nesinhronizovani(stanje).keys.toList())

        stanje = oznaciSinhronizovane(s, "kviz1", stanje, mapOf("q1" to OdgovorDeteta.Broj("42")), System.currentTimeMillis() + 1)
        assertTrue(sveSinhronizovano(stanje))
        assertTrue(nesinhronizovani(stanje).isEmpty())
    }

    @Test
    fun odgovorPromenjenPosleSlanjaOstajeNesinhronizovan() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kviz1", "t", "Iva")
        stanje = upisiOdgovor(s, "kviz1", stanje, "q1", OdgovorDeteta.Broj("1"))
        val vremeSlanja = System.currentTimeMillis() - 1000
        stanje = oznaciSinhronizovane(s, "kviz1", stanje, mapOf("q1" to OdgovorDeteta.Broj("1")), vremeSlanja)
        assertFalse(sveSinhronizovano(stanje))
    }

    @Test
    fun stanjePrezivljavaPonovnoUcitavanje() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kvizX", "tajni", "Maša")
        stanje = upisiOdgovor(s, "kvizX", stanje, "q7", OdgovorDeteta.Jedan("o2"))
        val posle = ucitajStanje(s, "kvizX")
        assertEquals(OdgovorDeteta.Jedan("o2"), posle?.answers?.get("q7")?.answer)
        assertEquals(false, posle?.answers?.get("q7")?.synced)
    }

    @Test
    fun pokvarenJsonNeRusiAplikaciju() {
        val s = memorija()
        s.setItem(kljucPokusaja("los"), "{nije json")
        assertNull(ucitajStanje(s, "los"))
    }

    @Test
    fun skladisteKojeBacaNeRusiAplikaciju() {
        val eksplozivno = object : Skladiste {
            override fun getItem(key: String): String? = throw IllegalStateException("kvota")
            override fun setItem(key: String, value: String) = throw IllegalStateException("kvota")
            override fun removeItem(key: String) = throw IllegalStateException("kvota")
        }
        assertNull(ucitajStanje(eksplozivno, "x"))
        zapocniStanje(eksplozivno, "x", "t", "A")
        obrisiStanje(eksplozivno, "x")
    }

    @Test
    fun brisanjeStanjaCistiSkladiste() {
        val s = memorija()
        zapocniStanje(s, "kviz1", "t", "Vuk")
        obrisiStanje(s, "kviz1")
        assertNull(ucitajStanje(s, "kviz1"))
    }

    @Test
    fun cuvaPodatkeZaPovratakNaProfil() {
        val s = memorija()
        zapocniStanje(s, "profilni-kviz", "attempt-token", "Andreja", accessMode = "profile", profileToken = "profil-token")
        val ucitano = ucitajStanje(s, "profilni-kviz")
        assertEquals("attempt-token", ucitano?.attemptToken)
        assertEquals("Andreja", ucitano?.childName)
        assertEquals("profile", ucitano?.accessMode)
        assertEquals("profil-token", ucitano?.profileToken)
    }

    @Test
    fun otkljucanSavetPrezivljavaUcitavanje() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kvizH", "t", "Nina")
        stanje = upisiHint(s, "kvizH", stanje, "q1", "Seti se tablice množenja.", 1)
        assertEquals(1, stanje.hintsUsed)
        assertEquals("Seti se tablice množenja.", stanje.hintovi?.get("q1"))
        val posle = ucitajStanje(s, "kvizH")
        assertEquals(1, posle?.hintsUsed)
        assertEquals("Seti se tablice množenja.", posle?.hintovi?.get("q1"))
    }

    @Test
    fun drugiSavetSeDodajeUzPrvi() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kvizH2", "t", "Filip")
        stanje = upisiHint(s, "kvizH2", stanje, "q1", "Savet 1", 1)
        stanje = upisiHint(s, "kvizH2", stanje, "q2", "Savet 2", 2)
        assertEquals(2, stanje.hintsUsed)
        assertEquals(mapOf("q1" to "Savet 1", "q2" to "Savet 2"), stanje.hintovi)
    }

    @Test
    fun radniListicSeCuvaLokalnoICekaSlanje() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kvizR", "t", "Miloš")
        stanje = upisiBelezku(s, "kvizR", stanje, "q1", "24 + 17 = 41")
        assertEquals(1, brojNesinhronizovanihBelezki(stanje))
        assertEquals(mapOf("q1" to "24 + 17 = 41"), belezkeZaSinhronizaciju(stanje))

        stanje = upisiBelezku(s, "kvizR", stanje, "q2", "7 · 8 = 56")
        assertEquals(
            mapOf("q1" to "24 + 17 = 41", "q2" to "7 · 8 = 56"),
            belezkeZaSinhronizaciju(stanje),
        )

        stanje = oznaciBelezkeSinhronizovane(s, "kvizR", stanje, System.currentTimeMillis() + 1)
        assertEquals(0, brojNesinhronizovanihBelezki(stanje))
        assertNull(belezkeZaSinhronizaciju(stanje))
    }

    @Test
    fun belezkaPromenjenaPosleSlanjaOstajeNesinhronizovana() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kvizR2", "t", "Ana")
        stanje = upisiBelezku(s, "kvizR2", stanje, "q1", "prvi korak")
        stanje = oznaciBelezkeSinhronizovane(s, "kvizR2", stanje, System.currentTimeMillis() - 1000)
        assertEquals(1, brojNesinhronizovanihBelezki(stanje))
    }

    @Test
    fun radniListicPrezivljavaUcitavanjeAStaroStanjeBezNjegaSeCita() {
        val s = memorija()
        var stanje = zapocniStanje(s, "kvizR3", "t", "Ana")
        stanje = upisiBelezku(s, "kvizR3", stanje, "q5", "5 + 5 = 10")
        assertEquals("5 + 5 = 10", ucitajStanje(s, "kvizR3")?.belezke?.get("q5")?.tekst)

        s.setItem(kljucPokusaja("bezradnog"), """{"attemptToken":"t","childName":"A","answers":{}}""")
        assertNull(ucitajStanje(s, "bezradnog")?.belezke)
    }

    @Test
    fun staroStanjeBezSavetaSeUcitava() {
        val s = memorija()
        s.setItem(kljucPokusaja("star"), """{"attemptToken":"t","childName":"A","answers":{}}""")
        val ucitano = ucitajStanje(s, "star")
        assertEquals("t", ucitano?.attemptToken)
        assertNull(ucitano?.hintsUsed)
        assertNull(ucitano?.hintovi)
    }
}

private class Memorija : Skladiste {
    private val mapa = HashMap<String, String>()
    override fun getItem(key: String): String? = mapa[key]
    override fun setItem(key: String, value: String) { mapa[key] = value }
    override fun removeItem(key: String) { mapa.remove(key) }
}

private fun memorija(): Skladiste = Memorija()
