package io.github.mlsivanovic.mozgalica.podaci.kviz

import io.github.mlsivanovic.mozgalica.podaci.CuvanjeOdgovor
import io.github.mlsivanovic.mozgalica.podaci.KvizMetaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.PitanjeZaDete
import io.github.mlsivanovic.mozgalica.podaci.PokusajOdgovor
import io.github.mlsivanovic.mozgalica.podaci.PonovniOdgovor
import io.github.mlsivanovic.mozgalica.podaci.PonovnoPitanje
import io.github.mlsivanovic.mozgalica.podaci.PotvrdaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.RezultatOdgovor
import io.github.mlsivanovic.mozgalica.podaci.SavetOdgovor
import io.github.mlsivanovic.mozgalica.podaci.TajmerOdgovor
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable

@Serializable
enum class FazaKviza { ULAZ, RESAVANJE, CEKA, REZULTAT }

@Serializable
data class SnimakPokusaja(
    val stanje: StanjePokusaja? = null,
    val meta: KvizMetaOdgovor? = null,
    val pitanja: List<PitanjeZaDete> = emptyList(),
    val deadlineAt: String? = null,
    val preostaloProfil: Int? = null,
    val serverOffsetMs: Long = 0,
    val predajaCeka: Boolean = false,
    val checkpointSekunde: Int? = null,
    val objasnjenjaCekaju: Boolean = false,
    val rezultat: RezultatOdgovor? = null,
    val rezultatSkriven: Boolean = false,
    val skriveniAccessMode: String? = null,
    val skriveniProfilToken: String? = null,
    val preostaloSavetaSaServera: Int? = null,
    val faza: FazaKviza = FazaKviza.ULAZ,
    // Ponovni pokušaj netačnih zadataka. Pitanja i odgovori ostaju u Room-u da
    // prežive prekid rada; ishod stiže tek posle submit_retry.
    val ponovnaPitanja: List<PonovnoPitanje> = emptyList(),
    val ponovniOdgovori: Map<String, OdgovorDeteta> = emptyMap(),
    val ponovniIshod: PonovniOdgovor? = null,
    val ponovniZapocet: Boolean = false,
)

interface SkladistePokusaja {
    fun posmatraj(token: String): Flow<SnimakPokusaja?>
    suspend fun procitaj(token: String): SnimakPokusaja?
    suspend fun upisi(token: String, snimak: SnimakPokusaja)
    suspend fun izmeni(token: String, blok: (SnimakPokusaja) -> SnimakPokusaja)
    suspend fun obrisi(token: String)
    suspend fun obrisiSve()
    suspend fun svi(): List<Pair<String, SnimakPokusaja>>
}

sealed interface IshodMeta {
    data class Uspesna(val meta: KvizMetaOdgovor) : IshodMeta
    data class Odbijena(val kod: String?) : IshodMeta
    data object Neuspesna : IshodMeta
}

sealed interface IshodPokusaja {
    data class Uspesan(val pokusaj: PokusajOdgovor) : IshodPokusaja
    data class Odbijen(val kod: String?) : IshodPokusaja
    data object Neuspesan : IshodPokusaja
}

sealed interface IshodCuvanja {
    data class Potvrdeno(val odgovor: CuvanjeOdgovor) : IshodCuvanja
    data class Odbijeno(val kod: String?) : IshodCuvanja
    data object Neuspesno : IshodCuvanja
}

sealed interface IshodTajmera {
    data class Potvrden(val odgovor: TajmerOdgovor) : IshodTajmera
    data class Odbijen(val kod: String?) : IshodTajmera
    data object Neuspesan : IshodTajmera
}

sealed interface IshodSaveta {
    data class Otkljucan(val odgovor: SavetOdgovor) : IshodSaveta
    data class Odbijen(val kod: String?) : IshodSaveta
    data object Neuspesan : IshodSaveta
}

sealed interface IshodPredaje {
    data class Prikazan(val rezultat: RezultatOdgovor) : IshodPredaje
    data class Skriven(
        val accessMode: String?,
        val profileToken: String?,
        val attemptsLeft: Int?,
    ) : IshodPredaje
    data class Odbijena(val kod: String?) : IshodPredaje
    data object Neuspesna : IshodPredaje
}

sealed interface IshodObjasnjenja {
    data class Potvrdeno(val odgovor: PotvrdaOdgovor) : IshodObjasnjenja
    data class Odbijeno(val kod: String?) : IshodObjasnjenja
    data object Neuspesno : IshodObjasnjenja
}

sealed interface IshodPonovnog {
    data class Uspesan(val odgovor: PonovniOdgovor) : IshodPonovnog
    data class Odbijen(val kod: String?) : IshodPonovnog
    data object Neuspesan : IshodPonovnog
}

interface IzvorKviza {
    suspend fun meta(token: String): IshodMeta
    suspend fun zapocni(token: String, ime: String, oznaka: String?): IshodPokusaja
    suspend fun nastavi(attemptToken: String): IshodPokusaja
    suspend fun sacuvaj(attemptToken: String, odgovori: Map<String, OdgovorDeteta>): IshodCuvanja
    suspend fun tajmer(attemptToken: String, sekunde: Int): IshodTajmera
    suspend fun savet(attemptToken: String, pitanjeId: String): IshodSaveta
    suspend fun predaj(attemptToken: String): IshodPredaje
    suspend fun objasnjenja(attemptToken: String): IshodObjasnjenja
    // Edge funkcija pripremi-ponovni generiše nove verzije na serveru i zove start_retry.
    suspend fun pripremiPonovni(attemptToken: String): IshodPonovnog
    suspend fun nastaviPonovni(attemptToken: String): IshodPonovnog
    suspend fun predajPonovni(attemptToken: String, odgovori: Map<String, OdgovorDeteta>): IshodPonovnog
}

enum class IshodReda { Gotovo, CekaVezu, Privremeno }

class KvizPriprema(
    private val izvor: IzvorKviza,
    private val kes: SkladistePokusaja,
) {
    suspend fun kesirajAktivne(tokeni: List<String>) {
        for (token in tokeni) {
            when (val meta = izvor.meta(token)) {
                is IshodMeta.Uspesna -> kes.izmeni(token) { it.copy(meta = meta.meta) }
                else -> Unit
            }
        }
    }
}
