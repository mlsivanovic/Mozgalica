package io.github.mlsivanovic.mozgalica.podaci.kviz

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json

private val jsonSnimka = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}

@Entity(tableName = "pokusaj")
data class PokusajRed(
    @PrimaryKey val kvizToken: String,
    val json: String,
)

@Dao
interface PokusajDao {
    @Query("SELECT json FROM pokusaj WHERE kvizToken = :token")
    fun posmatraj(token: String): Flow<String?>

    @Query("SELECT json FROM pokusaj WHERE kvizToken = :token")
    suspend fun procitaj(token: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upisi(red: PokusajRed)

    @Query("DELETE FROM pokusaj WHERE kvizToken = :token")
    suspend fun obrisi(token: String)

    @Query("DELETE FROM pokusaj")
    suspend fun obrisiSve()

    @Query("SELECT * FROM pokusaj")
    suspend fun svi(): List<PokusajRed>
}

class RoomKesPokusaja(private val dao: PokusajDao) : SkladistePokusaja {
    private val brava = Mutex()

    override fun posmatraj(token: String): Flow<SnimakPokusaja?> =
        dao.posmatraj(token).map { tekst -> tekst?.let { dekodiraj(it) } }

    override suspend fun procitaj(token: String): SnimakPokusaja? = brava.withLock {
        dao.procitaj(token)?.let { dekodiraj(it) }
    }

    override suspend fun upisi(token: String, snimak: SnimakPokusaja) {
        brava.withLock { dao.upisi(PokusajRed(token, kodiraj(snimak))) }
    }

    override suspend fun izmeni(token: String, blok: (SnimakPokusaja) -> SnimakPokusaja) {
        brava.withLock {
            val trenutni = dao.procitaj(token)?.let { dekodiraj(it) } ?: SnimakPokusaja()
            dao.upisi(PokusajRed(token, kodiraj(blok(trenutni))))
        }
    }

    override suspend fun obrisi(token: String) {
        brava.withLock { dao.obrisi(token) }
    }

    override suspend fun obrisiSve() {
        brava.withLock { dao.obrisiSve() }
    }

    override suspend fun svi(): List<Pair<String, SnimakPokusaja>> = brava.withLock {
        dao.svi().map { red -> red.kvizToken to (dekodiraj(red.json) ?: SnimakPokusaja()) }
    }

    private fun kodiraj(snimak: SnimakPokusaja): String =
        jsonSnimka.encodeToString(SnimakPokusaja.serializer(), snimak)

    private fun dekodiraj(tekst: String): SnimakPokusaja? =
        runCatching { jsonSnimka.decodeFromString(SnimakPokusaja.serializer(), tekst) }.getOrNull()
}
