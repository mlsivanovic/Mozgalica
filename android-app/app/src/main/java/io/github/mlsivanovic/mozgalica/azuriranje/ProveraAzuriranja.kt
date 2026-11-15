package io.github.mlsivanovic.mozgalica.azuriranje

import java.util.Locale
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.longOrNull

/** Objavljeno izdanje sa GitHub-a, spremno za proveru i preuzimanje. */
data class Izdanje(
    val verzija: String,
    val verzijaKod: Int?,
    val adresa: String,
    val velicinaBajta: Long,
    val sazetak: String?,
)

/**
 * Tumači odgovor GitHub API-ja i upoređuje verzije. Bez Android zavisnosti, pa se
 * pravila provere mogu testirati običnim JUnit testovima.
 */
object ProveraAzuriranja {
    private const val OZNAKA_IZDANJA = "android-v"
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }
    private val redVerzijeKoda = Regex("""(?im)^\s*verzija koda:\s*(\d+)\s*$""")
    private val ispravnaVerzija = Regex("""\d+(\.\d+)*""")

    /**
     * Vraća izdanje samo kada odgovor ima Android oznaku i APK preko HTTPS-a.
     * Sve ostalo je `null` — bolje ne ponuditi ništa nego pogrešan fajl.
     */
    fun izIzdanja(tekst: String): Izdanje? {
        val koren = try {
            json.parseToJsonElement(tekst) as? JsonObject ?: return null
        } catch (_: Exception) {
            return null
        }
        val oznaka = koren.tekst("tag_name") ?: return null
        if (!oznaka.startsWith(OZNAKA_IZDANJA)) return null
        val verzija = oznaka.removePrefix(OZNAKA_IZDANJA).substringBefore('+')
        if (!verzija.matches(ispravnaVerzija)) return null
        val kodIzOznake = oznaka.substringAfter('+', "")
            .takeIf { it.isNotEmpty() }
            ?.toIntOrNull()
        val kodIzOpisa = koren.tekst("body")
            ?.let { redVerzijeKoda.find(it)?.groupValues?.get(1)?.toIntOrNull() }
        val asset = (koren["assets"] as? JsonArray)
            ?.filterIsInstance<JsonObject>()
            ?.firstOrNull { it.tekst("name")?.endsWith(".apk", ignoreCase = true) == true }
            ?: return null
        val adresa = asset.tekst("browser_download_url") ?: return null
        if (!adresa.startsWith("https://")) return null
        return Izdanje(
            verzija = verzija,
            verzijaKod = kodIzOznake ?: kodIzOpisa,
            adresa = adresa,
            velicinaBajta = asset.broj("size") ?: 0L,
            sazetak = asset.tekst("digest")?.takeIf { it.startsWith("sha256:", ignoreCase = true) },
        )
    }

    /**
     * Verzija koda je merodavna kada je objavljena; starija izdanja je nemaju, pa
     * se tada poredi ime verzije (npr. 1.0.3 < 1.0.4).
     */
    fun jeNovije(izdanje: Izdanje, trenutnaVerzija: String, trenutniKod: Int): Boolean =
        izdanje.verzijaKod?.let { it > trenutniKod } ?: jeNovija(trenutnaVerzija, izdanje.verzija)

    fun jeNovija(trenutna: String, dostupna: String): Boolean = uporedi(trenutna, dostupna) < 0

    fun uporedi(a: String, b: String): Int {
        val prvi = delovi(a)
        val drugi = delovi(b)
        for (i in 0 until maxOf(prvi.size, drugi.size)) {
            val razlika = prvi.getOrElse(i) { 0 }.compareTo(drugi.getOrElse(i) { 0 })
            if (razlika != 0) return razlika
        }
        return 0
    }

    /** Veličina za dugme, npr. „4,3 MB"; prazan string kada nije poznata. */
    fun formatirajVelicinu(bajtova: Long): String = when {
        bajtova <= 0 -> ""
        bajtova < 1024 -> "$bajtova B"
        bajtova < 1024 * 1024 -> "${bajtova / 1024} KB"
        else -> String.format(Locale.GERMANY, "%.1f MB", bajtova / (1024.0 * 1024.0))
    }

    private fun delovi(verzija: String): List<Int> =
        verzija.removePrefix("v")
            .substringBefore('+')
            .substringBefore('-')
            .split('.')
            .map { deo -> deo.takeWhile(Char::isDigit).toIntOrNull() ?: 0 }

    private fun JsonObject.tekst(ime: String): String? =
        (this[ime] as? JsonPrimitive)?.contentOrNull

    private fun JsonObject.broj(ime: String): Long? =
        (this[ime] as? JsonPrimitive)?.longOrNull
}
