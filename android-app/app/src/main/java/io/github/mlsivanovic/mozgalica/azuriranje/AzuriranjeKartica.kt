package io.github.mlsivanovic.mozgalica.azuriranje

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.InstallMobile
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.SystemUpdate
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.github.mlsivanovic.mozgalica.dizajn.IkonaZnak
import io.github.mlsivanovic.mozgalica.dizajn.TrakaNapretka

@Composable
fun AzuriranjeKartica(model: AzuriranjeViewModel = hiltViewModel()) {
    val stanje by model.stanje.collectAsStateWithLifecycle()
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surfaceContainerLow,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IkonaZnak(Icons.Rounded.SystemUpdate, MaterialTheme.colorScheme.primary, velicina = 40.dp)
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text("Ažuriranje aplikacije", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Verzija ${model.verzija} (${model.verzijaKod})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            when (val trenutno = stanje) {
                StanjeAzuriranja.Mirno ->
                    Opis("Proveri da li je na GitHub-u objavljena novija verzija.")
                StanjeAzuriranja.Proverava -> Opis("Proveravam…")
                is StanjeAzuriranja.NemaNove -> Opis("Imaš najnoviju verziju.")
                is StanjeAzuriranja.Dostupno ->
                    Opis("Dostupna je verzija ${trenutno.izdanje.verzija}.")
                is StanjeAzuriranja.Preuzima -> {
                    val procenat = trenutno.procenat
                    if (procenat == null) {
                        LinearProgressIndicator(Modifier.fillMaxWidth())
                        Opis("Preuzimam…")
                    } else {
                        TrakaNapretka(udeo = procenat / 100f)
                        Opis("Preuzimam… $procenat%")
                    }
                }
                is StanjeAzuriranja.Preuzeto -> {
                    Opis("Verzija ${trenutno.verzija} je preuzeta. Dodirni Instaliraj da je instaliraš.")
                    trenutno.poruka?.let {
                        Text(
                            it,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
                is StanjeAzuriranja.Greska -> Text(
                    trenutno.poruka,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            val akcija = akcijaZa(stanje, model)
            Button(
                onClick = akcija.radi,
                enabled = akcija.omoguceno,
                modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
            ) {
                Icon(akcija.ikona, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(akcija.natpis)
            }
        }
    }
}

private data class Akcija(
    val natpis: String,
    val ikona: ImageVector,
    val omoguceno: Boolean,
    val radi: () -> Unit,
)

private fun akcijaZa(stanje: StanjeAzuriranja, model: AzuriranjeViewModel): Akcija = when (stanje) {
    StanjeAzuriranja.Mirno -> Akcija("Proveri ažuriranja", Icons.Rounded.Refresh, true, model::proveri)
    StanjeAzuriranja.Proverava -> Akcija("Proveravam…", Icons.Rounded.Refresh, false, {})
    is StanjeAzuriranja.NemaNove -> Akcija("Proveri ponovo", Icons.Rounded.Refresh, true, model::proveri)
    is StanjeAzuriranja.Dostupno -> {
        val velicina = ProveraAzuriranja.formatirajVelicinu(stanje.izdanje.velicinaBajta)
        val natpis = if (velicina.isEmpty()) "Preuzmi" else "Preuzmi ($velicina)"
        Akcija(natpis, Icons.Rounded.Download, true, model::preuzmi)
    }
    is StanjeAzuriranja.Preuzima -> Akcija("Preuzimam…", Icons.Rounded.Download, false, {})
    is StanjeAzuriranja.Preuzeto -> Akcija("Instaliraj", Icons.Rounded.InstallMobile, true, model::instaliraj)
    is StanjeAzuriranja.Greska -> Akcija("Pokušaj ponovo", Icons.Rounded.Refresh, true, model::ponovi)
}

@Composable
private fun Opis(tekst: String) {
    Text(
        tekst,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}
