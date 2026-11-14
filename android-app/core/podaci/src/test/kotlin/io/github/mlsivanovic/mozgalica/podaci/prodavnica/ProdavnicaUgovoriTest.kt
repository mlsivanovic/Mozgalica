package io.github.mlsivanovic.mozgalica.podaci.prodavnica

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProdavnicaUgovoriTest {
    @Test
    fun uspesnaProdavnicaSeParsiraStrogo() {
        val telo = """{"ok":true,"name":"Ana","avatar":"🦊","balance":5,"totalStars":5,"items":[],"purchases":[]}"""
        val ishod = protumaciProdavnicu(telo)
        assertTrue(ishod is IshodProdavnice.Uspesna)
        assertEquals(5, (ishod as IshodProdavnice.Uspesna).podaci.balance)
    }

    @Test
    fun greskaProdavniceNeZahtevaSvaPolja() {
        val ishod = protumaciProdavnicu("""{"ok":false,"error":"not_found"}""")
        assertTrue(ishod is IshodProdavnice.Odbijena)
        assertEquals("not_found", (ishod as IshodProdavnice.Odbijena).kod)
    }

    @Test
    fun nepotpunaUspesnaProdavnicaJeNeuspesna() {
        val ishod = protumaciProdavnicu("""{"ok":true,"balance":5}""")
        assertTrue(ishod is IshodProdavnice.Neuspesna)
    }

    @Test
    fun uspesnaKupovinaSeParsira() {
        val ishod = protumaciKupovinu("""{"ok":true,"purchaseId":"p","newBalance":2}""")
        assertTrue(ishod is IshodKupovine.Uspesna)
        assertEquals(2, (ishod as IshodKupovine.Uspesna).odgovor.newBalance)
    }

    @Test
    fun nedovoljanBalansNosCenuIBalans() {
        val ishod = protumaciKupovinu("""{"ok":false,"error":"insufficient_balance","balance":5,"cost":14}""")
        assertTrue(ishod is IshodKupovine.Odbijena)
        val odbijena = ishod as IshodKupovine.Odbijena
        assertEquals("insufficient_balance", odbijena.kod)
        assertEquals(5, odbijena.balance)
        assertEquals(14, odbijena.cost)
    }

    @Test
    fun nepoznatoTeloJeNeuspeh() {
        assertTrue(protumaciKupovinu("nije json") is IshodKupovine.Neuspesna)
    }
}
