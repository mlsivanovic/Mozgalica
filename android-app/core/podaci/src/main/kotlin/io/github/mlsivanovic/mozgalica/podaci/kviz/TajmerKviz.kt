package io.github.mlsivanovic.mozgalica.podaci.kviz

import java.time.OffsetDateTime
import kotlin.math.floor
import kotlin.math.min

enum class RezimTajmera { PROFILNI, ROK, NEMA }

fun rezimTajmera(accessMode: String?, deadlineAt: String?, remainingSeconds: Int?): RezimTajmera = when {
    accessMode == "profile" && remainingSeconds != null -> RezimTajmera.PROFILNI
    !deadlineAt.isNullOrBlank() -> RezimTajmera.ROK
    else -> RezimTajmera.NEMA
}

fun isoUMilisekunde(iso: String): Long = OffsetDateTime.parse(iso).toInstant().toEpochMilli()

fun serverOffsetMs(serverNowIso: String, lokalnoMs: Long): Long = isoUMilisekunde(serverNowIso) - lokalnoMs

// deadline je serversko vreme. offset = serverNow - lokalno u trenutku učitavanja,
// pa pomeren sat uređaja ne produžava rok.
fun preostaloDoRoka(deadlineAtMs: Long, serverOffsetMs: Long, sadaLokalnoMs: Long): Int {
    val sadaNaServeru = sadaLokalnoMs + serverOffsetMs
    return floor((deadlineAtMs - sadaNaServeru) / 1000.0).toInt()
}

fun istekaoRok(deadlineAtMs: Long, serverOffsetMs: Long, sadaLokalnoMs: Long): Boolean =
    preostaloDoRoka(deadlineAtMs, serverOffsetMs, sadaLokalnoMs) <= 0

// Lokalno potrošeno vreme ne sme da se vrati kad server još nije video checkpoint.
fun spojiPreostalo(lokalno: Int?, server: Int?): Int? = when {
    lokalno == null -> server
    server == null -> lokalno
    else -> min(lokalno, server)
}

data class KorakSata(
    val preostalo: Int,
    val checkpoint: Int?,
    val istekao: Boolean,
)

// Profilni sat staje dok ekran nije vidljiv i ne nadoknađuje sakrivene sekunde.
class ProfilniSat(pocetno: Int) {
    var preostalo: Int = pocetno.coerceAtLeast(0)
        private set
    private var istekao: Boolean = preostalo == 0
    private var poslednjiOtkucajMs: Long? = null
    private var poslednjiCheckpointMs: Long? = null

    fun sakrij(): KorakSata {
        poslednjiOtkucajMs = null
        poslednjiCheckpointMs = null
        return KorakSata(preostalo, checkpoint = if (istekao) null else preostalo, istekao = istekao)
    }

    fun otkucaj(sadaMs: Long, vidljivo: Boolean): KorakSata {
        if (!vidljivo || istekao) {
            poslednjiOtkucajMs = null
            return KorakSata(preostalo, checkpoint = null, istekao = istekao)
        }
        val prosli = poslednjiOtkucajMs
        if (prosli == null) {
            poslednjiOtkucajMs = sadaMs
            poslednjiCheckpointMs = sadaMs
            return KorakSata(preostalo, checkpoint = null, istekao = false)
        }
        val sekundi = ((sadaMs - prosli) / 1000).toInt()
        if (sekundi > 0) {
            poslednjiOtkucajMs = prosli + sekundi * 1000L
            preostalo = (preostalo - sekundi).coerceAtLeast(0)
            if (preostalo == 0) {
                istekao = true
                poslednjiCheckpointMs = sadaMs
                return KorakSata(0, checkpoint = 0, istekao = true)
            }
        }
        val zadnji = poslednjiCheckpointMs ?: sadaMs
        val checkpoint = if (sadaMs - zadnji >= 5_000) {
            poslednjiCheckpointMs = sadaMs
            preostalo
        } else {
            null
        }
        return KorakSata(preostalo, checkpoint, istekao = false)
    }
}

sealed interface OdlukaCheckpointa {
    data class Posalji(val sekunde: Int) : OdlukaCheckpointa
    data class Sacuvaj(val sekunde: Int) : OdlukaCheckpointa
}

fun odlukaCheckpointa(sekunde: Int, naMrezi: Boolean): OdlukaCheckpointa {
    val vrednost = sekunde.coerceAtLeast(0)
    return if (naMrezi) OdlukaCheckpointa.Posalji(vrednost) else OdlukaCheckpointa.Sacuvaj(vrednost)
}

fun formatOdbrojavanje(sekunde: Int): String {
    val s = sekunde.coerceAtLeast(0)
    return "${s / 60}:${(s % 60).toString().padStart(2, '0')}"
}

fun dozvoljenSwipe(tipPitanja: String, unosFokusiran: Boolean): Boolean = when (tipPitanja) {
    "numeric" -> false
    "text" -> !unosFokusiran
    else -> true
}

// fn_hint_cap() na serveru vraća 3. Polje remaining iz use_hint je merodavno kad stigne.
const val PODRAZUMEVANI_LIMIT_SAVETA = 3

fun preostaloSaveta(hintsUsed: Int, remainingSaServera: Int?): Int {
    if (remainingSaServera != null) return remainingSaServera.coerceAtLeast(0)
    return (PODRAZUMEVANI_LIMIT_SAVETA - hintsUsed).coerceAtLeast(0)
}
