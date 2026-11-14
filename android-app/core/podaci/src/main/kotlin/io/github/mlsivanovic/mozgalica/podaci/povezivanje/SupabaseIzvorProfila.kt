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
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseIzvorProfila(
    private val url: String,
    private val anonKljuc: String,
) : IzvorProfila {
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
}
