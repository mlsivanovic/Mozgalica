package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.ObavestenjeDeteta
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ProtumaciSadrzajTest {
    @Test
    fun rasporedBezUnosaNijePunOdgovor() {
        assertEquals(IshodRasporeda.Nema, protumaciRaspored("""{"ok":true,"exists":false}"""))
    }

    @Test
    fun lokalnoProcitanoPobedjujeNeprocitanoSaServera() {
        val lokalno = SacuvanoObavestenje(
            id = "1",
            eventType = "new_quiz",
            title = "Kviz",
            body = "Stigao je.",
            targetUrl = "/kviz/abc",
            readAt = "2026-11-14T12:00:00Z",
            createdAt = "2026-11-14T11:00:00Z",
            cekaServer = true,
        )
        val server = ObavestenjeDeteta(
            id = "1",
            eventType = "new_quiz",
            title = "Kviz",
            body = "Stigao je.",
            targetUrl = "/kviz/abc",
            readAt = null,
            createdAt = "2026-11-14T11:00:00Z",
        )
        val spojeno = spojiObavestenja(listOf(lokalno), listOf(server)).single()
        assertEquals(lokalno.readAt, spojeno.readAt)
        assertTrue(spojeno.cekaServer)
    }
}
