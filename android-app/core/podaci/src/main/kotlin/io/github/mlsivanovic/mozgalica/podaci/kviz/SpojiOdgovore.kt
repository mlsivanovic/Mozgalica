package io.github.mlsivanovic.mozgalica.podaci.kviz

import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.PokusajOdgovor

// Ista petlja kao u KvizResavanje.tsx: lokalni ključ, sinhronizovan ili ne,
// ostaje. Server se upisuje samo ako tog pitanja još nema na uređaju.
fun spojiOdgovore(
    lokalno: StanjePokusaja,
    accessMode: String?,
    profileToken: String?,
    childName: String?,
    hintsUsed: Int?,
    savedAnswers: Map<String, OdgovorDeteta>,
    hintoviSaPitanja: Map<String, String>,
    belezkeSaServera: Map<String, String> = emptyMap(),
): StanjePokusaja {
    val answers = lokalno.answers.toMutableMap()
    for ((qid, odgovor) in savedAnswers) {
        if (qid !in answers) {
            answers[qid] = LokalniOdgovor(answer = odgovor, changedAt = 0, synced = true)
        }
    }
    val hintovi = (lokalno.hintovi ?: emptyMap()).toMutableMap()
    for ((qid, hint) in hintoviSaPitanja) {
        hintovi[qid] = hint
    }
    // Lokalna (još neposlata) beležka je novija od one na serveru.
    val belezke = (lokalno.belezke ?: emptyMap()).toMutableMap()
    for ((qid, tekst) in belezkeSaServera) {
        if (belezke[qid]?.tekst.isNullOrEmpty()) {
            belezke[qid] = LokalnaBelezka(tekst = tekst, changedAt = 0, synced = true)
        }
    }
    return lokalno.copy(
        accessMode = accessMode ?: lokalno.accessMode,
        profileToken = profileToken ?: lokalno.profileToken,
        childName = childName ?: lokalno.childName,
        answers = answers,
        hintsUsed = hintsUsed ?: lokalno.hintsUsed ?: 0,
        hintovi = hintovi,
        belezke = belezke,
    )
}

fun spojiSaServerom(lokalno: StanjePokusaja, server: PokusajOdgovor): StanjePokusaja {
    val hintovi = linkedMapOf<String, String>()
    for (pitanje in server.questions) {
        val hint = pitanje.hint
        if (hint != null) hintovi[pitanje.id] = hint
    }
    return spojiOdgovore(
        lokalno = lokalno,
        accessMode = server.accessMode,
        profileToken = server.profileToken,
        childName = server.childName,
        hintsUsed = server.hintsUsed,
        savedAnswers = server.savedAnswers,
        hintoviSaPitanja = hintovi,
        belezkeSaServera = server.notes,
    )
}

fun prviNeodgovoren(pitanja: List<String>, stanje: StanjePokusaja): Int {
    val indeks = pitanja.indexOfFirst { id -> odgovorJePrazan(stanje.answers[id]?.answer) }
    return if (indeks >= 0) indeks else (pitanja.size - 1).coerceAtLeast(0)
}
