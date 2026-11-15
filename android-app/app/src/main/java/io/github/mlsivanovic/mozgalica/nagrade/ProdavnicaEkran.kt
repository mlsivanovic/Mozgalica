package io.github.mlsivanovic.mozgalica.nagrade

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import io.github.mlsivanovic.mozgalica.dizajn.EkranZaglavlje
import io.github.mlsivanovic.mozgalica.dizajn.Mozgalica
import io.github.mlsivanovic.mozgalica.dizajn.Razmak
import io.github.mlsivanovic.mozgalica.dizajn.SekcijaNaslov
import io.github.mlsivanovic.mozgalica.dizajn.StatPlocica
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.mlsivanovic.mozgalica.podaci.KupovinaPrikaz
import io.github.mlsivanovic.mozgalica.podaci.ProdavnicaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.StavkaProdavnice
import io.github.mlsivanovic.mozgalica.profil.formatDatum

@Composable
fun ProdavnicaTok(
    onNazad: () -> Unit,
    model: ProdavnicaViewModel = hiltViewModel(),
) {
    val ui by model.stanje.collectAsStateWithLifecycle()
    ProdavnicaEkran(ui, onNazad, model)
    ui.potvrda?.let { stavka ->
        PotvrdaKupovine(
            stavka = stavka,
            balans = ui.podaci?.balance ?: 0,
            kupuje = ui.kupuje,
            greska = ui.greska,
            onOtkazi = model::zatvoriPotvrdu,
            onKupi = model::kupi,
        )
    }
}

@Composable
private fun ProdavnicaEkran(
    ui: ProdavnicaUi,
    onNazad: () -> Unit,
    model: ProdavnicaViewModel,
) {
    val podaci = ui.podaci
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Razmak.ivica, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(Razmak.stavka),
    ) {
        EkranZaglavlje(
            nadnaslov = podaci?.let { "${it.avatar} ${it.name}" } ?: "Nagrade",
            naslov = "Prodavnica",
            onNazad = onNazad,
        )
        if (podaci != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                StatPlocica("${podaci.balance}", "Raspoloživo", Icons.Rounded.ShoppingBag, Mozgalica.boje.upozorenje, Modifier.weight(1f))
                StatPlocica("${podaci.totalStars}", "Ukupno zvezdica", Icons.Rounded.Star, Mozgalica.boje.zvezda, Modifier.weight(1f))
            }
        }
        if (ui.poruka != null) {
            Text(ui.poruka, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyLarge)
        }
        if (ui.greska != null && ui.potvrda == null) {
            Text(ui.greska, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyLarge)
            TextButton(onClick = model::osvezi) { Text("Pokušaj ponovo") }
        }
        when {
            ui.ucitava && podaci == null -> Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                Text("Učitavam prodavnicu…")
            }
            podaci == null -> {
                if (ui.greska == null) Text("Prodavnica nije dostupna.")
            }
            else -> {
                Katalog(podaci, ui.kupuje, model)
                HorizontalDivider()
                Kupovine(podaci.purchases)
            }
        }
    }
}

@Composable
private fun Katalog(podaci: ProdavnicaOdgovor, kupuje: Boolean, model: ProdavnicaViewModel) {
    SekcijaNaslov("Katalog nagrada", broj = podaci.items.size)
    if (podaci.items.isEmpty()) {
        Text("Prodavnica je trenutno prazna. Nove nagrade će se pojaviti uskoro.")
        return
    }
    podaci.items.forEach { stavka ->
        val kupljeno = stavka.purchased && !stavka.repeatable
        val ceka = stavka.awaitingConsumption
        val dovoljno = podaci.balance >= stavka.cost
        val onemoguceno = kupljeno || ceka || !dovoljno || kupuje
        val tekstDugmeta = when {
            kupljeno -> "Kupljeno"
            ceka -> "Čeka isporuku"
            !dovoljno -> "Potrebno ${stavka.cost} ★"
            else -> "Kupi · ${stavka.cost} ★"
        }
        Card(
            Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(60.dp)
                            .background(Mozgalica.boje.upozorenjeKontejner, MaterialTheme.shapes.medium),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(stavka.emoji.ifBlank { "🎁" }, fontSize = 32.sp)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(stavka.title, style = MaterialTheme.typography.titleMedium)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Star, null, tint = Mozgalica.boje.zvezda, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("${stavka.cost}", style = MaterialTheme.typography.labelLarge)
                        }
                    }
                }
                stavka.description?.takeIf { it.isNotBlank() }?.let {
                    Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (stavka.repeatable) {
                    Text("Može više puta", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (stavka.repeatable && stavka.previousCount > 0 && !ceka) {
                    Text("Ranije isporučeno: ${stavka.previousCount}×", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Button(
                    onClick = { model.otvoriPotvrdu(stavka) },
                    enabled = !onemoguceno,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                ) { Text(tekstDugmeta) }
            }
        }
    }
}

@Composable
private fun Kupovine(kupovine: List<KupovinaPrikaz>) {
    Text("Moje kupovine", style = MaterialTheme.typography.titleLarge)
    if (kupovine.isEmpty()) {
        Text("Još uvek nema kupovina. Kupi nešto iz kataloga da bi se nagrada pojavila ovde.")
        return
    }
    kupovine.forEach { kupovina ->
        Card(Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(kupovina.emoji.ifBlank { "🎁" }, fontSize = 28.sp)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(kupovina.title, fontWeight = FontWeight.SemiBold)
                    Text(
                        "${kupovina.cost}⭐ · ${formatDatum(kupovina.requestedAt)}" +
                            (kupovina.consumedAt?.let { " · isporučeno ${formatDatum(it)}" } ?: ""),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                Text(
                    nazivStatusa(kupovina.status),
                    color = when (kupovina.status) {
                        "consumed" -> MaterialTheme.colorScheme.primary
                        "requested" -> MaterialTheme.colorScheme.tertiary
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
    }
}

private fun nazivStatusa(status: String): String = when (status) {
    "requested" -> "Čeka isporuku"
    "consumed" -> "Isporučeno"
    "cancelled" -> "Otkazano"
    else -> status
}

@Composable
private fun PotvrdaKupovine(
    stavka: StavkaProdavnice,
    balans: Int,
    kupuje: Boolean,
    greska: String?,
    onOtkazi: () -> Unit,
    onKupi: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onOtkazi,
        title = { Text("Potvrda kupovine") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(stavka.emoji.ifBlank { "🎁" }, fontSize = 34.sp)
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(stavka.title, style = MaterialTheme.typography.titleMedium)
                        stavka.description?.takeIf { it.isNotBlank() }?.let {
                            Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Text(
                    "Biće potrošeno ${stavka.cost}⭐ od raspoloživih ${balans}⭐. " +
                        "Nakon kupovine ostaje ${(balans - stavka.cost).coerceAtLeast(0)}⭐.",
                )
                greska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        },
        confirmButton = {
            Button(
                onClick = onKupi,
                enabled = !kupuje,
                modifier = Modifier.semantics { contentDescription = "Potvrdi kupovinu" },
            ) { Text(if (kupuje) "Kupujem…" else "Kupi za ${stavka.cost} ★") }
        },
        dismissButton = {
            TextButton(onClick = onOtkazi, enabled = !kupuje) { Text("Otkaži") }
        },
    )
}
