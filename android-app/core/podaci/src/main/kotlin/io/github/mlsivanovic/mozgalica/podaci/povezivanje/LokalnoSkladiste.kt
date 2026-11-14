package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import android.content.Context
import androidx.room.Room

class LokalnoSkladiste(context: Context) {
    val kes: KesProfila
    val tokeni: SkladisteTokena
    val podesavanja: PodesavanjaPovezivanja

    init {
        val baza = Room.databaseBuilder(context, MozgalicaBaza::class.java, "mozgalica.db").build()
        kes = RoomKesProfila(baza.profilDao())
        tokeni = TinkSkladisteTokena(context)
        podesavanja = DataStorePodesavanja(context)
    }
}
