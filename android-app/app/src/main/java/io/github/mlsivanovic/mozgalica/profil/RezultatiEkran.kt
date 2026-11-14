package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil

@Composable
fun RezultatiEkran(
    profil: SacuvaniProfil,
    osvezava: Boolean,
    onOsvezi: () -> Unit,
) {
    val broj = profil.istorijaKvizova.size + profil.istorijaSaha.size
    Osveziv(osvezava = osvezava, onOsvezi = onOsvezi) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Moj rad", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Rezultati", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
                Text("$broj", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
            }
            if (broj == 0) {
                Text("Još nema završenih aktivnosti.", style = MaterialTheme.typography.bodyLarge)
            } else {
                profil.istorijaSaha.forEach { partija ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Šah protiv ELO ${partija.approximateElo}", style = MaterialTheme.typography.titleLarge)
                            Text(formatDatum(partija.completedAt), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("⭐ ${partija.starsAwarded}")
                            Text(tekstIshoda(partija.result), style = MaterialTheme.typography.titleLarge)
                        }
                    }
                }
                profil.istorijaKvizova.forEach { kviz ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(kviz.title, style = MaterialTheme.typography.titleLarge)
                            Text(formatDatum(kviz.submittedAt), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (kviz.pendingReview) {
                                Text("Čeka pregled", color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.titleLarge)
                            } else {
                                Text("⭐ ${kviz.starsAwarded}")
                                Text(formatProcenat(kviz.scorePct), style = MaterialTheme.typography.titleLarge)
                            }
                        }
                    }
                }
            }
        }
    }
}
