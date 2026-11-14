package io.github.mlsivanovic.mozgalica.podaci.kviz

data class UparivanjeStanje(
    val parovi: Map<String, String> = emptyMap(),
    val izabranoLevo: String? = null,
)

fun dodirLevo(stanje: UparivanjeStanje, id: String): UparivanjeStanje {
    if (id in stanje.parovi) {
        return UparivanjeStanje(parovi = stanje.parovi - id, izabranoLevo = null)
    }
    val novo = if (stanje.izabranoLevo == id) null else id
    return stanje.copy(izabranoLevo = novo)
}

fun dodirDesno(stanje: UparivanjeStanje, id: String): UparivanjeStanje {
    val levo = stanje.izabranoLevo
    if (levo != null) {
        val očišćeno = stanje.parovi.filterValues { it != id }
        return UparivanjeStanje(očišćeno + (levo to id), izabranoLevo = null)
    }
    val vlasnik = stanje.parovi.entries.firstOrNull { it.value == id }?.key
    return if (vlasnik != null) stanje.copy(parovi = stanje.parovi - vlasnik) else stanje
}

fun bojaPara(parovi: Map<String, String>, levoId: String): Int? {
    val indeks = parovi.keys.indexOf(levoId)
    return if (indeks < 0) null else indeks
}

fun numpadUnos(trenutno: String, taster: String): String {
    val sledece = when (taster) {
        "briši" -> trenutno.dropLast(1)
        "-" -> if (trenutno.startsWith("-")) trenutno.removePrefix("-") else "-$trenutno"
        "," -> when {
            trenutno.contains(',') -> trenutno
            trenutno.isEmpty() || trenutno == "-" -> trenutno
            else -> trenutno + ","
        }
        else -> if (taster.length == 1 && taster[0].isDigit()) trenutno + taster else trenutno
    }
    return sledece.take(16)
}
