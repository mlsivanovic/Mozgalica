package io.github.mlsivanovic.mozgalica.sah

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.R
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak

/** Material nema ikonu šaha — koristimo pravog skakača sa table. */
@Composable
fun SahIkona(modifier: Modifier = Modifier, velicina: Dp = 48.dp) {
    IkonaZnak(
        slika = painterResource(R.drawable.figura_bela_skakac),
        boja = MaterialTheme.colorScheme.tertiary,
        pozadina = MaterialTheme.colorScheme.tertiaryContainer,
        velicina = velicina,
        modifier = modifier,
    )
}
