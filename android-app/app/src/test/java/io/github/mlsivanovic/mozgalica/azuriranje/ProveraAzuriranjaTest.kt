package io.github.mlsivanovic.mozgalica.azuriranje

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProveraAzuriranjaTest {
    private val odgovor = """
        {
          "tag_name": "android-v1.0.3",
          "name": "Android 1.0.3",
          "body": "Native aplikacija.",
          "assets": [
            {
              "name": "Mozgalica.apk",
              "size": 4498760,
              "digest": "sha256:414bc032",
              "browser_download_url": "https://github.com/mlsivanovic/Mozgalica/releases/download/android-v1.0.3/Mozgalica.apk"
            }
          ]
        }
    """.trimIndent()

    @Test
    fun citaIzdanjeSaApk() {
        val izdanje = requireNotNull(ProveraAzuriranja.izIzdanja(odgovor))
        assertEquals("1.0.3", izdanje.verzija)
        assertNull(izdanje.verzijaKod)
        assertEquals(4498760L, izdanje.velicinaBajta)
        assertEquals("sha256:414bc032", izdanje.sazetak)
        assertTrue(izdanje.adresa.endsWith("/Mozgalica.apk"))
    }

    @Test
    fun verzijaKodMozeDaStojiUOznaciIliOpisu() {
        val izOznake = requireNotNull(
            ProveraAzuriranja.izIzdanja(odgovor.replace("android-v1.0.3", "android-v1.0.4+5")),
        )
        assertEquals("1.0.4", izOznake.verzija)
        assertEquals(5, izOznake.verzijaKod)

        val izOpisa = requireNotNull(
            ProveraAzuriranja.izIzdanja(
                odgovor.replace("\"Native aplikacija.\"", "\"Verzija koda: 6\""),
            ),
        )
        assertEquals(6, izOpisa.verzijaKod)
    }

    @Test
    fun odbijaTudjaINeispravnaIzdanja() {
        assertNull(ProveraAzuriranja.izIzdanja(odgovor.replace("android-v1.0.3", "v1.0.3")))
        assertNull(ProveraAzuriranja.izIzdanja(odgovor.replace("Mozgalica.apk", "Mozgalica.zip")))
        assertNull(ProveraAzuriranja.izIzdanja(odgovor.replace("https://github.com", "http://github.com")))
        assertNull(ProveraAzuriranja.izIzdanja("nije json"))
    }

    @Test
    fun uporedujeVerzijePoDelovima() {
        assertTrue(ProveraAzuriranja.jeNovija("1.0.3", "1.0.4"))
        assertTrue(ProveraAzuriranja.jeNovija("1.0.9", "1.0.10"))
        assertTrue(ProveraAzuriranja.jeNovija("1.9.0", "2.0.0"))
        assertFalse(ProveraAzuriranja.jeNovija("1.0.4", "1.0.4"))
        assertFalse(ProveraAzuriranja.jeNovija("1.0.4", "1.0.3"))
        assertEquals(0, ProveraAzuriranja.uporedi("1.0", "1.0.0"))
    }

    @Test
    fun verzijaKodaJeMerodavnaKadaPostoji() {
        val novije = Izdanje("1.0.4", 5, "https://github.com/x", 0, null)
        assertTrue(ProveraAzuriranja.jeNovije(novije, "1.0.3", 4))
        assertFalse(ProveraAzuriranja.jeNovije(novije, "1.0.4", 5))
        assertFalse(
            ProveraAzuriranja.jeNovije(Izdanje("1.0.9", 4, "https://github.com/x", 0, null), "1.0.3", 4),
        )
        assertTrue(
            ProveraAzuriranja.jeNovije(Izdanje("1.0.4", null, "https://github.com/x", 0, null), "1.0.3", 4),
        )
    }

    @Test
    fun velicinaZaDugme() {
        assertEquals("4,3 MB", ProveraAzuriranja.formatirajVelicinu(4498760))
        assertEquals("", ProveraAzuriranja.formatirajVelicinu(0))
        assertEquals("900 B", ProveraAzuriranja.formatirajVelicinu(900))
        assertEquals("1 KB", ProveraAzuriranja.formatirajVelicinu(1024))
    }
}
