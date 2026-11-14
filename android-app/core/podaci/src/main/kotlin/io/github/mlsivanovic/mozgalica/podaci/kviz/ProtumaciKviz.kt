package io.github.mlsivanovic.mozgalica.podaci.kviz

import io.github.mlsivanovic.mozgalica.podaci.CuvanjeOdgovor
import io.github.mlsivanovic.mozgalica.podaci.KvizMetaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.PokusajOdgovor
import io.github.mlsivanovic.mozgalica.podaci.PotvrdaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.RezultatOdgovor
import io.github.mlsivanovic.mozgalica.podaci.SavetOdgovor
import io.github.mlsivanovic.mozgalica.podaci.TajmerOdgovor
import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

private val strogo = Json { ignoreUnknownKeys = false }
private val labavo = Json { ignoreUnknownKeys = true }

@Serializable
private data class Omot(val ok: Boolean = false, val error: String? = null)

private sealed interface Dekodirano<out T> {
    data class Vrednost<T>(val vrednost: T) : Dekodirano<T>
    data class Odbijeno(val kod: String?) : Dekodirano<Nothing>
    data object Neuspesno : Dekodirano<Nothing>
}

fun protumaciMeta(telo: String): IshodMeta = when (val ishod = dekodiraj(telo, KvizMetaOdgovor.serializer())) {
    is Dekodirano.Vrednost -> IshodMeta.Uspesna(ishod.vrednost)
    is Dekodirano.Odbijeno -> IshodMeta.Odbijena(ishod.kod)
    Dekodirano.Neuspesno -> IshodMeta.Neuspesna
}

fun protumaciPokusaj(telo: String): IshodPokusaja = when (val ishod = dekodiraj(telo, PokusajOdgovor.serializer())) {
    is Dekodirano.Vrednost ->
        if (ishod.vrednost.attemptToken.isBlank()) IshodPokusaja.Odbijen("attempt_token")
        else IshodPokusaja.Uspesan(ishod.vrednost)
    is Dekodirano.Odbijeno -> IshodPokusaja.Odbijen(ishod.kod)
    Dekodirano.Neuspesno -> IshodPokusaja.Neuspesan
}

fun protumaciCuvanje(telo: String): IshodCuvanja = when (val ishod = dekodiraj(telo, CuvanjeOdgovor.serializer())) {
    is Dekodirano.Vrednost -> IshodCuvanja.Potvrdeno(ishod.vrednost)
    is Dekodirano.Odbijeno -> IshodCuvanja.Odbijeno(ishod.kod)
    Dekodirano.Neuspesno -> IshodCuvanja.Neuspesno
}

fun protumaciTajmer(telo: String): IshodTajmera = when (val ishod = dekodiraj(telo, TajmerOdgovor.serializer())) {
    is Dekodirano.Vrednost -> IshodTajmera.Potvrden(ishod.vrednost)
    is Dekodirano.Odbijeno -> IshodTajmera.Odbijen(ishod.kod)
    Dekodirano.Neuspesno -> IshodTajmera.Neuspesan
}

fun protumaciSavet(telo: String): IshodSaveta = when (val ishod = dekodiraj(telo, SavetOdgovor.serializer())) {
    is Dekodirano.Vrednost -> IshodSaveta.Otkljucan(ishod.vrednost)
    is Dekodirano.Odbijeno -> IshodSaveta.Odbijen(ishod.kod)
    Dekodirano.Neuspesno -> IshodSaveta.Neuspesan
}

fun protumaciObjasnjenja(telo: String): IshodObjasnjenja = when (val ishod = dekodiraj(telo, PotvrdaOdgovor.serializer())) {
    is Dekodirano.Vrednost -> IshodObjasnjenja.Potvrdeno(ishod.vrednost)
    is Dekodirano.Odbijeno -> IshodObjasnjenja.Odbijeno(ishod.kod)
    Dekodirano.Neuspesno -> IshodObjasnjenja.Neuspesno
}

fun protumaciRezultat(telo: String): IshodPredaje {
    val omot = omot(telo) ?: return IshodPredaje.Neuspesna
    if (!omot.ok) return IshodPredaje.Odbijena(omot.error)
    val stablo = try {
        labavo.parseToJsonElement(telo).jsonObject
    } catch (_: Exception) {
        return IshodPredaje.Neuspesna
    }
    if (stablo.logicki("showResult") == false) {
        return IshodPredaje.Skriven(
            accessMode = stablo.tekst("accessMode"),
            profileToken = stablo.tekst("profileToken"),
            attemptsLeft = stablo["attemptsLeft"]?.jsonPrimitive?.intOrNull,
        )
    }
    return try {
        IshodPredaje.Prikazan(strogo.decodeFromString(RezultatOdgovor.serializer(), telo))
    } catch (_: Exception) {
        IshodPredaje.Neuspesna
    }
}

fun parametriPocetka(token: String, ime: String, oznaka: String?): JsonObject = buildJsonObject {
    put("p_token", token)
    put("p_child_name", ime)
    put("p_child_label", oznaka?.let { JsonPrimitive(it) } ?: JsonNull)
}

fun parametriCuvanja(token: String, odgovori: Map<String, OdgovorDeteta>): JsonObject = buildJsonObject {
    put("p_attempt_token", token)
    put(
        "p_answers",
        strogo.encodeToJsonElement(MapSerializer(String.serializer(), OdgovorDeteta.serializer()), odgovori),
    )
}

fun parametriPredaje(token: String): JsonObject = buildJsonObject {
    put("p_attempt_token", token)
    put("p_answers", JsonNull)
}

fun parametriNastavka(attemptToken: String): JsonObject = buildJsonObject {
    put("p_attempt_token", attemptToken)
}

fun parametriTajmera(attemptToken: String, sekunde: Int): JsonObject = buildJsonObject {
    put("p_attempt_token", attemptToken)
    put("p_remaining_seconds", sekunde.coerceAtLeast(0))
}

fun parametriSaveta(attemptToken: String, pitanjeId: String): JsonObject = buildJsonObject {
    put("p_attempt_token", attemptToken)
    put("p_quiz_question_id", pitanjeId)
}

fun parametriMeta(token: String): JsonObject = buildJsonObject { put("p_token", token) }

private fun JsonObject.tekst(kljuc: String): String? {
    val primitiv = this[kljuc] as? JsonPrimitive ?: return null
    if (primitiv is JsonNull || !primitiv.isString) return null
    return primitiv.content
}

private fun JsonObject.logicki(kljuc: String): Boolean? {
    val primitiv = this[kljuc] as? JsonPrimitive ?: return null
    if (primitiv is JsonNull) return null
    return primitiv.content.toBooleanStrictOrNull()
}

private fun <T> dekodiraj(telo: String, serializer: KSerializer<T>): Dekodirano<T> {
    val omot = omot(telo) ?: return Dekodirano.Neuspesno
    if (!omot.ok) return Dekodirano.Odbijeno(omot.error)
    return try {
        Dekodirano.Vrednost(strogo.decodeFromString(serializer, telo))
    } catch (_: Exception) {
        Dekodirano.Neuspesno
    }
}

private fun omot(telo: String): Omot? = try {
    labavo.decodeFromString(Omot.serializer(), telo)
} catch (_: Exception) {
    null
}
