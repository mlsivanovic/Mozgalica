package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import io.github.mlsivanovic.mozgalica.podaci.AktivnaPartija
import io.github.mlsivanovic.mozgalica.podaci.AktivniKviz
import io.github.mlsivanovic.mozgalica.podaci.IstorijaKviza
import io.github.mlsivanovic.mozgalica.podaci.IstorijaPartije
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private val kesJson = Json { ignoreUnknownKeys = true }

@Serializable
private data class SnimakListova(
    val aktivniKvizovi: List<AktivniKviz> = emptyList(),
    val aktivnePartije: List<AktivnaPartija> = emptyList(),
    val istorijaKvizova: List<IstorijaKviza> = emptyList(),
    val istorijaSaha: List<IstorijaPartije> = emptyList(),
)

@Entity(tableName = "profil")
data class ProfilRed(
    @PrimaryKey val kljuc: String,
    val ime: String,
    val avatar: String,
    val ukupnoZvezdica: Int,
    val raspolozivoZvezdica: Int,
    val titula: String?,
    val listoviJson: String? = null,
)

@Entity(tableName = "snimak")
data class SnimakRed(
    @PrimaryKey val kljuc: String,
    val json: String,
)

val MIGRACIJA_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE profil ADD COLUMN listoviJson TEXT")
        db.execSQL(
            "CREATE TABLE IF NOT EXISTS `snimak` (`kljuc` TEXT NOT NULL, `json` TEXT NOT NULL, PRIMARY KEY(`kljuc`))",
        )
    }
}

@Dao
interface ProfilDao {
    @Query("SELECT * FROM profil LIMIT 1")
    fun posmatraj(): Flow<ProfilRed?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upisi(red: ProfilRed)

    @Query("DELETE FROM profil")
    suspend fun obrisi()
}

@Database(entities = [ProfilRed::class, SnimakRed::class], version = 2, exportSchema = false)
abstract class MozgalicaBaza : RoomDatabase() {
    abstract fun profilDao(): ProfilDao
    abstract fun snimakDao(): SnimakDao
}

@Dao
interface SnimakDao {
    @Query("SELECT json FROM snimak WHERE kljuc = :kljuc")
    fun posmatraj(kljuc: String): Flow<String?>

    @Query("SELECT json FROM snimak WHERE kljuc = :kljuc")
    suspend fun procitaj(kljuc: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upisi(red: SnimakRed)

    @Query("DELETE FROM snimak")
    suspend fun obrisiSve()
}

class RoomKesProfila(private val dao: ProfilDao) : KesProfila {
    override fun posmatraj(): Flow<SacuvaniProfil?> = dao.posmatraj().map { red ->
        red?.let { izReda(it) }
    }

    override suspend fun upisi(profil: SacuvaniProfil) {
        dao.upisi(
            ProfilRed(
                kljuc = PovezivanjeKonstante.IZABRANI_PROFIL,
                ime = profil.ime,
                avatar = profil.avatar,
                ukupnoZvezdica = profil.ukupnoZvezdica,
                raspolozivoZvezdica = profil.raspolozivoZvezdica,
                titula = profil.titula,
                listoviJson = kesJson.encodeToString(
                    SnimakListova.serializer(),
                    SnimakListova(
                        aktivniKvizovi = profil.aktivniKvizovi,
                        aktivnePartije = profil.aktivnePartije,
                        istorijaKvizova = profil.istorijaKvizova,
                        istorijaSaha = profil.istorijaSaha,
                    ),
                ),
            ),
        )
    }

    override suspend fun obrisi() {
        dao.obrisi()
    }
}

private fun izReda(red: ProfilRed): SacuvaniProfil {
    val listovi = red.listoviJson?.let {
        runCatching { kesJson.decodeFromString(SnimakListova.serializer(), it) }.getOrNull()
    } ?: SnimakListova()
    return SacuvaniProfil(
        ime = red.ime,
        avatar = red.avatar,
        ukupnoZvezdica = red.ukupnoZvezdica,
        raspolozivoZvezdica = red.raspolozivoZvezdica,
        titula = red.titula,
        aktivniKvizovi = listovi.aktivniKvizovi,
        aktivnePartije = listovi.aktivnePartije,
        istorijaKvizova = listovi.istorijaKvizova,
        istorijaSaha = listovi.istorijaSaha,
    )
}
