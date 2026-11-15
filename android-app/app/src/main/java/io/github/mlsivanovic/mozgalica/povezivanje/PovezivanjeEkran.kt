package io.github.mlsivanovic.mozgalica.povezivanje

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.QrCodeScanner
import androidx.compose.material3.Icon
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.style.TextAlign
import io.github.mlsivanovic.mozgalica.dizajn.Baner
import io.github.mlsivanovic.mozgalica.dizajn.Maskota
import io.github.mlsivanovic.mozgalica.dizajn.StanjeMaskote
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PorukePovezivanja

@Composable
fun PovezivanjeEkran(
    greska: String?,
    radi: Boolean,
    onPovezi: (String) -> Unit,
    onGreskaSkenera: () -> Unit,
    onProbniPrikaz: (() -> Unit)? = null,
) {
    var unos by rememberSaveable { mutableStateOf("") }
    val kontekst = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Maskota(StanjeMaskote.POZDRAV, velicina = 128.dp)
        Text(
            text = "Moja Mozgalica",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "Poveži profil deteta",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Text(
            text = "Skeniraj QR kod sa roditeljskog ekrana ili nalepi profilni link.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = {
                pokreniQrSkener(
                    aktivnost = kontekst.nadjiAktivnost(),
                    onRezultat = onPovezi,
                    onGreska = onGreskaSkenera,
                )
            },
            enabled = !radi,
            modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp),
            shape = MaterialTheme.shapes.large,
        ) {
            Icon(Icons.Rounded.QrCodeScanner, null)
            Spacer(Modifier.width(10.dp))
            Text("Skeniraj QR kod", style = MaterialTheme.typography.titleMedium)
        }
        Text("ili", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedTextField(
            value = unos,
            onValueChange = { unos = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Profilni link ili token") },
            placeholder = { Text("https://…/#/dete/…") },
            singleLine = true,
            enabled = !radi,
            leadingIcon = { Icon(Icons.Rounded.Link, null) },
            shape = MaterialTheme.shapes.medium,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.None,
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Uri,
            ),
        )
        if (greska != null) {
            Baner(greska, Icons.Rounded.ErrorOutline)
        }
        OutlinedButton(
            onClick = { onPovezi(unos) },
            enabled = !radi,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        ) {
            Text(if (radi) "Povezujem…" else "Poveži profil")
        }
        if (onProbniPrikaz != null) {
            TextButton(
                onClick = onProbniPrikaz,
                enabled = !radi,
                modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
            ) {
                Text("Prikaži probni profil")
            }
        }
    }
}

fun porukaSkeniranja(): String = PorukePovezivanja.SKENER
