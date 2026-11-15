package io.github.mlsivanovic.mozgalica.azuriranje

import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject

/** Čita najnovije izdanje sa GitHub-a; poziv je blokirajući, pa ide na IO nit. */
class GitHubIzdanja @Inject constructor() {
    fun najnovije(): Izdanje? {
        val veza = (URL(ADRESA).openConnection() as HttpURLConnection).apply {
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("Accept", "application/vnd.github+json")
            setRequestProperty("User-Agent", "Mozgalica-Android")
        }
        return try {
            if (veza.responseCode != HttpURLConnection.HTTP_OK) {
                throw IOException("GitHub je odgovorio ${veza.responseCode}.")
            }
            val tekst = veza.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            ProveraAzuriranja.izIzdanja(tekst)
        } finally {
            veza.disconnect()
        }
    }

    private companion object {
        // Workflow „Android APK" objavljuje svako izdanje kao „latest".
        const val ADRESA = "https://api.github.com/repos/mlsivanovic/Mozgalica/releases/latest"
    }
}
