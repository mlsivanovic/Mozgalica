package io.github.mlsivanovic.mozgalica.podaci.povezivanje

data class SacuvaniProfil(
    val ime: String,
    val avatar: String,
    val ukupnoZvezdica: Int,
    val raspolozivoZvezdica: Int,
    val titula: String?,
)

object PovezivanjeKonstante {
    // Lokalna oznaka izabranog profila. Nije bearer token.
    const val IZABRANI_PROFIL = "aktivan"
}
