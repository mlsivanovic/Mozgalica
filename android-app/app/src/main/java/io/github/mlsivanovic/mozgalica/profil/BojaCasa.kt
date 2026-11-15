package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.ui.graphics.Color
import androidx.core.graphics.toColorInt

private val PODRAZUMEVANA = Color(0xFF5A4BD6)

fun bojaCasa(hex: String?): Color {
    if (hex != null && hex.matches(Regex("#[0-9a-fA-F]{6}"))) {
        return runCatching { Color(hex.toColorInt()) }.getOrDefault(PODRAZUMEVANA)
    }
    return PODRAZUMEVANA
}
