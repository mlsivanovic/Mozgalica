package io.github.mlsivanovic.mozgalica.profil

import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val DANI = listOf("Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja")
private val datumPrikaz = DateTimeFormatter.ofPattern("d. M. yyyy. HH:mm", Locale.forLanguageTag("sr-Latn"))

fun formatDatum(iso: String): String = try {
    val trenutak = OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault())
    datumPrikaz.format(trenutak)
} catch (_: Exception) {
    iso
}

fun formatProcenat(pct: Double): String {
    val tekst = String.format(Locale.US, "%.1f", pct)
    return if (tekst.endsWith(".0")) "${tekst.substringBefore('.')}%" else "$tekst%"
}

fun tekstIshoda(result: String): String = when (result) {
    "child_win" -> "Pobeda"
    "draw" -> "Remi"
    else -> "Poraz"
}

fun tekstSata(sekunde: Int?): String = if (sekunde == null) "bez sata" else "${sekunde / 60}+0"

fun tekstPitanja(broj: Int): String = if (broj == 1) "1 pitanje" else "$broj pitanja"

fun nazivDana(weekday: Int): String = DANI.getOrNull(weekday - 1).orEmpty()

fun nazivSmene(smena: String?): String = when (smena) {
    "afternoon" -> "Popodnevna smena"
    "morning" -> "Prepodnevna smena"
    else -> "Nema nastave"
}

fun nazivCasa(periodNo: Int): String = if (periodNo == 0) "Pretčas" else "$periodNo. čas"

fun detaljCasa(teacher: String?, room: String?): String? {
    val delovi = listOfNotNull(
        teacher?.takeIf { it.isNotBlank() },
        room?.takeIf { it.isNotBlank() }?.let { "uč. $it" },
    )
    return delovi.joinToString(" · ").ifBlank { null }
}

fun kratakDatum(isoDatum: String): String {
    val delovi = isoDatum.split("-")
    if (delovi.size != 3) return isoDatum
    val dan = delovi[2].trimStart('0').ifEmpty { "0" }
    val mesec = delovi[1].trimStart('0').ifEmpty { "0" }
    return "$dan. $mesec."
}

fun tekstRezultata(pendingReview: Boolean, scorePct: Double): String =
    if (pendingReview) "Čeka pregled" else formatProcenat(scorePct)

sealed interface CiljObavestenja {
    data class Kviz(val token: String) : CiljObavestenja
    data class Sah(val token: String) : CiljObavestenja
}

fun ciljObavestenja(url: String): CiljObavestenja? {
    val kviz = Regex("""/kviz/([^/?#]+)""").find(url)?.groupValues?.getOrNull(1)
    if (!kviz.isNullOrBlank()) return CiljObavestenja.Kviz(kviz)
    val sah = Regex("""/sah/([^/?#]+)""").find(url)?.groupValues?.getOrNull(1)
    if (!sah.isNullOrBlank()) return CiljObavestenja.Sah(sah)
    return null
}
