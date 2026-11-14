package io.github.mlsivanovic.mozgalica.podaci.prodavnica

import io.github.mlsivanovic.mozgalica.podaci.KupovinaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.ProdavnicaOdgovor
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

sealed interface IshodProdavnice {
    data class Uspesna(val podaci: ProdavnicaOdgovor) : IshodProdavnice
    data class Odbijena(val kod: String?) : IshodProdavnice
    data object Neuspesna : IshodProdavnice
}

sealed interface IshodKupovine {
    data class Uspesna(val odgovor: KupovinaOdgovor) : IshodKupovine
    data class Odbijena(
        val kod: String?,
        val balance: Int? = null,
        val cost: Int? = null,
    ) : IshodKupovine
    data object Neuspesna : IshodKupovine
}

interface IzvorProdavnice {
    suspend fun prodavnica(profileToken: String): IshodProdavnice
    suspend fun kupi(profileToken: String, itemId: String): IshodKupovine
}

@Serializable
private data class OmotProdavnice(val ok: Boolean = false, val error: String? = null)

@Serializable
private data class OmotKupovine(
    val ok: Boolean = false,
    val error: String? = null,
    val balance: Int? = null,
    val cost: Int? = null,
)

private val strogo = Json { ignoreUnknownKeys = false }
private val labavo = Json { ignoreUnknownKeys = true }

fun protumaciProdavnicu(telo: String): IshodProdavnice {
    val omot = try {
        labavo.decodeFromString(OmotProdavnice.serializer(), telo)
    } catch (_: Exception) {
        return IshodProdavnice.Neuspesna
    }
    if (!omot.ok) return IshodProdavnice.Odbijena(omot.error)
    return try {
        IshodProdavnice.Uspesna(strogo.decodeFromString(ProdavnicaOdgovor.serializer(), telo))
    } catch (_: Exception) {
        IshodProdavnice.Neuspesna
    }
}

fun protumaciKupovinu(telo: String): IshodKupovine {
    val omot = try {
        labavo.decodeFromString(OmotKupovine.serializer(), telo)
    } catch (_: Exception) {
        return IshodKupovine.Neuspesna
    }
    if (!omot.ok) return IshodKupovine.Odbijena(omot.error, omot.balance, omot.cost)
    return try {
        IshodKupovine.Uspesna(strogo.decodeFromString(KupovinaOdgovor.serializer(), telo))
    } catch (_: Exception) {
        IshodKupovine.Neuspesna
    }
}
