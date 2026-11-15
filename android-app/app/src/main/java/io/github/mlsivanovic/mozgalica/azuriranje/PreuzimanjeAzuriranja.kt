package io.github.mlsivanovic.mozgalica.azuriranje

import android.content.Context
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext

/** Preuzima APK u keš i proverava kontrolni zbir koji GitHub navodi uz fajl. */
object PreuzimanjeAzuriranja {
    private const val BAJTOVA_ODJEDNOM = 64 * 1024

    /** Već preuzet, još neinstaliran APK iz prethodnog otvaranja podešavanja. */
    fun sacuvano(kontekst: Context): File? =
        folder(kontekst).listFiles()
            ?.filter { it.isFile && it.name.startsWith("Mozgalica-") && it.extension == "apk" }
            ?.maxByOrNull { it.lastModified() }

    suspend fun preuzmi(
        kontekst: Context,
        izdanje: Izdanje,
        napredak: (Int?) -> Unit,
    ): File = withContext(Dispatchers.IO) {
        val folder = folder(kontekst).apply { mkdirs() }
        folder.listFiles()?.forEach { it.delete() }
        val cilj = File(folder, "Mozgalica-${izdanje.verzija}.apk")
        val privremeni = File(folder, "Mozgalica.preuzima")
        val veza = (URL(izdanje.adresa).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 30_000
            setRequestProperty("User-Agent", "Mozgalica-Android")
        }
        try {
            if (veza.responseCode != HttpURLConnection.HTTP_OK) {
                throw IOException("Preuzimanje je odbijeno (${veza.responseCode}).")
            }
            val ukupno = if (izdanje.velicinaBajta > 0) izdanje.velicinaBajta else veza.contentLengthLong
            val sazetak = MessageDigest.getInstance("SHA-256")
            var preuzeto = 0L
            veza.inputStream.use { ulaz ->
                privremeni.outputStream().use { izlaz ->
                    val bafer = ByteArray(BAJTOVA_ODJEDNOM)
                    while (true) {
                        ensureActive()
                        val procitano = ulaz.read(bafer)
                        if (procitano < 0) break
                        izlaz.write(bafer, 0, procitano)
                        sazetak.update(bafer, 0, procitano)
                        preuzeto += procitano
                        napredak(
                            if (ukupno > 0) ((preuzeto * 100) / ukupno).toInt().coerceIn(0, 100) else null,
                        )
                    }
                }
            }
            val ocekivani = izdanje.sazetak?.substringAfter(':')?.lowercase()
            if (ocekivani != null && ocekivani != sazetak.digest().uHex()) {
                throw IOException("Kontrolni zbir preuzetog fajla nije ispravan.")
            }
            if (!privremeni.renameTo(cilj)) {
                privremeni.copyTo(cilj, overwrite = true)
                privremeni.delete()
            }
            cilj
        } catch (e: Exception) {
            privremeni.delete()
            throw e
        } finally {
            veza.disconnect()
        }
    }

    private fun folder(kontekst: Context): File = File(kontekst.cacheDir, "azuriranje")

    private fun ByteArray.uHex(): String = joinToString("") { "%02x".format(it) }
}
