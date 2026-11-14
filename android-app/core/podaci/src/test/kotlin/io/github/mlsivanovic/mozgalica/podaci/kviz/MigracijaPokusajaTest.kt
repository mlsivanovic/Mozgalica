package io.github.mlsivanovic.mozgalica.podaci.kviz

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.MIGRACIJA_1_2
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.MIGRACIJA_2_3
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.MozgalicaBaza
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class MigracijaPokusajaTest {
    @Test(timeout = 20_000)
    fun verzija2CuvaProfilIRaspored() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val ime = "migracija-kviz.db"
        context.deleteDatabase(ime)
        val fajl = context.getDatabasePath(ime)
        fajl.parentFile?.mkdirs()
        val sqlite = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(fajl, null)
        sqlite.execSQL(
            "CREATE TABLE `profil` (`kljuc` TEXT NOT NULL, `ime` TEXT NOT NULL, `avatar` TEXT NOT NULL, `ukupnoZvezdica` INTEGER NOT NULL, `raspolozivoZvezdica` INTEGER NOT NULL, `titula` TEXT, `listoviJson` TEXT, PRIMARY KEY(`kljuc`))",
        )
        sqlite.execSQL(
            "CREATE TABLE `snimak` (`kljuc` TEXT NOT NULL, `json` TEXT NOT NULL, PRIMARY KEY(`kljuc`))",
        )
        sqlite.execSQL(
            "INSERT INTO profil (kljuc, ime, avatar, ukupnoZvezdica, raspolozivoZvezdica, titula, listoviJson) VALUES ('aktivan', 'Ana', '🦊', 4, 2, 'Iskra', NULL)",
        )
        sqlite.execSQL("INSERT INTO snimak (kljuc, json) VALUES ('raspored', '{\"postoji\":false}')")
        sqlite.version = 2
        sqlite.close()

        val baza = Room.databaseBuilder(context, MozgalicaBaza::class.java, ime)
            .addMigrations(MIGRACIJA_1_2, MIGRACIJA_2_3)
            .allowMainThreadQueries()
            .build()
        val red = baza.profilDao().posmatraj().first()
        assertEquals("Ana", red?.ime)
        assertEquals(4, red?.ukupnoZvezdica)
        assertEquals("{\"postoji\":false}", baza.snimakDao().procitaj("raspored"))
        baza.pokusajDao().upisi(PokusajRed("kviz", "{}"))
        assertEquals("{}", baza.pokusajDao().procitaj("kviz"))
        baza.close()
        context.deleteDatabase(ime)
        Unit
    }
}
