package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.podesavanjaPovezivanja by preferencesDataStore(name = "mozgalica_povezivanje")

class DataStorePodesavanja(private val context: Context) : PodesavanjaPovezivanja {
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

    private companion object {
        val KLJUC = stringPreferencesKey("izabrani_profil")
    }
}
