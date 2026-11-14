package io.github.mlsivanovic.mozgalica.profil

import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IshodUcitavanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzborTeme
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzvorProfila
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.KesProfila
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaAplikacije
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaPovezivanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PovezivanjeKonstante
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SkladisteTokena
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.StanjePodesavanja
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

        val model = ProfilViewModel(repo, LaznaPodesavanja())

        assertTrue(model.stanje.value is UiStanje.Profil)
        assertTrue(mrezaKrenula)
        assertFalse(kapija.isCompleted)
        kapija.complete(Unit)
    }
}

private class LaznaPodesavanja : PodesavanjaAplikacije {
    private val stanje = MutableStateFlow(StanjePodesavanja())
    private val probni = MutableStateFlow(false)
    override fun stanje(): Flow<StanjePodesavanja> = stanje
    override suspend fun postaviTemu(tema: IzborTeme) { stanje.value = stanje.value.copy(tema = tema) }
    override suspend fun postaviZvuk(ukljucen: Boolean) { stanje.value = stanje.value.copy(zvuk = ukljucen) }
    override suspend fun postaviHaptiku(ukljucena: Boolean) { stanje.value = stanje.value.copy(haptika = ukljucena) }
    override fun probniPrikaz(): Flow<Boolean> = probni
    override suspend fun postaviProbniPrikaz(ukljucen: Boolean, bezTokena: Boolean) { probni.value = ukljucen }
    override suspend fun probniJeBezTokena(): Boolean = false
}
