package io.github.mlsivanovic.mozgalica.profil

import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IshodUcitavanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzvorProfila
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.KesProfila
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaPovezivanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PovezivanjeKonstante
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SkladisteTokena
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ProfilViewModelTest {
    @Before
    fun glavniDispecer() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun vratiDispecer() {
        Dispatchers.resetMain()
    }

    @Test
    fun kesSeVidiDokMrezaJosNijeVratilaOdgovor() {
        val profil = SacuvaniProfil("Ana", "🦊", 3, 1, null)
        val kes = object : KesProfila {
            private val stanje = MutableStateFlow<SacuvaniProfil?>(profil)
            override fun posmatraj(): Flow<SacuvaniProfil?> = stanje
            override suspend fun upisi(profil: SacuvaniProfil) { stanje.value = profil }
            override suspend fun obrisi() { stanje.value = null }
        }
        val kapija = CompletableDeferred<Unit>()
        var mrezaKrenula = false
        val repo = ProfilRepozitorijum(
            kes = kes,
            tokeni = object : SkladisteTokena {
                override suspend fun procitaj(): String? = "s6x6i9AdsRRuadngZOWYI_OEpi95grqI"
                override suspend fun upisi(token: String) = Unit
                override suspend fun obrisi() = Unit
            },
            izvor = IzvorProfila {
                mrezaKrenula = true
                kapija.await()
                IshodUcitavanja.Uspesan(profil)
            },
            podesavanja = object : PodesavanjaPovezivanja {
                override fun izabrani(): Flow<String?> = MutableStateFlow(PovezivanjeKonstante.IZABRANI_PROFIL)
                override suspend fun zapamtiIzabrani() = Unit
                override suspend fun zaboravi() = Unit
            },
        )

        val model = ProfilViewModel(repo)

        assertTrue(model.stanje.value is UiStanje.Profil)
        assertTrue(mrezaKrenula)
        assertFalse(kapija.isCompleted)
        kapija.complete(Unit)
    }
}
