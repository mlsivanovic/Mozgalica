package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.VolumeUp
import androidx.compose.material.icons.rounded.BrightnessAuto
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.SwitchAccount
import androidx.compose.material.icons.rounded.Vibration
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import io.github.mlsivanovic.mozgalica.dizajn.EkranZaglavlje
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak
import io.github.mlsivanovic.mozgalica.dizajn.Razmak
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzborTeme
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.StanjePodesavanja
import io.github.mlsivanovic.mozgalica.push.PushKartica
import io.github.mlsivanovic.mozgalica.push.PushViewModel

@Composable
fun PodesavanjaEkran(
    stanje: StanjePodesavanja,
    onNazad: () -> Unit,
    onTemu: (IzborTeme) -> Unit,
    onZvuk: (Boolean) -> Unit,
    onHaptiku: (Boolean) -> Unit,
    onPromeniProfil: () -> Unit,
    pushModel: PushViewModel = hiltViewModel(),
) {
    var pitaj by rememberSaveable { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Razmak.ivica, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(Razmak.stavka),
    ) {
        EkranZaglavlje(nadnaslov = "Moj nalog", naslov = "Podešavanja", onNazad = onNazad)

        Naslov("Izgled")
        Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerLow) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IkonaZnak(Icons.Rounded.Palette, MaterialTheme.colorScheme.primary, velicina = 40.dp)
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("Tema", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Mozgalica može da prati temu telefona.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                val opcije = listOf(
                    Triple(IzborTeme.SISTEM, "Sistem", Icons.Rounded.BrightnessAuto),
                    Triple(IzborTeme.SVETLA, "Svetla", Icons.Rounded.LightMode),
                    Triple(IzborTeme.TAMNA, "Tamna", Icons.Rounded.DarkMode),
                )
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    opcije.forEachIndexed { i, (tema, naziv, ikona) ->
                        SegmentedButton(
                            selected = stanje.tema == tema,
                            onClick = { onTemu(tema) },
                            shape = SegmentedButtonDefaults.itemShape(i, opcije.size),
                            icon = { Icon(ikona, null, modifier = Modifier.size(SegmentedButtonDefaults.IconSize)) },
                        ) { Text(naziv) }
                    }
                }
            }
        }

        Naslov("Zvuk i obaveštenja")
        Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerLow) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                Prekidac(Icons.AutoMirrored.Rounded.VolumeUp, MaterialTheme.colorScheme.tertiary, "Zvuk", "Kratki zvuci u kvizu i šahu", stanje.zvuk, onZvuk)
                Prekidac(Icons.Rounded.Vibration, MaterialTheme.colorScheme.primary, "Vibracija", "Blago podrhtavanje na dodir", stanje.haptika, onHaptiku)
            }
        }
        PushKartica(pushModel)

        Naslov("Profil")
        OutlinedButton(
            onClick = { pitaj = true },
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
        ) {
            Icon(Icons.Rounded.SwitchAccount, null)
            Spacer(Modifier.width(8.dp))
            Text("Promeni profil")
        }
    }
    if (pitaj) {
        AlertDialog(
            onDismissRequest = { pitaj = false },
            icon = { Icon(Icons.Rounded.SwitchAccount, null) },
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
private fun Naslov(tekst: String) {
    Text(
        tekst,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(start = 4.dp, top = 8.dp),
    )
}

@Composable
private fun Prekidac(
    ikona: ImageVector,
    boja: Color,
    naziv: String,
    opis: String,
    ukljucen: Boolean,
    onPromena: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 64.dp)
            .toggleable(value = ukljucen, role = Role.Switch, onValueChange = onPromena),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IkonaZnak(ikona, boja, velicina = 40.dp)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(naziv, style = MaterialTheme.typography.titleMedium)
            Text(opis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = ukljucen, onCheckedChange = null)
    }
}
