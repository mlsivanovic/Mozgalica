package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.Quiz
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak
import io.github.mlsivanovic.mozgalica.dizajn.Maskota
import io.github.mlsivanovic.mozgalica.dizajn.StanjeMaskote
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvanaObavestenja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvanoObavestenje

@Composable
fun ZvonceDugme(
    ime: String,
    neprocitano: Int,
    onClick: () -> Unit,
) {
    val opis = if (neprocitano > 0) {
        "Obaveštenja za $ime, $neprocitano nepročitanih"
    } else {
        "Obaveštenja za $ime"
    }
    IconButton(onClick = onClick, modifier = Modifier.size(48.dp).semantics { contentDescription = opis }) {
        BadgedBox(badge = { if (neprocitano > 0) Badge { Text("$neprocitano") } }) {
            Icon(
                if (neprocitano > 0) Icons.Rounded.NotificationsActive else Icons.Outlined.Notifications,
                contentDescription = null,
                modifier = Modifier.size(26.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ZvoncePanel(
    obavestenja: SacuvanaObavestenja,
    istorija: Boolean,
    onIstorija: (Boolean) -> Unit,
    onOznaciProcitanim: (List<String>?) -> Unit,
    onOtvori: (SacuvanoObavestenje) -> Unit,
) {
    val nova = obavestenja.stavke.filter { it.readAt == null }
    val procitana = obavestenja.stavke.filter { it.readAt != null }
    val lista = if (istorija) procitana else nova
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Obaveštenja", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            if (!istorija && obavestenja.neprocitano > 0) {
                TextButton(onClick = { onOznaciProcitanim(null) }) {
                    Icon(Icons.Rounded.DoneAll, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.size(6.dp))
                    Text("Sve pročitano")
                }
            }
        }
        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
            SegmentedButton(
                selected = !istorija,
                onClick = { onIstorija(false) },
                shape = SegmentedButtonDefaults.itemShape(0, 2),
            ) { Text("Nova (${nova.size})") }
            SegmentedButton(
                selected = istorija,
                onClick = { onIstorija(true) },
                shape = SegmentedButtonDefaults.itemShape(1, 2),
            ) { Text("Pročitana (${procitana.size})") }
        }
        Column(
            Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()),
        ) {
            if (lista.isEmpty()) {
                Column(
                    Modifier.fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Maskota(StanjeMaskote.PRAZNO, velicina = 72.dp)
                    Text(
                        when {
                            obavestenja.stavke.isEmpty() -> "Još nema obaveštenja."
                            istorija -> "Nema pročitanih obaveštenja."
                            else -> "Nema novih obaveštenja."
                        },
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                lista.forEach { stavka -> StavkaObavestenja(stavka, onOznaciProcitanim, onOtvori) }
            }
        }
    }
}

@Composable
private fun StavkaObavestenja(
    stavka: SacuvanoObavestenje,
    onOznaciProcitanim: (List<String>?) -> Unit,
    onOtvori: (SacuvanoObavestenje) -> Unit,
) {
    val boje = MaterialTheme.colorScheme
    val (ikona, boja) = when {
        stavka.targetUrl.contains("/sah/") -> Icons.Rounded.EmojiEvents to boje.tertiary
        stavka.targetUrl.contains("/kviz/") -> Icons.Rounded.Quiz to boje.primary
        stavka.eventType.contains("star") || stavka.eventType.contains("reward") -> Icons.Rounded.Star to io.github.mlsivanovic.mozgalica.dizajn.Mozgalica.boje.zvezda
        else -> Icons.Rounded.NotificationsNone to boje.onSurfaceVariant
    }
    val neprocitano = stavka.readAt == null
    ListItem(
        modifier = Modifier
            .padding(horizontal = 8.dp)
            .clip(MaterialTheme.shapes.medium)
            .clickable {
                if (neprocitano) onOznaciProcitanim(listOf(stavka.id))
                onOtvori(stavka)
            },
        colors = ListItemDefaults.colors(
            containerColor = if (neprocitano) boje.surfaceContainerHigh else boje.surfaceContainerLow,
        ),
        leadingContent = { IkonaZnak(ikona, boja, velicina = 44.dp) },
        headlineContent = {
            Text(stavka.title, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
        },
        supportingContent = {
            Column {
                Text(stavka.body, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                Text(formatDatum(stavka.createdAt), style = MaterialTheme.typography.bodySmall, color = boje.onSurfaceVariant)
            }
        },
        trailingContent = if (neprocitano) {
            { Box(Modifier.size(10.dp).clip(CircleShape).background(boje.primary)) }
        } else {
            null
        },
    )
    Spacer(Modifier.size(6.dp))
}
