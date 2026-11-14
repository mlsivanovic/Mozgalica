package io.github.mlsivanovic.mozgalica.dizajn

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Test

class BojeTest {
    @Test
    fun predmetiPrateThemeCss() {
        assertEquals(Color(0xFF4F46E5), MozgalicaBoje.svetla.matematika)
        assertEquals(Color(0xFFBE123C), MozgalicaBoje.svetla.srpski)
        assertEquals(Color(0xFF0F766E), MozgalicaBoje.svetla.priroda)
        assertEquals(Color(0xFF475569), MozgalicaBoje.svetla.sah)
        assertEquals(Color(0xFFF59E0B), MozgalicaBoje.svetla.zvezda)
        assertEquals(Color(0xFFFBBF24), MozgalicaBoje.tamna.zvezda)
    }
}
