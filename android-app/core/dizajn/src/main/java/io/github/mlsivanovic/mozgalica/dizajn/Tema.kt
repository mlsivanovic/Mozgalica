package io.github.mlsivanovic.mozgalica.dizajn

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
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

// Hex vrednosti su 1:1 prepis iz src/styles/theme.css.
private val svetla = lightColorScheme(
    primary = Color(0xFF4F46E5),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFE8EAFD),
    onPrimaryContainer = Color(0xFF25225A),
    secondary = Color(0xFFA16207),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFFEF3C7),
    onSecondaryContainer = Color(0xFF854D0E),
    tertiary = Color(0xFF15803D),
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFDCFCE7),
    onTertiaryContainer = Color(0xFF166534),
    error = Color(0xFFB91C1C),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF991B1B),
    background = Color(0xFFF7F7FC),
    onBackground = Color(0xFF191B2A),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF191B2A),
    surfaceVariant = Color(0xFFEEF0F6),
    onSurfaceVariant = Color(0xFF5F6475),
    outline = Color(0xFFDDE0EA),
    outlineVariant = Color(0xFFDDE0EA),
    inverseSurface = Color(0xFF191B2A),
    inverseOnSurface = Color(0xFFFFFFFF),
    // rgb(16 18 26 / 58%)
    scrim = Color(0x9410121A),
)

private val tamna = darkColorScheme(
    primary = Color(0xFFA5B4FC),
    onPrimary = Color(0xFF1E1B4B),
    primaryContainer = Color(0xFF292B55),
    onPrimaryContainer = Color(0xFFE0E7FF),
    secondary = Color(0xFFFBBF24),
    onSecondary = Color(0xFF2C2100),
    secondaryContainer = Color(0xFF3C3013),
    onSecondaryContainer = Color(0xFFFDE68A),
    tertiary = Color(0xFF4ADE80),
    onTertiary = Color(0xFF052E16),
    tertiaryContainer = Color(0xFF173923),
    onTertiaryContainer = Color(0xFF86EFAC),
    error = Color(0xFFFCA5A5),
    onError = Color(0xFF442126),
    errorContainer = Color(0xFF442126),
    onErrorContainer = Color(0xFFFECACA),
    background = Color(0xFF10121A),
    onBackground = Color(0xFFF4F5FA),
    surface = Color(0xFF191C27),
    onSurface = Color(0xFFF4F5FA),
    surfaceVariant = Color(0xFF20232F),
    onSurfaceVariant = Color(0xFFB7BBC9),
    outline = Color(0xFF353A49),
    outlineVariant = Color(0xFF353A49),
    inverseSurface = Color(0xFFF4F5FA),
    inverseOnSurface = Color(0xFF10121A),
    // rgb(0 0 0 / 68%)
    scrim = Color(0xAD000000),
)

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
private val nunito = FontFamily(
    Font(R.font.nunito, FontWeight.Normal, variationSettings = FontVariation.Settings(FontWeight.Normal, FontStyle.Normal)),
    Font(R.font.nunito, FontWeight.Medium, variationSettings = FontVariation.Settings(FontWeight.Medium, FontStyle.Normal)),
    Font(R.font.nunito, FontWeight.SemiBold, variationSettings = FontVariation.Settings(FontWeight.SemiBold, FontStyle.Normal)),
    Font(R.font.nunito, FontWeight.Bold, variationSettings = FontVariation.Settings(FontWeight.Bold, FontStyle.Normal)),
)

private val tipografija = Typography(
    bodyLarge = TextStyle(fontFamily = nunito, fontWeight = FontWeight.Normal, fontSize = 18.sp, lineHeight = 26.sp),
    bodyMedium = TextStyle(fontFamily = nunito, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    titleLarge = TextStyle(fontFamily = nunito, fontWeight = FontWeight.SemiBold, fontSize = 22.sp, lineHeight = 28.sp),
    headlineMedium = TextStyle(fontFamily = nunito, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 32.sp),
    labelLarge = TextStyle(fontFamily = nunito, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
)

private val oblici = Shapes(
    extraSmall = RoundedCornerShape(12.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(24.dp),
)

@Composable
fun MozgalicaTema(
    tamnaTema: Boolean = isSystemInDarkTheme(),
    sadrzaj: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (tamnaTema) tamna else svetla,
        typography = tipografija,
        shapes = oblici,
        content = sadrzaj,
    )
}
