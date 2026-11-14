package io.github.mlsivanovic.mozgalica.nagrade

import io.github.mlsivanovic.mozgalica.podaci.ProfilnaTitula
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TituleTest {
    @Test
    fun sveFabrickeTituleSePrepoznaju() {
        val imena = listOf(
            "ShadowNoob", "StarScout", "SolarKnight", "CosmicPaladin",
            "VortexChampion", "GalacticTitan", "SupernovaDragon", "CelestialPhoenix",
        )
        imena.forEach { ime ->
            val deo = parsirajTitulu("$ime Empowered")
            assertEquals(ime, deo.osnova)
            assertEquals(RangTitule.EMPOWERED, deo.rang)
            assertEquals(ime.lowercase(), prepoznajFabrickuTitulu(deo.osnova)?.kljuc)
            assertEquals(ime.lowercase(), prepoznajFabrickuTitulu(ime)?.kljuc)
        }
    }

    @Test
    fun rangBezSufiksaJeAwakened() {
        assertEquals(RangTitule.AWAKENED, parsirajTitulu("ShadowNoob").rang)
        assertEquals("ShadowNoob", parsirajTitulu("ShadowNoob").osnova)
        assertEquals(RangTitule.UNBOUND, parsirajTitulu("ShadowNoob Unbound").rang)
    }

    @Test
    fun nepoznataTitulaDobijaGenerickuPaletu() {
        assertNull(prepoznajFabrickuTitulu("Neka Nova Titula"))
        assertEquals(paletaZa(null), paletaZa(prepoznajFabrickuTitulu("Neka Nova Titula")))
    }

    @Test
    fun napredakJeIzmedjuPragova() {
        val sada = ProfilnaTitula("ShadowNoob Empowered", 5, null)
        val sledeca = ProfilnaTitula("ShadowNoob Unbound", 10, null, 3)
        assertEquals(60, napredakTitule(8, sada, sledeca))
        assertEquals(0, napredakTitule(5, sada, sledeca))
        assertEquals(100, napredakTitule(10, sada, sledeca))
        assertEquals(100, napredakTitule(5, sada, null))
    }
}
