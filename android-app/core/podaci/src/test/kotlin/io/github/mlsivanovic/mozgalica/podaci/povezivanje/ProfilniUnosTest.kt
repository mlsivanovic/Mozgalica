package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProfilniUnosTest {
    private val token = "s6x6i9AdsRRuadngZOWYI_OEpi95grqI"

    @Test
    fun izdvajaTokenIzPunogProfilnogLinka() {
        assertEquals(token, izdvojiProfilniToken("https://primer.test/Mozgalica/#/dete/$token"))
        assertEquals(token, izdvojiProfilniToken("https://mlsivanovic.github.io/Mozgalica/#/dete/$token"))
    }

    @Test
    fun prihvataSamToken() {
        assertEquals(token, izdvojiProfilniToken("  $token  "))
    }

    @Test
    fun odbijaTudjeOblici() {
        assertNull(izdvojiProfilniToken(""))
        assertNull(izdvojiProfilniToken("kratak-token"))
        assertNull(izdvojiProfilniToken("https://primer.rs/#/admin"))
        assertNull(izdvojiProfilniToken("https://primer.test/Mozgalica/#/kviz/$token"))
        assertNull(izdvojiProfilniToken("tekst $token u recenici"))
    }
}
