package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.podaci.CasUDanu
import io.github.mlsivanovic.mozgalica.podaci.DanRasporeda
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniRaspored

private enum class PrikazRasporeda { DANAS, SUTRA, NEDELJA }

@Composable
fun RasporedEkran(
    raspored: SacuvaniRaspored?,
    osvezava: Boolean,
    onOsvezi: () -> Unit,
) {
    var prikaz by rememberSaveable { mutableStateOf(PrikazRasporeda.DANAS) }
    Osveziv(osvezava = osvezava, onOsvezi = onOsvezi) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Škola", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge)
            Text("Raspored časova", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.primary)
            val danas = raspored?.danas
            val sutra = raspored?.sutra
            if (raspored == null || !raspored.postoji || danas == null || sutra == null) {
                PraznoStanje(
                    naslov = "Raspored još nije unet",
                    opis = "Kada odrasla osoba unese časove, videćeš ih ovde.",
                )
                return@Column
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                TabDugme("Danas", prikaz == PrikazRasporeda.DANAS, Modifier.weight(1f)) { prikaz = PrikazRasporeda.DANAS }
                TabDugme("Sutra", prikaz == PrikazRasporeda.SUTRA, Modifier.weight(1f)) { prikaz = PrikazRasporeda.SUTRA }
                TabDugme("Nedelja", prikaz == PrikazRasporeda.NEDELJA, Modifier.weight(1f)) { prikaz = PrikazRasporeda.NEDELJA }
            }
            when (prikaz) {
                PrikazRasporeda.DANAS -> DanPrikaz(danas, "Danas", "Danas nema škole")
                PrikazRasporeda.SUTRA -> DanPrikaz(sutra, "Sutra", "Sutra nema škole")
                PrikazRasporeda.NEDELJA -> NedeljaPrikaz(raspored)
            }
        }
    }
}

@Composable
private fun TabDugme(naziv: String, izabran: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val dugme = modifier.heightIn(min = 56.dp)
    if (izabran) {
        Button(onClick = onClick, modifier = dugme) { Text(naziv) }
    } else {
        OutlinedButton(onClick = onClick, modifier = dugme) { Text(naziv) }
    }
}

@Composable
private fun DanPrikaz(dan: DanRasporeda, naslov: String, prazan: String) {
    if (dan.isBreak) {
        PraznoStanje(prazan, "Možeš da vidiš raspored za nastavni dan u pregledu nedelje.")
        return
    }
    val danIme = nazivDana(dan.weekday)
    Text(
        text = listOf(naslov, danIme, nazivSmene(dan.shift)).filter { it.isNotBlank() }.joinToString(" · "),
        style = MaterialTheme.typography.titleLarge,
    )
    if (dan.lessons.isEmpty()) {
        Text("Nema unetih časova za ovaj dan.", style = MaterialTheme.typography.bodyLarge)
    } else {
        dan.lessons.forEach { cas -> CasRed(cas) }
    }
}

@Composable
private fun NedeljaPrikaz(raspored: SacuvaniRaspored) {
    val imaCas = raspored.nedelja.any { it.lessons.isNotEmpty() }
    Text(
        text = "Ova nedelja · ${nazivSmene(raspored.smenaNedelje)}",
        style = MaterialTheme.typography.titleLarge,
    )
    if (!imaCas) {
        Text("Još nema unetih časova ove nedelje.", style = MaterialTheme.typography.bodyLarge)
        return
    }
    raspored.nedelja.forEach { dan ->
        val ime = nazivDana(dan.weekday)
        Text(
            text = "$ime · ${kratakDatum(dan.date)}",
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(top = 8.dp),
        )
        when {
            dan.isBreak -> Text("Nema škole", color = MaterialTheme.colorScheme.onSurfaceVariant)
            dan.lessons.isEmpty() -> Text("Nema unetih časova.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            else -> dan.lessons.forEach { cas -> CasRed(cas) }
        }
    }
}

@Composable
private fun CasRed(cas: CasUDanu) {
    Row(
        modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min).padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .width(8.dp)
                .fillMaxHeight()
                .clip(RoundedCornerShape(8.dp))
                .background(bojaCasa(cas.color)),
        )
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = "${nazivCasa(cas.periodNo)} · ${cas.startsAt}–${cas.endsAt}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(cas.subject, style = MaterialTheme.typography.titleLarge)
            detaljCasa(cas.teacher, cas.room)?.let { Text(it, style = MaterialTheme.typography.bodyLarge) }
            cas.note?.takeIf { it.isNotBlank() }?.let {
                Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (cas.isCurrent) Text("Sada", color = MaterialTheme.colorScheme.primary)
            else if (cas.isNext == true) Text("Sledeći", color = MaterialTheme.colorScheme.secondary)
        }
    }
}

private fun bojaCasa(hex: String?): Color {
    if (hex != null && hex.matches(Regex("#[0-9a-fA-F]{6}"))) {
        return runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrDefault(Color(0xFF4F46E5))
    }
    return Color(0xFF4F46E5)
}
