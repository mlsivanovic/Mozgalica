package io.github.mlsivanovic.mozgalica.dizajn

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// M3 tonska paleta iz brend ljubičaste (seed #5A4BD6), sa svim `surfaceContainer*`
// ulogama da kartice, trake i listovi imaju jasnu dubinu u obe teme.
private val svetla = lightColorScheme(
    primary = Color(0xFF5A4BD6),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFE5DEFF),
    onPrimaryContainer = Color(0xFF1A0F63),
    inversePrimary = Color(0xFFC8BFFF),
    secondary = Color(0xFF5F5A7D),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFE5DFFF),
    onSecondaryContainer = Color(0xFF1C1736),
    tertiary = Color(0xFF006A60),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFF9EF2E3),
    onTertiaryContainer = Color(0xFF00201C),
    error = Color(0xFFBA1A1A),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    background = Color(0xFFFCF8FF),
    onBackground = Color(0xFF1C1B22),
    surface = Color(0xFFFCF8FF),
    onSurface = Color(0xFF1C1B22),
    surfaceVariant = Color(0xFFE5E0EC),
    onSurfaceVariant = Color(0xFF48454F),
    surfaceTint = Color(0xFF5A4BD6),
    outline = Color(0xFF79757F),
    outlineVariant = Color(0xFFC9C4D0),
    inverseSurface = Color(0xFF312F37),
    inverseOnSurface = Color(0xFFF3EFF9),
    scrim = Color(0xFF000000),
    surfaceBright = Color(0xFFFCF8FF),
    surfaceDim = Color(0xFFDCD8E2),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFF6F2FC),
    surfaceContainer = Color(0xFFF0ECF6),
    surfaceContainerHigh = Color(0xFFEAE6F1),
    surfaceContainerHighest = Color(0xFFE5E1EB),
)

private val tamna = darkColorScheme(
    primary = Color(0xFFC8BFFF),
    onPrimary = Color(0xFF2B1D9C),
    primaryContainer = Color(0xFF4436BD),
    onPrimaryContainer = Color(0xFFE5DEFF),
    inversePrimary = Color(0xFF5A4BD6),
    secondary = Color(0xFFC9C2EA),
    onSecondary = Color(0xFF312D4C),
    secondaryContainer = Color(0xFF474364),
    onSecondaryContainer = Color(0xFFE5DFFF),
    tertiary = Color(0xFF82D5C7),
    onTertiary = Color(0xFF003731),
    tertiaryContainer = Color(0xFF005048),
    onTertiaryContainer = Color(0xFF9EF2E3),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    background = Color(0xFF14131A),
    onBackground = Color(0xFFE6E1EB),
    surface = Color(0xFF14131A),
    onSurface = Color(0xFFE6E1EB),
    surfaceVariant = Color(0xFF48454F),
    onSurfaceVariant = Color(0xFFC9C4D0),
    surfaceTint = Color(0xFFC8BFFF),
    outline = Color(0xFF938F99),
    outlineVariant = Color(0xFF48454F),
    inverseSurface = Color(0xFFE6E1EB),
    inverseOnSurface = Color(0xFF312F37),
    scrim = Color(0xFF000000),
    surfaceBright = Color(0xFF3A383F),
    surfaceDim = Color(0xFF14131A),
    surfaceContainerLowest = Color(0xFF0F0D15),
    surfaceContainerLow = Color(0xFF1C1B22),
    surfaceContainer = Color(0xFF201F26),
    surfaceContainerHigh = Color(0xFF2B2930),
    surfaceContainerHighest = Color(0xFF36343B),
)

/** Semantičke boje koje M3 nema: uspeh (tačno/pobeda), upozorenje i zlatna zvezdica. */
data class ProsireneBoje(
    val uspeh: Color,
    val naUspehu: Color,
    val uspehKontejner: Color,
    val naUspehKontejneru: Color,
    val upozorenje: Color,
    val upozorenjeKontejner: Color,
    val naUpozorenjeKontejneru: Color,
    val zvezda: Color,
)

private val prosireneSvetle = ProsireneBoje(
    uspeh = Color(0xFF1B6D2F),
    naUspehu = Color(0xFFFFFFFF),
    uspehKontejner = Color(0xFFA4F5A8),
    naUspehKontejneru = Color(0xFF002107),
    upozorenje = Color(0xFF8A5100),
    upozorenjeKontejner = Color(0xFFFFDDB8),
    naUpozorenjeKontejneru = Color(0xFF2C1600),
    zvezda = Color(0xFFF2A900),
)

private val prosireneTamne = ProsireneBoje(
    uspeh = Color(0xFF89D88E),
    naUspehu = Color(0xFF003911),
    uspehKontejner = Color(0xFF00531C),
    naUspehKontejneru = Color(0xFFA4F5A8),
    upozorenje = Color(0xFFFFB868),
    upozorenjeKontejner = Color(0xFF693C00),
    naUpozorenjeKontejneru = Color(0xFFFFDDB8),
    zvezda = Color(0xFFFFC94D),
)

val LocalProsireneBoje = staticCompositionLocalOf { prosireneSvetle }

object Mozgalica {
    val boje: ProsireneBoje
        @Composable get() = LocalProsireneBoje.current
}

data class BojePredmeta(
    val matematika: Color,
    val srpski: Color,
    val priroda: Color,
    val sah: Color,
    val zvezda: Color,
)

object MozgalicaBoje {
    val svetla = BojePredmeta(
        matematika = Color(0xFF4F46E5),
        srpski = Color(0xFFBE123C),
        priroda = Color(0xFF0F766E),
        sah = Color(0xFF475569),
        zvezda = Color(0xFFF59E0B),
    )
    val tamna = BojePredmeta(
        matematika = Color(0xFF4F46E5),
        srpski = Color(0xFFBE123C),
        priroda = Color(0xFF0F766E),
        sah = Color(0xFF475569),
        zvezda = Color(0xFFFBBF24),
    )
}

// Varijabilni Nunito: težine ispod API 26 padaju na podrazumevani rez,
// jer Android varijabilne fontove podržava tek od API 26.
@OptIn(ExperimentalTextApi::class)
private fun rez(tezina: FontWeight) =
    Font(R.font.nunito, tezina, variationSettings = FontVariation.Settings(tezina, FontStyle.Normal))

private val nunito = FontFamily(
    rez(FontWeight.Normal),
    rez(FontWeight.Medium),
    rez(FontWeight.SemiBold),
    rez(FontWeight.Bold),
    rez(FontWeight.ExtraBold),
    rez(FontWeight.Black),
)

private fun stil(tezina: FontWeight, velicina: Int, visina: Int, razmak: Float = 0f) = TextStyle(
    fontFamily = nunito,
    fontWeight = tezina,
    fontSize = velicina.sp,
    lineHeight = visina.sp,
    letterSpacing = razmak.sp,
)

// Skala je za nijansu krupnija od M3 podrazumevane — čitaju je deca.
private val tipografija = Typography(
    displayLarge = stil(FontWeight.ExtraBold, 52, 60, -0.5f),
    displayMedium = stil(FontWeight.ExtraBold, 44, 52, -0.25f),
    displaySmall = stil(FontWeight.ExtraBold, 36, 44),
    headlineLarge = stil(FontWeight.ExtraBold, 32, 40),
    headlineMedium = stil(FontWeight.ExtraBold, 28, 36),
    headlineSmall = stil(FontWeight.Bold, 24, 32),
    titleLarge = stil(FontWeight.Bold, 22, 28),
    titleMedium = stil(FontWeight.Bold, 18, 24, 0.1f),
    titleSmall = stil(FontWeight.Bold, 15, 20, 0.1f),
    bodyLarge = stil(FontWeight.Medium, 17, 24),
    bodyMedium = stil(FontWeight.Medium, 15, 22),
    bodySmall = stil(FontWeight.Medium, 13, 18, 0.2f),
    labelLarge = stil(FontWeight.Bold, 15, 20, 0.1f),
    labelMedium = stil(FontWeight.Bold, 13, 16, 0.3f),
    labelSmall = stil(FontWeight.Bold, 11, 16, 0.4f),
)

private val oblici = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(20.dp),
    large = RoundedCornerShape(28.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

data class Efekti(
    val zvuk: Boolean,
    val haptika: Boolean,
    val animacije: Boolean,
)

// Zvuk i haptika dolaze iz podešavanja. Animacije prate sistemsko „ukloni animacije", ne prekidač zvuka.
val LocalEfekti = staticCompositionLocalOf {
    Efekti(zvuk = true, haptika = true, animacije = true)
}

@Composable
fun MozgalicaTema(
    tamnaTema: Boolean = isSystemInDarkTheme(),
    sadrzaj: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalProsireneBoje provides if (tamnaTema) prosireneTamne else prosireneSvetle) {
        MaterialTheme(
            colorScheme = if (tamnaTema) tamna else svetla,
            typography = tipografija,
            shapes = oblici,
            content = sadrzaj,
        )
    }
}
