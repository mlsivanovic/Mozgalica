package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.ObavestenjaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.OznakaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.RasporedOdgovor
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private val strogo = Json { ignoreUnknownKeys = false }
private val labavo = Json { ignoreUnknownKeys = true }

@Serializable
private data class OmotSadrzaja(
    val ok: Boolean = false,
    val error: String? = null,
    val exists: Boolean? = null,
)

// Kad raspored nije unet, server vrati samo ok i exists, bez dana i časova.
fun protumaciRaspored(telo: String): IshodRasporeda {
    val omot = runCatching { labavo.decodeFromString(OmotSadrzaja.serializer(), telo) }.getOrNull()
        ?: return IshodRasporeda.Neuspesan
    if (!omot.ok) {
        return if (omot.error == "not_found") IshodRasporeda.NijePronadjen else IshodRasporeda.Odbijen
    }
    if (omot.exists != true) return IshodRasporeda.Nema
    val pun = runCatching { strogo.decodeFromString(RasporedOdgovor.serializer(), telo) }.getOrNull()
        ?: return IshodRasporeda.Odbijen
    return IshodRasporeda.Postoji(
        SacuvaniRaspored(
            postoji = true,
            smenaNedelje = pun.thisWeekShift,
            danas = pun.today,
            sutra = pun.tomorrow,
            nedelja = pun.week,
        ),
    )
}

fun protumaciObavestenja(telo: String): IshodObavestenja {
    val omot = runCatching { labavo.decodeFromString(OmotSadrzaja.serializer(), telo) }.getOrNull()
        ?: return IshodObavestenja.Neuspesan
    if (!omot.ok) {
        return if (omot.error == "not_found") IshodObavestenja.NijePronadjen else IshodObavestenja.Neuspesan
    }
    val pun = runCatching { strogo.decodeFromString(ObavestenjaOdgovor.serializer(), telo) }.getOrNull()
        ?: return IshodObavestenja.Neuspesan
    return IshodObavestenja.Uspesna(pun.notifications.map { it.uSacuvano() })
}

fun protumaciOznaku(telo: String): IshodOznake {
    val omot = runCatching { labavo.decodeFromString(OmotSadrzaja.serializer(), telo) }.getOrNull()
        ?: return IshodOznake.Neuspesan
    if (!omot.ok) return IshodOznake.Neuspesan
    val pun = runCatching { strogo.decodeFromString(OznakaOdgovor.serializer(), telo) }.getOrNull()
        ?: return IshodOznake.Neuspesan
    return if (pun.ok) IshodOznake.Uspesno else IshodOznake.Neuspesan
}
