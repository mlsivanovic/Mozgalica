package io.github.mlsivanovic.mozgalica.dizajn

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Standardni razmaci ekrana — svi ekrani imaju istu ivicu i ritam. */
object Razmak {
    val ivica = 20.dp
    val sekcija = 24.dp
    val stavka = 12.dp
}

/**
 * Zaglavlje ekrana u stilu M3 „large top app bar": nadnaslov, krupan naslov i akcije.
 * Nalazi se u sadržaju koji se skroluje, pa ne zauzima mesto kada dete skroluje.
 */
@Composable
fun EkranZaglavlje(
    naslov: String,
    modifier: Modifier = Modifier,
    nadnaslov: String? = null,
    onNazad: (() -> Unit)? = null,
    akcije: @Composable RowScope.() -> Unit = {},
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        if (onNazad != null) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                DugmeNazad(onNazad)
                Spacer(Modifier.weight(1f))
                akcije()
            }
            Spacer(Modifier.height(8.dp))
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                if (nadnaslov != null) {
                    Text(
                        nadnaslov.uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
                Text(
                    naslov,
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.semantics { heading() },
                )
            }
            if (onNazad == null) akcije()
        }
    }
}

@Composable
fun DugmeNazad(onNazad: () -> Unit, modifier: Modifier = Modifier) {
    FilledTonalIconButton(onClick = onNazad, modifier = modifier.size(48.dp)) {
        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Nazad")
    }
}

/** Ikona u zaobljenom obojenom kvadratu — vodeći element kartica i stavki liste. */
@Composable
fun IkonaZnak(
    ikona: ImageVector,
    boja: Color,
    modifier: Modifier = Modifier,
    velicina: Dp = 48.dp,
    pozadina: Color = boja.copy(alpha = 0.14f),
) {
    Box(
        modifier
            .size(velicina)
            .background(pozadina, RoundedCornerShape(velicina * 0.32f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(ikona, contentDescription = null, tint = boja, modifier = Modifier.size(velicina * 0.54f))
    }
}

@Composable
fun IkonaZnak(
    slika: Painter,
    boja: Color,
    modifier: Modifier = Modifier,
    velicina: Dp = 48.dp,
    pozadina: Color = boja.copy(alpha = 0.14f),
) {
    Box(
        modifier
            .size(velicina)
            .background(pozadina, RoundedCornerShape(velicina * 0.32f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(slika, contentDescription = null, tint = Color.Unspecified, modifier = Modifier.size(velicina * 0.7f))
    }
}

/** Mala „pilula" za status: „U toku", „Sada", „Pobeda"… */
@Composable
fun Znacka(
    tekst: String,
    modifier: Modifier = Modifier,
    boja: Color = Mozgalica.boje.upozorenjeKontejner,
    naBoji: Color = Mozgalica.boje.naUpozorenjeKontejneru,
    ikona: ImageVector? = null,
) {
    Surface(color = boja, contentColor = naBoji, shape = CircleShape, modifier = modifier) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (ikona != null) Icon(ikona, contentDescription = null, modifier = Modifier.size(14.dp))
            Text(tekst, style = MaterialTheme.typography.labelMedium, maxLines = 1)
        }
    }
}

@Composable
fun SekcijaNaslov(
    naslov: String,
    modifier: Modifier = Modifier,
    broj: Int? = null,
    akcija: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier.fillMaxWidth().padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            naslov,
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() },
        )
        if (broj != null && broj > 0) {
            Znacka(
                "$broj",
                boja = MaterialTheme.colorScheme.primaryContainer,
                naBoji = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
        Spacer(Modifier.weight(1f))
        akcija?.invoke()
    }
}

/** Pločica sa jednim brojem (sažetak rezultata, nagrade). */
@Composable
fun StatPlocica(
    vrednost: String,
    oznaka: String,
    ikona: ImageVector,
    boja: Color,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            IkonaZnak(ikona, boja, velicina = 36.dp)
            Text(
                vrednost,
                style = MaterialTheme.typography.titleLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                oznaka,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
            )
        }
    }
}

/** Zaobljena traka napretka sa blagom animacijom punjenja. */
@Composable
fun TrakaNapretka(
    udeo: Float,
    modifier: Modifier = Modifier,
    boja: Color = MaterialTheme.colorScheme.primary,
    pozadina: Color = MaterialTheme.colorScheme.surfaceContainerHighest,
    visina: Dp = 10.dp,
) {
    val animacije = LocalEfekti.current.animacije
    val prikazano by animateFloatAsState(
        targetValue = udeo.coerceIn(0f, 1f),
        animationSpec = tween(if (animacije) 600 else 0),
        label = "napredak",
    )
    LinearProgressIndicator(
        progress = { prikazano },
        modifier = modifier.fillMaxWidth().height(visina),
        color = boja,
        trackColor = pozadina,
        strokeCap = StrokeCap.Round,
        gapSize = 0.dp,
        drawStopIndicator = {},
    )
}

/** Obavestenje u ekranu (greška mreže, info) — obojena kartica sa ikonom. */
@Composable
fun Baner(
    tekst: String,
    ikona: ImageVector,
    modifier: Modifier = Modifier,
    boja: Color = MaterialTheme.colorScheme.errorContainer,
    naBoji: Color = MaterialTheme.colorScheme.onErrorContainer,
) {
    Surface(modifier.fillMaxWidth(), color = boja, contentColor = naBoji, shape = MaterialTheme.shapes.medium) {
        Row(
            Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(ikona, contentDescription = null, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Text(tekst, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
