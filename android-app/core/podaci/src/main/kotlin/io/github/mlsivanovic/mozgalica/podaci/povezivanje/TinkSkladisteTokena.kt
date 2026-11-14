package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import android.content.Context
import android.util.Base64
import com.google.crypto.tink.Aead
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.aead.PredefinedAeadParameters
import com.google.crypto.tink.integration.android.AndroidKeysetManager
import java.security.GeneralSecurityException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class TinkSkladisteTokena(context: Context) : SkladisteTokena {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // Ključ iz Keystore-a se pravi tek pri prvom čitanju ili upisu.
    private val aead: Aead by lazy {
        AeadConfig.register()
        AndroidKeysetManager.Builder()
            .withSharedPref(context, KEYSET, KEYSET_PREFS)
            .withKeyTemplate(com.google.crypto.tink.KeyTemplate.createFrom(PredefinedAeadParameters.AES256_GCM))
            .withMasterKeyUri(MASTER_KEY)
            .build()
            .keysetHandle
            .getPrimitive(RegistryConfiguration.get(), Aead::class.java)
    }

    override suspend fun upisi(token: String) = withContext(Dispatchers.IO) {
        val sifrat = aead.encrypt(token.toByteArray(Charsets.UTF_8), AAD)
        prefs.edit().putString(POLJE, Base64.encodeToString(sifrat, Base64.NO_WRAP)).apply()
    }

    override suspend fun procitaj(): String? = withContext(Dispatchers.IO) {
        val sirovo = prefs.getString(POLJE, null) ?: return@withContext null
        try {
            val otvoren = aead.decrypt(Base64.decode(sirovo, Base64.NO_WRAP), AAD)
            String(otvoren, Charsets.UTF_8)
        } catch (_: GeneralSecurityException) {
            null
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    override suspend fun obrisi() = withContext(Dispatchers.IO) {
        prefs.edit().remove(POLJE).apply()
    }

    private companion object {
        const val PREFS = "mozgalica_token_sifrat"
        const val KEYSET_PREFS = "mozgalica_tink_kljuc"
        const val KEYSET = "profilni_token_keyset"
        const val POLJE = "sifrat"
        const val MASTER_KEY = "android-keystore://mozgalica_profilni_token"
        val AAD = "mozgalica_profilni_token".toByteArray(Charsets.UTF_8)
    }
}
