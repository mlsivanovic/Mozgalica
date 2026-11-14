package io.github.mlsivanovic.mozgalica.kviz

import android.view.HapticFeedbackConstants
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.mlsivanovic.mozgalica.dizajn.LocalEfekti
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.OpcijeJson
import io.github.mlsivanovic.mozgalica.podaci.PitanjeZaDete
import io.github.mlsivanovic.mozgalica.podaci.kviz.UparivanjeStanje
import io.github.mlsivanovic.mozgalica.podaci.kviz.bojaPara
import io.github.mlsivanovic.mozgalica.podaci.kviz.dodirDesno
import io.github.mlsivanovic.mozgalica.podaci.kviz.dodirLevo
import io.github.mlsivanovic.mozgalica.podaci.kviz.numpadUnos

private val bojeParova = listOf(
    Color(0xFF4F46E5),
    Color(0xFF0F766E),
    Color(0xFFBE123C),
    Color(0xFFA16207),
    Color(0xFF7C3AED),
    Color(0xFF0369A1),
)

@Composable
fun PitanjePrikaz(
    pitanje: PitanjeZaDete,
    odgovor: OdgovorDeteta?,
    dozvoljenUnos: Boolean,
    onOdgovor: (OdgovorDeteta) -> Unit,
    onTekstFokus: (Boolean) -> Unit,
) {
    when (pitanje.type) {
        "single" -> IzborKartice(
            opcije = (pitanje.options as? OpcijeJson.Lista)?.stavke.orEmpty(),
            izabrani = listOfNotNull((odgovor as? OdgovorDeteta.Jedan)?.optionId),
            vise = false,
            dozvoljenUnos = dozvoljenUnos,
        ) { id -> onOdgovor(OdgovorDeteta.Jedan(id)) }
        "multi" -> {
            val izabrani = (odgovor as? OdgovorDeteta.Vise)?.optionIds.orEmpty()
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Izaberi sve tačne odgovore.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                IzborKartice(
                    opcije = (pitanje.options as? OpcijeJson.Lista)?.stavke.orEmpty(),
                    izabrani = izabrani,
                    vise = true,
                    dozvoljenUnos = dozvoljenUnos,
                ) { id ->
                    val novi = if (id in izabrani) izabrani - id else izabrani + id
                    onOdgovor(OdgovorDeteta.Vise(novi))
                }
            }
        }
        "numeric" -> NumerickiUnos((odgovor as? OdgovorDeteta.Broj)?.value.orEmpty(), dozvoljenUnos, onOdgovor)
        "text" -> TekstualniUnos(
            (odgovor as? OdgovorDeteta.Tekst)?.text.orEmpty(),
            dozvoljenUnos,
            onOdgovor,
            onTekstFokus,
        )
        "truefalse" -> {
            val izabrano = (odgovor as? OdgovorDeteta.Logicki)?.value
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                listOf(true to "Tačno", false to "Netačno").forEach { (vrednost, natpis) ->
                    OdgovorKartica(
                        tekst = natpis,
                        izabrano = izabrano == vrednost,
                        dozvoljenUnos = dozvoljenUnos,
                        modifier = Modifier.weight(1f),
                        opis = natpis,
                        onClick = { onOdgovor(OdgovorDeteta.Logicki(vrednost)) },
                    )
                }
            }
        }
        "matching" -> UparivanjePrikaz(pitanje, odgovor as? OdgovorDeteta.Parovi, dozvoljenUnos, onOdgovor)
        else -> Text("Ovo pitanje još ne umem da prikažem.", color = MaterialTheme.colorScheme.error)
    }
}

@Composable
private fun IzborKartice(
    opcije: List<io.github.mlsivanovic.mozgalica.podaci.Opcija>,
    izabrani: List<String>,
    vise: Boolean,
    dozvoljenUnos: Boolean,
    onIzbor: (String) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.semantics {
        contentDescription = if (vise) "Ponuđeni odgovori, više tačnih" else "Ponuđeni odgovori"
    }) {
        opcije.forEach { opcija ->
            OdgovorKartica(
                tekst = opcija.text,
                izabrano = opcija.id in izabrani,
                dozvoljenUnos = dozvoljenUnos,
                opis = opcija.text,
                onClick = { onIzbor(opcija.id) },
            )
        }
    }
}

@Composable
private fun OdgovorKartica(
    tekst: String,
    izabrano: Boolean,
    dozvoljenUnos: Boolean,
    opis: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val vibriraj = zapamtiVibraciju()
    Card(
        onClick = {
            if (!dozvoljenUnos) return@Card
            vibriraj()
            onClick()
        },
        modifier = modifier.fillMaxWidth().heightIn(min = 64.dp).semantics { contentDescription = opis },
        colors = CardDefaults.cardColors(
            containerColor = if (izabrano) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface,
        ),
        border = if (izabrano) BorderStroke(3.dp, MaterialTheme.colorScheme.primary) else BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Text(
            text = tekst,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 18.dp),
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}

@Composable
private fun NumerickiUnos(trenutno: String, dozvoljenUnos: Boolean, onOdgovor: (OdgovorDeteta) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Upiši broj", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text = trenutno.ifEmpty { " " },
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Uneti broj ${trenutno.ifEmpty { "prazno" }}" },
            style = MaterialTheme.typography.headlineMedium,
        )
        if (dozvoljenUnos) Numpad(trenutno) { onOdgovor(OdgovorDeteta.Broj(it)) }
    }
}

@Composable
private fun Numpad(trenutno: String, onVrednost: (String) -> Unit) {
    val vibriraj = zapamtiVibraciju()
    val redovi = listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf("-", "0", ","), listOf("briši"))
    Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.semantics { contentDescription = "Numpad" }) {
        redovi.forEach { red ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                red.forEach { taster ->
                    Card(
                        onClick = {
                            vibriraj()
                            onVrednost(numpadUnos(trenutno, taster))
                        },
                        modifier = Modifier.weight(1f).heightIn(min = 64.dp).semantics {
                            contentDescription = if (taster == "briši") "Obriši cifru" else "Cifra $taster"
                        },
                    ) {
                        Text(
                            text = if (taster == "briši") "⌫" else taster,
                            modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 16.dp),
                            style = MaterialTheme.typography.headlineMedium,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TekstualniUnos(
    trenutno: String,
    dozvoljenUnos: Boolean,
    onOdgovor: (OdgovorDeteta) -> Unit,
    onFokus: (Boolean) -> Unit,
) {
    OutlinedTextField(
        value = trenutno,
        onValueChange = { onOdgovor(OdgovorDeteta.Tekst(it.take(120))) },
        enabled = dozvoljenUnos,
        modifier = Modifier.fillMaxWidth().onFocusChanged { onFokus(it.isFocused) },
        textStyle = MaterialTheme.typography.bodyLarge.copy(fontSize = 18.sp),
        label = { Text("Upiši odgovor") },
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Done),
        singleLine = true,
    )
}

@Composable
private fun UparivanjePrikaz(
    pitanje: PitanjeZaDete,
    odgovor: OdgovorDeteta.Parovi?,
    dozvoljenUnos: Boolean,
    onOdgovor: (OdgovorDeteta) -> Unit,
) {
    val opcije = pitanje.options as? OpcijeJson.Uparivanje
    if (opcije == null) {
        Text("Pitanje nema parove.", color = MaterialTheme.colorScheme.error)
        return
    }
    var izabrano by remember(pitanje.id) { mutableStateOf<String?>(null) }
    val parovi = odgovor?.pairs.orEmpty()
    val stanje = UparivanjeStanje(parovi, izabrano)
    Text(
        "Dodirni levo, pa desno. Isti par ima istu boju. Ponovni dodir raskida par.",
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            opcije.left.forEach { levo ->
                val indeks = bojaPara(parovi, levo.id)
                ParKartica(levo.text, indeks, izabrano == levo.id, "Levo ${levo.text}") {
                    if (!dozvoljenUnos) return@ParKartica
                    val novo = dodirLevo(stanje, levo.id)
                    izabrano = novo.izabranoLevo
                    onOdgovor(OdgovorDeteta.Parovi(novo.parovi))
                }
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            opcije.right.forEach { desno ->
                val vlasnik = parovi.entries.firstOrNull { it.value == desno.id }?.key
                val indeks = vlasnik?.let { bojaPara(parovi, it) }
                ParKartica(desno.text, indeks, false, "Desno ${desno.text}") {
                    if (!dozvoljenUnos) return@ParKartica
                    val novo = dodirDesno(stanje, desno.id)
                    izabrano = novo.izabranoLevo
                    onOdgovor(OdgovorDeteta.Parovi(novo.parovi))
                }
            }
        }
    }
}

@Composable
private fun ParKartica(tekst: String, indeksBoje: Int?, izabrano: Boolean, opis: String, onClick: () -> Unit) {
    val boja = indeksBoje?.let { bojeParova[it % bojeParova.size] }
    val ivica = when {
        boja != null -> BorderStroke(3.dp, boja)
        izabrano -> BorderStroke(3.dp, MaterialTheme.colorScheme.primary)
        else -> BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    }
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp).semantics { contentDescription = opis },
        border = ivica,
    ) {
        Text(tekst, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun zapamtiVibraciju(): () -> Unit {
    val efekti = LocalEfekti.current
    val pogled = LocalView.current
    return {
        if (efekti.haptika) pogled.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
    }
}
