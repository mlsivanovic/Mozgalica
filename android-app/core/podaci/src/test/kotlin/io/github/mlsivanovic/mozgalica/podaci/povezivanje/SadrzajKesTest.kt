package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class SadrzajKesTest {
    private val baza = Room.inMemoryDatabaseBuilder(
        ApplicationProvider.getApplicationContext(),
        MozgalicaBaza::class.java,
    ).allowMainThreadQueries().build()

    @After
    fun zatvori() {
        baza.close()
    }

    @Test(timeout = 20_000)
    fun posleUpisaSnimkaCitaRasporedRezultateIObavestenjaBezMreze() = runBlocking {
        val podesavanja = MemorijaIzbora()
        val upisni = repo(podesavanja = podesavanja, mrezaBaca = true)
        val upis = upisni.napuniIzSnimka(ugovor("get_child_profile.json"), ugovor("get_child_school_timetable.json"), ugovor("get_child_notifications.json"))
        assertTrue(upis.uspeo)

        val citanje = repo(podesavanja = podesavanja, mrezaBaca = true)
        val profil = citanje.posmatraj().first()
        val raspored = citanje.posmatrajRaspored().first()
        val obavestenja = citanje.posmatrajObavestenja().first()

        assertEquals("Proba Native", profil?.ime)
        assertEquals("Matematika — Proba Native", profil?.istorijaKvizova?.single()?.title)
        assertEquals(66.7, profil?.istorijaKvizova?.single()?.scorePct ?: 0.0, 0.001)
        assertEquals("child_win", profil?.istorijaSaha?.single()?.result)
        assertEquals("Matematika", raspored?.danas?.lessons?.single()?.subject)
        assertEquals("08:00", raspored?.danas?.lessons?.single()?.startsAt)
        assertEquals("#4F46E5", raspored?.danas?.lessons?.single()?.color)
        assertEquals("morning", raspored?.smenaNedelje)
        assertTrue(raspored?.sutra?.isBreak == true)
        assertEquals(4, obavestenja.neprocitano)
        assertEquals("Novi kviz: Matematika — Proba Native", obavestenja.stavke.first().title)
    }

    @Test(timeout = 20_000)
    fun procitanoOstajeLokalnoKadServerPadne() = runBlocking {
        val tokeni = MemorijaTokena("token")
        val podesavanja = MemorijaIzbora()
        val izvorSadrzaja = PadajuciIzvor()
        val repo = repo(tokeni, podesavanja, izvorSadrzaja, mrezaBaca = false)
        repo.napuniIzSnimka(ugovor("get_child_profile.json"), ugovor("get_child_school_timetable.json"), ugovor("get_child_notifications.json"))
        val id = "db477fb4-91ec-42b3-9425-f3782c8a3d18"

        repo.oznaciProcitanim(listOf(id))

        val posleOznake = repo.posmatrajObavestenja().first()
        assertEquals(3, posleOznake.neprocitano)
        assertTrue(posleOznake.stavke.single { it.id == id }.readAt != null)
        assertEquals(1, izvorSadrzaja.oznake)

        val ishod = repo.osvezi()
        assertEquals(IshodOsvezavanja.Osvezen, ishod)
        val posleOsvezavanja = repo.posmatrajObavestenja().first()
        assertTrue(posleOsvezavanja.stavke.single { it.id == id }.readAt != null)
        assertTrue(izvorSadrzaja.oznake >= 2)
        assertEquals("Matematika", repo.posmatrajRaspored().first()?.danas?.lessons?.single()?.subject)
    }

    private fun repo(
        tokeni: MemorijaTokena = MemorijaTokena(null),
        podesavanja: MemorijaIzbora = MemorijaIzbora(),
        izvorSadrzaja: IzvorSadrzaja = object : IzvorSadrzaja {
            override suspend fun raspored(token: String) = error("Mreža ne sme da se zove pri čitanju keša.")
            override suspend fun obavestenja(token: String) = error("Mreža ne sme da se zove pri čitanju keša.")
            override suspend fun oznaciProcitanim(token: String, ids: List<String>) = error("Mreža ne sme da se zove pri čitanju keša.")
        },
        mrezaBaca: Boolean,
    ) = ProfilRepozitorijum(
        kes = RoomKesProfila(baza.profilDao()),
        tokeni = tokeni,
        izvor = IzvorProfila {
            if (mrezaBaca) error("Mreža ne sme da se zove pri čitanju keša.")
            IshodUcitavanja.Uspesan(
                SacuvaniProfil("Proba Native", "🦊", 7, 6, "ShadowNoob Empowered"),
            )
        },
        podesavanja = podesavanja,
        kesSadrzaja = RoomKesSadrzaja(baza.snimakDao()),
        izvorSadrzaja = izvorSadrzaja,
    )

    private class PadajuciIzvor : IzvorSadrzaja {
        var oznake = 0
        override suspend fun raspored(token: String) = IshodRasporeda.Neuspesan
        override suspend fun obavestenja(token: String): IshodObavestenja {
            val telo = ugovor("get_child_notifications.json")
            return protumaciObavestenja(telo)
        }
        override suspend fun oznaciProcitanim(token: String, ids: List<String>): IshodOznake {
            oznake += 1
            return IshodOznake.Neuspesan
        }
    }

    private class MemorijaTokena(var token: String?) : SkladisteTokena {
        override suspend fun procitaj(): String? = token
        override suspend fun upisi(token: String) { this.token = token }
        override suspend fun obrisi() { token = null }
    }

    private class MemorijaIzbora : PodesavanjaPovezivanja {
        val izabrani = MutableStateFlow<String?>(null)
        override fun izabrani(): Flow<String?> = izabrani
        override suspend fun zapamtiIzabrani() { izabrani.value = PovezivanjeKonstante.IZABRANI_PROFIL }
        override suspend fun zaboravi() { izabrani.value = null }
    }
}

private fun ugovor(ime: String): String =
    checkNotNull(SadrzajKesTest::class.java.getResourceAsStream("/ugovori/$ime"))
        .bufferedReader()
        .readText()

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class TemaDataStoreTest {
    private val podesavanja = DataStorePodesavanja(ApplicationProvider.getApplicationContext())

    @After
    fun ocisti() = runBlocking {
        podesavanja.postaviTemu(IzborTeme.SISTEM)
        podesavanja.postaviZvuk(true)
        podesavanja.postaviHaptiku(true)
        podesavanja.postaviProbniPrikaz(false)
    }

    @Test(timeout = 20_000)
    fun temaSeCitaIzDataStore() = runBlocking {
        assertEquals(IzborTeme.SISTEM, podesavanja.stanje().first().tema)
        assertTrue(podesavanja.stanje().first().zvuk)
        assertTrue(podesavanja.stanje().first().haptika)

        podesavanja.postaviTemu(IzborTeme.TAMNA)
        podesavanja.postaviZvuk(false)

        val ponovo = DataStorePodesavanja(ApplicationProvider.getApplicationContext())
        assertEquals(IzborTeme.TAMNA, ponovo.stanje().first().tema)
        assertEquals(false, ponovo.stanje().first().zvuk)
        assertTrue(StanjePodesavanja(tema = IzborTeme.TAMNA).jeTamna(sistemTamna = false))
        assertFalse(StanjePodesavanja(tema = IzborTeme.SVETLA).jeTamna(sistemTamna = true))
        assertTrue(StanjePodesavanja().jeTamna(sistemTamna = true))
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], manifest = Config.NONE)
class MigracijaKesTest {
    @Test(timeout = 20_000)
    fun stariProfilOstajeIDobijaSnimak() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val ime = "migracija-kes.db"
        context.deleteDatabase(ime)
        val fajl = context.getDatabasePath(ime)
        fajl.parentFile?.mkdirs()
        val sqlite = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(fajl, null)
        sqlite.execSQL(
            """
            CREATE TABLE IF NOT EXISTS `profil` (
                `kljuc` TEXT NOT NULL,
                `ime` TEXT NOT NULL,
                `avatar` TEXT NOT NULL,
                `ukupnoZvezdica` INTEGER NOT NULL,
                `raspolozivoZvezdica` INTEGER NOT NULL,
                `titula` TEXT,
                PRIMARY KEY(`kljuc`)
            )
            """.trimIndent(),
        )
        sqlite.execSQL(
            "INSERT INTO profil (kljuc, ime, avatar, ukupnoZvezdica, raspolozivoZvezdica, titula) VALUES ('aktivan', 'Ana', '🦊', 3, 1, 'Iskra')",
        )
        sqlite.version = 1
        sqlite.close()

        val baza = Room.databaseBuilder(context, MozgalicaBaza::class.java, ime)
            .addMigrations(MIGRACIJA_1_2)
            .allowMainThreadQueries()
            .build()
        val profil = RoomKesProfila(baza.profilDao()).posmatraj().first()
        assertEquals("Ana", profil?.ime)
        assertEquals(3, profil?.ukupnoZvezdica)
        assertEquals("Iskra", profil?.titula)
        assertTrue(profil?.aktivniKvizovi?.isEmpty() == true)
        RoomKesSadrzaja(baza.snimakDao()).upisiRaspored(SacuvaniRaspored.NEMA)
        assertEquals(false, RoomKesSadrzaja(baza.snimakDao()).raspored().first()?.postoji)
        baza.close()
        context.deleteDatabase(ime)
        Unit
    }
}
