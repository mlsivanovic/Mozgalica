package io.github.mlsivanovic.mozgalica.nagrade

import androidx.compose.ui.graphics.Color
import io.github.mlsivanovic.mozgalica.podaci.ProfilnaTitula
import kotlin.math.roundToInt

enum class RangTitule { AWAKENED, EMPOWERED, UNBOUND }

data class TitulaDeo(val osnova: String, val rang: RangTitule)

enum class FabrickaTitula(val kljuc: String) {
    SHADOW_NOOB("shadownoob"),
    STAR_SCOUT("starscout"),
    SOLAR_KNIGHT("solarknight"),
    COSMIC_PALADIN("cosmicpaladin"),
    VORTEX_CHAMPION("vortexchampion"),
    GALACTIC_TITAN("galactictitan"),
    SUPERNOVA_DRAGON("supernovadragon"),
    CELESTIAL_PHOENIX("celestialphoenix"),
}

data class PaletaTitule(
    val pozadina: Color,
    val pozadinaTamnija: Color,
    val metal: Color,
    val akcenat: Color,
    val svetlo: Color,
    val mastilo: Color,
)

private val palete = mapOf(
    FabrickaTitula.SHADOW_NOOB to PaletaTitule(
        Color(0xFF312E81), Color(0xFF17133F), Color(0xFF818CF8),
        Color(0xFFA5B4FC), Color(0xFFE0E7FF), Color(0xFF0B1029),
    ),
    FabrickaTitula.STAR_SCOUT to PaletaTitule(
        Color(0xFF12345B), Color(0xFF071A36), Color(0xFFF5B942),
        Color(0xFF7DD3FC), Color(0xFFFFF3BD), Color(0xFF07192D),
    ),
    FabrickaTitula.SOLAR_KNIGHT to PaletaTitule(
        Color(0xFF263665), Color(0xFF111A3B), Color(0xFFF0A93B),
        Color(0xFFFFD875), Color(0xFFFFF4CF), Color(0xFF121C3D),
    ),
    FabrickaTitula.COSMIC_PALADIN to PaletaTitule(
        Color(0xFF4C1D74), Color(0xFF21113D), Color(0xFFCF8BFF),
        Color(0xFF58D8FF), Color(0xFFF4DBFF), Color(0xFF180D2F),
    ),
    FabrickaTitula.VORTEX_CHAMPION to PaletaTitule(
        Color(0xFF07595D), Color(0xFF063438), Color(0xFF4EE2C1),
        Color(0xFFF6D365), Color(0xFFD6FFF3), Color(0xFF04292B),
    ),
    FabrickaTitula.GALACTIC_TITAN to PaletaTitule(
        Color(0xFF42475D), Color(0xFF202438), Color(0xFFD6D9E7),
        Color(0xFFF58CC8), Color(0xFFF6F3FF), Color(0xFF1F2130),
    ),
    FabrickaTitula.SUPERNOVA_DRAGON to PaletaTitule(
        Color(0xFF7D1F39), Color(0xFF380D20), Color(0xFFFF7662),
        Color(0xFFFFC250), Color(0xFFFFE0D3), Color(0xFF340C1B),
    ),
    FabrickaTitula.CELESTIAL_PHOENIX to PaletaTitule(
        Color(0xFF80275E), Color(0xFF3D1339), Color(0xFFFF8EC4),
        Color(0xFFFFD15B), Color(0xFFFFE2F3), Color(0xFF3B102E),
    ),
)

private val genericka = PaletaTitule(
    Color(0xFF475569), Color(0xFF1E293B), Color(0xFFCBD5E1),
    Color(0xFF94A3B8), Color(0xFFF8FAFC), Color(0xFF162033),
)

fun paletaZa(titula: FabrickaTitula?): PaletaTitule = titula?.let { palete[it] } ?: genericka

fun parsirajTitulu(punoIme: String): TitulaDeo {
    val tekst = punoIme.trim()
    val sufiks = Regex("\\s*(Awakened|Empowered|Unbound)$", RegexOption.IGNORE_CASE)
    val poklapanje = sufiks.find(tekst)
    if (poklapanje != null) {
        val osnova = tekst.replace(sufiks, "").trim()
        val rang = when (poklapanje.groupValues[1].lowercase()) {
            "empowered" -> RangTitule.EMPOWERED
            "unbound" -> RangTitule.UNBOUND
            else -> RangTitule.AWAKENED
        }
        return TitulaDeo(osnova, rang)
    }
    return TitulaDeo(tekst, RangTitule.AWAKENED)
}

fun prepoznajFabrickuTitulu(osnova: String): FabrickaTitula? {
    val normalizovano = osnova.lowercase().replace(Regex("[\\s_-]+"), "")
    return FabrickaTitula.entries.firstOrNull { it.kljuc == normalizovano }
}

fun napredakTitule(
    ukupnoZvezdica: Int,
    trenutna: ProfilnaTitula?,
    sledeca: ProfilnaTitula?,
): Int {
    if (sledeca == null) return 100
    val od = trenutna?.minStars ?: 0
    val doPraga = sledeca.minStars
    if (doPraga <= od) return 100
    return (100.0 * (ukupnoZvezdica - od) / (doPraga - od)).roundToInt().coerceIn(0, 100)
}
