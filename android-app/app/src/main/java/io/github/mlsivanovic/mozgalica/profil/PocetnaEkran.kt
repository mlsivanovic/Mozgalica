package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowForward
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.Quiz
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.mlsivanovic.mozgalica.dizajn.Baner
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak
import io.github.mlsivanovic.mozgalica.dizajn.Mozgalica
import io.github.mlsivanovic.mozgalica.dizajn.Razmak
import io.github.mlsivanovic.mozgalica.dizajn.SekcijaNaslov
import io.github.mlsivanovic.mozgalica.dizajn.TrakaNapretka
import io.github.mlsivanovic.mozgalica.dizajn.Znacka
import io.github.mlsivanovic.mozgalica.nagrade.TitulaAvatar
import io.github.mlsivanovic.mozgalica.nagrade.napredakTitule
import io.github.mlsivanovic.mozgalica.podaci.AktivnaPartija
import io.github.mlsivanovic.mozgalica.podaci.AktivniKviz
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvanaObavestenja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniRaspored
import io.github.mlsivanovic.mozgalica.sah.SahIkona

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PocetnaEkran(
    profil: SacuvaniProfil,
    raspored: SacuvaniRaspored?,
    obavestenja: SacuvanaObavestenja,
    osvezava: Boolean,
    greskaMreze: String?,
    onOsvezi: () -> Unit,
    onPodesavanja: () -> Unit,
    onRaspored: () -> Unit,
    onNagrade: () -> Unit,
    onKviz: (String) -> Unit,
    onSah: (String) -> Unit,
    onOznaciProcitanim: (List<String>?) -> Unit,
    onObavestenje: (String) -> Unit,
    sharedScope: SharedTransitionScope? = null,
    animatedScope: AnimatedVisibilityScope? = null,
) {
    val brojAktivnih = profil.aktivniKvizovi.size + profil.aktivnePartije.size
    var zvonceOtvoreno by rememberSaveable { mutableStateOf(false) }
    var istorija by rememberSaveable { mutableStateOf(false) }
    Osveziv(osvezava = osvezava, onOsvezi = onOsvezi) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Razmak.ivica, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(Razmak.stavka),
        ) {
            Zaglavlje(
                profil = profil,
                neprocitano = obavestenja.neprocitano,
                onZvonce = { zvonceOtvoreno = true },
                onPodesavanja = onPodesavanja,
            )
            if (greskaMreze != null) {
                Baner(greskaMreze, Icons.Rounded.CloudOff)
            }
            ZvezdiceKartica(profil, onClick = onNagrade)
            raspored?.takeIf { it.postoji }?.let { DanasUSkoli(it, onRaspored) }

            SekcijaNaslov("Moji zadaci", broj = brojAktivnih)
            if (brojAktivnih == 0) {
                PraznoStanje("Sve je završeno!", "Novi zadaci će se pojaviti ovde.")
            } else {
                profil.aktivnePartije.forEach { partija ->
                    PartijaKartica(partija, onClick = { onSah(partija.playToken) })
                }
                profil.aktivniKvizovi.forEach { kviz ->
                    KvizKartica(
                        kviz = kviz,
                        onClick = { onKviz(kviz.quizToken) },
                        modifier = if (sharedScope != null && animatedScope != null) {
                            with(sharedScope) {
                                Modifier.sharedElement(
                                    rememberSharedContentState("kviz-${kviz.quizToken}"),
                                    animatedVisibilityScope = animatedScope,
                                )
                            }
                        } else {
                            Modifier
                        },
                    )
                }
            }
            Spacer(Modifier.size(8.dp))
        }
    }

    if (zvonceOtvoreno) {
        ModalBottomSheet(
            onDismissRequest = {
                zvonceOtvoreno = false
                istorija = false
            },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        ) {
            ZvoncePanel(
                obavestenja = obavestenja,
                istorija = istorija,
                onIstorija = { istorija = it },
                onOznaciProcitanim = onOznaciProcitanim,
                onOtvori = {
                    zvonceOtvoreno = false
                    istorija = false
                    onObavestenje(it.targetUrl)
                },
            )
        }
    }
}

@Composable
private fun Zaglavlje(
    profil: SacuvaniProfil,
    neprocitano: Int,
    onZvonce: () -> Unit,
    onPodesavanja: () -> Unit,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text(profil.avatar, fontSize = 28.sp)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                pozdrav(),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                profil.ime,
                style = MaterialTheme.typography.headlineSmall,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        ZvonceDugme(ime = profil.ime, neprocitano = neprocitano, onClick = onZvonce)
        IconButton(onClick = onPodesavanja, modifier = Modifier.size(48.dp)) {
            Icon(Icons.Rounded.Settings, contentDescription = "Podešavanja", modifier = Modifier.size(26.dp))
        }
    }
}

private fun pozdrav(): String = when (java.time.LocalTime.now().hour) {
    in 5..10 -> "Dobro jutro,"
    in 11..17 -> "Zdravo,"
    else -> "Dobro veče,"
}

@Composable
private fun ZvezdiceKartica(profil: SacuvaniProfil, onClick: () -> Unit) {
    val boje = MaterialTheme.colorScheme
    val napredak = napredakTitule(profil.ukupnoZvezdica, profil.trenutnaTitula, profil.sledecaTitula)
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Column(
            Modifier
                .background(Brush.linearGradient(listOf(Color(0xFF5A4BD6), Color(0xFF8B5CF6))))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Moje zvezdice", style = MaterialTheme.typography.labelLarge, color = Color.White.copy(alpha = 0.85f))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Star, null, tint = Mozgalica.boje.zvezda, modifier = Modifier.size(36.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(
                            "${profil.ukupnoZvezdica}",
                            style = MaterialTheme.typography.displaySmall,
                            color = Color.White,
                        )
                    }
                    Text(
                        "${profil.raspolozivoZvezdica} za prodavnicu",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.85f),
                    )
                }
                val titula = profil.titula
                if (titula != null) {
                    Box(
                        Modifier
                            .size(76.dp)
                            .clip(CircleShape)
                            .background(Color.White.copy(alpha = 0.18f))
                            .border(2.dp, Color.White.copy(alpha = 0.5f), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        TitulaAvatar(ime = titula, avatar = profil.trenutnaTitula?.avatar, velicina = 64.dp)
                    }
                }
            }
            profil.titula?.let { titula ->
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            titula,
                            style = MaterialTheme.typography.titleSmall,
                            color = Color.White,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        val sledeca = profil.sledecaTitula
                        if (sledeca != null) {
                            val jos = sledeca.starsNeeded ?: (sledeca.minStars - profil.ukupnoZvezdica).coerceAtLeast(0)
                            Text(
                                "još $jos ★",
                                style = MaterialTheme.typography.labelMedium,
                                color = Color.White.copy(alpha = 0.85f),
                            )
                        }
                    }
                    TrakaNapretka(
                        udeo = napredak / 100f,
                        boja = Mozgalica.boje.zvezda,
                        pozadina = Color.White.copy(alpha = 0.25f),
                        modifier = Modifier.semantics {
                            contentDescription = "Napredak do sledeće titule: $napredak posto"
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun DanasUSkoli(raspored: SacuvaniRaspored, onRaspored: () -> Unit) {
    val danas = raspored.danas
    val istaknut = danas?.let { istaknutCas(it) }
    val (naslov, opis) = when {
        danas == null || danas.isBreak -> "Danas nema škole" to "Pogledaj raspored za ostatak nedelje."
        istaknut != null -> {
            val oznaka = if (istaknut.isCurrent) "Sada" else "Sledeći čas"
            "$oznaka: ${istaknut.subject}" to "${nazivCasa(istaknut.periodNo)} · ${istaknut.startsAt}–${istaknut.endsAt}"
        }
        danas.lessons.isEmpty() -> "Danas u školi" to "Nema unetih časova."
        else -> "Danas: ${danas.lessons.size} ${tekstCasova(danas.lessons.size)}" to
            "${danas.lessons.first().startsAt}–${danas.lessons.last().endsAt} · ${nazivSmene(danas.shift)}"
    }
    ElevatedCard(
        onClick = onRaspored,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            val boja = istaknut?.let { bojaCasa(it.color) } ?: MaterialTheme.colorScheme.tertiary
            IkonaZnak(if (danas?.isBreak == true) Icons.Rounded.WbSunny else Icons.Rounded.School, boja)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(naslov, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(opis, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Rounded.ChevronRight, contentDescription = "Otvori raspored", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ZadatakKartica(
    vodeci: @Composable () -> Unit,
    status: String,
    uToku: Boolean,
    naslov: String,
    opis: String?,
    detalji: List<Pair<androidx.compose.ui.graphics.vector.ImageVector?, String>>,
    napredak: Float?,
    akcija: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    ElevatedCard(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                vodeci()
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Znacka(
                        status,
                        boja = if (uToku) Mozgalica.boje.upozorenjeKontejner else MaterialTheme.colorScheme.primaryContainer,
                        naBoji = if (uToku) Mozgalica.boje.naUpozorenjeKontejneru else MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                    Text(naslov, style = MaterialTheme.typography.titleMedium)
                    opis?.let {
                        Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                detalji.forEach { (ikona, tekst) ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (ikona != null) {
                            Icon(ikona, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.width(4.dp))
                        }
                        Text(tekst, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (napredak != null) TrakaNapretka(napredak, visina = 8.dp)
            FilledTonalButton(
                onClick = onClick,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.filledTonalButtonColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                ),
            ) {
                Text(akcija, style = MaterialTheme.typography.labelLarge)
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Rounded.ArrowForward, null, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun PartijaKartica(partija: AktivnaPartija, onClick: () -> Unit) {
    val uToku = partija.status == "in_progress"
    ZadatakKartica(
        vodeci = { SahIkona() },
        status = if (uToku) "Partija u toku" else "Nova partija",
        uToku = uToku,
        naslov = "Šah protiv računara",
        opis = "Igraš ${if (partija.childColor == "white") "belim" else "crnim"} figurama",
        detalji = listOf(
            Icons.Rounded.Timer to tekstSata(partija.clockSeconds),
            null to "ELO ${partija.approximateElo}",
        ),
        napredak = null,
        akcija = if (uToku) "Nastavi partiju" else "Pokreni partiju",
        onClick = onClick,
    )
}

@Composable
private fun KvizKartica(kviz: AktivniKviz, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val uToku = kviz.attemptState == "in_progress"
    val detalji = buildList {
        add(Icons.Rounded.Quiz to tekstPitanja(kviz.questionCount))
        kviz.timeLimitSeconds?.let { sekunde ->
            add(Icons.Rounded.Timer to formatOdbrojavanje(kviz.remainingSeconds ?: sekunde))
        }
    }
    ZadatakKartica(
        vodeci = { IkonaZnak(Icons.Rounded.Quiz, MaterialTheme.colorScheme.primary) },
        status = if (uToku) "U toku · ${kviz.answeredCount}/${kviz.questionCount}" else "Novi kviz",
        uToku = uToku,
        naslov = kviz.title,
        opis = kviz.description?.takeIf { it.isNotBlank() },
        detalji = detalji,
        napredak = if (uToku && kviz.questionCount > 0) kviz.answeredCount.toFloat() / kviz.questionCount else null,
        akcija = if (uToku) "Nastavi kviz" else "Počni kviz",
        onClick = onClick,
        modifier = modifier,
    )
}

private fun formatOdbrojavanje(sekunde: Int): String {
    val s = sekunde.coerceAtLeast(0)
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}
