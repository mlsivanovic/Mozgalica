package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvanaObavestenja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvanoObavestenje

@Composable
fun ZvonceDugme(
    ime: String,
    neprocitano: Int,
    onClick: () -> Unit,
) {
    val opis = if (neprocitano > 0) {
        "Obaveštenja za $ime, $neprocitano nepročitanih"
    } else {
        "Obaveštenja za $ime"
    }
    TextButton(
        onClick = onClick,
        modifier = Modifier.size(56.dp).semantics { contentDescription = opis },
    ) {
        Text(if (neprocitano > 0) "🔔$neprocitano" else "🔔")
    }
}

@Composable
fun ZvoncePanel(
    obavestenja: SacuvanaObavestenja,
    istorija: Boolean,
    onIstorija: (Boolean) -> Unit,
    onOznaciProcitanim: (List<String>?) -> Unit,
    onOtvori: (SacuvanoObavestenje) -> Unit,
) {
    val nova = obavestenja.stavke.filter { it.readAt == null }
    val procitana = obavestenja.stavke.filter { it.readAt != null }
    val lista = if (istorija) procitana else nova
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(12.dp).heightIn(max = 360.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = if (istorija) "Istorija obaveštenja" else "Obaveštenja",
                    style = MaterialTheme.typography.titleLarge,
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!istorija && obavestenja.neprocitano > 0) {
                    TextButton(onClick = { onOznaciProcitanim(null) }, modifier = Modifier.heightIn(min = 48.dp)) {
                        Text("Označi sve kao pročitano")
                    }
                }
                if (!istorija && procitana.isNotEmpty()) {
                    TextButton(onClick = { onIstorija(true) }, modifier = Modifier.heightIn(min = 48.dp)) {
                        Text("Istorija (${procitana.size})")
                    }
                }
                if (istorija) {
                    TextButton(onClick = { onIstorija(false) }, modifier = Modifier.heightIn(min = 48.dp)) {
                        Text("Nazad na nova")
                    }
                }
            }
            when {
                obavestenja.stavke.isEmpty() -> Text("Još nema obaveštenja.")
                lista.isEmpty() -> Text(if (istorija) "Nema pročitanih obaveštenja." else "Nema novih obaveštenja.")
                else -> lista.forEach { stavka ->
                    TextButton(
                        onClick = {
                            if (stavka.readAt == null) onOznaciProcitanim(listOf(stavka.id))
                            onOtvori(stavka)
                        },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(stavka.title, style = MaterialTheme.typography.titleLarge)
                            Text(stavka.body, style = MaterialTheme.typography.bodyLarge)
                            Text(
                                formatDatum(stavka.createdAt),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}
