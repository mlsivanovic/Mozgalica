package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.BuildConfig
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil

@Composable
fun ProveraEkran() {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Moja Mozgalica",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}

@Composable
fun PocetnaEkran(
    profil: SacuvaniProfil,
    osvezava: Boolean,
    greskaMreze: String?,
    onPromeniProfil: () -> Unit,
    onKviz: () -> Unit,
    onSah: () -> Unit,
) {
    var pitaj by rememberSaveable { mutableStateOf(false) }
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (osvezava) {
            LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
        }
        Text(text = profil.avatar, style = MaterialTheme.typography.headlineMedium)
        Text(
            text = profil.ime,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "⭐ ${profil.ukupnoZvezdica} zvezdica",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "Raspoloživo: ${profil.raspolozivoZvezdica}",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        val titula = profil.titula
        if (titula != null) {
            Text(
                text = titula,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
        }
        if (greskaMreze != null) {
            Text(
                text = greskaMreze,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyLarge,
            )
        }
        TextButton(onClick = { pitaj = true }) {
            Text("Promeni profil")
        }
        if (BuildConfig.DEBUG) {
            TextButton(onClick = onKviz, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Probni prikaz kviza")
            }
            TextButton(onClick = onSah, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Probni prikaz šaha")
            }
        }
    }
    if (pitaj) {
        AlertDialog(
            onDismissRequest = { pitaj = false },
            title = { Text("Promena profila") },
            text = { Text("Obrisati sačuvani profil sa ovog uređaja i povezati drugi?") },
            confirmButton = {
                TextButton(onClick = {
                    pitaj = false
                    onPromeniProfil()
                }) { Text("Promeni") }
            },
            dismissButton = {
                TextButton(onClick = { pitaj = false }) { Text("Ostani") }
            },
        )
    }
}

@Composable
fun PrazanTab(naziv: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = naziv,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "Ovde još nema ničega.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun FokusiranEkran(naziv: String, onNazad: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = naziv,
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            text = "Donja navigacija je sakrivena.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Button(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp)) {
            Text("Nazad")
        }
    }
}
