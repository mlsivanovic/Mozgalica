package io.github.mlsivanovic.mozgalica.podaci.kviz

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.RezultatOdgovor
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.MozgalicaBaza
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class RedPredajeTest {
    @Test(timeout = 20_000)
    fun offlineNeZoveMrezuAPovratakSaljeSavePaSubmit() = runBlocking {
        val baza = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            MozgalicaBaza::class.java,
        ).allowMainThreadQueries().build()
        val kes = RoomKesPokusaja(baza.pokusajDao())
        val mreza = BrojacaMreza()
        var naMrezi = false
        val red = KvizSinhronizacija(kes, mreza, veza = { naMrezi }, sat = { 1_000 })
        var stanje = StanjePokusaja(attemptToken = "pokusaj", childName = "Proba", accessMode = "profile")
        stanje = upisiOdgovorCisto(stanje, "q1", OdgovorDeteta.Jedan("a"), sada = 10)
        stanje = upisiOdgovorCisto(stanje, "q3", OdgovorDeteta.Broj("12"), sada = 20)
        kes.upisi("kviz", SnimakPokusaja(stanje = stanje, predajaCeka = true, faza = FazaKviza.CEKA))

        assertEquals(IshodReda.CekaVezu, red.izvrsi("kviz"))
        assertTrue(mreza.pozivi.isEmpty())
        val offline = kes.procitaj("kviz")
        assertEquals(false, offline?.stanje?.answers?.get("q1")?.synced)
        assertEquals(true, offline?.predajaCeka)
        assertNull(offline?.rezultat)

        naMrezi = true
        assertEquals(IshodReda.Gotovo, red.izvrsi("kviz"))
        assertEquals(listOf("save_answers", "submit_attempt"), mreza.pozivi)
        assertTrue(mreza.predajaJeNull)
        val snimak = kes.procitaj("kviz")
        val ocekivano = Json { ignoreUnknownKeys = false }.decodeFromString(
            RezultatOdgovor.serializer(),
            ucitaj("submit_attempt.json"),
        )
        assertEquals(ocekivano, snimak?.rezultat)
        assertEquals(66.7, snimak?.rezultat?.scorePct ?: 0.0, 0.001)
        assertEquals(1, snimak?.rezultat?.starsAwarded)
        assertEquals(false, snimak?.predajaCeka)
        assertTrue(snimak?.stanje?.answers?.values?.all { it.synced } == true)
        baza.close()
    }

    @Test
    fun predajaNeSaljeOdgovoreAPrikazNeRacunaOcenu() {
        val parametri = parametriPredaje("t")
        assertEquals(JsonNull, parametri["p_answers"])
        val cuvanje = parametriCuvanja("t", mapOf("q1" to OdgovorDeteta.Broj("12")))
        assertTrue(cuvanje["p_answers"].toString().contains("12"))
        assertFalse(cuvanje["p_answers"].toString().contains("correct"))

        val telo = ucitaj("submit_attempt.json")
        val rezultat = (protumaciRezultat(telo) as IshodPredaje.Prikazan).rezultat
        assertEquals(66.7, prikazaniProcenat(rezultat), 0.001)
        assertEquals(1, prikazaneZvezdice(rezultat))
        assertTrue(prikazujeOcenu(rezultat))
        assertEquals(false, prikazujeOcenu(rezultat.copy(pendingReview = true)))
        assertEquals("66.7%", formatProcenat(rezultat.scorePct))
        val numeric = rezultat.questions.first { it.type == "numeric" }
        assertEquals("12", tekstTacnog(numeric))
        assertTrue(numeric.isCorrect)
    }

    @Test
    fun skriveniRezultatNemaIzmisjenuOcenu() {
        val telo = """{"ok":true,"showResult":false,"accessMode":"generic","attemptsLeft":2}"""
        val ishod = protumaciRezultat(telo) as IshodPredaje.Skriven
        assertEquals("generic", ishod.accessMode)
        assertEquals(2, ishod.attemptsLeft)
    }

    @Test
    fun pripremaNeZoveStartAttempt() = runBlocking {
        var metaPozivi = 0
        var startPozivi = 0
        val kes = MemorijaPokusaja()
        val izvor = object : IzvorKviza by PrazanIzvor() {
            override suspend fun meta(token: String): IshodMeta {
                metaPozivi += 1
                return protumaciMeta(ucitaj("get_quiz_by_token.json"))
            }

            override suspend fun zapocni(token: String, ime: String, oznaka: String?): IshodPokusaja {
                startPozivi += 1
                error("start_attempt")
            }
        }
        KvizPriprema(izvor, kes).kesirajAktivne(listOf("nativeugovorkviz00000002"))
        assertEquals(1, metaPozivi)
        assertEquals(0, startPozivi)
        assertEquals("Matematika — Proba Native", kes.procitaj("nativeugovorkviz00000002")?.meta?.title)
    }
}

private class BrojacaMreza : IzvorKviza by PrazanIzvor() {
    val pozivi = mutableListOf<String>()
    var predajaJeNull = false
    override suspend fun sacuvaj(attemptToken: String, odgovori: Map<String, OdgovorDeteta>): IshodCuvanja {
        pozivi += "save_answers"
        return protumaciCuvanje(ucitaj("save_answers.json"))
    }

    override suspend fun predaj(attemptToken: String): IshodPredaje {
        pozivi += "submit_attempt"
        predajaJeNull = parametriPredaje(attemptToken)["p_answers"] is JsonNull
        return protumaciRezultat(ucitaj("submit_attempt.json"))
    }
}

private open class PrazanIzvor : IzvorKviza {
    override suspend fun meta(token: String) = IshodMeta.Neuspesna
    override suspend fun zapocni(token: String, ime: String, oznaka: String?) = IshodPokusaja.Neuspesan
    override suspend fun nastavi(attemptToken: String) = IshodPokusaja.Neuspesan
    override suspend fun sacuvaj(attemptToken: String, odgovori: Map<String, OdgovorDeteta>) = IshodCuvanja.Neuspesno
    override suspend fun tajmer(attemptToken: String, sekunde: Int) = IshodTajmera.Neuspesan
    override suspend fun savet(attemptToken: String, pitanjeId: String) = IshodSaveta.Neuspesan
    override suspend fun predaj(attemptToken: String) = IshodPredaje.Neuspesna
    override suspend fun objasnjenja(attemptToken: String) = IshodObjasnjenja.Neuspesno
}

private class MemorijaPokusaja : SkladistePokusaja {
    private val mapa = HashMap<String, SnimakPokusaja>()
    private val tok = MutableStateFlow<SnimakPokusaja?>(null)
    override fun posmatraj(token: String): Flow<SnimakPokusaja?> = tok
    override suspend fun procitaj(token: String) = mapa[token]
    override suspend fun upisi(token: String, snimak: SnimakPokusaja) { mapa[token] = snimak }
    override suspend fun izmeni(token: String, blok: (SnimakPokusaja) -> SnimakPokusaja) {
        mapa[token] = blok(mapa[token] ?: SnimakPokusaja())
    }
    override suspend fun obrisi(token: String) { mapa.remove(token) }
    override suspend fun obrisiSve() { mapa.clear() }
    override suspend fun svi() = mapa.map { it.key to it.value }
}

private fun ucitaj(ime: String): String =
    checkNotNull(RedPredajeTest::class.java.getResourceAsStream("/ugovori/$ime")).bufferedReader().readText()
