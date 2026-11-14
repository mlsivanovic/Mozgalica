package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.ObavestenjeDeteta
import kotlinx.coroutines.flow.Flow

interface IzvorSadrzaja {
    suspend fun raspored(token: String): IshodRasporeda
    suspend fun obavestenja(token: String): IshodObavestenja
    suspend fun oznaciProcitanim(token: String, ids: List<String>): IshodOznake
}

sealed interface IshodRasporeda {
    data class Postoji(val raspored: SacuvaniRaspored) : IshodRasporeda
    data object Nema : IshodRasporeda
    data object NijePronadjen : IshodRasporeda
    data object Odbijen : IshodRasporeda
    data object Neuspesan : IshodRasporeda
}

sealed interface IshodObavestenja {
    data class Uspesna(val stavke: List<SacuvanoObavestenje>) : IshodObavestenja
    data object NijePronadjen : IshodObavestenja
    data object Neuspesan : IshodObavestenja
}

sealed interface IshodOznake {
    data object Uspesno : IshodOznake
    data object Neuspesan : IshodOznake
}

interface KesSadrzaja {
    fun raspored(): Flow<SacuvaniRaspored?>
    fun obavestenja(): Flow<SacuvanaObavestenja>
    suspend fun upisiRaspored(raspored: SacuvaniRaspored)
    suspend fun zameniObavestenja(stavke: List<SacuvanoObavestenje>)
    suspend fun oznaciLokalno(ids: List<String>?): List<String>
    suspend fun spojiSaServerom(server: List<ObavestenjeDeteta>)
    suspend fun potvrdi(ids: List<String>)
    suspend fun cekajuci(): List<String>
    suspend fun obrisi()
}

data class IshodSnimka(
    val uspeo: Boolean,
    val bezTokena: Boolean,
)

interface PodesavanjaAplikacije {
    fun stanje(): Flow<StanjePodesavanja>
    suspend fun postaviTemu(tema: IzborTeme)
    suspend fun postaviZvuk(ukljucen: Boolean)
    suspend fun postaviHaptiku(ukljucena: Boolean)
    fun probniPrikaz(): Flow<Boolean>
    suspend fun postaviProbniPrikaz(ukljucen: Boolean, bezTokena: Boolean = false)
    suspend fun probniJeBezTokena(): Boolean
}
