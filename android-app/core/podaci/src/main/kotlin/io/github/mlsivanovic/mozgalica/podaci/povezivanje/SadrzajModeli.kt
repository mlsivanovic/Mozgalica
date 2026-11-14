package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.DanRasporeda
import kotlinx.serialization.Serializable

@Serializable
data class SacuvaniRaspored(
    val postoji: Boolean,
    val smenaNedelje: String? = null,
    val danas: DanRasporeda? = null,
    val sutra: DanRasporeda? = null,
    val nedelja: List<DanRasporeda> = emptyList(),
) {
    companion object {
        val NEMA = SacuvaniRaspored(postoji = false)
    }
}

@Serializable
data class SacuvanoObavestenje(
    val id: String,
    val eventType: String,
    val title: String,
    val body: String,
    val targetUrl: String,
    val readAt: String?,
    val createdAt: String,
    val cekaServer: Boolean = false,
)

data class SacuvanaObavestenja(
    val stavke: List<SacuvanoObavestenje>,
) {
    val neprocitano: Int get() = stavke.count { it.readAt == null }
}

enum class IzborTeme {
    SISTEM,
    SVETLA,
    TAMNA,
}

data class StanjePodesavanja(
    val tema: IzborTeme = IzborTeme.SISTEM,
    // Zvuk i haptika su podrazumevano uključeni. „Ukloni animacije" ne gasi zvuk.
    val zvuk: Boolean = true,
    val haptika: Boolean = true,
)

fun StanjePodesavanja.jeTamna(sistemTamna: Boolean): Boolean = when (tema) {
    IzborTeme.SVETLA -> false
    IzborTeme.TAMNA -> true
    IzborTeme.SISTEM -> sistemTamna
}
