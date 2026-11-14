package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.logging.LogLevel
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.PropertyConversionMethod
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.serializer.KotlinXSerializer
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodCuvanja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodObjasnjenja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodPokusaja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodPredaje
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodSaveta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodTajmera
import io.github.mlsivanovic.mozgalica.podaci.kviz.IzvorKviza
import io.github.mlsivanovic.mozgalica.podaci.kviz.parametriCuvanja
import io.github.mlsivanovic.mozgalica.podaci.kviz.parametriMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.parametriNastavka
import io.github.mlsivanovic.mozgalica.podaci.kviz.parametriPocetka
import io.github.mlsivanovic.mozgalica.podaci.kviz.parametriPredaje
import io.github.mlsivanovic.mozgalica.podaci.kviz.parametriSaveta
import io.github.mlsivanovic.mozgalica.podaci.kviz.parametriTajmera
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciCuvanje
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciObjasnjenja
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciPokusaj
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciRezultat
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciSavet
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciTajmer
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
) : IzvorProfila, IzvorSadrzaja, IzvorKviza {
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

    override suspend fun meta(token: String): IshodMeta = pozoviKviz(parametriMeta(token), "get_quiz_by_token", ::protumaciMeta, IshodMeta.Neuspesna)

    override suspend fun zapocni(token: String, ime: String, oznaka: String?): IshodPokusaja =
        pozoviKviz(parametriPocetka(token, ime, oznaka), "start_attempt", ::protumaciPokusaj, IshodPokusaja.Neuspesan)

    override suspend fun nastavi(attemptToken: String): IshodPokusaja =
        pozoviKviz(parametriNastavka(attemptToken), "resume_attempt", ::protumaciPokusaj, IshodPokusaja.Neuspesan)

    override suspend fun sacuvaj(attemptToken: String, odgovori: Map<String, OdgovorDeteta>): IshodCuvanja =
        pozoviKviz(parametriCuvanja(attemptToken, odgovori), "save_answers", ::protumaciCuvanje, IshodCuvanja.Neuspesno)

    override suspend fun tajmer(attemptToken: String, sekunde: Int): IshodTajmera =
        pozoviKviz(parametriTajmera(attemptToken, sekunde), "checkpoint_attempt_timer", ::protumaciTajmer, IshodTajmera.Neuspesan)

    override suspend fun savet(attemptToken: String, pitanjeId: String): IshodSaveta =
        pozoviKviz(parametriSaveta(attemptToken, pitanjeId), "use_hint", ::protumaciSavet, IshodSaveta.Neuspesan)

    override suspend fun predaj(attemptToken: String): IshodPredaje =
        pozoviKviz(parametriPredaje(attemptToken), "submit_attempt", ::protumaciRezultat, IshodPredaje.Neuspesna)

    override suspend fun objasnjenja(attemptToken: String): IshodObjasnjenja =
        pozoviKviz(parametriNastavka(attemptToken), "mark_explanations_seen", ::protumaciObjasnjenja, IshodObjasnjenja.Neuspesno)

    private suspend fun <T> pozoviKviz(
        parametri: kotlinx.serialization.json.JsonObject,
        ime: String,
        protumaci: (String) -> T,
        neuspeh: T,
    ): T {
        if (url.isBlank() || anonKljuc.isBlank()) return neuspeh
        return try {
            val telo = klijent.postgrest.rpc(ime, parametri).data
            protumaci(telo)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            neuspeh
        }
    }
}
