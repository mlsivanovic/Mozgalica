package io.github.mlsivanovic.mozgalica.profil

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TekstTest {
    @Test
    fun rezultatIRasporedIObavestenje() {
        assertEquals("66.7%", formatProcenat(66.7))
        assertEquals("100%", formatProcenat(100.0))
        assertEquals("Čeka pregled", tekstRezultata(true, 66.7))
        assertEquals("Pobeda", tekstIshoda("child_win"))
        assertEquals("Remi", tekstIshoda("draw"))
        assertEquals("Poraz", tekstIshoda("engine_win"))
        assertEquals("bez sata", tekstSata(null))
        assertEquals("10+0", tekstSata(600))
        assertEquals("Ana · uč. 12", detaljCasa("Ana", "12"))
        assertNull(detaljCasa(null, null))
        assertEquals("1. čas", nazivCasa(1))
        assertEquals("Pretčas", nazivCasa(0))
        assertEquals("Prepodnevna smena", nazivSmene("morning"))
        assertEquals("Subota", nazivDana(6))
        assertTrue(formatDatum("2026-11-14T11:08:09.73283+00:00").contains("2026"))
        assertEquals(CiljObavestenja.Kviz("nativeugovorkviz00000001"), ciljObavestenja("/kviz/nativeugovorkviz00000001"))
        assertEquals(CiljObavestenja.Sah("nativeugovorsah000000001"), ciljObavestenja("/sah/nativeugovorsah000000001"))
        assertNull(ciljObavestenja("/admin/rezultati/1"))
    }
}
