package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.podesavanjaPovezivanja by preferencesDataStore(name = "mozgalica_povezivanje")

class DataStorePodesavanja(private val context: Context) : PodesavanjaPovezivanja, PodesavanjaAplikacije {
    override fun izabrani(): Flow<String?> = context.podesavanjaPovezivanja.data.map { prefs ->
        prefs[KLJUC]
    }

    override suspend fun zapamtiIzabrani() {
        context.podesavanjaPovezivanja.edit { prefs ->
            prefs[KLJUC] = PovezivanjeKonstante.IZABRANI_PROFIL
        }
    }

    override suspend fun zaboravi() {
        context.podesavanjaPovezivanja.edit { prefs ->
            prefs.remove(KLJUC)
        }
    }

    override fun stanje(): Flow<StanjePodesavanja> = context.podesavanjaPovezivanja.data.map { prefs ->
        StanjePodesavanja(
            tema = when (prefs[TEMA]) {
                "svetla" -> IzborTeme.SVETLA
                "tamna" -> IzborTeme.TAMNA
                else -> IzborTeme.SISTEM
            },
            zvuk = prefs[ZVUK] ?: true,
            haptika = prefs[HAPTIKA] ?: true,
        )
    }

    override suspend fun postaviTemu(tema: IzborTeme) {
        context.podesavanjaPovezivanja.edit { prefs ->
            when (tema) {
                IzborTeme.SISTEM -> prefs.remove(TEMA)
                IzborTeme.SVETLA -> prefs[TEMA] = "svetla"
                IzborTeme.TAMNA -> prefs[TEMA] = "tamna"
            }
        }
    }

    override suspend fun postaviZvuk(ukljucen: Boolean) {
        context.podesavanjaPovezivanja.edit { prefs -> prefs[ZVUK] = ukljucen }
    }

    override suspend fun postaviHaptiku(ukljucena: Boolean) {
        context.podesavanjaPovezivanja.edit { prefs -> prefs[HAPTIKA] = ukljucena }
    }

    override fun probniPrikaz(): Flow<Boolean> = context.podesavanjaPovezivanja.data.map { prefs ->
        prefs[PROBNI] == true
    }

    override suspend fun postaviProbniPrikaz(ukljucen: Boolean, bezTokena: Boolean) {
        context.podesavanjaPovezivanja.edit { prefs ->
            if (ukljucen) {
                prefs[PROBNI] = true
                prefs[PROBNI_BEZ_TOKENA] = bezTokena
            } else {
                prefs.remove(PROBNI)
                prefs.remove(PROBNI_BEZ_TOKENA)
            }
        }
    }

    override suspend fun probniJeBezTokena(): Boolean =
        context.podesavanjaPovezivanja.data.map { it[PROBNI_BEZ_TOKENA] == true }.first()

    private companion object {
        val KLJUC = stringPreferencesKey("izabrani_profil")
        val TEMA = stringPreferencesKey("tema")
        val ZVUK = booleanPreferencesKey("zvuk")
        val HAPTIKA = booleanPreferencesKey("haptika")
        val PROBNI = booleanPreferencesKey("probni_prikaz")
        val PROBNI_BEZ_TOKENA = booleanPreferencesKey("probni_bez_tokena")
    }
}
