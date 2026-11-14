package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.podaci.AktivnaPartija
import io.github.mlsivanovic.mozgalica.podaci.AktivniKviz
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvanaObavestenja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil

@Composable
fun PocetnaEkran(
    profil: SacuvaniProfil,
    rasporedPostoji: Boolean,
    obavestenja: SacuvanaObavestenja,
    osvezava: Boolean,
    greskaMreze: String?,
    onOsvezi: () -> Unit,
    onPodesavanja: () -> Unit,
    onRaspored: () -> Unit,
    onKviz: (String) -> Unit,
    onSah: (String) -> Unit,
    onOznaciProcitanim: (List<String>?) -> Unit,
    onObavestenje: (String) -> Unit,
) {
    val brojAktivnih = profil.aktivniKvizovi.size + profil.aktivnePartije.size
    var zvonceOtvoreno by rememberSaveable { mutableStateOf(false) }
    var istorija by rememberSaveable { mutableStateOf(false) }
    Osveziv(osvezava = osvezava, onOsvezi = onOsvezi) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                ZvonceDugme(
                    ime = profil.ime,
                    neprocitano = obavestenja.neprocitano,
                    onClick = {
                        zvonceOtvoreno = !zvonceOtvoreno
                        if (!zvonceOtvoreno) istorija = false
                    },
                )
                TextButton(
                    onClick = onPodesavanja,
                    modifier = Modifier.heightIn(min = 56.dp).semantics { contentDescription = "Podešavanja" },
                ) {
                    Text("⚙️")
                }
            }
            if (zvonceOtvoreno) {
                ZvoncePanel(
                    obavestenja = obavestenja,
                    istorija = istorija,
                    onIstorija = { istorija = it },
                    onOznaciProcitanim = onOznaciProcitanim,
                    onOtvori = {
                        zvonceOtvoreno = false
                        onObavestenje(it.targetUrl)
                    },
                )
            }
            Text(text = profil.avatar, style = MaterialTheme.typography.headlineMedium)
            Text(
                text = "Moj profil",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = profil.ime,
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(text = "⭐ ${profil.ukupnoZvezdica} zvezdica", style = MaterialTheme.typography.titleLarge)
            Text(
                text = "Raspoloživo: ${profil.raspolozivoZvezdica}",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            profil.titula?.let { titula ->
                Text(text = titula, style = MaterialTheme.typography.bodyLarge)
            }
            if (greskaMreze != null) {
                Text(text = greskaMreze, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyLarge)
            }
            if (rasporedPostoji) {
                Card(onClick = onRaspored, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Današnji raspored", style = MaterialTheme.typography.titleLarge)
                        Text(
                            "Pogledaj časove za danas i sutra.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Aktivne aktivnosti", style = MaterialTheme.typography.titleLarge)
                Text("$brojAktivnih", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.primary)
            }
            if (brojAktivnih == 0) {
                PraznoStanje("Sve je završeno!", "Novi zadaci će se pojaviti ovde.")
            } else {
                profil.aktivnePartije.forEach { partija ->
                    PartijaKartica(partija, onClick = { onSah(partija.playToken) })
                }
                profil.aktivniKvizovi.forEach { kviz ->
                    KvizKartica(kviz, onClick = { onKviz(kviz.quizToken) })
                }
            }
        }
    }
}

@Composable
private fun PartijaKartica(partija: AktivnaPartija, onClick: () -> Unit) {
    val uToku = partija.status == "in_progress"
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(if (uToku) "Partija u toku" else "Novi šah", color = MaterialTheme.colorScheme.primary)
            Text("Šah protiv računara", style = MaterialTheme.typography.titleLarge)
            Text(
                "Igraš ${if (partija.childColor == "white") "belim" else "crnim"} · ${tekstSata(partija.clockSeconds)}",
                style = MaterialTheme.typography.bodyLarge,
            )
            Text("ELO ${partija.approximateElo}", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(if (uToku) "Nastavi partiju" else "Pokreni partiju", style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun KvizKartica(kviz: AktivniKviz, onClick: () -> Unit) {
    val uToku = kviz.attemptState == "in_progress"
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(if (uToku) "U toku" else "Novi kviz", color = MaterialTheme.colorScheme.primary)
            Text(kviz.title, style = MaterialTheme.typography.titleLarge)
            kviz.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            val odgovoreno = if (uToku) " · ${kviz.answeredCount} odgovoreno" else ""
            val vreme = kviz.timeLimitSeconds?.let { sekunde ->
                val preostalo = kviz.remainingSeconds ?: sekunde
                " · ⏱ ${formatOdbrojavanje(preostalo)}"
            }.orEmpty()
            Text("📝 ${tekstPitanja(kviz.questionCount)}$odgovoreno$vreme", style = MaterialTheme.typography.bodyLarge)
            Text(if (uToku) "Nastavi" else "Počni kviz", style = MaterialTheme.typography.labelLarge)
        }
    }
}

private fun formatOdbrojavanje(sekunde: Int): String {
    val s = sekunde.coerceAtLeast(0)
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}
