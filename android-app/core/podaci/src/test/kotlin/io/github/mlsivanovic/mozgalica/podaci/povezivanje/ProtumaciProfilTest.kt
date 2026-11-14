package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProtumaciProfilTest {
    @Test
    fun ugovorSePrevodiUKesBezTokena() {
        val telo = checkNotNull(javaClass.getResourceAsStream("/ugovori/get_child_profile.json"))
            .bufferedReader()
            .readText()
        val ishod = protumaciProfil(telo)
        assertTrue(ishod is IshodUcitavanja.Uspesan)
        val profil = (ishod as IshodUcitavanja.Uspesan).profil
        assertEquals("Proba Native", profil.ime)
        assertEquals("🦊", profil.avatar)
        assertEquals(7, profil.ukupnoZvezdica)
        assertEquals(6, profil.raspolozivoZvezdica)
        assertEquals("ShadowNoob Empowered", profil.titula)
        assertEquals("Matematika — Proba Native", profil.aktivniKvizovi.single().title)
        assertEquals(1, profil.istorijaKvizova.size)
        assertEquals(false, profil.istorijaKvizova.single().pendingReview)
        assertEquals(1, profil.aktivnePartije.size)
        assertEquals(1, profil.istorijaSaha.size)
    }

    @Test
    fun notFoundNeCuvaProfil() {
        val ishod = protumaciProfil("""{"ok":false,"error":"not_found"}""")
        assertEquals(IshodUcitavanja.NijePronadjen, ishod)
    }
}
