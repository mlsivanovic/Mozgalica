package io.github.mlsivanovic.mozgalica.dizajn

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.dp
import kotlin.math.sin

private data class Cestica(
    val x: Float,
    val brzina: Float,
    val zamah: Float,
    val faza: Float,
    val rotacija: Float,
    val velicina: Float,
    val boja: Color,
)

private val boje = listOf(
    Color(0xFF4F46E5),
    Color(0xFFF59E0B),
    Color(0xFFEC4899),
    Color(0xFF10B981),
    Color(0xFF38BDF8),
)

@Composable
fun Konfete(
    ukljucene: Boolean,
    modifier: Modifier = Modifier,
) {
    val progres = remember { Animatable(0f) }
    LaunchedEffect(ukljucene) {
        if (!ukljucene) {
            progres.snapTo(1f)
            return@LaunchedEffect
        }
        progres.snapTo(0f)
        progres.animateTo(1f, tween(durationMillis = 2600, easing = LinearEasing))
    }
    val cestice = remember {
        List(58) { indeks ->
            val x = ((indeks * 37) % 100) / 100f
            Cestica(
                x = x,
                brzina = 0.7f + ((indeks * 17) % 60) / 100f,
                zamah = 10f + ((indeks * 13) % 30),
                faza = (indeks * 29 % 360) * (Math.PI.toFloat() / 180f),
                rotacija = 120f + ((indeks * 23) % 540),
                velicina = 4f + ((indeks * 7) % 7),
                boja = boje[indeks % boje.size],
            )
        }
    }
    Canvas(modifier) {
        val p = progres.value
        if (!ukljucene || p >= 1f) return@Canvas
        val alpha = (1f - p).coerceIn(0f, 1f)
        cestice.forEach { c ->
            val y = -0.08f + p * c.brzina * 1.15f
            if (y > 1.05f) return@forEach
            val x = c.x + sin(p * 7f + c.faza) * (c.zamah / size.width)
            val centar = Offset(x * size.width, y * size.height)
            rotate(c.rotacija * p, pivot = centar) {
                drawRect(
                    color = c.boja.copy(alpha = alpha),
                    topLeft = Offset(centar.x - c.velicina / 2f, centar.y - c.velicina / 2f),
                    size = androidx.compose.ui.geometry.Size(c.velicina, c.velicina * 1.8f),
                )
            }
        }
    }
}

val VisinaKonfeta = 150.dp
