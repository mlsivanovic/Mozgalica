package io.github.mlsivanovic.mozgalica.podaci.sah

import io.github.mlsivanovic.mozgalica.podaci.SahStanjeOdgovor
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

// Akcije koje podržava play-chess Edge funkcija. `move` je samo za stare PWA
// klijente; native koristi child_move pa zasebno engine.
enum class SahAkcija(val vrednost: String) {
    STANJE("state"),
    POCNI("start"),
    DETE_POTEZ("child_move"),
    RACUNAR("engine"),
    PONISTI("undo"),
    PREDAJ("resign"),
    PONOVO("retry"),
}

data class SahPotezUnos(
    val from: String,
    val to: String,
    val promotion: String? = null,
)

sealed interface IshodSaha {
    data class Uspesan(val stanje: SahStanjeOdgovor) : IshodSaha
    data class Odbijen(val kod: String?) : IshodSaha
    data object Neuspesan : IshodSaha
}

interface IzvorSaha {
    suspend fun stanje(playToken: String): IshodSaha
    suspend fun akcija(
        playToken: String,
        akcija: SahAkcija,
        expectedRevision: Int,
        potez: SahPotezUnos? = null,
        requestId: String,
        elo: Int? = null,
    ): IshodSaha
}

@Serializable
private data class SahOmot(
    val ok: Boolean = false,
    val error: String? = null,
    val stale: Boolean = false,
    val duplicate: Boolean = false,
)

private val strogo = Json { ignoreUnknownKeys = false }
private val labavo = Json { ignoreUnknownKeys = true }

fun protumaciSah(telo: String): IshodSaha {
    val omot = try {
        labavo.decodeFromString(SahOmot.serializer(), telo)
    } catch (_: Exception) {
        return IshodSaha.Neuspesan
    }
    if (!omot.ok) return IshodSaha.Odbijen(omot.error)
    return try {
        IshodSaha.Uspesan(strogo.decodeFromString(SahStanjeOdgovor.serializer(), telo))
    } catch (_: Exception) {
        IshodSaha.Neuspesan
    }
}

fun sahZahtev(
    playToken: String,
    akcija: SahAkcija,
    expectedRevision: Int? = null,
    potez: SahPotezUnos? = null,
    requestId: String? = null,
    elo: Int? = null,
): JsonObject = buildJsonObject {
    put("playToken", playToken)
    put("action", akcija.vrednost)
    expectedRevision?.let { put("expectedRevision", it) }
    potez?.let {
        put(
            "move",
            buildJsonObject {
                put("from", it.from)
                put("to", it.to)
                it.promotion?.let { slovo -> put("promotion", slovo) }
            },
        )
    }
    requestId?.let { put("requestId", it) }
    put("elo", elo?.let { kotlinx.serialization.json.JsonPrimitive(it) } ?: JsonNull)
}
