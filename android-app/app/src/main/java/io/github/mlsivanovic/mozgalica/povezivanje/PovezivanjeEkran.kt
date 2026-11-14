package io.github.mlsivanovic.mozgalica.povezivanje

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
) {
    var unos by rememberSaveable { mutableStateOf("") }
    val kontekst = LocalContext.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Moja Mozgalica",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "Poveži profil deteta",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "Skeniraj QR kod sa roditeljskog ekrana ili nalepi profilni link.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Button(
            onClick = {
                pokreniQrSkener(
                    aktivnost = kontekst.nadjiAktivnost(),
                    onRezultat = onPovezi,
                    onGreska = onGreskaSkenera,
                )
            },
            enabled = !radi,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        ) {
            Text("Skeniraj QR kod")
        }
        OutlinedTextField(
            value = unos,
            onValueChange = { unos = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Profilni link ili token") },
            placeholder = { Text("https://…/#/dete/…") },
            singleLine = true,
            enabled = !radi,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.None,
                autoCorrectEnabled = false,
                keyboardType = KeyboardType.Uri,
            ),
        )
        if (greska != null) {
            Text(
                text = greska,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyLarge,
            )
        }
        OutlinedButton(
            onClick = { onPovezi(unos) },
            enabled = !radi,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        ) {
            Text(if (radi) "Povezujem…" else "Poveži profil")
        }
    }
}

fun porukaSkeniranja(): String = PorukePovezivanja.SKENER
