package io.github.mlsivanovic.mozgalica.navigacija

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DonjaNavigacijaTest {
    @Test
    fun taboviImajuTrakuAFokusiraneRuteNemaju() {
        assertTrue(prikazujeDonjuNavigaciju(Odrediste.POCETNA))
        assertTrue(prikazujeDonjuNavigaciju(Odrediste.RASPORED))
        assertTrue(prikazujeDonjuNavigaciju(Odrediste.NAGRADE))
        assertTrue(prikazujeDonjuNavigaciju(Odrediste.REZULTATI))
        assertFalse(prikazujeDonjuNavigaciju(Odrediste.KVIZ))
        assertFalse(prikazujeDonjuNavigaciju(Odrediste.SAH))
        assertFalse(prikazujeDonjuNavigaciju(Odrediste.POVEZIVANJE))
    }
}
