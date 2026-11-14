package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.logging.LogLevel
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.PropertyConversionMethod
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.serializer.KotlinXSerializer
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseIzvorProfila(
    private val url: String,
    private val anonKljuc: String,
) : IzvorProfila, IzvorSadrzaja {
    private val json = Json { ignoreUnknownKeys = false }

    // Klijent se pravi tek na prvi mrežni poziv, posle crtanja keša.
    private val klijent: SupabaseClient by lazy {
        createSupabaseClient(url, anonKljuc) {
            defaultLogLevel = LogLevel.NONE
            requestTimeout = 15.seconds
            defaultSerializer = KotlinXSerializer(json)
            install(Postgrest) {
                propertyConversionMethod = PropertyConversionMethod.NONE
            }
        }
    }

    override suspend fun ucitaj(token: String): IshodUcitavanja {
        if (url.isBlank() || anonKljuc.isBlank()) {
            return IshodUcitavanja.Neuspesan(PorukePovezivanja.BAZA_NIJE_PODESENA)
        }
        return try {
            val telo = klijent.postgrest.rpc(
                "get_child_profile",
                buildJsonObject { put("p_profile_token", token) },
            ).data
            protumaciProfil(telo)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodUcitavanja.Neuspesan(PorukePovezivanja.MREZA)
        }
    }

    override suspend fun raspored(token: String): IshodRasporeda = pozovi("get_child_school_timetable", token) {
        protumaciRaspored(it)
    } ?: IshodRasporeda.Neuspesan

    override suspend fun obavestenja(token: String): IshodObavestenja {
        if (url.isBlank() || anonKljuc.isBlank()) return IshodObavestenja.Neuspesan
        return try {
            val telo = klijent.postgrest.rpc(
                "get_child_notifications",
                buildJsonObject {
                    put("p_profile_token", token)
                    put("p_limit", 50)
                },
            ).data
            protumaciObavestenja(telo)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodObavestenja.Neuspesan
        }
    }

    override suspend fun oznaciProcitanim(token: String, ids: List<String>): IshodOznake {
        if (ids.isEmpty() || url.isBlank() || anonKljuc.isBlank()) return IshodOznake.Neuspesan
        return try {
            val telo = klijent.postgrest.rpc(
                "mark_child_notifications_read",
                buildJsonObject {
                    put("p_profile_token", token)
                    put("p_notification_ids", JsonArray(ids.map { JsonPrimitive(it) }))
                },
            ).data
            protumaciOznaku(telo)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodOznake.Neuspesan
        }
    }

    private suspend fun pozovi(
        ime: String,
        token: String,
        protumaci: (String) -> IshodRasporeda,
    ): IshodRasporeda? {
        if (url.isBlank() || anonKljuc.isBlank()) return null
        return try {
            val telo = klijent.postgrest.rpc(
                ime,
                buildJsonObject { put("p_profile_token", token) },
            ).data
            protumaci(telo)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodRasporeda.Neuspesan
        }
    }
}
