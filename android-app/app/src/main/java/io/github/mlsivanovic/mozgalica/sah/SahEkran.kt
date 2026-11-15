package io.github.mlsivanovic.mozgalica.sah

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.NavigateBefore
import androidx.compose.material.icons.automirrored.rounded.NavigateNext
import androidx.compose.material.icons.automirrored.rounded.Undo
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.FirstPage
import androidx.compose.material.icons.rounded.Flag
import androidx.compose.material.icons.rounded.Handshake
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.LastPage
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Replay
import androidx.compose.material.icons.rounded.SmartToy
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarOutline
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.TouchApp
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.github.bhlangonijr.chesslib.Board
import io.github.mlsivanovic.mozgalica.dizajn.Baner
import io.github.mlsivanovic.mozgalica.dizajn.DugmeNazad
import io.github.mlsivanovic.mozgalica.dizajn.EkranZaglavlje
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak
import io.github.mlsivanovic.mozgalica.dizajn.LocalEfekti
import io.github.mlsivanovic.mozgalica.dizajn.Maskota
import io.github.mlsivanovic.mozgalica.dizajn.Mozgalica
import io.github.mlsivanovic.mozgalica.dizajn.Razmak
import io.github.mlsivanovic.mozgalica.dizajn.StanjeMaskote
import io.github.mlsivanovic.mozgalica.dizajn.Znacka
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
            icon = { Icon(Icons.Rounded.Flag, null) },
            confirmButton = {
                Button(
                    onClick = model::predaj,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                ) { Text("Predaj") }
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
    val beli = stanje.childColor == "white"
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Razmak.ivica, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(Razmak.stavka),
    ) {
        EkranZaglavlje(nadnaslov = "Nova partija", naslov = "Šah protiv računara", onNazad = onNazad)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Znacka(
                if (beli) "Igraš belim" else "Igraš crnim",
                boja = MaterialTheme.colorScheme.surfaceContainerHighest,
                naBoji = MaterialTheme.colorScheme.onSurface,
            )
            Znacka("ELO ${stanje.approximateElo}", boja = MaterialTheme.colorScheme.tertiaryContainer, naBoji = MaterialTheme.colorScheme.onTertiaryContainer)
            Znacka(
                stanje.clockSeconds?.let { "${it / 60} min" } ?: "Bez sata",
                ikona = Icons.Rounded.Timer,
            )
        }
        SahTabla(
            fen = stanje.fen,
            orijentacija = stanje.childColor,
            mozeIgrati = false,
            poslednjiPotez = null,
            najavljeniPotez = null,
            animacija = null,
            trajanjeAnimacije = 0,
            onPotez = {},
        )
        Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainerLow) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Maskota(StanjeMaskote.POZDRAV, velicina = 72.dp)
                Spacer(Modifier.width(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Spreman/na za partiju, ${stanje.childName}?", style = MaterialTheme.typography.titleMedium)
                    Text(
                        stanje.clockSeconds?.let {
                            "Imaš ${it / 60} minuta. Sat se ne pauzira kada zatvoriš aplikaciju."
                        } ?: "Partija je bez sata — razmisli koliko god ti treba.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        ui.greska?.let { Baner(it, Icons.Rounded.ErrorOutline) }
        Button(
            onClick = model::pocni,
            enabled = !ui.radi,
            modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp).semantics { contentDescription = "Pokreni partiju" },
            shape = MaterialTheme.shapes.large,
        ) {
            Icon(Icons.Rounded.PlayArrow, null)
            Spacer(Modifier.width(8.dp))
            Text(if (ui.radi) "Pokrećem…" else "Pokreni partiju", style = MaterialTheme.typography.titleMedium)
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
    val uzete = remember(prikazaniFen) { uzeteFigure(prikazaniFen) }
    val deteBeli = stanje.childColor == "white"
    val uToku = stanje.status == "in_progress"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            DugmeNazad(onNazad)
            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                Text("Šah protiv računara", style = MaterialTheme.typography.titleMedium)
                Text(
                    if (rezultat) "Pregled partije" else "ELO ${stanje.approximateElo}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = model::osvezi, enabled = !ui.radi) {
                Icon(Icons.Rounded.Refresh, contentDescription = "Osveži partiju")
            }
        }

        if (!ui.naMrezi) Baner("Nema veze — partija se osvežava kada se veza vrati.", Icons.Rounded.CloudOff)
        ui.greska?.let { Baner(it, Icons.Rounded.ErrorOutline) }
        ui.obavestenje?.let {
            Baner(
                it,
                Icons.Rounded.Info,
                boja = MaterialTheme.colorScheme.tertiaryContainer,
                naBoji = MaterialTheme.colorScheme.onTertiaryContainer,
            )
        }

        IgracTraka(
            ime = "Računar",
            opis = "ELO ${stanje.approximateElo}",
            vodeci = { IkonaZnak(Icons.Rounded.SmartToy, MaterialTheme.colorScheme.onSurfaceVariant, velicina = 40.dp) },
            uzeo = if (deteBeli) uzete.uzeoCrni else uzete.uzeoBeli,
            uzeoBelim = !deteBeli,
            prednost = if (deteBeli) -uzete.prednostBelog else uzete.prednostBelog,
            satMs = if (stanje.clockSeconds != null) (if (deteBeli) sat.black else sat.white) else null,
            naPotezu = uToku && stanje.turnColor != stanje.childColor,
        )

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

        IgracTraka(
            ime = stanje.childName,
            opis = if (deteBeli) "Bele figure" else "Crne figure",
            vodeci = {
                FiguraIkona(
                    if (deteBeli) com.github.bhlangonijr.chesslib.Piece.WHITE_KING else com.github.bhlangonijr.chesslib.Piece.BLACK_KING,
                    40.dp,
                    Modifier
                        .clip(MaterialTheme.shapes.small)
                        .background(MaterialTheme.colorScheme.primaryContainer)
                        .padding(4.dp),
                )
            },
            uzeo = if (deteBeli) uzete.uzeoBeli else uzete.uzeoCrni,
            uzeoBelim = deteBeli,
            prednost = if (deteBeli) uzete.prednostBelog else -uzete.prednostBelog,
            satMs = if (stanje.clockSeconds != null) (if (deteBeli) sat.white else sat.black) else null,
            naPotezu = deteNaPotezu,
        )

        if (rezultat) {
            RezultatPartije(ui, stanje, model)
        } else {
            StatusPartije(ui, stanje, deteNaPotezu, uSahu, pregled == null, model)
        }

        if (potezi.isNotEmpty()) {
            ListaPoteza(potezi, rezultat, aktivniPly, model::idiNaPly)
            if (rezultat) KontrolePregleda(aktivniPly, potezi.size, pregled?.san, model::idiNaPly)
        }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun IgracTraka(
    ime: String,
    opis: String,
    vodeci: @Composable () -> Unit,
    uzeo: List<Char>,
    uzeoBelim: Boolean,
    prednost: Int,
    satMs: Long?,
    naPotezu: Boolean,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        vodeci()
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(ime, style = MaterialTheme.typography.titleSmall, maxLines = 1)
                if (naPotezu) {
                    Spacer(Modifier.width(6.dp))
                    Box(Modifier.size(8.dp).clip(CircleShape).background(Mozgalica.boje.uspeh))
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (uzeo.isEmpty()) {
                    Text(opis, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    // Uzete figure su protivničke boje; svetla podloga da se crne vide i u tamnoj temi.
                    Row(
                        Modifier
                            .clip(MaterialTheme.shapes.extraSmall)
                            .background(Color(0xFFF0D9B5).copy(alpha = 0.85f))
                            .padding(horizontal = 4.dp, vertical = 1.dp),
                    ) {
                        uzeo.forEach { tip -> FiguraIkona(figuraZa(tip, belaFigura = !uzeoBelim), 18.dp) }
                    }
                    if (prednost > 0) {
                        Spacer(Modifier.width(4.dp))
                        Text("+$prednost", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        if (satMs != null) SatPilula(satMs, naPotezu)
    }
}

private fun figuraZa(tip: Char, belaFigura: Boolean): com.github.bhlangonijr.chesslib.Piece {
    val strana = if (belaFigura) com.github.bhlangonijr.chesslib.Side.WHITE else com.github.bhlangonijr.chesslib.Side.BLACK
    val vrsta = when (tip) {
        'q' -> com.github.bhlangonijr.chesslib.PieceType.QUEEN
        'r' -> com.github.bhlangonijr.chesslib.PieceType.ROOK
        'b' -> com.github.bhlangonijr.chesslib.PieceType.BISHOP
        'n' -> com.github.bhlangonijr.chesslib.PieceType.KNIGHT
        else -> com.github.bhlangonijr.chesslib.PieceType.PAWN
    }
    return com.github.bhlangonijr.chesslib.Piece.make(strana, vrsta)
}

@Composable
private fun SatPilula(ms: Long, aktivno: Boolean) {
    val malo = ms < 30_000
    val boje = MaterialTheme.colorScheme
    val (pozadina, tekst) = when {
        aktivno && malo -> boje.error to boje.onError
        aktivno -> boje.inverseSurface to boje.inverseOnSurface
        else -> boje.surfaceContainerHigh to boje.onSurfaceVariant
    }
    Surface(color = pozadina, contentColor = tekst, shape = MaterialTheme.shapes.small) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Timer, null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text(
                formatSat(ms),
                style = MaterialTheme.typography.titleLarge.copy(fontFeatureSettings = "tnum"),
            )
        }
    }
}

@Composable
private fun StatusPartije(
    ui: SahUi,
    stanje: SahStanjeOdgovor,
    deteNaPotezu: Boolean,
    uSahu: Boolean,
    uzivo: Boolean,
    model: SahViewModel,
) {
    val boje = MaterialTheme.colorScheme
    val racunarNaPotezu = stanje.status == "in_progress" && stanje.turnColor != stanje.childColor
    Surface(
        shape = MaterialTheme.shapes.large,
        color = when {
            uSahu && deteNaPotezu -> boje.errorContainer
            deteNaPotezu -> boje.primaryContainer
            else -> boje.surfaceContainerLow
        },
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    when {
                        uSahu && deteNaPotezu -> Icons.Rounded.Warning
                        deteNaPotezu -> Icons.Rounded.TouchApp
                        else -> Icons.Rounded.SmartToy
                    },
                    null,
                    modifier = Modifier.size(28.dp),
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        (if (uSahu && deteNaPotezu) "Šah! " else "") + tekstFaze(ui.faza, deteNaPotezu),
                        style = MaterialTheme.typography.titleMedium,
                    )
                    val pomoc = when {
                        deteNaPotezu -> "Prevuci figuru ili dodirni figuru pa polje."
                        racunarNaPotezu && !ui.radi -> {
                            val preostalo = ((PAUZA_PRE_RACUNARA_MS - (ui.sada - ui.primljenoAt)).coerceAtLeast(0) + 999) / 1000
                            if (stanje.undoAvailable) "Imaš još $preostalo s da vratiš potez." else "Računar igra za $preostalo s."
                        }
                        else -> null
                    }
                    pomoc?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                }
            }
            if (racunarNaPotezu && ui.radi) {
                LinearProgressIndicator(Modifier.fillMaxWidth(), strokeCap = StrokeCap.Round)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                if (racunarNaPotezu && !ui.radi && stanje.undoAvailable) {
                    FilledTonalButton(
                        onClick = model::ponistiPotez,
                        modifier = Modifier.weight(1f).heightIn(min = 48.dp).semantics { contentDescription = "Poništi moj potez" },
                    ) {
                        Icon(Icons.AutoMirrored.Rounded.Undo, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Vrati potez")
                    }
                }
                OutlinedButton(
                    onClick = { model.potvrdaPredaje(true) },
                    enabled = deteNaPotezu && !ui.radi && uzivo,
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp).semantics { contentDescription = "Predaj partiju" },
                ) {
                    Icon(Icons.Rounded.Flag, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Predaj")
                }
            }
        }
    }
}

@Composable
private fun RezultatPartije(ui: SahUi, stanje: SahStanjeOdgovor, model: SahViewModel) {
    val boje = MaterialTheme.colorScheme
    val (ikona, boja) = when (stanje.result) {
        "child_win" -> Icons.Rounded.EmojiEvents to Mozgalica.boje.zvezda
        "draw" -> Icons.Rounded.Handshake to boje.tertiary
        else -> Icons.Rounded.SmartToy to boje.onSurfaceVariant
    }
    Surface(shape = MaterialTheme.shapes.large, color = boje.surfaceContainerLow, modifier = Modifier.fillMaxWidth()) {
        Column(
            Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (stanje.result == "child_win") {
                Maskota(StanjeMaskote.USPEH, velicina = 88.dp)
            } else {
                IkonaZnak(ikona, boja, velicina = 64.dp)
            }
            Text(rezultatTekst(stanje.result), style = MaterialTheme.typography.headlineSmall)
            razlogTekst(stanje.termination).takeIf { it.isNotBlank() }?.let {
                Text(it.replaceFirstChar { c -> c.uppercase() }, color = boje.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
            }
            val zvezdice = (stanje.starsAwarded ?: 0).coerceIn(0, 5)
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.semantics(mergeDescendants = true) { contentDescription = "$zvezdice od 5 zvezdica" },
            ) {
                repeat(5) { i ->
                    Icon(
                        if (i < zvezdice) Icons.Rounded.Star else Icons.Rounded.StarOutline,
                        null,
                        tint = if (i < zvezdice) Mozgalica.boje.zvezda else boje.outlineVariant,
                        modifier = Modifier.size(36.dp),
                    )
                }
            }
            if (stanje.result == "child_loss") {
                PonudaZaPonovni(ui, stanje, model)
            }
        }
    }
}

@Composable
private fun ListaPoteza(
    potezi: List<io.github.mlsivanovic.mozgalica.podaci.SahPotez>,
    pregled: Boolean,
    aktivniPly: Int,
    onPly: (Int) -> Unit,
) {
    val stanjeListe = rememberLazyListState()
    val parovi = potezi.chunked(2)
    val ciljniPar = if (pregled) ((aktivniPly - 1).coerceAtLeast(0) / 2) else parovi.lastIndex
    LaunchedEffect(ciljniPar, parovi.size) {
        if (parovi.isNotEmpty()) stanjeListe.animateScrollToItem(ciljniPar.coerceIn(0, parovi.lastIndex))
    }
    Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceContainerLow) {
        LazyRow(
            state = stanjeListe,
            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            itemsIndexed(parovi) { indeks, par ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "${indeks + 1}.",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 6.dp, end = 2.dp),
                    )
                    par.forEach { potez ->
                        val aktivan = if (pregled) potez.ply == aktivniPly else potez.ply == potezi.size
                        val boje = MaterialTheme.colorScheme
                        Text(
                            potez.san,
                            style = MaterialTheme.typography.labelLarge,
                            color = if (aktivan) boje.onPrimary else boje.onSurface,
                            modifier = Modifier
                                .clip(MaterialTheme.shapes.extraSmall)
                                .background(if (aktivan) boje.primary else Color.Transparent)
                                .then(if (pregled) Modifier.clickable { onPly(potez.ply) } else Modifier)
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun KontrolePregleda(aktivniPly: Int, ukupno: Int, san: String?, onPly: (Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        FilledTonalIconButton(onClick = { onPly(0) }, enabled = aktivniPly > 0) {
            Icon(Icons.Rounded.FirstPage, contentDescription = "Na početak")
        }
        FilledTonalIconButton(onClick = { onPly(aktivniPly - 1) }, enabled = aktivniPly > 0) {
            Icon(Icons.AutoMirrored.Rounded.NavigateBefore, contentDescription = "Prethodni potez")
        }
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("$aktivniPly / $ukupno", style = MaterialTheme.typography.titleMedium)
            Text(
                if (aktivniPly == 0) "Početna pozicija" else san.orEmpty(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        FilledTonalIconButton(onClick = { onPly(aktivniPly + 1) }, enabled = aktivniPly < ukupno) {
            Icon(Icons.AutoMirrored.Rounded.NavigateNext, contentDescription = "Sledeći potez")
        }
        FilledTonalIconButton(onClick = { onPly(ukupno) }, enabled = aktivniPly < ukupno) {
            Icon(Icons.Rounded.LastPage, contentDescription = "Na kraj")
        }
    }
}

@Composable
private fun PonudaZaPonovni(ui: SahUi, stanje: SahStanjeOdgovor, model: SahViewModel) {
    if (!stanje.retryAvailable) {
        if ((stanje.retriesUsed ?: 0) >= MAKSIMALNO_PONOVNIH_SAHA) {
            Text(
                "Za ovu partiju više nemaš pravo na ponovni pokušaj.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }
    if (ui.biraElo) {
        Text("Izaberi jačinu protivnika", style = MaterialTheme.typography.titleSmall)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            dozvoljeniEloZaPokusaj(stanje.approximateElo).forEach { elo ->
                val ista = elo == stanje.approximateElo
                FilledTonalButton(
                    onClick = { model.pokusajPonovo(elo) },
                    enabled = !ui.radi,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                ) {
                    Text("ELO $elo", style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                    Text(if (ista) "ista jačina" else "lakše", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        TextButton(onClick = { model.biraElo(false) }) { Text("Odustani") }
    } else {
        Button(
            onClick = { model.biraElo(true) },
            enabled = !ui.radi,
            modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).semantics { contentDescription = "Pokušaj ponovo" },
        ) {
            Icon(Icons.Rounded.Replay, null)
            Spacer(Modifier.width(8.dp))
            Text(if (ui.radi) "Pravim novu partiju…" else "Pokušaj ponovo", style = MaterialTheme.typography.titleSmall)
        }
        val preostalo = preostaloPokusaja(stanje.retriesUsed)
        Text(
            if (preostalo == 1) {
                "Preostao ti je još 1 pokušaj, protiv istog ili slabijeg protivnika."
            } else {
                "Preostalo ti je još $preostalo pokušaja, protiv istog ili slabijeg protivnika."
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun GreskaPartije(greska: String?, onNazad: () -> Unit, onOsvezi: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Maskota(StanjeMaskote.PRAZNO, velicina = 96.dp)
        Text("Partija nije dostupna", style = MaterialTheme.typography.headlineSmall)
        Text(
            greska ?: "Proveri internet vezu i pokušaj ponovo.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
        Button(onClick = onOsvezi, modifier = Modifier.heightIn(min = 56.dp)) {
            Icon(Icons.Rounded.Refresh, null)
            Spacer(Modifier.width(8.dp))
            Text("Pokušaj ponovo")
        }
        TextButton(onClick = onNazad) { Text("Nazad") }
    }
}

@Composable
private fun Centrirano(tekst: String) {
    Column(
        Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator()
        Text(tekst, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
