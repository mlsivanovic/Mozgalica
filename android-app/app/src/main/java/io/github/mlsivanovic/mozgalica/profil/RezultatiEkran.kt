package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Sort
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.FilterAltOff
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.Percent
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import io.github.mlsivanovic.mozgalica.dizajn.EkranZaglavlje
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak
import io.github.mlsivanovic.mozgalica.dizajn.Mozgalica
import io.github.mlsivanovic.mozgalica.dizajn.Razmak
import io.github.mlsivanovic.mozgalica.dizajn.StatPlocica
import io.github.mlsivanovic.mozgalica.dizajn.Znacka
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import io.github.mlsivanovic.mozgalica.sah.SahIkona
import io.github.mlsivanovic.mozgalica.sah.razlogTekst
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val vremeFormat = DateTimeFormatter.ofPattern("d. M. · HH:mm")

// Filter preživljava rotaciju i povratak na tab; čuvamo ga kao imena enum vrednosti.
private fun FilterRezultata.uListu() = listOf(vrsta.name, period.name, ishod.name, sortiranje.name)
private fun filterIzListe(l: List<String>) = runCatching {
    FilterRezultata(
        VrstaRezultata.valueOf(l[0]),
        PeriodRezultata.valueOf(l[1]),
        IshodRezultata.valueOf(l[2]),
        SortiranjeRezultata.valueOf(l[3]),
    )
}.getOrDefault(FilterRezultata())

@Composable
fun RezultatiEkran(
    profil: SacuvaniProfil,
    osvezava: Boolean,
    onOsvezi: () -> Unit,
    onSah: (String) -> Unit,
) {
    var sacuvan by rememberSaveable { mutableStateOf(FilterRezultata().uListu()) }
    val filter = filterIzListe(sacuvan)
    fun postavi(novi: FilterRezultata) { sacuvan = novi.uListu() }

    val ukupno = profil.istorijaKvizova.size + profil.istorijaSaha.size
    val stavke = remember(profil.istorijaKvizova, profil.istorijaSaha, filter) {
        filtrirajRezultate(profil.istorijaKvizova, profil.istorijaSaha, filter)
    }
    val sazetak = remember(stavke) { sazetakRezultata(stavke) }

    Osveziv(osvezava = osvezava, onOsvezi = onOsvezi) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Razmak.ivica, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(Razmak.stavka),
        ) {
            EkranZaglavlje(
                nadnaslov = "Moj rad",
                naslov = "Rezultati",
                akcije = {
                    if (ukupno > 0) SortiranjeMeni(filter.sortiranje) { postavi(filter.copy(sortiranje = it)) }
                },
            )
            if (ukupno == 0) {
                PraznoStanje("Još nema rezultata", "Kada završiš kviz ili šahovsku partiju, videćeš rezultat ovde.")
                return@Column
            }
            Sazetak(sazetak, prikaziSah = filter.vrsta != VrstaRezultata.KVIZ && profil.istorijaSaha.isNotEmpty())
            Filteri(filter, ::postavi)

            if (stavke.isEmpty()) {
                PraznoStanje("Nema rezultata za ovaj filter", "Promeni filtere da vidiš ostale aktivnosti.")
            } else {
                val grupisi = filter.sortiranje == SortiranjeRezultata.NAJNOVIJE
                val sada = Instant.now()
                var prethodna: String? = null
                stavke.forEach { stavka ->
                    if (grupisi) {
                        val grupa = grupaDatuma(stavka.vreme, sada)
                        if (grupa != prethodna) {
                            Text(
                                grupa,
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(top = 8.dp, start = 4.dp),
                            )
                            prethodna = grupa
                        }
                    }
                    when (stavka) {
                        is StavkaRezultata.Kviz -> KvizRezultat(stavka)
                        is StavkaRezultata.Sah -> SahRezultat(stavka, onClick = { onSah(stavka.partija.playToken) })
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun Sazetak(s: SazetakRezultata, prikaziSah: Boolean) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        StatPlocica("${s.broj}", "Aktivnosti", Icons.Rounded.TaskAlt, MaterialTheme.colorScheme.primary, Modifier.weight(1f))
        StatPlocica("${s.zvezdice}", "Osvojene zvezdice", Icons.Rounded.Star, Mozgalica.boje.zvezda, Modifier.weight(1f))
        StatPlocica(
            s.prosekKviza?.let { formatProcenat(it) } ?: "—",
            "Prosek kvizova",
            Icons.Rounded.Percent,
            MaterialTheme.colorScheme.tertiary,
            Modifier.weight(1f),
        )
    }
    if (prikaziSah) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surfaceContainerLow,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                SahIkona(velicina = 40.dp)
                Spacer(Modifier.width(12.dp))
                Text("Šah", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                IshodBroj("${s.pobede}", "pobeda", Mozgalica.boje.uspeh)
                IshodBroj("${s.remiji}", "remi", MaterialTheme.colorScheme.onSurfaceVariant)
                IshodBroj("${s.porazi}", "poraza", MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun IshodBroj(broj: String, oznaka: String, boja: Color) {
    Column(Modifier.padding(horizontal = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(broj, style = MaterialTheme.typography.titleLarge, color = boja)
        Text(oznaka, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun Filteri(filter: FilterRezultata, onFilter: (FilterRezultata) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            VrstaRezultata.entries.forEach { vrsta ->
                Cip(vrsta.naziv, filter.vrsta == vrsta) {
                    onFilter(filter.copy(vrsta = vrsta, ishod = if (vrsta == VrstaRezultata.SAH) filter.ishod else IshodRezultata.SVI))
                }
            }
        }
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            PeriodRezultata.entries.forEach { period ->
                Cip(period.naziv, filter.period == period) { onFilter(filter.copy(period = period)) }
            }
        }
        if (filter.vrsta == VrstaRezultata.SAH) {
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                IshodRezultata.entries.forEach { ishod ->
                    Cip(ishod.naziv, filter.ishod == ishod) { onFilter(filter.copy(ishod = ishod)) }
                }
            }
        }
        if (filter.aktivan) {
            TextButton(onClick = { onFilter(FilterRezultata()) }) {
                Icon(Icons.Rounded.FilterAltOff, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Poništi filtere")
            }
        }
    }
}

@Composable
private fun Cip(tekst: String, izabran: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = izabran,
        onClick = onClick,
        label = { Text(tekst, style = MaterialTheme.typography.labelLarge) },
        leadingIcon = if (izabran) {
            { Icon(Icons.Rounded.Check, null, modifier = Modifier.size(FilterChipDefaults.IconSize)) }
        } else {
            null
        },
        shape = MaterialTheme.shapes.small,
    )
}

@Composable
private fun SortiranjeMeni(izabrano: SortiranjeRezultata, onIzbor: (SortiranjeRezultata) -> Unit) {
    var otvoren by remember { mutableStateOf(false) }
    Box {
        val aktivno = izabrano != SortiranjeRezultata.NAJNOVIJE
        FilledTonalIconButton(
            onClick = { otvoren = true },
            modifier = Modifier.size(48.dp).semantics { contentDescription = "Sortiranje: ${izabrano.naziv}" },
            colors = if (aktivno) {
                IconButtonDefaults.filledTonalIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                IconButtonDefaults.filledTonalIconButtonColors()
            },
        ) {
            Icon(Icons.AutoMirrored.Rounded.Sort, null)
        }
        DropdownMenu(expanded = otvoren, onDismissRequest = { otvoren = false }) {
            SortiranjeRezultata.entries.forEach { opcija ->
                DropdownMenuItem(
                    text = { Text(opcija.naziv) },
                    onClick = {
                        otvoren = false
                        onIzbor(opcija)
                    },
                    leadingIcon = if (opcija == izabrano) {
                        { Icon(Icons.Rounded.Check, null) }
                    } else {
                        null
                    },
                )
            }
        }
    }
}

@Composable
private fun RezultatKartica(
    vodeci: @Composable () -> Unit,
    naslov: String,
    podnaslov: String,
    zvezdice: Int?,
    desno: @Composable () -> Unit,
    onClick: (() -> Unit)? = null,
) {
    val sadrzaj: @Composable () -> Unit = {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            vodeci()
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(naslov, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(podnaslov, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (zvezdice != null) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Star, null, tint = Mozgalica.boje.zvezda, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(2.dp))
                        Text("$zvezdice", style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
            Spacer(Modifier.width(8.dp))
            desno()
        }
    }
    val oblik = MaterialTheme.shapes.medium
    val boja = MaterialTheme.colorScheme.surfaceContainerLow
    if (onClick != null) {
        Surface(onClick = onClick, shape = oblik, color = boja, modifier = Modifier.fillMaxWidth()) { sadrzaj() }
    } else {
        Surface(shape = oblik, color = boja, modifier = Modifier.fillMaxWidth()) { sadrzaj() }
    }
}

private fun formatVreme(vreme: Instant?): String =
    vreme?.let { vremeFormat.format(it.atZone(ZoneId.systemDefault())) }.orEmpty()

@Composable
private fun KvizRezultat(stavka: StavkaRezultata.Kviz) {
    val kviz = stavka.kviz
    RezultatKartica(
        vodeci = {
            if (kviz.pendingReview) {
                IkonaZnak(Icons.Rounded.HourglassTop, Mozgalica.boje.upozorenje)
            } else {
                OcenaKrug(kviz.scorePct)
            }
        },
        naslov = kviz.title,
        podnaslov = "Kviz · ${formatVreme(stavka.vreme)}",
        zvezdice = if (kviz.pendingReview) null else kviz.starsAwarded,
        desno = {
            if (kviz.pendingReview) {
                Znacka("Čeka pregled")
            }
        },
    )
}

@Composable
private fun OcenaKrug(procenat: Double) {
    val boja = bojaOcene(procenat)
    Box(Modifier.size(52.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(
            progress = { (procenat / 100.0).toFloat().coerceIn(0f, 1f) },
            modifier = Modifier.size(52.dp),
            color = boja,
            trackColor = boja.copy(alpha = 0.16f),
            strokeWidth = 5.dp,
            strokeCap = StrokeCap.Round,
            gapSize = 0.dp,
        )
        Text(
            "${procenat.toInt()}",
            style = MaterialTheme.typography.labelLarge,
            color = boja,
        )
    }
}

@Composable
private fun bojaOcene(procenat: Double): Color = when {
    procenat >= 85 -> Mozgalica.boje.uspeh
    procenat >= 60 -> Mozgalica.boje.upozorenje
    else -> MaterialTheme.colorScheme.error
}

@Composable
private fun SahRezultat(stavka: StavkaRezultata.Sah, onClick: () -> Unit) {
    val p = stavka.partija
    val ishod = ishodPartije(p.result)
    val (boja, naBoji) = when (ishod) {
        IshodRezultata.POBEDA -> Mozgalica.boje.uspehKontejner to Mozgalica.boje.naUspehKontejneru
        IshodRezultata.PORAZ -> MaterialTheme.colorScheme.errorContainer to MaterialTheme.colorScheme.onErrorContainer
        else -> MaterialTheme.colorScheme.surfaceContainerHighest to MaterialTheme.colorScheme.onSurface
    }
    val razlog = razlogTekst(p.termination).takeIf { it.isNotBlank() }
    RezultatKartica(
        vodeci = { SahIkona(velicina = 52.dp) },
        naslov = "Šah · ELO ${p.approximateElo}",
        podnaslov = listOfNotNull(
            if (p.childColor == "white") "beli" else "crni",
            razlog?.lowercase(),
            formatVreme(stavka.vreme),
        ).joinToString(" · "),
        zvezdice = p.starsAwarded,
        desno = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Znacka(tekstIshoda(p.result), boja = boja, naBoji = naBoji)
                Icon(Icons.Rounded.ChevronRight, contentDescription = "Pregledaj partiju", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        onClick = onClick,
    )
}
