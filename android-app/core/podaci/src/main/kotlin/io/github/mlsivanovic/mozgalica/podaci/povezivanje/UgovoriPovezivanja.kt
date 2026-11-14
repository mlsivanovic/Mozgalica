package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import kotlinx.coroutines.flow.Flow

fun interface IzvorProfila {
    suspend fun ucitaj(token: String): IshodUcitavanja
}

sealed interface IshodUcitavanja {
    data class Uspesan(val profil: SacuvaniProfil) : IshodUcitavanja
    data object NijePronadjen : IshodUcitavanja
    data class Odbijen(val poruka: String) : IshodUcitavanja
    data class Neuspesan(val poruka: String) : IshodUcitavanja
}

interface KesProfila {
    fun posmatraj(): Flow<SacuvaniProfil?>
    suspend fun upisi(profil: SacuvaniProfil)
    suspend fun obrisi()
}

interface SkladisteTokena {
    suspend fun procitaj(): String?
    suspend fun upisi(token: String)
    suspend fun obrisi()
}

interface PodesavanjaPovezivanja {
    fun izabrani(): Flow<String?>
    suspend fun zapamtiIzabrani()
    suspend fun zaboravi()
}

sealed interface IshodPovezivanja {
    data class Povezan(val ime: String) : IshodPovezivanja
    data class Greska(val poruka: String) : IshodPovezivanja
}

sealed interface IshodOsvezavanja {
    data object Osvezen : IshodOsvezavanja
    data object NemaTokena : IshodOsvezavanja
    data class ProfilObrisan(val poruka: String) : IshodOsvezavanja
    data class Greska(val poruka: String) : IshodOsvezavanja
}
