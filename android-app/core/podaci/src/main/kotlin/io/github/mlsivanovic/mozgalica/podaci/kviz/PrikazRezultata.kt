package io.github.mlsivanovic.mozgalica.podaci.kviz

import io.github.mlsivanovic.mozgalica.podaci.OpcijeJson
import io.github.mlsivanovic.mozgalica.podaci.RezultatOdgovor
import io.github.mlsivanovic.mozgalica.podaci.RezultatPitanja
import io.github.mlsivanovic.mozgalica.podaci.TacanOdgovor
import java.util.Locale

const val MAKSIMALNO_ZVEZDICA = 5

fun formatProcenat(pct: Double?): String {
    if (pct == null) return "—"
    val tekst = if (pct % 1.0 == 0.0) {
        pct.toLong().toString()
    } else {
        String.format(Locale.US, "%.1f", pct)
    }
    return "$tekst%"
}

fun porukaOhrabrenja(zvezdice: Int): String = when (zvezdice) {
    5 -> "Savršeno! Osvojio/la si svih pet zvezdica!"
    4 -> "Fenomenalno! Još samo mali korak do savršenog rezultata!"
    3 -> "Sjajno urađeno! Nastavi tako!"
    2 -> "Vrlo dobro! Još malo vežbe i stižu nove zvezdice!"
    1 -> "Bravo! Vežbaj još malo pa će biti još bolje!"
    else -> "Ne brini — svaka vežba te čini boljim. Pokušaj ponovo, možeš ti to!"
}

fun prikazujeOcenu(rezultat: RezultatOdgovor): Boolean =
    rezultat.showResult && !rezultat.pendingReview && rezultat.starsAwarded != null

// Samo prepisuje serversko polje. Ne poredi odgovor deteta sa tačnim.
fun prikazaniProcenat(rezultat: RezultatOdgovor): Double = rezultat.scorePct

fun prikazaneZvezdice(rezultat: RezultatOdgovor): Int? = rezultat.starsAwarded

fun tekstTacnog(pitanje: RezultatPitanja): String? {
    val tacan = pitanje.correct ?: return null
    return when (tacan) {
        is TacanOdgovor.Jedan -> {
            val opcije = (pitanje.options as? OpcijeJson.Lista)?.stavke.orEmpty()
            opcije.find { it.id == tacan.optionId }?.text
        }
        is TacanOdgovor.Vise -> {
            val opcije = (pitanje.options as? OpcijeJson.Lista)?.stavke.orEmpty()
            val tekstovi = tacan.optionIds.mapNotNull { id -> opcije.find { it.id == id }?.text }
            tekstovi.takeIf { it.isNotEmpty() }?.joinToString(", ")
        }
        is TacanOdgovor.Logicki -> if (tacan.value) "Tačno" else "Netačno"
        is TacanOdgovor.Broj -> formatBroja(tacan.value)
        is TacanOdgovor.Tekst -> tacan.accept.takeIf { it.isNotEmpty() }?.joinToString(" / ")
        is TacanOdgovor.Parovi -> {
            val opcije = pitanje.options as? OpcijeJson.Uparivanje ?: return null
            tacan.pairs.entries.joinToString("; ") { (levoId, desnoId) ->
                val levo = opcije.left.find { it.id == levoId }?.text ?: levoId
                val desno = opcije.right.find { it.id == desnoId }?.text ?: desnoId
                "$levo → $desno"
            }
        }
    }
}

private fun formatBroja(vrednost: Double): String {
    val tekst = if (vrednost % 1.0 == 0.0) vrednost.toLong().toString() else vrednost.toString()
    return tekst.replace('.', ',')
}

fun pocetnaVrednostAnimacije(cilj: Int, animacije: Boolean): Int = if (animacije) 0 else cilj
