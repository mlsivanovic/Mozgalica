package io.github.mlsivanovic.mozgalica.sah

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.github.bhlangonijr.chesslib.Board
import io.github.mlsivanovic.mozgalica.dizajn.LocalEfekti
import io.github.mlsivanovic.mozgalica.dizajn.Maskota
import io.github.mlsivanovic.mozgalica.dizajn.StanjeMaskote
import io.github.mlsivanovic.mozgalica.podaci.SahStanjeOdgovor

@Composable
fun SahTok(
    onNazad: () -> Unit,
    onNoviToken: (String) -> Unit,
    model: SahViewModel = hiltViewModel(),
) {
    val ui by model.stanje.collectAsStateWithLifecycle()
    val noviToken by model.noviToken.collectAsStateWithLifecycle()
    val vlasnik = LocalLifecycleOwner.current
    val efekti = LocalEfekti.current
    val kontekst = LocalContext.current
    val pogled = LocalView.current
    val zvuk = remember(efekti.zvuk) { ZvukSaha(kontekst, efekti.zvuk) }

    DisposableEffect(vlasnik) {
        val posmatrac = LifecycleEventObserver { _, dogadjaj ->
            when (dogadjaj) {
                Lifecycle.Event.ON_START -> model.vidljivost(true)
                Lifecycle.Event.ON_STOP -> model.vidljivost(false)
                else -> Unit
            }
        }
        vlasnik.lifecycle.addObserver(posmatrac)
        onDispose { vlasnik.lifecycle.removeObserver(posmatrac) }
    }
    DisposableEffect(zvuk) {
        onDispose { zvuk.otpusti() }
    }
    LaunchedEffect(noviToken) {
        val token = noviToken ?: return@LaunchedEffect
        model.potrosiNoviToken()
        onNoviToken(token)
    }
    LaunchedEffect(ui.efekat?.id) {
        val efekat = ui.efekat ?: return@LaunchedEffect
        if (efekat.kraj) {
            zvuk.kraj()
            if (efekti.haptika) pogled.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        } else if (efekat.sah) {
            zvuk.sah()
            if (efekti.haptika) pogled.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        } else if (efekat.uzimanje) {
            zvuk.uzimanje()
            if (efekti.haptika) pogled.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        } else if (efekat.potez) {
            zvuk.potez()
            if (efekti.haptika) pogled.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        }
    }

    val stanje = ui.stanje
    when {
        ui.ucitava && stanje == null -> Centrirano("Postavljam figure…")
        stanje == null -> GreskaPartije(ui.greska, onNazad, model::osvezi)
        stanje.status == "assigned" -> SpremnaPartija(ui, onNazad, model)
        else -> PartijaEkran(ui, stanje, onNazad, model)
    }

    if (ui.potvrdaPredaje) {
        AlertDialog(
            onDismissRequest = { model.potvrdaPredaje(false) },
            title = { Text("Predati partiju?") },
            text = { Text("Ovo se računa kao poraz i donosi 0 zvezdica.") },
            confirmButton = {
                Button(onClick = model::predaj) { Text("Predaj") }
            },
            dismissButton = {
                TextButton(onClick = { model.potvrdaPredaje(false) }) { Text("Otkaži") }
            },
        )
    }
}

@Composable
private fun SpremnaPartija(ui: SahUi, onNazad: () -> Unit, model: SahViewModel) {
    val stanje = ui.stanje ?: return
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TextButton(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp)) { Text("← Nazad") }
        Text("Šah protiv računara", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("${stanje.childName} · ELO ${stanje.approximateElo}", style = MaterialTheme.typography.headlineMedium)
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Maskota(StanjeMaskote.POZDRAV, velicina = 96.dp)
                Text("Spreman/na za partiju?", style = MaterialTheme.typography.titleLarge)
                val satSekundi = stanje.clockSeconds
                Text(
                    "Igraš ${if (stanje.childColor == "white") "belim" else "crnim"} figurama" +
                        if (satSekundi != null) {
                            ", sa ${satSekundi / 60} minuta po igraču. Sat se ne pauzira kada zatvoriš aplikaciju."
                        } else {
                            ", bez sata."
                        },
                )
                ui.greska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                Button(
                    onClick = model::pocni,
                    enabled = !ui.radi,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp).semantics { contentDescription = "Pokreni partiju" },
                ) { Text(if (ui.radi) "Pokrećem…" else "Pokreni partiju", style = MaterialTheme.typography.titleLarge) }
            }
        }
    }
}

@Composable
private fun PartijaEkran(
    ui: SahUi,
    stanje: SahStanjeOdgovor,
    onNazad: () -> Unit,
    model: SahViewModel,
) {
    val efekti = LocalEfekti.current
    val potezi = stanje.moves
    val rezultat = stanje.status == "completed"
    val aktivniPly = ogranicenPlyPregleda(ui.pregledPly ?: potezi.size, potezi.size)
    val pregled = if (rezultat) pozicijaPregleda(potezi, aktivniPly) else null
    val prikazaniFen = pregled?.fen ?: ui.prikazaniFen ?: stanje.fen
    val prikazaniPoslednji = pregled?.lastMove ?: ui.prikazaniPoslednji
    val deteNaPotezu = stanje.status == "in_progress" && stanje.turnColor == stanje.childColor
    val mozeIgrati = deteNaPotezu && !ui.radi && pregled == null
    val tabla = remember(prikazaniFen) { runCatching { Board().apply { loadFromFen(prikazaniFen) } }.getOrNull() }
    val uSahu = tabla?.isKingAttacked() == true
    val sat = satovi(stanje, ui.primljenoAt, ui.sada)

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            TextButton(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp).semantics { contentDescription = "Nazad" }) { Text("←") }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Šah protiv računara", style = MaterialTheme.typography.bodyLarge)
                Text("${stanje.childName} · ELO ${stanje.approximateElo}", style = MaterialTheme.typography.labelLarge)
            }
            TextButton(onClick = model::osvezi, enabled = !ui.radi) { Text("↻") }
        }

        if (!ui.naMrezi) {
            Text("Nema veze — partija se osvežava kada se veza vrati.", color = MaterialTheme.colorScheme.error)
        }
        ui.greska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        ui.obavestenje?.let { Text(it, color = MaterialTheme.colorScheme.tertiary) }

        if (stanje.clockSeconds != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                SatKartica("Beli", sat.white, stanje.status == "in_progress" && stanje.turnColor == "white", Modifier.weight(1f))
                SatKartica("Crni", sat.black, stanje.status == "in_progress" && stanje.turnColor == "black", Modifier.weight(1f))
            }
        }

        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (rezultat) {
                    Text(rezultatTekst(stanje.result), style = MaterialTheme.typography.headlineMedium)
                    Text(razlogTekst(stanje.termination), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    val zvezdice = (stanje.starsAwarded ?: 0).coerceIn(0, 5)
                    Text("⭐".repeat(zvezdice) + "☆".repeat(5 - zvezdice), style = MaterialTheme.typography.titleLarge)
                    Text("$zvezdice od 5 zvezdica", style = MaterialTheme.typography.bodyLarge)
                    if (stanje.result == "child_loss") {
                        PonudaZaPonovni(ui, stanje, model)
                    }
                } else {
                    Text(tekstFaze(ui.faza, deteNaPotezu), style = MaterialTheme.typography.titleLarge)
                    Text(
                        (if (uSahu) "Šah! " else "") + "Pomeraj figure prevlačenjem ili dodirom na dva polja.",
                        color = if (uSahu) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    val racunarNaPotezu = stanje.status == "in_progress" && stanje.turnColor != stanje.childColor
                    if (racunarNaPotezu && !ui.radi) {
                        val preostalo = ((PAUZA_PRE_RACUNARA_MS - (ui.sada - ui.primljenoAt)).coerceAtLeast(0) + 999) / 1000
                        Text(
                            if (stanje.undoAvailable) "Imaš $preostalo s da vratiš potez." else "Računar će odigrati za $preostalo s.",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                        if (stanje.undoAvailable) {
                            OutlinedButton(
                                onClick = model::ponistiPotez,
                                modifier = Modifier.heightIn(min = 56.dp).semantics { contentDescription = "Poništi moj potez" },
                            ) { Text("Poništi moj potez") }
                        }
                    }
                    OutlinedButton(
                        onClick = { model.potvrdaPredaje(true) },
                        enabled = deteNaPotezu && !ui.radi && pregled == null,
                        modifier = Modifier.heightIn(min = 56.dp).semantics { contentDescription = "Predaj partiju" },
                    ) { Text("Predaj partiju") }
                }
            }
        }

        SahTabla(
            fen = prikazaniFen,
            orijentacija = stanje.childColor,
            mozeIgrati = mozeIgrati,
            poslednjiPotez = prikazaniPoslednji,
            najavljeniPotez = if (pregled == null) ui.najavljeniPotez else null,
            animacija = if (pregled == null) ui.animacija else null,
            trajanjeAnimacije = if (efekti.animacije) ui.trajanjeAnimacije else 0,
            onPotez = model::odigrajPotez,
        )

        if (potezi.isNotEmpty()) {
            Text("Potezi", style = MaterialTheme.typography.titleLarge)
            if (rezultat) {
                Text("Pregled partije — dodirni potez ili koristi strelice.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            potezi.chunked(2).forEachIndexed { indeks, par ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("${indeks + 1}.", modifier = Modifier.padding(end = 4.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    par.forEach { potez ->
                        if (rezultat) {
                            val aktivan = potez.ply == aktivniPly
                            TextButton(
                                onClick = { model.idiNaPly(potez.ply) },
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (aktivan) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface),
                            ) {
                                Text(potez.san, color = if (aktivan) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurface)
                            }
                        } else {
                            Text(potez.san, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }
            }
            if (rezultat && potezi.isNotEmpty()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    OutlinedButton(onClick = { model.idiNaPly(0) }, enabled = aktivniPly > 0) { Text("⏮") }
                    OutlinedButton(onClick = { model.idiNaPly(aktivniPly - 1) }, enabled = aktivniPly > 0) { Text("◀") }
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("$aktivniPly / ${potezi.size}", style = MaterialTheme.typography.titleLarge)
                        Text(
                            if (aktivniPly == 0) "Početak" else pregled?.san.orEmpty(),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    OutlinedButton(onClick = { model.idiNaPly(aktivniPly + 1) }, enabled = aktivniPly < potezi.size) { Text("▶") }
                    OutlinedButton(onClick = { model.idiNaPly(potezi.size) }, enabled = aktivniPly < potezi.size) { Text("⏭") }
                }
            }
        }

        if (stanje.profileToken.isNotBlank()) {
            TextButton(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp)) { Text("← Nazad na profil") }
        }
    }
}

@Composable
private fun PonudaZaPonovni(ui: SahUi, stanje: SahStanjeOdgovor, model: SahViewModel) {
    if (!stanje.retryAvailable) {
        if ((stanje.retriesUsed ?: 0) >= MAKSIMALNO_PONOVNIH_SAHA) {
            Text("Za ovu partiju više nemaš pravo na ponovni pokušaj.", style = MaterialTheme.typography.bodyLarge)
        }
        return
    }
    if (ui.biraElo) {
        Text("Izaberi jačinu protivnika:")
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            dozvoljeniEloZaPokusaj(stanje.approximateElo).forEach { elo ->
                Button(
                    onClick = { model.pokusajPonovo(elo) },
                    enabled = !ui.radi,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
                ) {
                    Text("ELO $elo" + if (elo == stanje.approximateElo) " · ista jačina" else " · lakše")
                }
            }
        }
        TextButton(onClick = { model.biraElo(false) }) { Text("Odustani od izbora") }
    } else {
        Button(
            onClick = { model.biraElo(true) },
            enabled = !ui.radi,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).semantics { contentDescription = "Pokušaj ponovo" },
        ) { Text(if (ui.radi) "Pravim novu partiju…" else "Pokušaj ponovo") }
        Text(
            if (preostaloPokusaja(stanje.retriesUsed) == 1) {
                "Preostao ti je još 1 pokušaj, protiv istog ili slabijeg protivnika."
            } else {
                "Preostalo ti je još ${preostaloPokusaja(stanje.retriesUsed)} pokušaja, protiv istog ili slabijeg protivnika."
            },
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SatKartica(naziv: String, ms: Long?, aktivno: Boolean, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = if (aktivno) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(naziv, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(formatSat(ms), style = MaterialTheme.typography.headlineMedium)
        }
    }
}

@Composable
private fun GreskaPartije(greska: String?, onNazad: () -> Unit, onOsvezi: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Maskota(StanjeMaskote.PRAZNO, velicina = 88.dp)
        Text("Partija nije dostupna", style = MaterialTheme.typography.headlineMedium)
        Text(greska ?: "Proveri internet vezu i pokušaj ponovo.")
        Button(onClick = onOsvezi, modifier = Modifier.heightIn(min = 56.dp)) { Text("Pokušaj ponovo") }
        TextButton(onClick = onNazad) { Text("Nazad") }
    }
}

@Composable
private fun Centrirano(tekst: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(tekst, style = MaterialTheme.typography.bodyLarge)
    }
}
