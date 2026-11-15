package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.StickyNote2
import androidx.compose.material.icons.rounded.MeetingRoom
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material.icons.rounded.WbTwilight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.dizajn.EkranZaglavlje
import io.github.mlsivanovic.mozgalica.dizajn.Mozgalica
import io.github.mlsivanovic.mozgalica.dizajn.Razmak
import io.github.mlsivanovic.mozgalica.dizajn.StanjeMaskote
import io.github.mlsivanovic.mozgalica.dizajn.TrakaNapretka
import io.github.mlsivanovic.mozgalica.dizajn.Znacka
import io.github.mlsivanovic.mozgalica.podaci.CasUDanu
import io.github.mlsivanovic.mozgalica.podaci.DanRasporeda
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniRaspored

private enum class PrikazRasporeda(val naziv: String) { DANAS("Danas"), SUTRA("Sutra"), NEDELJA("Nedelja") }

@Composable
fun RasporedEkran(
    raspored: SacuvaniRaspored?,
    osvezava: Boolean,
    onOsvezi: () -> Unit,
) {
    var prikaz by rememberSaveable { mutableStateOf(PrikazRasporeda.DANAS) }
    var izabraniDatum by rememberSaveable { mutableStateOf<String?>(null) }
    Osveziv(osvezava = osvezava, onOsvezi = onOsvezi) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Razmak.ivica, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(Razmak.stavka),
        ) {
            val danas = raspored?.danas
            val sutra = raspored?.sutra
            EkranZaglavlje(
                nadnaslov = "Škola",
                naslov = "Raspored časova",
                akcije = { raspored?.smenaNedelje?.let { SmenaZnacka(it) } },
            )
            if (raspored == null || !raspored.postoji || danas == null || sutra == null) {
                PraznoStanje(
                    naslov = "Raspored još nije unet",
                    opis = "Kada odrasla osoba unese časove, videćeš ih ovde.",
                )
                return@Column
            }
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                PrikazRasporeda.entries.forEachIndexed { i, opcija ->
                    SegmentedButton(
                        selected = prikaz == opcija,
                        onClick = { prikaz = opcija },
                        shape = SegmentedButtonDefaults.itemShape(i, PrikazRasporeda.entries.size),
                    ) { Text(opcija.naziv, style = MaterialTheme.typography.labelLarge) }
                }
            }
            when (prikaz) {
                PrikazRasporeda.DANAS -> DanPrikaz(danas, "Danas", "Danas nema škole")
                PrikazRasporeda.SUTRA -> DanPrikaz(sutra, "Sutra", "Sutra nema škole")
                PrikazRasporeda.NEDELJA -> {
                    val dani = raspored.nedelja
                    if (dani.isEmpty()) {
                        PraznoStanje("Nema rasporeda", "Još nema unetih časova ove nedelje.")
                    } else {
                        val podrazumevani = dani.firstOrNull { it.date == danas.date }
                            ?: dani.firstOrNull { it.lessons.isNotEmpty() }
                            ?: dani.first()
                        val izabran = dani.firstOrNull { it.date == izabraniDatum } ?: podrazumevani
                        BiracDana(dani, izabran.date, danas.date) { izabraniDatum = it }
                        DanPrikaz(izabran, nazivDana(izabran.weekday), "Nema škole")
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SmenaZnacka(smena: String) {
    val popodne = smena == "afternoon"
    Znacka(
        tekst = if (popodne) "Popodne" else "Prepodne",
        ikona = if (popodne) Icons.Rounded.WbTwilight else Icons.Rounded.WbSunny,
        boja = MaterialTheme.colorScheme.tertiaryContainer,
        naBoji = MaterialTheme.colorScheme.onTertiaryContainer,
    )
}

@Composable
private fun BiracDana(dani: List<DanRasporeda>, izabran: String, danas: String, onIzbor: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        dani.forEach { dan ->
            val jeIzabran = dan.date == izabran
            val jeDanas = dan.date == danas
            val boje = MaterialTheme.colorScheme
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clip(MaterialTheme.shapes.medium)
                    .background(if (jeIzabran) boje.primary else boje.surfaceContainerHigh)
                    .then(if (jeDanas && !jeIzabran) Modifier.border(2.dp, boje.primary, MaterialTheme.shapes.medium) else Modifier)
                    .selectable(selected = jeIzabran, role = Role.Tab, onClick = { onIzbor(dan.date) })
                    .padding(vertical = 10.dp)
                    .semantics { contentDescription = "${nazivDana(dan.weekday)} ${kratakDatum(dan.date)}" },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                val tekst = if (jeIzabran) boje.onPrimary else boje.onSurface
                Text(kratakNazivDana(dan.weekday), style = MaterialTheme.typography.labelMedium, color = tekst.copy(alpha = 0.8f))
                Text(danUMesecu(dan.date), style = MaterialTheme.typography.titleLarge, color = tekst)
                Box(
                    Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                dan.isBreak || dan.lessons.isEmpty() -> Color.Transparent
                                jeIzabran -> boje.onPrimary
                                else -> boje.primary
                            },
                        ),
                )
            }
        }
    }
}

@Composable
private fun DanPrikaz(dan: DanRasporeda, naslov: String, prazan: String) {
    if (dan.isBreak) {
        PraznoStanje(prazan, "Odmori se! Raspored za nastavne dane je u pregledu nedelje.", StanjeMaskote.USPEH)
        return
    }
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
        Column(Modifier.weight(1f)) {
            Text(naslov, style = MaterialTheme.typography.titleLarge)
            val danIme = nazivDana(dan.weekday)
            Text(
                listOf(danIme.takeIf { it != naslov }, kratakDatum(dan.date), nazivSmene(dan.shift))
                    .filterNotNull().filter { it.isNotBlank() }.joinToString(" · "),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (dan.lessons.isNotEmpty()) {
            Znacka(
                "${dan.lessons.size} ${tekstCasova(dan.lessons.size)}",
                boja = MaterialTheme.colorScheme.surfaceContainerHigh,
                naBoji = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
    if (dan.lessons.isEmpty()) {
        PraznoStanje("Nema časova", "Za ovaj dan još nema unetih časova.")
    } else {
        Column {
            dan.lessons.forEachIndexed { i, cas ->
                CasRed(cas, prvi = i == 0, poslednji = i == dan.lessons.lastIndex)
            }
        }
    }
}

@Composable
private fun CasRed(cas: CasUDanu, prvi: Boolean, poslednji: Boolean) {
    val boje = MaterialTheme.colorScheme
    val boja = bojaCasa(cas.color)
    val sledeci = !cas.isCurrent && cas.isNext == true
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
        Column(
            Modifier.width(52.dp).padding(top = 14.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Text(cas.startsAt, style = MaterialTheme.typography.titleSmall, color = if (cas.isCurrent) boje.primary else boje.onSurface)
            Text(cas.endsAt, style = MaterialTheme.typography.bodySmall, color = boje.onSurfaceVariant)
        }
        Box(Modifier.width(32.dp).fillMaxHeight(), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.width(2.dp).height(18.dp).background(if (prvi) Color.Transparent else boje.outlineVariant))
                Box(
                    Modifier
                        .size(if (cas.isCurrent) 14.dp else 10.dp)
                        .clip(CircleShape)
                        .background(if (cas.isCurrent || sledeci) boja else boje.surface)
                        .border(2.dp, boja, CircleShape),
                )
                Box(Modifier.width(2.dp).weight(1f).background(if (poslednji) Color.Transparent else boje.outlineVariant))
            }
        }
        Surface(
            modifier = Modifier.weight(1f).padding(vertical = 6.dp),
            shape = MaterialTheme.shapes.medium,
            color = boja.copy(alpha = if (cas.isCurrent) 0.18f else 0.09f).compositeOver(boje.surfaceContainerLow),
            border = if (cas.isCurrent) BorderStroke(2.dp, boja) else null,
        ) {
            Row(Modifier.height(IntrinsicSize.Min)) {
                Box(Modifier.width(6.dp).fillMaxHeight().background(boja))
                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            nazivCasa(cas.periodNo),
                            style = MaterialTheme.typography.labelMedium,
                            color = boje.onSurfaceVariant,
                        )
                        if (cas.isCurrent) {
                            Znacka("Sada", boja = boje.primary, naBoji = boje.onPrimary, ikona = Icons.Rounded.Schedule)
                        } else if (sledeci) {
                            Znacka(
                                "Sledeći",
                                boja = Mozgalica.boje.upozorenjeKontejner,
                                naBoji = Mozgalica.boje.naUpozorenjeKontejneru,
                            )
                        }
                    }
                    Text(cas.subject, style = MaterialTheme.typography.titleMedium)
                    val ucitelj = cas.teacher?.takeIf { it.isNotBlank() }
                    val ucionica = cas.room?.takeIf { it.isNotBlank() }
                    if (ucitelj != null || ucionica != null) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            ucitelj?.let { Detalj(Icons.Rounded.Person, it) }
                            ucionica?.let { Detalj(Icons.Rounded.MeetingRoom, "uč. $it") }
                        }
                    }
                    cas.note?.takeIf { it.isNotBlank() }?.let { Detalj(Icons.AutoMirrored.Rounded.StickyNote2, it) }
                    if (cas.isCurrent) {
                        napredakCasa(cas.startsAt, cas.endsAt)?.let { udeo ->
                            Spacer(Modifier.height(4.dp))
                            TrakaNapretka(udeo, boja = boja, visina = 6.dp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Detalj(ikona: androidx.compose.ui.graphics.vector.ImageVector, tekst: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(ikona, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(4.dp))
        Text(tekst, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Start)
    }
}
