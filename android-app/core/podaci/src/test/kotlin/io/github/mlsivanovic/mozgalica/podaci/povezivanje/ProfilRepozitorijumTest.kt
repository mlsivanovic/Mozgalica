package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfilRepozitorijumTest {
    private val token = "s6x6i9AdsRRuadngZOWYI_OEpi95grqI"
    private val profil = SacuvaniProfil("Ana", "🦊", 4, 2, "Iskra")

    @Test
    fun neuspesanOdgovorNeCuvaToken() = runBlocking {
        val tokeni = MemorijaTokena()
        val kes = MemorijaKesa()
        val podesavanja = MemorijaPodesavanja()
        val repo = repo(tokeni, kes, podesavanja) { IshodUcitavanja.NijePronadjen }

        val ishod = repo.povezi("https://primer.test/Mozgalica/#/dete/$token")

        assertTrue(ishod is IshodPovezivanja.Greska)
        assertEquals(PorukePovezivanja.NIJE_PRONADJEN, (ishod as IshodPovezivanja.Greska).poruka)
        assertNull(tokeni.token)
        assertNull(kes.profil.value)
        assertNull(podesavanja.izabrani.value)
    }

    @Test
    fun uspehCuvaTokenKesIIzbor() = runBlocking {
        val tokeni = MemorijaTokena()
        val kes = MemorijaKesa()
        val podesavanja = MemorijaPodesavanja()
        val repo = repo(tokeni, kes, podesavanja) { IshodUcitavanja.Uspesan(profil) }

        val ishod = repo.povezi(token)

        assertEquals(IshodPovezivanja.Povezan("Ana"), ishod)
        assertEquals(token, tokeni.token)
        assertEquals(profil, repo.posmatraj().first())
    }

    @Test
    fun posmatranjeNeZoveMrezu() = runBlocking {
        val kes = MemorijaKesa()
        kes.upisi(profil)
        val podesavanja = MemorijaPodesavanja()
        podesavanja.zapamtiIzabrani()
        val repo = repo(MemorijaTokena(), kes, podesavanja) {
            error("Mreža ne sme da se zove pri čitanju keša.")
        }

        assertEquals(profil, repo.posmatraj().first())
    }

    @Test
    fun promenaBriseTokenIKes() = runBlocking {
        val tokeni = MemorijaTokena()
        val kes = MemorijaKesa()
        val podesavanja = MemorijaPodesavanja()
        val repo = repo(tokeni, kes, podesavanja) { IshodUcitavanja.Uspesan(profil) }
        repo.povezi(token)

        repo.promeniProfil()

        assertNull(tokeni.token)
        assertNull(repo.posmatraj().first())
    }

    @Test
    fun mreznaGreskaPriOsvezavanjuNeBriseKes() = runBlocking {
        val tokeni = MemorijaTokena().apply { this.token = this@ProfilRepozitorijumTest.token }
        val kes = MemorijaKesa()
        kes.upisi(profil)
        val podesavanja = MemorijaPodesavanja()
        podesavanja.zapamtiIzabrani()
        val repo = repo(tokeni, kes, podesavanja) {
            IshodUcitavanja.Neuspesan(PorukePovezivanja.MREZA)
        }

        val ishod = repo.osvezi()

        assertEquals(IshodOsvezavanja.Greska(PorukePovezivanja.MREZA), ishod)
        assertEquals(profil, repo.posmatraj().first())
        assertEquals(token, tokeni.token)
    }

    private fun repo(
        tokeni: MemorijaTokena,
        kes: MemorijaKesa,
        podesavanja: MemorijaPodesavanja,
        izvor: IzvorProfila,
    ) = ProfilRepozitorijum(kes, tokeni, izvor, podesavanja)

    private class MemorijaTokena : SkladisteTokena {
        var token: String? = null
        override suspend fun procitaj(): String? = token
        override suspend fun upisi(token: String) { this.token = token }
        override suspend fun obrisi() { token = null }
    }

    private class MemorijaKesa : KesProfila {
        val profil = MutableStateFlow<SacuvaniProfil?>(null)
        override fun posmatraj(): Flow<SacuvaniProfil?> = profil
        override suspend fun upisi(profil: SacuvaniProfil) { this.profil.value = profil }
        override suspend fun obrisi() { profil.value = null }
    }

    private class MemorijaPodesavanja : PodesavanjaPovezivanja {
        val izabrani = MutableStateFlow<String?>(null)
        override fun izabrani(): Flow<String?> = izabrani
        override suspend fun zapamtiIzabrani() { izabrani.value = PovezivanjeKonstante.IZABRANI_PROFIL }
        override suspend fun zaboravi() { izabrani.value = null }
    }
}
