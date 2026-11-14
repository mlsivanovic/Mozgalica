package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.AktivnaPartija
import io.github.mlsivanovic.mozgalica.podaci.AktivniKviz
import io.github.mlsivanovic.mozgalica.podaci.IstorijaKviza
import io.github.mlsivanovic.mozgalica.podaci.IstorijaPartije

data class SacuvaniProfil(
    val ime: String,
    val avatar: String,
    val ukupnoZvezdica: Int,
    val raspolozivoZvezdica: Int,
    val titula: String?,
    val aktivniKvizovi: List<AktivniKviz> = emptyList(),
    val aktivnePartije: List<AktivnaPartija> = emptyList(),
    val istorijaKvizova: List<IstorijaKviza> = emptyList(),
    val istorijaSaha: List<IstorijaPartije> = emptyList(),
)

object PovezivanjeKonstante {
    // Lokalna oznaka izabranog profila. Nije bearer token.
    const val IZABRANI_PROFIL = "aktivan"
}
