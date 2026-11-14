package io.github.mlsivanovic.mozgalica.podaci

import io.github.jan.supabase.serializer.KotlinXSerializer
import kotlin.reflect.typeOf
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class UgovorTest {
    // Novo polje u odgovoru mora da obori test, da se model ažurira sa serverom.
    private val strogo = Json { ignoreUnknownKeys = false }

    @Test
    fun sviSnimciSeParsiraju() {
        proveri<ProfilOdgovor>("get_child_profile.json")
        proveri<RasporedOdgovor>("get_child_school_timetable.json")
        proveri<ObavestenjaOdgovor>("get_child_notifications.json")
        proveri<OznakaOdgovor>("mark_child_notifications_read.json")
        proveri<KvizMetaOdgovor>("get_quiz_by_token.json")
        proveri<PokusajOdgovor>("start_attempt.json")
        proveri<PokusajOdgovor>("resume_attempt.json")
        proveri<CuvanjeOdgovor>("save_answers.json")
        proveri<TajmerOdgovor>("checkpoint_attempt_timer.json")
        proveri<SavetOdgovor>("use_hint.json")
        proveri<RezultatOdgovor>("submit_attempt.json")
        proveri<PotvrdaOdgovor>("mark_explanations_seen.json")
        proveri<PonovniOdgovor>("start_retry.json")
        proveri<PonovniOdgovor>("resume_retry.json")
        proveri<PonovniOdgovor>("submit_retry.json")
        proveri<ProdavnicaOdgovor>("get_shop.json")
        proveri<KupovinaOdgovor>("purchase_shop_item.json")
        proveri<PushRegistracijaOdgovor>("register_child_push.json")
        proveri<PotvrdaOdgovor>("unregister_child_push.json")
        proveri<PushStatusOdgovor>("get_child_push_status.json")
        proveri<SahStanjeOdgovor>("play_chess_state.json")
    }

    private inline fun <reified T> proveri(ime: String) {
        val telo = ucitaj(ime)
        val strogoDekodiran = strogo.decodeFromString<T>(telo)
        val prekoBiblioteke = KotlinXSerializer().decode<T>(typeOf<T>(), telo)
        assertEquals(strogoDekodiran, prekoBiblioteke)
    }

    @Test
    fun profilIKvizImajuOcekivaniOblik() {
        val profil = strogo.decodeFromString<ProfilOdgovor>(ucitaj("get_child_profile.json"))
        assertTrue(profil.ok)
        assertEquals("Proba Native", profil.name)
        assertEquals(1, profil.activeQuizzes.size)
        assertEquals(1, profil.history.size)
        assertEquals(1, profil.activeChessGames.size)
        assertEquals(1, profil.chessHistory.size)

        val meta = strogo.decodeFromString<KvizMetaOdgovor>(ucitaj("get_quiz_by_token.json"))
        assertEquals(6, meta.questionCount)
        assertEquals("profile", meta.accessMode)

        val pokusaj = strogo.decodeFromString<PokusajOdgovor>(ucitaj("resume_attempt.json"))
        assertEquals(6, pokusaj.questions.size)
        assertEquals(6, pokusaj.savedAnswers.size)
        assertTrue(pokusaj.savedAnswers.values.any { it is OdgovorDeteta.Parovi })
        assertTrue(pokusaj.savedAnswers.values.any { it is OdgovorDeteta.Broj })
        assertTrue(pokusaj.questions.any { it.options is OpcijeJson.Uparivanje })
        assertTrue(pokusaj.questions.any { it.options == null })

        val rezultat = strogo.decodeFromString<RezultatOdgovor>(ucitaj("submit_attempt.json"))
        assertEquals(66.7, rezultat.scorePct, 0.001)
        assertTrue(rezultat.questions.any { it.correct is TacanOdgovor.Tekst })
        assertTrue(rezultat.questions.any { it.correct is TacanOdgovor.Broj })

        val sah = strogo.decodeFromString<SahStanjeOdgovor>(ucitaj("play_chess_state.json"))
        assertEquals("in_progress", sah.status)
        assertEquals(1, sah.moves.size)
        assertTrue(sah.undoAvailable)
    }

    @Test
    fun brojPrihvataCeoIDecimalniZapis() {
        val ceo = strogo.decodeFromString(Omot.serializer(), """{"n":100}""")
        val decimalni = strogo.decodeFromString(Omot.serializer(), """{"n":66.7}""")
        assertEquals(100.0, ceo.n, 0.0)
        assertEquals(66.7, decimalni.n, 0.0)
    }

    @Test
    fun nepoznatoPoljeObaraUgovor() {
        val telo = strogo.parseToJsonElement(ucitaj("save_answers.json")).jsonObject.toMutableMap()
        telo["novoPolje"] = JsonPrimitive(1)
        val greska = runCatching {
            strogo.decodeFromJsonElement(CuvanjeOdgovor.serializer(), JsonObject(telo))
        }.exceptionOrNull()
        assertTrue(greska != null)
    }

    private fun ucitaj(ime: String): String =
        checkNotNull(javaClass.getResourceAsStream("/ugovori/$ime")).bufferedReader().readText()

    @Serializable
    private data class Omot(@Serializable(with = BrojSerializer::class) val n: Double)
}
