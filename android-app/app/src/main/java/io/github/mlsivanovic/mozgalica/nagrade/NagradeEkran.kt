package io.github.mlsivanovic.mozgalica.nagrade

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import io.github.mlsivanovic.mozgalica.profil.Osveziv

@Composable
fun NagradeEkran(
    profil: SacuvaniProfil,
    osvezava: Boolean,
    onOsvezi: () -> Unit,
    onProdavnica: () -> Unit,
) {
    val naslov = profil.trenutnaTitula?.name ?: profil.titula ?: "ShadowNoob Awakened"
    val avatar = profil.trenutnaTitula?.avatar
    val napredak = napredakTitule(profil.ukupnoZvezdica, profil.trenutnaTitula, profil.sledecaTitula)
    var prethodnaTitula by rememberSaveable { mutableStateOf(profil.titula) }
    var novaTitula by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(profil.titula) {
        val stara = prethodnaTitula
        val nova = profil.titula
        if (stara != null && nova != null && stara != nova) novaTitula = nova
        prethodnaTitula = nova
    }

    Osveziv(osvezava = osvezava, onOsvezi = onOsvezi) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Moj rad", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("Nagrade", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
            Text("⭐ ${profil.ukupnoZvezdica} zvezdica · 🛒 raspoloživo ${profil.raspolozivoZvezdica}")

            Card(Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Trenutna titula", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    TitulaAvatar(ime = naslov, avatar = avatar, velicina = 96.dp)
                    Text(naslov, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.primary)
                    Text(
                        "Rang: ${nazivRanga(parsirajTitulu(naslov).rang)}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Napredak do sledeće titule", style = MaterialTheme.typography.titleLarge)
                    val sledeca = profil.sledecaTitula
                    if (sledeca != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            TitulaAvatar(ime = sledeca.name, avatar = sledeca.avatar, velicina = 52.dp)
                            Column(Modifier.weight(1f)) {
                                Text(sledeca.name, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "Još ${sledeca.starsNeeded ?: (sledeca.minStars - profil.ukupnoZvezdica).coerceAtLeast(0)} zvezdica",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(12.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .semantics {
                                    contentDescription = "Napredak do titule ${sledeca.name}: $napredak posto"
                                },
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(napredak / 100f)
                                    .height(12.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(MaterialTheme.colorScheme.primary),
                            )
                        }
                        Text(
                            "Još ${sledeca.starsNeeded ?: (sledeca.minStars - profil.ukupnoZvezdica).coerceAtLeast(0)} zvezdica do titule „${sledeca.name}”.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        Text("Osvojio/la si najvišu titulu — svaka čast!", style = MaterialTheme.typography.titleMedium)
                    }
                }
            }

            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Zameni zvezdice za nagrade", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("Prodavnica", style = MaterialTheme.typography.headlineSmall)
                    Text(
                        "Raspoloživo: ${profil.raspolozivoZvezdica}⭐",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(
                        onClick = onProdavnica,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)
                            .semantics { contentDescription = "Otvori prodavnicu" },
                    ) { Text("Otvori prodavnicu →") }
                }
            }

            Card(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Kako do nove titule?", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "Zvezdice dobijaš za rešene kvizove i šahovske partije. Kada skupiš dovoljno, " +
                            "automatski prelaziš na sledeći rang.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }

    if (novaTitula != null) {
        val nova = profil.trenutnaTitula
        AlertDialog(
            onDismissRequest = { novaTitula = null },
            title = { Text("Nova titula!") },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    TitulaAvatar(
                        ime = nova?.name ?: novaTitula.orEmpty(),
                        avatar = nova?.avatar,
                        velicina = 120.dp,
                    )
                    Text(nova?.name ?: novaTitula.orEmpty(), style = MaterialTheme.typography.headlineSmall)
                    Text("Čestitamo! Osvojio/la si novu titulu.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                Button(onClick = { novaTitula = null }) { Text("Super!") }
            },
            dismissButton = {
                TextButton(onClick = { novaTitula = null }) { Text("Zatvori") }
            },
        )
    }
}

private fun nazivRanga(rang: RangTitule): String = when (rang) {
    RangTitule.AWAKENED -> "Awakened"
    RangTitule.EMPOWERED -> "Empowered"
    RangTitule.UNBOUND -> "Unbound"
}
