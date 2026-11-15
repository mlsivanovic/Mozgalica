package io.github.mlsivanovic.mozgalica.podaci.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PushUgovoriTest {
    private fun ugovor(ime: String): String =
        checkNotNull(javaClass.getResource("/ugovori/$ime")).readText()

    @Test
    fun `registracija cita subscriptionId`() {
        val ishod = protumaciRegistracijuPush(ugovor("register_child_push.json"))
        assertTrue(ishod is IshodRegistracijePush.Uspesna)
        assertEquals("771caf28-0864-425b-be99-df3d3b3248f2", (ishod as IshodRegistracijePush.Uspesna).subscriptionId)
    }

    @Test
    fun `registracija cuva kod odbijenog zahteva`() {
        val ishod = protumaciRegistracijuPush("""{"ok":false,"error":"invalid_token"}""")
        assertTrue(ishod is IshodRegistracijePush.Odbijena)
        assertEquals("invalid_token", (ishod as IshodRegistracijePush.Odbijena).kod)
    }

    @Test
    fun `status cita active`() {
        val ishod = protumaciStatusPush(ugovor("get_child_push_status.json"))
        assertTrue(ishod is IshodStatusaPush.Aktivan)
        assertTrue((ishod as IshodStatusaPush.Aktivan).active)
    }

    @Test
    fun `odjava prihvata potvrdu bez active polja`() {
        val ishod = protumaciPotvrduPush("""{"ok":true}""")
        assertEquals(IshodPotvrdePush.Uspesna, ishod)
    }

    @Test
    fun `neispravan json ne pada`() {
        assertEquals(IshodRegistracijePush.Neuspesna, protumaciRegistracijuPush("nije json"))
        assertEquals(IshodStatusaPush.Neuspesan, protumaciStatusPush("nije json"))
    }
}
