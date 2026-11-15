package io.github.mlsivanovic.mozgalica.profil

import io.github.mlsivanovic.mozgalica.podaci.IstorijaKviza
import io.github.mlsivanovic.mozgalica.podaci.IstorijaPartije
import java.time.Instant
import java.time.ZoneOffset
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FilterRezultataTest {
    private val sada = Instant.parse("2026-11-15T12:00:00Z")

    private fun kviz(id: String, kada: String, pct: Double, zvezdice: Int = 3, ceka: Boolean = false) =
        IstorijaKviza(id, "Kviz $id", kada, pct, zvezdice, ceka)

    private fun partija(id: String, kada: String, ishod: String, zvezdice: Int = 2) =
        IstorijaPartije(id, "t$id", 900, "white", ishod, "checkmate", zvezdice, kada)

    private val kvizovi = listOf(
        kviz("a", "2026-11-14T10:00:00+00:00", 90.0),
        kviz("b", "2026-10-01T10:00:00+00:00", 50.0),
        kviz("c", "2026-11-15T08:00:00+00:00", 0.0, ceka = true),
    )
    private val partije = listOf(
        partija("x", "2026-11-13T10:00:00+00:00", "child_win"),
        partija("y", "2026-11-10T10:00:00+00:00", "child_loss"),
        partija("z", "2026-09-10T10:00:00+00:00", "draw"),
    )

    @Test
    fun podrazumevanoSpajaISortiraOdNajnovijeg() {
        val r = filtrirajRezultate(kvizovi, partije, FilterRezultata(), sada)
        assertEquals(listOf("k-c", "k-a", "s-x", "s-y", "k-b", "s-z"), r.map { it.kljuc })
    }

    @Test
    fun vrstaIIshod() {
        val samoKvizovi = filtrirajRezultate(kvizovi, partije, FilterRezultata(vrsta = VrstaRezultata.KVIZ), sada)
        assertEquals(3, samoKvizovi.size)
        val pobede = filtrirajRezultate(
            kvizovi, partije,
            FilterRezultata(vrsta = VrstaRezultata.SAH, ishod = IshodRezultata.POBEDA),
            sada,
        )
        assertEquals(listOf("s-x"), pobede.map { it.kljuc })
    }

    @Test
    fun periodOdsecaStarije() {
        val r = filtrirajRezultate(kvizovi, partije, FilterRezultata(period = PeriodRezultata.NEDELJA), sada)
        assertEquals(listOf("k-c", "k-a", "s-x", "s-y"), r.map { it.kljuc })
    }

    @Test
    fun najboljiRezultatStavljaNaCekanjuNaKraj() {
        val r = filtrirajRezultate(kvizovi, partije, FilterRezultata(sortiranje = SortiranjeRezultata.NAJBOLJE), sada)
        assertEquals("s-x", r.first().kljuc)
        assertEquals("k-c", r.last().kljuc)
    }

    @Test
    fun sazetakIgnoriseKvizNaPregledu() {
        val s = sazetakRezultata(filtrirajRezultate(kvizovi, partije, FilterRezultata(), sada))
        assertEquals(6, s.broj)
        assertEquals(70.0, s.prosekKviza!!, 0.001)
        assertEquals(1, s.pobede)
        assertEquals(1, s.remiji)
        assertEquals(1, s.porazi)
        assertNull(sazetakRezultata(emptyList()).prosekKviza)
    }

    @Test
    fun grupeDatuma() {
        val z = ZoneOffset.UTC
        assertEquals("Danas", grupaDatuma(Instant.parse("2026-11-15T01:00:00Z"), sada, z))
        assertEquals("Juče", grupaDatuma(Instant.parse("2026-11-14T23:00:00Z"), sada, z))
        assertEquals("Ove nedelje", grupaDatuma(Instant.parse("2026-11-10T10:00:00Z"), sada, z))
        assertEquals("1. oktobar", grupaDatuma(Instant.parse("2026-10-01T10:00:00Z"), sada, z))
        assertEquals("3. mart 2025.", grupaDatuma(Instant.parse("2025-03-03T10:00:00Z"), sada, z))
    }
}
