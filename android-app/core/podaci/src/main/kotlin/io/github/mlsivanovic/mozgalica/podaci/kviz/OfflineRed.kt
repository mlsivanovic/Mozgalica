package io.github.mlsivanovic.mozgalica.podaci.kviz

import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

// Isti ugovor kao src/lib/offlineQueue.ts: upis je odmah lokalan, a synced
// postaje true samo ako se odgovor nije promenio posle trenutka slanja.
@Serializable
data class LokalniOdgovor(
    val answer: OdgovorDeteta,
    val changedAt: Long,
    val synced: Boolean,
)

@Serializable
data class StanjePokusaja(
    val attemptToken: String,
    val childName: String,
    val answers: Map<String, LokalniOdgovor> = emptyMap(),
    val accessMode: String? = null,
    val profileToken: String? = null,
    val hintsUsed: Int? = null,
    val hintovi: Map<String, String>? = null,
)

interface Skladiste {
    fun getItem(key: String): String?
    fun setItem(key: String, value: String)
    fun removeItem(key: String)
}

private val jsonStanja = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}

fun kljucPokusaja(kvizToken: String): String = "mozgalica:pokusaj:$kvizToken"

private fun <T> bezbedno(podrazumevano: T, fn: () -> T): T = try {
    fn()
} catch (_: Exception) {
    podrazumevano
}

fun ucitajStanje(skladiste: Skladiste, kvizToken: String): StanjePokusaja? = bezbedno(null) {
    val sirovo = skladiste.getItem(kljucPokusaja(kvizToken)) ?: return@bezbedno null
    val stablo = jsonStanja.parseToJsonElement(sirovo)
    if (stablo !is JsonObject) return@bezbedno null
    val token = stablo["attemptToken"] as? JsonPrimitive
    if (token == null || !token.isString || token.content.isEmpty()) return@bezbedno null
    if (stablo["answers"] !is JsonObject) return@bezbedno null
    jsonStanja.decodeFromJsonElement(StanjePokusaja.serializer(), stablo)
}

fun sacuvajStanje(skladiste: Skladiste, kvizToken: String, stanje: StanjePokusaja) {
    bezbedno(Unit) {
        skladiste.setItem(
            kljucPokusaja(kvizToken),
            jsonStanja.encodeToString(StanjePokusaja.serializer(), stanje),
        )
    }
}

fun zapocniStanje(
    skladiste: Skladiste,
    kvizToken: String,
    attemptToken: String,
    childName: String,
    accessMode: String? = null,
    profileToken: String? = null,
): StanjePokusaja {
    val stanje = StanjePokusaja(
        attemptToken = attemptToken,
        childName = childName,
        answers = emptyMap(),
        accessMode = accessMode,
        profileToken = profileToken,
    )
    sacuvajStanje(skladiste, kvizToken, stanje)
    return stanje
}

fun upisiOdgovorCisto(
    stanje: StanjePokusaja,
    questionId: String,
    answer: OdgovorDeteta,
    sada: Long = System.currentTimeMillis(),
): StanjePokusaja {
    val answers = stanje.answers.toMutableMap()
    answers[questionId] = LokalniOdgovor(answer = answer, changedAt = sada, synced = false)
    return stanje.copy(answers = answers)
}

fun upisiOdgovor(
    skladiste: Skladiste,
    kvizToken: String,
    stanje: StanjePokusaja,
    questionId: String,
    answer: OdgovorDeteta,
    sada: Long = System.currentTimeMillis(),
): StanjePokusaja {
    val novo = upisiOdgovorCisto(stanje, questionId, answer, sada)
    sacuvajStanje(skladiste, kvizToken, novo)
    return novo
}

fun upisiHintCisto(
    stanje: StanjePokusaja,
    questionId: String,
    hint: String,
    hintsUsed: Int,
): StanjePokusaja {
    val hintovi = (stanje.hintovi ?: emptyMap()).toMutableMap()
    hintovi[questionId] = hint
    return stanje.copy(hintsUsed = hintsUsed, hintovi = hintovi)
}

fun upisiHint(
    skladiste: Skladiste,
    kvizToken: String,
    stanje: StanjePokusaja,
    questionId: String,
    hint: String,
    hintsUsed: Int,
): StanjePokusaja {
    val novo = upisiHintCisto(stanje, questionId, hint, hintsUsed)
    sacuvajStanje(skladiste, kvizToken, novo)
    return novo
}

fun nesinhronizovani(stanje: StanjePokusaja): Map<String, OdgovorDeteta> {
    val rezultat = linkedMapOf<String, OdgovorDeteta>()
    for ((id, odgovor) in stanje.answers) {
        if (!odgovor.synced) rezultat[id] = odgovor.answer
    }
    return rezultat
}

fun oznaciSinhronizovaneCisto(
    stanje: StanjePokusaja,
    poslati: Map<String, OdgovorDeteta>,
    vremePoslato: Long,
): StanjePokusaja {
    val answers = stanje.answers.toMutableMap()
    for (id in poslati.keys) {
        val trenutni = answers[id]
        if (trenutni != null && trenutni.changedAt <= vremePoslato) {
            answers[id] = trenutni.copy(synced = true)
        }
    }
    return stanje.copy(answers = answers)
}

fun oznaciSinhronizovane(
    skladiste: Skladiste,
    kvizToken: String,
    stanje: StanjePokusaja,
    poslati: Map<String, OdgovorDeteta>,
    vremePoslato: Long,
): StanjePokusaja {
    val novo = oznaciSinhronizovaneCisto(stanje, poslati, vremePoslato)
    sacuvajStanje(skladiste, kvizToken, novo)
    return novo
}

fun sveSinhronizovano(stanje: StanjePokusaja): Boolean = stanje.answers.values.all { it.synced }

fun obrisiStanje(skladiste: Skladiste, kvizToken: String) {
    bezbedno(Unit) { skladiste.removeItem(kljucPokusaja(kvizToken)) }
}

fun odgovorJePrazan(value: OdgovorDeteta?): Boolean = when (value) {
    null -> true
    is OdgovorDeteta.Jedan -> value.optionId == null
    is OdgovorDeteta.Vise -> value.optionIds.isEmpty()
    is OdgovorDeteta.Tekst -> value.text.isBlank()
    is OdgovorDeteta.Parovi -> value.pairs.isEmpty()
    is OdgovorDeteta.Broj -> value.value.isEmpty()
    is OdgovorDeteta.Logicki -> value.value == null
}
