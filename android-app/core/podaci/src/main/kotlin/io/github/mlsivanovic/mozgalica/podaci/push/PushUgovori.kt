package io.github.mlsivanovic.mozgalica.podaci.push

import io.github.mlsivanovic.mozgalica.podaci.PushRegistracijaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.PushStatusOdgovor
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

sealed interface IshodRegistracijePush {
    data class Uspesna(val subscriptionId: String) : IshodRegistracijePush
    data class Odbijena(val kod: String?) : IshodRegistracijePush
    data object Neuspesna : IshodRegistracijePush
}

sealed interface IshodStatusaPush {
    data class Aktivan(val active: Boolean) : IshodStatusaPush
    data class Odbijen(val kod: String?) : IshodStatusaPush
    data object Neuspesan : IshodStatusaPush
}

sealed interface IshodPotvrdePush {
    data object Uspesna : IshodPotvrdePush
    data class Odbijena(val kod: String?) : IshodPotvrdePush
    data object Neuspesna : IshodPotvrdePush
}

interface IzvorPush {
    suspend fun registrujFcm(
        profileToken: String,
        fcmToken: String,
        userAgent: String?,
    ): IshodRegistracijePush

    suspend fun odjaviFcm(profileToken: String, fcmToken: String): IshodPotvrdePush
    suspend fun statusFcm(profileToken: String, fcmToken: String): IshodStatusaPush
}

@Serializable
private data class OmotPush(val ok: Boolean = false, val error: String? = null)

private val strogo = Json { ignoreUnknownKeys = false }
private val labavo = Json { ignoreUnknownKeys = true }

fun protumaciRegistracijuPush(telo: String): IshodRegistracijePush {
    val omot = try {
        labavo.decodeFromString(OmotPush.serializer(), telo)
    } catch (_: Exception) {
        return IshodRegistracijePush.Neuspesna
    }
    if (!omot.ok) return IshodRegistracijePush.Odbijena(omot.error)
    return try {
        val odgovor = strogo.decodeFromString(PushRegistracijaOdgovor.serializer(), telo)
        IshodRegistracijePush.Uspesna(odgovor.subscriptionId)
    } catch (_: Exception) {
        IshodRegistracijePush.Neuspesna
    }
}

fun protumaciPotvrduPush(telo: String): IshodPotvrdePush {
    val omot = try {
        labavo.decodeFromString(OmotPush.serializer(), telo)
    } catch (_: Exception) {
        return IshodPotvrdePush.Neuspesna
    }
    return if (omot.ok) IshodPotvrdePush.Uspesna else IshodPotvrdePush.Odbijena(omot.error)
}

fun protumaciStatusPush(telo: String): IshodStatusaPush {
    val omot = try {
        labavo.decodeFromString(OmotPush.serializer(), telo)
    } catch (_: Exception) {
        return IshodStatusaPush.Neuspesan
    }
    if (!omot.ok) return IshodStatusaPush.Odbijen(omot.error)
    return try {
        val odgovor = strogo.decodeFromString(PushStatusOdgovor.serializer(), telo)
        IshodStatusaPush.Aktivan(odgovor.active)
    } catch (_: Exception) {
        IshodStatusaPush.Neuspesan
    }
}
