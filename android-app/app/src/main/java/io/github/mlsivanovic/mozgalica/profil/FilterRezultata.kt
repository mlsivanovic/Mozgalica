package io.github.mlsivanovic.mozgalica.profil

import io.github.mlsivanovic.mozgalica.podaci.IstorijaKviza
import io.github.mlsivanovic.mozgalica.podaci.IstorijaPartije
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

enum class VrstaRezultata(val naziv: String) { SVE("Sve"), KVIZ("Kvizovi"), SAH("Šah") }

enum class PeriodRezultata(val naziv: String, val dana: Long?) {
    SVE("Sve vreme", null),
    NEDELJA("7 dana", 7),
    MESEC("30 dana", 30),
}

enum class IshodRezultata(val naziv: String) { SVI("Svi ishodi"), POBEDA("Pobede"), REMI("Remi"), PORAZ("Porazi") }

enum class SortiranjeRezultata(val naziv: String) { NAJNOVIJE("Najnovije"), NAJBOLJE("Najbolji rezultat") }

data class FilterRezultata(
    val vrsta: VrstaRezultata = VrstaRezultata.SVE,
    val period: PeriodRezultata = PeriodRezultata.SVE,
    val ishod: IshodRezultata = IshodRezultata.SVI,
    val sortiranje: SortiranjeRezultata = SortiranjeRezultata.NAJNOVIJE,
) {
    val aktivan: Boolean get() = this != FilterRezultata()
}

sealed interface StavkaRezultata {
    val kljuc: String
    val vreme: Instant?
    val zvezdice: Int

    /** 0..1 — zajednička mera za sortiranje kvizova i šaha po uspehu. */
    val uspeh: Double?

    data class Kviz(val kviz: IstorijaKviza) : StavkaRezultata {
        override val kljuc = "k-${kviz.attemptId}"
        override val vreme = parsiraj(kviz.submittedAt)
        override val zvezdice = kviz.starsAwarded
        override val uspeh = if (kviz.pendingReview) null else kviz.scorePct / 100.0
    }

    data class Sah(val partija: IstorijaPartije) : StavkaRezultata {
        override val kljuc = "s-${partija.gameId}"
        override val vreme = parsiraj(partija.completedAt)
        override val zvezdice = partija.starsAwarded
        override val uspeh = when (partija.result) {
            "child_win" -> 1.0
            "draw" -> 0.5
            else -> 0.0
        }
    }
}

private fun parsiraj(iso: String): Instant? =
    runCatching { OffsetDateTime.parse(iso).toInstant() }.getOrNull()
        ?: runCatching { Instant.parse(iso) }.getOrNull()

fun ishodPartije(result: String): IshodRezultata = when (result) {
    "child_win" -> IshodRezultata.POBEDA
    "draw" -> IshodRezultata.REMI
    else -> IshodRezultata.PORAZ
}

fun filtrirajRezultate(
    kvizovi: List<IstorijaKviza>,
    partije: List<IstorijaPartije>,
    filter: FilterRezultata,
    sada: Instant = Instant.now(),
): List<StavkaRezultata> {
    val granica = filter.period.dana?.let { sada.minus(Duration.ofDays(it)) }
    val sve = buildList {
        if (filter.vrsta != VrstaRezultata.SAH) kvizovi.forEach { add(StavkaRezultata.Kviz(it)) }
        if (filter.vrsta != VrstaRezultata.KVIZ) {
            partije
                .filter { filter.ishod == IshodRezultata.SVI || ishodPartije(it.result) == filter.ishod }
                .forEach { add(StavkaRezultata.Sah(it)) }
        }
    }.filter { stavka ->
        granica == null || (stavka.vreme != null && !stavka.vreme!!.isBefore(granica))
    }
    val poVremenu = compareByDescending<StavkaRezultata> { it.vreme ?: Instant.MIN }
    return when (filter.sortiranje) {
        SortiranjeRezultata.NAJNOVIJE -> sve.sortedWith(poVremenu)
        SortiranjeRezultata.NAJBOLJE -> sve.sortedWith(
            compareByDescending<StavkaRezultata> { it.uspeh ?: -1.0 }.then(poVremenu),
        )
    }
}

data class SazetakRezultata(
    val broj: Int,
    val zvezdice: Int,
    val prosekKviza: Double?,
    val pobede: Int,
    val remiji: Int,
    val porazi: Int,
)

fun sazetakRezultata(stavke: List<StavkaRezultata>): SazetakRezultata {
    val ocene = stavke.filterIsInstance<StavkaRezultata.Kviz>()
        .filterNot { it.kviz.pendingReview }
        .map { it.kviz.scorePct }
    val partije = stavke.filterIsInstance<StavkaRezultata.Sah>().map { ishodPartije(it.partija.result) }
    return SazetakRezultata(
        broj = stavke.size,
        zvezdice = stavke.sumOf { it.zvezdice },
        prosekKviza = ocene.takeIf { it.isNotEmpty() }?.average(),
        pobede = partije.count { it == IshodRezultata.POBEDA },
        remiji = partije.count { it == IshodRezultata.REMI },
        porazi = partije.count { it == IshodRezultata.PORAZ },
    )
}

private val MESECI = listOf(
    "januar", "februar", "mart", "april", "maj", "jun",
    "jul", "avgust", "septembar", "oktobar", "novembar", "decembar",
)

/** Naslov grupe u listi: „Danas", „Juče", „Ove nedelje" ili „14. novembar 2026.". */
fun grupaDatuma(vreme: Instant?, sada: Instant = Instant.now(), zona: ZoneId = ZoneId.systemDefault()): String {
    if (vreme == null) return "Ranije"
    val dan = vreme.atZone(zona).toLocalDate()
    val danas = sada.atZone(zona).toLocalDate()
    val razlika = ChronoUnit.DAYS.between(dan, danas)
    return when {
        razlika == 0L -> "Danas"
        razlika == 1L -> "Juče"
        razlika in 2..6 -> "Ove nedelje"
        else -> punDatum(dan, danas)
    }
}

private fun punDatum(dan: LocalDate, danas: LocalDate): String {
    val mesec = MESECI[dan.monthValue - 1]
    return if (dan.year == danas.year) "${dan.dayOfMonth}. $mesec" else "${dan.dayOfMonth}. $mesec ${dan.year}."
}
