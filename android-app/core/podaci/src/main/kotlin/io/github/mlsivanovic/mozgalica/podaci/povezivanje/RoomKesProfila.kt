package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Entity(tableName = "profil")
data class ProfilRed(
    @PrimaryKey val kljuc: String,
    val ime: String,
    val avatar: String,
    val ukupnoZvezdica: Int,
    val raspolozivoZvezdica: Int,
    val titula: String?,
)

@Dao
interface ProfilDao {
    @Query("SELECT * FROM profil LIMIT 1")
    fun posmatraj(): Flow<ProfilRed?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upisi(red: ProfilRed)

    @Query("DELETE FROM profil")
    suspend fun obrisi()
}

@Database(entities = [ProfilRed::class], version = 1, exportSchema = false)
abstract class MozgalicaBaza : RoomDatabase() {
    abstract fun profilDao(): ProfilDao
}

class RoomKesProfila(private val dao: ProfilDao) : KesProfila {
    override fun posmatraj(): Flow<SacuvaniProfil?> = dao.posmatraj().map { red ->
        red?.let {
            SacuvaniProfil(
                ime = it.ime,
                avatar = it.avatar,
                ukupnoZvezdica = it.ukupnoZvezdica,
                raspolozivoZvezdica = it.raspolozivoZvezdica,
                titula = it.titula,
            )
        }
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
            ),
        )
    }

    override suspend fun obrisi() {
        dao.obrisi()
    }
}
