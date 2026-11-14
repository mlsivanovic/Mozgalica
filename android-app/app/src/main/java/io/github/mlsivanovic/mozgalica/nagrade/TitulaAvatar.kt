package io.github.mlsivanovic.mozgalica.nagrade

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun TitulaAvatar(
    ime: String,
    avatar: String?,
    velicina: Dp,
    modifier: Modifier = Modifier,
) {
    val deo = parsirajTitulu(ime)
    val titula = prepoznajFabrickuTitulu(deo.osnova)
    val paleta = paletaZa(titula)
    val bitmap = remember(avatar) { dekodirajSliku(avatar) }
    if (bitmap != null) {
        Image(
            bitmap = bitmap.asImageBitmap(),
            contentDescription = ime,
            contentScale = ContentScale.Crop,
            modifier = modifier
                .size(velicina)
                .clip(CircleShape)
                .border(2.dp, paleta.metal, CircleShape),
        )
        return
    }
    if (jeEmoji(avatar)) {
        Box(
            modifier = modifier
                .size(velicina)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(paleta.pozadina, paleta.pozadinaTamnija)))
                .border(2.dp, paleta.metal, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = avatar.orEmpty(),
                fontSize = (velicina.value * 0.5f).sp,
                color = MaterialTheme.colorScheme.onPrimary,
            )
        }
        return
    }
    Canvas(modifier = modifier.size(velicina)) {
        val s = size.minDimension / 100f
        withTransform({ scale(s, s, Offset.Zero) }) {
            nacrtajBedz(titula, deo.rang, paleta)
        }
    }
}

private fun jeEmoji(avatar: String?): Boolean =
    avatar != null && avatar.isNotBlank() && !avatar.startsWith("http") &&
        !avatar.startsWith("data:") && avatar.length <= 4

private fun dekodirajSliku(avatar: String?): android.graphics.Bitmap? {
    if (avatar == null || !avatar.startsWith("data:image/")) return null
    val zapis = avatar.substringAfter("base64,", "")
    if (zapis.isBlank()) return null
    return runCatching {
        val bajtovi = Base64.decode(zapis, Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bajtovi, 0, bajtovi.size)
    }.getOrNull()
}

private fun DrawScope.nacrtajBedz(
    titula: FabrickaTitula?,
    rang: RangTitule,
    paleta: PaletaTitule,
) {
    if (rang == RangTitule.UNBOUND) {
        drawCircle(paleta.akcenat, radius = 47f, center = Offset(50f, 50f), style = Stroke(width = 1.5f))
        listOf(
            Offset(50f, 3f) to Offset(50f, 9f),
            Offset(50f, 91f) to Offset(50f, 97f),
            Offset(3f, 50f) to Offset(9f, 50f),
            Offset(91f, 50f) to Offset(97f, 50f),
            Offset(16f, 16f) to Offset(20f, 20f),
            Offset(80f, 80f) to Offset(84f, 84f),
            Offset(16f, 84f) to Offset(20f, 80f),
            Offset(80f, 20f) to Offset(84f, 16f),
        ).forEach { (od, doTacke) ->
            drawLine(paleta.akcenat, od, doTacke, strokeWidth = 2.5f, cap = StrokeCap.Round)
        }
        val zigzag = Path().apply {
            moveTo(39f, 14f); lineTo(44f, 9f); lineTo(50f, 14f); lineTo(56f, 9f); lineTo(61f, 14f)
        }
        drawPath(zigzag, paleta.akcenat, style = Stroke(width = 2.3f, cap = StrokeCap.Round))
    }
    drawCircle(
        brush = Brush.linearGradient(
            colors = listOf(paleta.pozadina, paleta.pozadinaTamnija),
            start = Offset(12f, 8f),
            end = Offset(88f, 94f),
        ),
        radius = 44f,
        center = Offset(50f, 50f),
    )
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(paleta.svetlo.copy(alpha = 0.34f), Color.Transparent),
            center = Offset(50f, 12f),
            radius = 75f,
        ),
        radius = 41f,
        center = Offset(50f, 50f),
    )
    drawCircle(paleta.metal, radius = 44f, center = Offset(50f, 50f), style = Stroke(width = 2.5f))
    if (rang != RangTitule.AWAKENED) {
        drawCircle(
            paleta.akcenat,
            radius = 39f,
            center = Offset(50f, 50f),
            style = Stroke(
                width = 1.6f,
                pathEffect = if (rang == RangTitule.EMPOWERED) {
                    PathEffect.dashPathEffect(floatArrayOf(4f, 4f))
                } else {
                    PathEffect.dashPathEffect(floatArrayOf(2f, 3f))
                },
            ),
        )
    }
    when (titula) {
        FabrickaTitula.SHADOW_NOOB -> shadowNoob(paleta)
        FabrickaTitula.STAR_SCOUT -> starScout(paleta)
        FabrickaTitula.SOLAR_KNIGHT -> solarKnight(paleta)
        FabrickaTitula.COSMIC_PALADIN -> cosmicPaladin(paleta)
        FabrickaTitula.VORTEX_CHAMPION -> vortexChampion(paleta)
        FabrickaTitula.GALACTIC_TITAN -> galacticTitan(paleta)
        FabrickaTitula.SUPERNOVA_DRAGON -> supernovaDragon(paleta)
        FabrickaTitula.CELESTIAL_PHOENIX -> celestialPhoenix(paleta)
        null -> generickiBedz(paleta)
    }
    if (rang == RangTitule.EMPOWERED) {
        krugZvezda(Offset(20f, 35f), 1.4f, paleta.svetlo)
        krugZvezda(Offset(79f, 65f), 1.4f, paleta.svetlo)
    }
    if (rang == RangTitule.UNBOUND) {
        krugZvezda(Offset(20f, 34f), 1.8f, paleta.svetlo)
        krugZvezda(Offset(80f, 34f), 1.8f, paleta.svetlo)
        krugZvezda(Offset(50f, 88f), 1.6f, paleta.svetlo)
    }
}

private fun DrawScope.metalBrush(paleta: PaletaTitule): Brush = Brush.linearGradient(
    colors = listOf(paleta.svetlo, paleta.metal, paleta.akcenat),
    start = Offset(15f, 10f),
    end = Offset(85f, 90f),
)

private fun DrawScope.shadowNoob(paleta: PaletaTitule) {
    val hood = Path().apply {
        moveTo(25f, 75f); cubicTo(25f, 45f, 34f, 25f, 50f, 20f)
        cubicTo(66f, 25f, 75f, 45f, 75f, 75f); close()
    }
    drawPath(hood, metalBrush(paleta))
    val unutra = Path().apply {
        moveTo(31f, 74f); cubicTo(32f, 48f, 39f, 34f, 50f, 30f)
        cubicTo(61f, 34f, 68f, 48f, 69f, 74f); close()
    }
    drawPath(unutra, paleta.mastilo)
    val senka = Path().apply {
        moveTo(36f, 48f); cubicTo(41f, 44f, 45f, 44f, 50f, 47f)
        cubicTo(55f, 44f, 59f, 44f, 64f, 48f); lineTo(61f, 58f); lineTo(39f, 58f); close()
    }
    drawPath(senka, paleta.pozadinaTamnija)
    val oci = Path().apply {
        moveTo(38f, 51f); lineTo(46f, 49f); lineTo(43f, 55f); close()
        moveTo(62f, 51f); lineTo(54f, 49f); lineTo(57f, 55f); close()
    }
    drawPath(oci, paleta.svetlo)
    drawLine(paleta.akcenat, Offset(50f, 20f), Offset(50f, 34f), strokeWidth = 3f, cap = StrokeCap.Round)
}

private fun DrawScope.starScout(paleta: PaletaTitule) {
    drawCircle(paleta.metal, radius = 25f, center = Offset(50f, 50f), style = Stroke(width = 3f))
    drawCircle(paleta.mastilo, radius = 17f, center = Offset(50f, 50f), style = Stroke(width = 1.5f))
    drawCircle(paleta.akcenat, radius = 17f, center = Offset(50f, 50f), style = Stroke(width = 1.5f))
    val igla = Path().apply {
        moveTo(50f, 29f); lineTo(56f, 48f); lineTo(50f, 73f); lineTo(44f, 48f); close()
    }
    drawPath(igla, paleta.metal)
    val krst = Path().apply {
        moveTo(28f, 51f); lineTo(48f, 45f); lineTo(72f, 51f); lineTo(48f, 57f); close()
    }
    drawPath(krst, paleta.akcenat.copy(alpha = 0.9f))
    drawCircle(paleta.svetlo, radius = 4f, center = Offset(50f, 50f))
    krugZvezda(Offset(73f, 29f), 1.5f, paleta.svetlo)
    krugZvezda(Offset(27f, 72f), 1.2f, paleta.akcenat)
}

private fun DrawScope.solarKnight(paleta: PaletaTitule) {
    listOf(
        Offset(50f, 19f) to Offset(50f, 27f),
        Offset(29f, 28f) to Offset(35f, 34f),
        Offset(71f, 28f) to Offset(65f, 34f),
        Offset(22f, 50f) to Offset(30f, 50f),
        Offset(78f, 50f) to Offset(70f, 50f),
    ).forEach { (od, doTacke) ->
        drawLine(paleta.akcenat, od, doTacke, strokeWidth = 3f, cap = StrokeCap.Round)
    }
    val kaciga = Path().apply {
        moveTo(33f, 49f); cubicTo(33f, 32f, 40f, 26f, 50f, 26f)
        cubicTo(60f, 26f, 67f, 32f, 67f, 49f); lineTo(67f, 65f)
        cubicTo(63f, 72f, 57f, 76f, 50f, 78f); cubicTo(43f, 76f, 37f, 72f, 33f, 65f); close()
    }
    drawPath(kaciga, metalBrush(paleta))
    drawPath(kaciga, paleta.svetlo, style = Stroke(width = 1.5f))
    val vizir = Path().apply {
        moveTo(37f, 49f); cubicTo(42f, 45f, 58f, 45f, 63f, 49f)
        lineTo(63f, 56f); cubicTo(58f, 53f, 42f, 53f, 37f, 56f); close()
    }
    drawPath(vizir, paleta.mastilo)
    val brada = Path().apply {
        moveTo(43f, 64f); lineTo(57f, 64f); lineTo(54f, 70f); lineTo(46f, 70f); close()
    }
    drawPath(brada, paleta.akcenat)
    drawCircle(paleta.svetlo, radius = 3f, center = Offset(50f, 34f))
}

private fun DrawScope.cosmicPaladin(paleta: PaletaTitule) {
    val stit = Path().apply {
        moveTo(50f, 23f); cubicTo(61f, 27f, 69f, 29f, 70f, 29f)
        lineTo(70f, 53f); cubicTo(70f, 68f, 60f, 77f, 50f, 81f)
        cubicTo(40f, 77f, 30f, 68f, 30f, 53f); lineTo(30f, 29f)
        cubicTo(31f, 29f, 39f, 27f, 50f, 23f); close()
    }
    drawPath(stit, metalBrush(paleta))
    drawPath(stit, paleta.svetlo, style = Stroke(width = 2f))
    val unutra = Path().apply {
        moveTo(50f, 30f); cubicTo(57f, 33f, 62f, 34f, 64f, 34f)
        lineTo(64f, 52f); cubicTo(64f, 62f, 58f, 69f, 50f, 73f)
        cubicTo(42f, 69f, 36f, 62f, 36f, 52f); lineTo(36f, 34f)
        cubicTo(38f, 34f, 43f, 33f, 50f, 30f); close()
    }
    drawPath(unutra, paleta.mastilo)
    val zvezda = Path().apply {
        moveTo(38f, 57f); cubicTo(45f, 54f, 54f, 47f, 62f, 37f)
        cubicTo(58f, 49f, 52f, 57f, 41f, 63f); close()
    }
    drawPath(zvezda, paleta.akcenat)
    krugZvezda(Offset(61f, 37f), 1.6f, paleta.svetlo)
    drawLine(paleta.metal, Offset(45f, 42f), Offset(55f, 42f), strokeWidth = 2f, cap = StrokeCap.Round)
    drawLine(paleta.metal, Offset(50f, 37f), Offset(50f, 47f), strokeWidth = 2f, cap = StrokeCap.Round)
}

private fun DrawScope.vortexChampion(paleta: PaletaTitule) {
    val spirala = Path().apply {
        moveTo(23f, 49f); cubicTo(29f, 27f, 62f, 20f, 75f, 39f)
        cubicTo(83f, 51f, 75f, 71f, 55f, 76f)
    }
    drawPath(spirala, paleta.akcenat, style = Stroke(width = 4f, cap = StrokeCap.Round))
    val spirala2 = Path().apply {
        moveTo(27f, 63f); cubicTo(36f, 80f, 66f, 76f, 73f, 55f)
    }
    drawPath(spirala2, paleta.metal, style = Stroke(width = 3f, cap = StrokeCap.Round))
    val pehar = Path().apply {
        moveTo(38f, 35f); lineTo(62f, 35f); lineTo(62f, 50f)
        cubicTo(62f, 59f, 57f, 64f, 50f, 64f); cubicTo(43f, 64f, 38f, 59f, 38f, 50f); close()
    }
    drawPath(pehar, metalBrush(paleta))
    drawPath(pehar, paleta.svetlo, style = Stroke(width = 1.5f))
    val drske = Path().apply {
        moveTo(38f, 41f); lineTo(31f, 41f); cubicTo(30f, 49f, 33f, 53f, 39f, 53f)
        moveTo(62f, 41f); lineTo(69f, 41f); cubicTo(70f, 49f, 67f, 53f, 61f, 53f)
    }
    drawPath(drske, paleta.svetlo, style = Stroke(width = 2f))
    drawRect(paleta.akcenat, topLeft = Offset(47f, 64f), size = Size(6f, 7f))
    drawRect(paleta.akcenat, topLeft = Offset(40f, 72f), size = Size(20f, 4f))
    krugZvezda(Offset(50f, 45f), 1.6f, paleta.svetlo)
}

private fun DrawScope.galacticTitan(paleta: PaletaTitule) {
    withTransform({ rotate(-17f, Offset(50f, 42f)) }) {
        drawOval(
            paleta.akcenat,
            topLeft = Offset(20f, 33f),
            size = Size(60f, 18f),
            style = Stroke(width = 3f),
        )
    }
    drawCircle(paleta.metal, radius = 17f, center = Offset(50f, 42f))
    drawCircle(paleta.svetlo, radius = 17f, center = Offset(50f, 42f), style = Stroke(width = 1.5f))
    val telo = Path().apply {
        moveTo(33f, 76f); lineTo(33f, 61f); cubicTo(33f, 55f, 39f, 52f, 45f, 52f)
        lineTo(55f, 52f); cubicTo(61f, 52f, 67f, 55f, 67f, 61f); lineTo(67f, 76f); close()
    }
    drawPath(telo, metalBrush(paleta))
    drawPath(telo, paleta.svetlo, style = Stroke(width = 1.5f))
    listOf(40f, 46f, 54f, 60f).forEach { x ->
        drawLine(paleta.mastilo, Offset(x, 58f), Offset(x, 73f), strokeWidth = 2f, cap = StrokeCap.Round)
    }
    val osmeh = Path().apply {
        moveTo(44f, 42f); cubicTo(47f, 39f, 53f, 39f, 56f, 42f)
    }
    drawPath(osmeh, paleta.mastilo, style = Stroke(width = 2f, cap = StrokeCap.Round))
    krugZvezda(Offset(67f, 27f), 1.4f, paleta.svetlo)
}

private fun DrawScope.supernovaDragon(paleta: PaletaTitule) {
    val prasak = Path().apply {
        moveTo(50f, 20f); lineTo(54f, 31f); lineTo(66f, 25f); lineTo(62f, 37f)
        lineTo(75f, 40f); lineTo(65f, 48f); lineTo(73f, 59f); lineTo(60f, 58f)
        lineTo(57f, 72f); lineTo(50f, 62f); lineTo(42f, 72f); lineTo(43f, 58f)
        lineTo(29f, 59f); lineTo(37f, 48f); lineTo(25f, 40f); lineTo(38f, 37f)
        lineTo(34f, 25f); lineTo(46f, 31f); close()
    }
    drawPath(prasak, paleta.akcenat.copy(alpha = 0.55f))
    val glava = Path().apply {
        moveTo(31f, 58f); cubicTo(31f, 39f, 43f, 29f, 57f, 31f)
        cubicTo(69f, 33f, 75f, 42f, 71f, 52f); cubicTo(69f, 58f, 63f, 61f, 56f, 61f)
        lineTo(47f, 61f); cubicTo(42f, 67f, 35f, 65f, 31f, 58f); close()
    }
    drawPath(glava, metalBrush(paleta))
    drawPath(glava, paleta.svetlo, style = Stroke(width = 1.5f))
    val rogovi = Path().apply {
        moveTo(42f, 35f); lineTo(45f, 25f); lineTo(51f, 34f)
        moveTo(55f, 34f); lineTo(61f, 24f); lineTo(63f, 37f)
    }
    drawPath(rogovi, paleta.akcenat, style = Stroke(width = 3f, cap = StrokeCap.Round))
    val oko = Path().apply {
        moveTo(61f, 44f); lineTo(66f, 46f); lineTo(61f, 49f); close()
    }
    drawPath(oko, paleta.mastilo)
    drawCircle(paleta.svetlo, radius = 1.6f, center = Offset(64f, 45f))
    val zubi = Path().apply {
        moveTo(49f, 59f); lineTo(53f, 53f); lineTo(57f, 59f)
        moveTo(56f, 59f); lineTo(60f, 53f); lineTo(64f, 58f)
    }
    drawPath(zubi, paleta.svetlo, style = Stroke(width = 2f))
}

private fun DrawScope.celestialPhoenix(paleta: PaletaTitule) {
    val levo = Path().apply {
        moveTo(50f, 50f); cubicTo(30f, 23f, 19f, 31f, 22f, 44f)
        cubicTo(28f, 53f, 38f, 58f, 48f, 63f); cubicTo(37f, 48f, 35f, 42f, 39f, 36f)
        cubicTo(44f, 41f, 47f, 46f, 50f, 50f); close()
    }
    drawPath(levo, metalBrush(paleta))
    val desno = Path().apply {
        moveTo(50f, 50f); cubicTo(70f, 23f, 81f, 31f, 78f, 44f)
        cubicTo(72f, 53f, 62f, 58f, 52f, 63f); cubicTo(63f, 48f, 65f, 42f, 61f, 36f)
        cubicTo(56f, 41f, 53f, 46f, 50f, 50f); close()
    }
    drawPath(desno, paleta.akcenat)
    val telo = Path().apply {
        moveTo(46f, 47f); cubicTo(46f, 38f, 50f, 29f, 50f, 29f)
        cubicTo(50f, 29f, 54f, 38f, 54f, 47f); cubicTo(54f, 59f, 52f, 72f, 50f, 80f)
        cubicTo(48f, 72f, 46f, 59f, 46f, 47f); close()
    }
    drawPath(telo, metalBrush(paleta))
    drawPath(telo, paleta.svetlo, style = Stroke(width = 1.2f))
    drawCircle(paleta.akcenat, radius = 6f, center = Offset(50f, 28f))
    drawCircle(paleta.svetlo, radius = 6f, center = Offset(50f, 28f), style = Stroke(width = 1.2f))
    drawLine(paleta.svetlo, Offset(50f, 24f), Offset(50f, 21f), strokeWidth = 1.5f, cap = StrokeCap.Round)
    drawLine(paleta.svetlo, Offset(47f, 26f), Offset(44f, 24f), strokeWidth = 1.5f, cap = StrokeCap.Round)
    drawLine(paleta.svetlo, Offset(53f, 26f), Offset(56f, 24f), strokeWidth = 1.5f, cap = StrokeCap.Round)
    val kljun = Path().apply { moveTo(50f, 30f); lineTo(47f, 33f); lineTo(53f, 33f); close() }
    drawPath(kljun, paleta.mastilo)
}

private fun DrawScope.generickiBedz(paleta: PaletaTitule) {
    val stit = Path().apply {
        moveTo(50f, 24f); cubicTo(61f, 28f, 68f, 29f, 69f, 30f)
        lineTo(69f, 53f); cubicTo(69f, 68f, 59f, 76f, 50f, 80f)
        cubicTo(41f, 76f, 31f, 68f, 31f, 53f); lineTo(31f, 30f)
        cubicTo(32f, 29f, 39f, 28f, 50f, 24f); close()
    }
    drawPath(stit, metalBrush(paleta))
    drawPath(stit, paleta.svetlo, style = Stroke(width = 2f))
    krugZvezda(Offset(50f, 51f), 4f, paleta.svetlo)
}

private fun DrawScope.krugZvezda(centar: Offset, velicina: Float, boja: Color) {
    val path = Path().apply {
        val t = velicina * 2f
        val u = velicina * 0.65f
        moveTo(centar.x, centar.y - t)
        lineTo(centar.x + u, centar.y - u)
        lineTo(centar.x + t, centar.y)
        lineTo(centar.x + u, centar.y + u)
        lineTo(centar.x, centar.y + t)
        lineTo(centar.x - u, centar.y + u)
        lineTo(centar.x - t, centar.y)
        lineTo(centar.x - u, centar.y - u)
        close()
    }
    drawPath(path, boja)
}
