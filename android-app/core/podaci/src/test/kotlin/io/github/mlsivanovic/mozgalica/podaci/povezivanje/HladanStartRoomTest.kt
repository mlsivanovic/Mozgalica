package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import androidx.room.Room
import io.github.mlsivanovic.mozgalica.podaci.ProfilnaTitula
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class HladanStartRoomTest {
    private val baza = Room.inMemoryDatabaseBuilder(
        ApplicationProvider.getApplicationContext(),
        MozgalicaBaza::class.java,
    ).allowMainThreadQueries().build()

    @After
    fun zatvori() {
        baza.close()
    }

    @Test(timeout = 20_000)
    fun posleSnimanjaHladanStartCitaRoomBezMreze() = runBlocking {
        val kes = RoomKesProfila(baza.profilDao())
        val sacuvan = SacuvaniProfil(
            ime = "Proba Native",
            avatar = "🦊",
            ukupnoZvezdica = 7,
            raspolozivoZvezdica = 6,
            titula = "ShadowNoob Empowered",
            trenutnaTitula = ProfilnaTitula("ShadowNoob Empowered", 5, null),
            sledecaTitula = ProfilnaTitula("ShadowNoob Unbound", 10, null, 3),
        )
        kes.upisi(sacuvan)

        val noviKes = RoomKesProfila(baza.profilDao())
        val repo = ProfilRepozitorijum(
            kes = noviKes,
            tokeni = object : SkladisteTokena {
                override suspend fun procitaj(): String? = null
                override suspend fun upisi(token: String) = Unit
                override suspend fun obrisi() = Unit
            },
            izvor = IzvorProfila { error("Mreža ne sme da se zove pri čitanju keša.") },
            podesavanja = object : PodesavanjaPovezivanja {
                override fun izabrani(): Flow<String?> = flowOf(PovezivanjeKonstante.IZABRANI_PROFIL)
                override suspend fun zapamtiIzabrani() = Unit
                override suspend fun zaboravi() = Unit
            },
        )

        assertEquals(sacuvan, repo.posmatraj().first())
    }
}
