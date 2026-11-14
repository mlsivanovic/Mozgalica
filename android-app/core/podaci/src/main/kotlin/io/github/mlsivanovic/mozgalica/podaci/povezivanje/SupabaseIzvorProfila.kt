package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.functions.functions
import io.github.jan.supabase.logging.LogLevel
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.PropertyConversionMethod
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.serializer.KotlinXSerializer
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodCuvanja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodObjasnjenja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodPonovnog
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
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciPonovni
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciRezultat
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciSavet
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciTajmer
import io.github.mlsivanovic.mozgalica.podaci.prodavnica.IshodKupovine
import io.github.mlsivanovic.mozgalica.podaci.prodavnica.IshodProdavnice
import io.github.mlsivanovic.mozgalica.podaci.prodavnica.IzvorProdavnice
import io.github.mlsivanovic.mozgalica.podaci.prodavnica.protumaciKupovinu
import io.github.mlsivanovic.mozgalica.podaci.prodavnica.protumaciProdavnicu
import io.github.mlsivanovic.mozgalica.podaci.sah.IshodSaha
import io.github.mlsivanovic.mozgalica.podaci.sah.IzvorSaha
import io.github.mlsivanovic.mozgalica.podaci.sah.SahAkcija
import io.github.mlsivanovic.mozgalica.podaci.sah.SahPotezUnos
import io.github.mlsivanovic.mozgalica.podaci.sah.protumaciSah
import io.github.mlsivanovic.mozgalica.podaci.sah.sahZahtev
import io.ktor.client.statement.bodyAsText
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SupabaseIzvorProfila(
    private val url: String,
    private val anonKljuc: String,
) : IzvorProfila, IzvorSadrzaja, IzvorKviza, IzvorSaha, IzvorProdavnice {
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
            install(Functions)
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

    override suspend fun pripremiPonovni(attemptToken: String): IshodPonovnog {
        if (url.isBlank() || anonKljuc.isBlank()) return IshodPonovnog.Neuspesan
        return try {
            val odgovor = klijent.functions.invoke(
                function = "pripremi-ponovni",
                body = buildJsonObject { put("attemptToken", attemptToken) },
            )
            protumaciPonovni(odgovor.bodyAsText())
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodPonovnog.Neuspesan
        }
    }

    override suspend fun nastaviPonovni(attemptToken: String): IshodPonovnog =
        pozoviKviz(parametriNastavka(attemptToken), "resume_retry", ::protumaciPonovni, IshodPonovnog.Neuspesan)

    override suspend fun predajPonovni(attemptToken: String, odgovori: Map<String, OdgovorDeteta>): IshodPonovnog =
        pozoviKviz(parametriCuvanja(attemptToken, odgovori), "submit_retry", ::protumaciPonovni, IshodPonovnog.Neuspesan)

    override suspend fun stanje(playToken: String): IshodSaha = pozoviSah(sahZahtev(playToken, SahAkcija.STANJE))

    override suspend fun akcija(
        playToken: String,
        akcija: SahAkcija,
        expectedRevision: Int,
        potez: SahPotezUnos?,
        requestId: String,
        elo: Int?,
    ): IshodSaha = pozoviSah(
        sahZahtev(playToken, akcija, expectedRevision, potez, requestId, elo),
    )

    override suspend fun prodavnica(profileToken: String): IshodProdavnice {
        if (url.isBlank() || anonKljuc.isBlank()) return IshodProdavnice.Neuspesna
        return try {
            val telo = klijent.postgrest.rpc(
                "get_shop",
                buildJsonObject { put("p_profile_token", profileToken) },
            ).data
            protumaciProdavnicu(telo)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodProdavnice.Neuspesna
        }
    }

    override suspend fun kupi(profileToken: String, itemId: String): IshodKupovine {
        if (url.isBlank() || anonKljuc.isBlank()) return IshodKupovine.Neuspesna
        return try {
            val telo = klijent.postgrest.rpc(
                "purchase_shop_item",
                buildJsonObject {
                    put("p_profile_token", profileToken)
                    put("p_item_id", itemId)
                },
            ).data
            protumaciKupovinu(telo)
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodKupovine.Neuspesna
        }
    }

    private suspend fun pozoviSah(telo: JsonObject): IshodSaha {
        if (url.isBlank() || anonKljuc.isBlank()) return IshodSaha.Neuspesan
        return try {
            val odgovor = klijent.functions.invoke(
                function = "play-chess",
                body = telo,
            )
            protumaciSah(odgovor.bodyAsText())
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            IshodSaha.Neuspesan
        }
    }

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
