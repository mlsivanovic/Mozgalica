package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import android.content.Context
import androidx.room.Room
import io.github.mlsivanovic.mozgalica.podaci.kviz.RoomKesPokusaja
import io.github.mlsivanovic.mozgalica.podaci.kviz.SkladistePokusaja

class LokalnoSkladiste(context: Context) {
    val kes: KesProfila
    val sadrzaj: KesSadrzaja
    val tokeni: SkladisteTokena
    val podesavanja: DataStorePodesavanja
    val pokusaji: SkladistePokusaja

    init {
        val baza = Room.databaseBuilder(context, MozgalicaBaza::class.java, "mozgalica.db")
            .addMigrations(MIGRACIJA_1_2, MIGRACIJA_2_3)
            .build()
        kes = RoomKesProfila(baza.profilDao())
        sadrzaj = RoomKesSadrzaja(baza.snimakDao())
        tokeni = TinkSkladisteTokena(context)
        podesavanja = DataStorePodesavanja(context)
        pokusaji = RoomKesPokusaja(baza.pokusajDao())
    }
}
