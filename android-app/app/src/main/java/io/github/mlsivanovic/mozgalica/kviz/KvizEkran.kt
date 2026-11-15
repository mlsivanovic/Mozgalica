package io.github.mlsivanovic.mozgalica.kviz

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.mlsivanovic.mozgalica.dizajn.Konfete
import io.github.mlsivanovic.mozgalica.dizajn.LocalEfekti
import io.github.mlsivanovic.mozgalica.dizajn.Maskota
import io.github.mlsivanovic.mozgalica.dizajn.StanjeMaskote
import io.github.mlsivanovic.mozgalica.dizajn.VisinaKonfeta
import io.github.mlsivanovic.mozgalica.podaci.PonovnoPitanje
import io.github.mlsivanovic.mozgalica.podaci.RezultatOdgovor
import io.github.mlsivanovic.mozgalica.podaci.RezultatPitanja
import io.github.mlsivanovic.mozgalica.podaci.kviz.FazaKviza
import io.github.mlsivanovic.mozgalica.podaci.kviz.MAKSIMALNO_ZVEZDICA
import io.github.mlsivanovic.mozgalica.podaci.kviz.dozvoljenSwipe
import io.github.mlsivanovic.mozgalica.podaci.kviz.formatOdbrojavanje
import io.github.mlsivanovic.mozgalica.podaci.kviz.formatProcenat
import io.github.mlsivanovic.mozgalica.podaci.kviz.nesinhronizovani
import io.github.mlsivanovic.mozgalica.podaci.kviz.odgovorJePrazan
import io.github.mlsivanovic.mozgalica.podaci.kviz.porukaOhrabrenja
import io.github.mlsivanovic.mozgalica.podaci.kviz.preostaloSaveta
import io.github.mlsivanovic.mozgalica.podaci.kviz.prikazaneZvezdice
import io.github.mlsivanovic.mozgalica.podaci.kviz.prikazaniProcenat
import io.github.mlsivanovic.mozgalica.podaci.kviz.prikazujeOcenu
import io.github.mlsivanovic.mozgalica.podaci.kviz.sveSinhronizovano
import io.github.mlsivanovic.mozgalica.podaci.kviz.tekstTacnog
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

@Composable
fun KvizTok(
    onNazad: () -> Unit,
    modifier: Modifier = Modifier,
    model: KvizViewModel = hiltViewModel(),
) {
    val ui by model.stanje.collectAsStateWithLifecycle()
    val vlasnik = LocalLifecycleOwner.current
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
    Box(modifier.fillMaxSize()) {
    when {
        ui.ucitavaMeta && ui.meta == null && ui.greska == null -> Centrirano("Učitavanje kviza…")
        ui.greska != null && ui.meta == null && ui.faza == FazaKviza.ULAZ -> GreskaEkran(ui.greska ?: "", onNazad)
        ui.ponovniIshod != null -> PonovniRezultatEkran(ui, model::zatvoriPonovniIshod)
        ui.ponovniOtvoren -> PonovniEkran(ui, model::zatvoriPonovni, model)
        ui.faza == FazaKviza.CEKA && ui.rezultat == null && !ui.rezultatSkriven -> CekaEkran(ui, onNazad, model::vratiProbnuVezu)
        ui.faza == FazaKviza.REZULTAT -> RezultatEkran(ui, onNazad, model::otvoriObjasnjenja, model::noviPokusaj, model::pokreniPonovni)
        ui.faza == FazaKviza.RESAVANJE && ui.pitanja.isNotEmpty() && ui.stanje != null -> ResavanjeEkran(ui, onNazad, model)
        else -> UlazEkran(ui, onNazad, model)
    }
    }
}

@Composable
private fun UlazEkran(ui: KvizUi, onNazad: () -> Unit, model: KvizViewModel) {
    val meta = ui.meta
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        TextButton(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp)) { Text("← Nazad") }
        Maskota(StanjeMaskote.POZDRAV, velicina = 72.dp)
        if (meta == null) {
            if (ui.greska != null) Text(ui.greska, color = MaterialTheme.colorScheme.error)
            return@Column
        }
        if (meta.accessMode == "profile" && !meta.childName.isNullOrBlank()) {
            Text("Kviz za ${meta.childName}", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(meta.title, style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
        meta.description?.takeIf { it.isNotBlank() }?.let { Text(it) }
        Text("${meta.questionCount} pitanja · ${meta.totalPoints} poena")
        meta.timeLimitSeconds?.let { Text("⏱ ${it / 60} min") }
        if (meta.accessMode != "profile" && meta.requireName) {
            OutlinedTextField(ui.ime, model::ime, label = { Text("Kako se zoveš?") }, modifier = Modifier.fillMaxWidth())
        } else if (meta.accessMode != "profile") {
            OutlinedTextField(ui.ime, model::ime, label = { Text("Nadimak (opciono)") }, modifier = Modifier.fillMaxWidth())
        }
        if (meta.accessMode != "profile" && meta.requireLabel) {
            OutlinedTextField(
                ui.oznaka,
                model::oznaka,
                label = { Text(meta.labelName ?: "Oznaka") },
                modifier = Modifier.fillMaxWidth(),
            )
        }
        ui.greska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        val natpis = when {
            ui.pokrece -> "Pokrećem…"
            meta.attemptState == "in_progress" -> "Nastavi kviz (${meta.answeredCount}/${meta.questionCount})"
            else -> "Počni kviz"
        }
        Button(
            onClick = model::pokreni,
            enabled = !ui.pokrece,
            modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp).semantics { contentDescription = "Počni kviz" },
        ) { Text(natpis, style = MaterialTheme.typography.titleLarge) }
    }
}

@Composable
private fun ResavanjeEkran(ui: KvizUi, onNazad: () -> Unit, model: KvizViewModel) {
    val stanje = ui.stanje ?: return
    val pager = rememberPagerState(initialPage = ui.indeks.coerceIn(0, ui.pitanja.lastIndex)) { ui.pitanja.size }
    val efekti = LocalEfekti.current
    LaunchedEffect(ui.indeks, ui.pitanja.size) {
        if (ui.pitanja.isNotEmpty() && pager.currentPage != ui.indeks) {
            val cilj = ui.indeks.coerceIn(0, ui.pitanja.lastIndex)
            if (efekti.animacije) pager.animateScrollToPage(cilj) else pager.scrollToPage(cilj)
        }
    }
    LaunchedEffect(pager) {
        snapshotFlowStrana(pager).collect { model.indeks(it) }
    }
    val trenutni = ui.pitanja.getOrNull(pager.currentPage.coerceIn(0, ui.pitanja.lastIndex))
    val swipe = trenutni?.let { dozvoljenSwipe(it.type, ui.tekstFokus && it.type == "text") } ?: true
    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onNazad, modifier = Modifier.semantics { contentDescription = "Izađi iz kviza" }) { Text("←") }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stanje.childName.ifBlank { "Kviz" }, style = MaterialTheme.typography.bodyLarge)
                Text("Pitanje ${pager.currentPage + 1} od ${ui.pitanja.size}")
            }
            Text(
                text = ui.preostaloSekundi?.let { "⏱ ${formatOdbrojavanje(it)}" } ?: "",
                color = if ((ui.preostaloSekundi ?: 61) <= 60) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
        }
        if (!ui.naMrezi || ui.probni) {
            Text("Radiš bez interneta — odgovori se čuvaju na uređaju i poslaće se čim se veza vrati.")
        }
        val odgovoreno = ui.pitanja.count { !odgovorJePrazan(stanje.answers[it.id]?.answer) }
        LinearProgressIndicator(
            progress = { if (ui.pitanja.isEmpty()) 0f else odgovoreno.toFloat() / ui.pitanja.size },
            modifier = Modifier.fillMaxWidth(),
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = { model.pregled(true) }) { Text("Pregled pitanja") }
            if (ui.pitanja.any { it.hasHint }) {
                val ostalo = preostaloSaveta(stanje.hintsUsed ?: 0, ui.preostaloSavetaSaServera)
                Text("💡 $ostalo")
            }
        }
        HorizontalPager(
            state = pager,
            userScrollEnabled = swipe,
            modifier = Modifier.weight(1f),
        ) { strana ->
            val pitanje = ui.pitanja[strana]
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(pitanje.text, style = MaterialTheme.typography.headlineMedium.copy(fontSize = 23.sp, lineHeight = 30.sp))
                PitanjePrikaz(
                    pitanje = pitanje,
                    odgovor = stanje.answers[pitanje.id]?.answer,
                    dozvoljenUnos = true,
                    onOdgovor = { model.odgovor(pitanje.id, it) },
                    onTekstFokus = model::tekstFokus,
                )
                if (pitanje.hasHint) SavetBlok(ui, pitanje.id, model::savet)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            OutlinedButton(onClick = { model.indeks(pager.currentPage - 1) }, enabled = pager.currentPage > 0) { Text("Nazad") }
            if (pager.currentPage < ui.pitanja.lastIndex) {
                Button(onClick = { model.indeks(pager.currentPage + 1) }, modifier = Modifier.semantics { contentDescription = "Sledeće" }) {
                    Text("Napred")
                }
            } else {
                Button(onClick = model::zatraziPredaju, enabled = !ui.pokrece, modifier = Modifier.semantics { contentDescription = "Završi kviz" }) {
                    Text(if (ui.pokrece) "Predajem…" else "Završi kviz")
                }
            }
        }
        val ceka = nesinhronizovani(stanje).size
        Text(
            when {
                ui.probni -> "Sačuvano na uređaju"
                ceka == 0 && sveSinhronizovano(stanje) -> "Sačuvano"
                else -> "$ceka čeka slanje"
            },
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        ui.greska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
    if (ui.pregled) {
        DonjiList(onZatvori = { model.pregled(false) }) {
            Text("Pregled pitanja", style = MaterialTheme.typography.titleLarge)
            ui.pitanja.chunked(5).forEach { red ->
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    red.forEach { pitanje ->
                        val indeks = ui.pitanja.indexOf(pitanje)
                        val popunjeno = !odgovorJePrazan(stanje.answers[pitanje.id]?.answer)
                        val boja = when {
                            indeks == ui.indeks -> MaterialTheme.colorScheme.primary
                            popunjeno -> MaterialTheme.colorScheme.tertiary
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        }
                        Button(
                            onClick = {
                                model.indeks(indeks)
                                model.pregled(false)
                            },
                            modifier = Modifier.semantics {
                                contentDescription = "Pitanje ${indeks + 1}${if (popunjeno) ", odgovoreno" else ", bez odgovora"}"
                            },
                        ) {
                            Text("${indeks + 1}", color = if (boja == MaterialTheme.colorScheme.surfaceVariant) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onPrimary)
                        }
                    }
                }
            }
            Text("${ui.pitanja.count { !odgovorJePrazan(stanje.answers[it.id]?.answer) }} od ${ui.pitanja.size} odgovoreno")
        }
    }
    if (ui.upozorenje) {
        val praznih = ui.pitanja.count { odgovorJePrazan(stanje.answers[it.id]?.answer) }
        DonjiList(onZatvori = model::zatvoriUpozorenje) {
            Text(tekstNeodgovorenih(praznih), style = MaterialTheme.typography.titleLarge)
            Text("Možeš da odeš na prvo prazno ili da ipak predaš kviz.")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = model::idiNaPrvoPrazno) { Text("Idi na prvo prazno") }
                Button(onClick = model::predaj, modifier = Modifier.semantics { contentDescription = "Ipak predaj" }) { Text("Ipak predaj") }
            }
        }
    }
    }
}

@Composable
private fun SavetBlok(ui: KvizUi, pitanjeId: String, onSavet: (String) -> Unit) {
    val tekst = ui.stanje?.hintovi?.get(pitanjeId)
    if (tekst != null) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Maskota(StanjeMaskote.SAVET, velicina = 40.dp)
            Text(tekst, modifier = Modifier.weight(1f))
        }
        return
    }
    val ostalo = preostaloSaveta(ui.stanje?.hintsUsed ?: 0, ui.preostaloSavetaSaServera)
    Button(
        onClick = { onSavet(pitanjeId) },
        enabled = !ui.trazimSavet && ostalo > 0 && ui.naMrezi && !ui.probni,
    ) {
        Text(if (ui.trazimSavet) "Tražim savet…" else "Savet (ostalo $ostalo)")
    }
    if (!ui.naMrezi || ui.probni) Text("Savet traži vezu.")
    ui.porukaSaveta?.let { Text(it) }
}

@Composable
private fun CekaEkran(ui: KvizUi, onNazad: () -> Unit, onVezu: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Maskota(StanjeMaskote.PRAZNO, velicina = 88.dp)
        Text("Predaja je sačuvana", style = MaterialTheme.typography.headlineMedium)
        Text("Čeka vezu. Rezultat stiže tek kad server potvrdi predaju.", style = MaterialTheme.typography.bodyLarge)
        if (ui.probni) {
            Button(onClick = onVezu, modifier = Modifier.semantics { contentDescription = "Veza se vratila" }) {
                Text("Veza se vratila")
            }
        }
        TextButton(onClick = onNazad) { Text("Nazad") }
    }
}

@Composable
private fun RezultatEkran(
    ui: KvizUi,
    onNazad: () -> Unit,
    onObjasnjenja: () -> Unit,
    onNovi: () -> Unit,
    onPonovni: () -> Unit,
) {
    val profilni = ui.stanje?.accessMode == "profile" || ui.skriveniAccessMode == "profile" || ui.rezultat?.accessMode == "profile"
    if (ui.rezultatSkriven || ui.rezultat?.showResult == false) {
        Centrirano("Kviz je predat. Tvoj rezultat će videti osoba koja ti je poslala link.")
        return
    }
    val rezultat = ui.rezultat
    if (rezultat == null) {
        Centrirano("Rezultat trenutno nije dostupan.")
        return
    }
    if (rezultat.pendingReview) {
        Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)) {
            Text("Poslato na pregled", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.semantics { contentDescription = "Poslato na pregled" })
            Text("Odgovori su poslati na pregled. Rezultat stiže kada ih pregleda odrasla osoba.")
            TextButton(onClick = onNazad) { Text(if (profilni) "Nazad na moj profil" else "Nazad") }
        }
        return
    }
    if (!prikazujeOcenu(rezultat)) {
        Centrirano("Zvezdice trenutno nisu dostupne. Pokušaj ponovo malo kasnije.")
        return
    }
    val procenat = prikazaniProcenat(rezultat)
    val zvezdice = prikazaneZvezdice(rezultat) ?: return
    val efekti = LocalEfekti.current
    val kontekst = LocalContext.current
    val zvuk = remember { ZvukKviza(kontekst, efekti.zvuk) }
    DisposableEffect(zvuk) { onDispose { zvuk.otpusti() } }
    LaunchedEffect(rezultat) { zvuk.zavrsen(zvezdice > 0) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (efekti.animacije && procenat >= 90.0) {
            Konfete(
                ukljucene = true,
                modifier = Modifier.fillMaxWidth().height(VisinaKonfeta).semantics { contentDescription = "Konfete" },
            )
        }
        Maskota(if (zvezdice > 0) StanjeMaskote.USPEH else StanjeMaskote.PRAZNO, velicina = 88.dp)
        val ime = ui.stanje?.childName?.takeIf { it.isNotBlank() }
        Text(if (ime != null) "Bravo, $ime!" else "Kviz je završen!", style = MaterialTheme.typography.headlineMedium)
        Zvezdice(zvezdice, efekti.animacije)
        Text(porukaOhrabrenja(zvezdice))
        AnimiraniProcenat(procenat, efekti.animacije)
        Text("${rezultat.totalPoints} / ${rezultat.maxPoints} poena")
        Text("✓ ${rezultat.correctCount} tačnih    ✗ ${rezultat.incorrectCount} netačnih")
        val netacni = rezultat.questions.filter { !it.isCorrect }
        if (rezultat.showCorrect && netacni.isNotEmpty() && !rezultat.retry.submitted) {
            Button(onClick = onObjasnjenja) { Text("Objasni netačne") }
        }
        when {
            ui.ponovniZapocet -> {
                Button(
                    onClick = onPonovni,
                    enabled = !ui.ponovniRadi,
                    modifier = Modifier.semantics { contentDescription = "Nastavi ponovni pokušaj" },
                ) { Text("Nastavi ponovni pokušaj") }
            }
            rezultat.retry.available && !rezultat.retry.submitted &&
                (rezultat.retry.explanationsSeen || ui.objasnjenja) -> {
                Button(
                    onClick = onPonovni,
                    enabled = !ui.ponovniRadi,
                    modifier = Modifier.semantics { contentDescription = "Probaj ponovo netačne" },
                ) { Text("Probaj ponovo netačne") }
            }
        }
        ui.ponovniGreska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        if (!profilni && rezultat.attemptsLeft > 0 && rezultat.retry.submitted != true) {
            OutlinedButton(onClick = onNovi) { Text("Pokušaj ponovo") }
        }
        if (ui.objasnjenja && rezultat.showCorrect) {
            Text("Objašnjenja netačnih zadataka", style = MaterialTheme.typography.titleLarge)
            netacni.forEachIndexed { indeks, pitanje -> PregledPitanja(pitanje, indeks, prikaziTacan = true) }
        } else {
            Text("Pregled odgovora", style = MaterialTheme.typography.titleLarge)
            rezultat.questions.forEachIndexed { indeks, pitanje -> PregledPitanja(pitanje, indeks, prikaziTacan = false) }
        }
        TextButton(onClick = onNazad) { Text(if (profilni) "Nazad na moj profil" else "Nazad") }
    }
}

@Composable
private fun PonovniEkran(ui: KvizUi, onNazad: () -> Unit, model: KvizViewModel) {
    val pitanja = ui.ponovnaPitanja
    if (pitanja.isEmpty()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        ) {
            Maskota(StanjeMaskote.PRAZNO, velicina = 88.dp)
            Text("Ponovni pokušaj", style = MaterialTheme.typography.headlineMedium)
            Text(ui.ponovniGreska ?: "Ponovni pokušaj trenutno nije dostupan.")
            Button(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp)) { Text("Nazad na rezultat") }
        }
        return
    }
    val indeks = ui.ponovniIndeks.coerceIn(0, pitanja.lastIndex)
    val pitanje = pitanja[indeks]
    val odgovoreno = pitanja.count { !odgovorJePrazan(ui.ponovniOdgovori[it.id]) }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onNazad, modifier = Modifier.semantics { contentDescription = "Nazad na rezultat" }) { Text("←") }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Ponovni pokušaj", style = MaterialTheme.typography.bodyLarge)
                Text("Pitanje ${indeks + 1} od ${pitanja.size}")
            }
            Text(if (ui.ponovniRadi) "Predajem…" else "")
        }
        Text("Nove verzije netačnih zadataka — isti tip i težina, drugi brojevi.")
        LinearProgressIndicator(
            progress = { odgovoreno.toFloat() / pitanja.size },
            modifier = Modifier.fillMaxWidth(),
        )
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(pitanje.text, style = MaterialTheme.typography.headlineMedium.copy(fontSize = 23.sp, lineHeight = 30.sp))
            PitanjePrikaz(
                pitanje = io.github.mlsivanovic.mozgalica.podaci.PitanjeZaDete(
                    id = pitanje.id,
                    type = pitanje.type,
                    text = pitanje.text,
                    options = pitanje.options,
                    hasHint = false,
                    hint = null,
                    points = pitanje.points,
                ),
                odgovor = ui.ponovniOdgovori[pitanje.id],
                dozvoljenUnos = !ui.ponovniRadi,
                onOdgovor = { model.ponovniOdgovor(pitanje.id, it) },
                onTekstFokus = {},
            )
            ui.ponovniGreska?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            OutlinedButton(
                onClick = { model.ponovniIndeks(indeks - 1) },
                enabled = indeks > 0,
            ) { Text("Nazad") }
            if (indeks < pitanja.lastIndex) {
                Button(
                    onClick = { model.ponovniIndeks(indeks + 1) },
                    modifier = Modifier.semantics { contentDescription = "Sledeće" },
                ) { Text("Napred") }
            } else {
                Button(
                    onClick = model::predajPonovni,
                    enabled = !ui.ponovniRadi,
                    modifier = Modifier.semantics { contentDescription = "Završi ponovni pokušaj" },
                ) { Text(if (ui.ponovniRadi) "Predajem…" else "Završi") }
            }
        }
        Text("$odgovoreno od ${pitanja.size} odgovoreno", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    if (ui.ponovniUpozorenje) {
        val praznih = pitanja.count { odgovorJePrazan(ui.ponovniOdgovori[it.id]) }
        DonjiList(onZatvori = model::zatvoriPonovniUpozorenje) {
            Text(tekstNeodgovorenih(praznih), style = MaterialTheme.typography.titleLarge)
            Text("Možeš da odeš na prvo prazno ili da ipak predaš ponovni pokušaj.")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = model::idiNaPrvoPraznoPonovno) { Text("Idi na prvo prazno") }
                Button(
                    onClick = model::predajPonovni,
                    modifier = Modifier.semantics { contentDescription = "Ipak predaj ponovni" },
                ) { Text("Ipak predaj") }
            }
        }
    }
}

@Composable
private fun PonovniRezultatEkran(ui: KvizUi, onNazad: () -> Unit) {
    val ishod = ui.ponovniIshod ?: return
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Maskota(
            if (ishod.allCorrect == true) StanjeMaskote.USPEH else StanjeMaskote.PRAZNO,
            velicina = 88.dp,
        )
        Text(
            if (ishod.allCorrect == true) "Svi netačni zadaci su sada tačni!" else "Ponovni pokušaj je predat",
            style = MaterialTheme.typography.headlineMedium,
        )
        Text("Na ovom pokušaju: ${ishod.starsAwarded ?: 0} / $MAKSIMALNO_ZVEZDICA ⭐")
        if (ishod.allCorrect == false) {
            Text("Neki zadaci i dalje nisu tačni. Pogledaj tačne odgovore ispod.")
        }
        ishod.questions.forEachIndexed { indeks, pitanje ->
            PregledPitanja(ponovnoURezultat(pitanje), indeks, prikaziTacan = true)
        }
        Button(onClick = onNazad, modifier = Modifier.heightIn(min = 56.dp)) { Text("Nazad na rezultat") }
    }
}

private fun ponovnoURezultat(pitanje: PonovnoPitanje): RezultatPitanja = RezultatPitanja(
    id = pitanje.id,
    type = pitanje.type,
    text = pitanje.text,
    options = pitanje.options,
    points = pitanje.points,
    answer = pitanje.answer,
    isCorrect = pitanje.isCorrect == true,
    awardedPoints = if (pitanje.isCorrect == true) pitanje.points else 0,
    correct = pitanje.correct,
    explanation = pitanje.explanation,
    topicSlug = null,
)

@Composable
private fun PregledPitanja(pitanje: RezultatPitanja, indeks: Int, prikaziTacan: Boolean) {
    Column(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("${if (pitanje.isCorrect) "✓" else "✗"} Pitanje ${indeks + 1} · ${pitanje.awardedPoints} / ${pitanje.points} poena")
        Text(pitanje.text, style = MaterialTheme.typography.bodyLarge)
        PitanjePrikaz(
            pitanje = io.github.mlsivanovic.mozgalica.podaci.PitanjeZaDete(
                id = pitanje.id,
                type = pitanje.type,
                text = pitanje.text,
                options = pitanje.options,
                hasHint = false,
                hint = null,
                points = pitanje.points,
            ),
            odgovor = pitanje.answer,
            dozvoljenUnos = false,
            onOdgovor = {},
            onTekstFokus = {},
        )
        if (prikaziTacan) {
            tekstTacnog(pitanje)?.let { Text("✔ Tačan odgovor: $it") }
            pitanje.explanation?.let { Text("💡 $it") }
        }
    }
}

@Composable
private fun Zvezdice(broj: Int, animacije: Boolean) {
    val prikaz = remember { Animatable(if (animacije) 0f else broj.toFloat()) }
    LaunchedEffect(broj, animacije) {
        if (animacije) prikaz.animateTo(broj.toFloat(), tween(700)) else prikaz.snapTo(broj.toFloat())
    }
    val otvorene = prikaz.value.toInt().coerceIn(0, MAKSIMALNO_ZVEZDICA)
    Text(
        text = buildString {
            repeat(MAKSIMALNO_ZVEZDICA) { indeks -> append(if (indeks < otvorene) "⭐" else "☆") }
        },
        modifier = Modifier.semantics { contentDescription = "$broj od $MAKSIMALNO_ZVEZDICA zvezdica" },
        style = MaterialTheme.typography.headlineMedium,
    )
}

@Composable
private fun AnimiraniProcenat(cilj: Double, animacije: Boolean) {
    val prikaz = remember { Animatable(if (animacije) 0f else cilj.toFloat()) }
    LaunchedEffect(cilj, animacije) {
        if (animacije) prikaz.animateTo(cilj.toFloat(), tween(900)) else prikaz.snapTo(cilj.toFloat())
    }
    val tekst = formatProcenat(if (animacije) prikaz.value.toDouble() else cilj)
    Text(
        text = tekst,
        modifier = Modifier.semantics { contentDescription = "Rezultat ${formatProcenat(cilj)}" },
        style = MaterialTheme.typography.headlineMedium,
        color = MaterialTheme.colorScheme.primary,
    )
}

@Composable
private fun DonjiList(onZatvori: () -> Unit, sadrzaj: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.scrim), contentAlignment = Alignment.BottomCenter) {
        Column(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)).background(MaterialTheme.colorScheme.surface).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            sadrzaj()
            TextButton(onClick = onZatvori) { Text("Zatvori") }
        }
    }
}

@Composable
private fun Centrirano(tekst: String) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Text(tekst, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun GreskaEkran(tekst: String, onNazad: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)) {
        Maskota(StanjeMaskote.PRAZNO, velicina = 72.dp)
        Text(tekst, color = MaterialTheme.colorScheme.error)
        TextButton(onClick = onNazad) { Text("Nazad") }
    }
}

private fun snapshotFlowStrana(pager: androidx.compose.foundation.pager.PagerState) =
    snapshotFlow { pager.currentPage }.map { it }.distinctUntilChanged()
