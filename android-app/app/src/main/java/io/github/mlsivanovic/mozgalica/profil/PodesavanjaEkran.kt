package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzborTeme
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.StanjePodesavanja

@Composable
fun PodesavanjaEkran(
    stanje: StanjePodesavanja,
    onNazad: () -> Unit,
    onTemu: (IzborTeme) -> Unit,
    onZvuk: (Boolean) -> Unit,
    onHaptiku: (Boolean) -> Unit,
    onPromeniProfil: () -> Unit,
) {
    var pitaj by rememberSaveable { mutableStateOf(false) }
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        TextButton(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp)) { Text("Nazad") }
        Text("Moj nalog", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
        Text("Podešavanja", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
        Text("Izgled", style = MaterialTheme.typography.titleLarge)
        Text(
            "Mozgalica može da prati temu telefona.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            TemaDugme("Sistem", stanje.tema == IzborTeme.SISTEM, Modifier.weight(1f)) { onTemu(IzborTeme.SISTEM) }
            TemaDugme("Svetla", stanje.tema == IzborTeme.SVETLA, Modifier.weight(1f)) { onTemu(IzborTeme.SVETLA) }
            TemaDugme("Tamna", stanje.tema == IzborTeme.TAMNA, Modifier.weight(1f)) { onTemu(IzborTeme.TAMNA) }
        }
        Prekidac("Zvuk", stanje.zvuk, onZvuk)
        Prekidac("Vibracija", stanje.haptika, onHaptiku)
        OutlinedButton(
            onClick = { pitaj = true },
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
        ) {
            Text("Promeni profil")
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
private fun TemaDugme(naziv: String, izabran: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val dugme = modifier.heightIn(min = 56.dp)
    if (izabran) Button(onClick = onClick, modifier = dugme) { Text(naziv) }
    else OutlinedButton(onClick = onClick, modifier = dugme) { Text(naziv) }
}

@Composable
private fun Prekidac(naziv: String, ukljucen: Boolean, onPromena: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .toggleable(value = ukljucen, role = Role.Switch, onValueChange = onPromena),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(naziv, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
        Switch(checked = ukljucen, onCheckedChange = null)
    }
}
