package io.github.mlsivanovic.mozgalica.push

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material3.Surface
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun PushKartica(model: PushViewModel = hiltViewModel()) {
    val ui by model.stanje.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var objasnjenje by rememberSaveable { mutableStateOf(false) }
    var dozvola by remember { mutableStateOf(imaDozvolu(context)) }
    val trazilac = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { data ->
        dozvola = data
        if (data) model.ukljuci() else model.prijaviDozvoluOdbijenu()
    }

    Surface(Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 56.dp)
                    .toggleable(
                        value = ui.ukljucen && dozvola,
                        enabled = ui.dostupan && !ui.ucitava,
                        role = Role.Switch,
                    ) { ukljuci ->
                        if (ukljuci) {
                            if (imaDozvolu(context)) model.ukljuci() else objasnjenje = true
                        } else {
                            model.iskljuci()
                        }
                    },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                IkonaZnak(Icons.Rounded.Notifications, MaterialTheme.colorScheme.primary, velicina = 40.dp)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text("Obaveštenja", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Novi zadaci i rezultati stižu kao obaveštenja.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = ui.ukljucen && dozvola,
                    onCheckedChange = null,
                    enabled = ui.dostupan && !ui.ucitava,
                    modifier = Modifier.semantics { contentDescription = "Obaveštenja" },
                )
            }
            if (!ui.dostupan) {
                Text(
                    "Push nije podešen u ovoj gradnji (nedostaje Firebase konfiguracija).",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (ui.ucitava && ui.dostupan) {
                Text("Proveravam obaveštenja…", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            ui.greska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (ui.dostupan && !ui.ucitava && ui.greska != null) {
                TextButton(onClick = model::osvezi) { Text("Pokušaj ponovo") }
            }
        }
    }

    if (objasnjenje) {
        AlertDialog(
            onDismissRequest = { objasnjenje = false },
            title = { Text("Uključi obaveštenja") },
            text = {
                Text(
                    "Mozgalica može da ti javi kada stigne novi kviz ili šahovska partija i kada " +
                        "bude gotov rezultat. Obaveštenja možeš isključiti u svakom trenutku.",
                )
            },
            confirmButton = {
                Button(onClick = {
                    objasnjenje = false
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        trazilac.launch(Manifest.permission.POST_NOTIFICATIONS)
                    } else {
                        dozvola = true
                        model.ukljuci()
                    }
                }) { Text("Dozvoli") }
            },
            dismissButton = {
                TextButton(onClick = { objasnjenje = false }) { Text("Ne sada") }
            },
        )
    }
}

private fun imaDozvolu(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
    return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
}
