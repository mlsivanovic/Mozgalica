package io.github.mlsivanovic.mozgalica.dizajn

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

enum class StanjeMaskote { POZDRAV, SAVET, PRAZNO, USPEH }

private val Tamna = Color(0xFF25225A)
private val Indigo = Color(0xFF4F46E5)
private val Zlatna = Color(0xFFF59E0B)

private fun putanja(d: String) = PathParser().parsePathString(d).toPath()

// Isti oblici kao `src/components/Maskota.tsx` (viewBox 84x84).
@Composable
fun Maskota(stanje: StanjeMaskote = StanjeMaskote.POZDRAV, modifier: Modifier = Modifier, velicina: Dp = 88.dp) {
    Canvas(modifier.size(velicina).clearAndSetSemantics { }) {
        val k = size.width / 84f
        fun t(x: Float, y: Float) = Offset(x * k, y * k)
        drawCircle(
            brush = Brush.linearGradient(
                colors = listOf(Color(0xFFFEF3C7), Color(0xFFFBBF24)),
                start = t(14f, 10f),
                end = t(70f, 66f),
            ),
            radius = 28f * k,
            center = t(42f, 38f),
        )
        val telo = putanja("M31 61h22v5a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8Z")
        crtaj(k) { drawPath(telo, Indigo) }
        drawCircle(Tamna, 2.7f * k, t(33f, 40f))
        drawCircle(Tamna, 2.7f * k, t(51f, 40f))
        val usta = putanja(if (stanje == StanjeMaskote.PRAZNO) "M34 49q8 6 16 0" else "M34 49q8 9 16 0")
        crtaj(k) { drawPath(usta, Tamna, style = Stroke(3f, cap = StrokeCap.Round)) }
        when (stanje) {
            StanjeMaskote.USPEH -> {
                val zvezda = putanja("m62 17 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z")
                crtaj(k) { drawPath(zvezda, Zlatna) }
            }
            StanjeMaskote.SAVET -> {
                val plus = putanja("M15 20h9M19.5 15.5v9")
                crtaj(k) { drawPath(plus, Indigo, style = Stroke(3f, cap = StrokeCap.Round)) }
            }
            StanjeMaskote.POZDRAV -> {
                val ruka = putanja("M67 43q10 4 6 14")
                crtaj(k) { drawPath(ruka, Indigo, style = Stroke(4f, cap = StrokeCap.Round)) }
            }
            StanjeMaskote.PRAZNO -> Unit
        }
    }
}

private inline fun androidx.compose.ui.graphics.drawscope.DrawScope.crtaj(k: Float, blok: androidx.compose.ui.graphics.drawscope.DrawScope.() -> Unit) {
    drawContext.canvas.save()
    drawContext.canvas.scale(k, k)
    blok()
    drawContext.canvas.restore()
}
