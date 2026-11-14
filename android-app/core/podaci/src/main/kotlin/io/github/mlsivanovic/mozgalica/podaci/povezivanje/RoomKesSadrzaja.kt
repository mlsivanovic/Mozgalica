package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.ObavestenjeDeteta
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private val kesJson = Json { ignoreUnknownKeys = true }

private object SnimakKljuc {
    const val RASPORED = "raspored"
    const val OBAVESTENJA = "obavestenja"
}

@Serializable
private data class SnimakObavestenja(
    val stavke: List<SacuvanoObavestenje> = emptyList(),
)

class RoomKesSadrzaja(private val dao: SnimakDao) : KesSadrzaja {
    private val brava = Mutex()

    override fun raspored(): Flow<SacuvaniRaspored?> =
        dao.posmatraj(SnimakKljuc.RASPORED).map { json ->
            json?.let { runCatching { kesJson.decodeFromString(SacuvaniRaspored.serializer(), it) }.getOrNull() }
        }

    override fun obavestenja(): Flow<SacuvanaObavestenja> =
        dao.posmatraj(SnimakKljuc.OBAVESTENJA).map { json ->
            SacuvanaObavestenja(procitajObavestenja(json))
        }

    override suspend fun upisiRaspored(raspored: SacuvaniRaspored) {
        dao.upisi(SnimakRed(SnimakKljuc.RASPORED, kesJson.encodeToString(SacuvaniRaspored.serializer(), raspored)))
    }

    override suspend fun zameniObavestenja(stavke: List<SacuvanoObavestenje>) {
        brava.withLock { upisiObavestenja(stavke) }
    }

    override suspend fun oznaciLokalno(ids: List<String>?): List<String> = brava.withLock {
        val trenutno = procitajObavestenja(dao.procitaj(SnimakKljuc.OBAVESTENJA))
        val izabrani = ids?.toSet()
        val sada = sadaIso()
        val oznaceni = mutableListOf<String>()
        val novo = trenutno.map { stavka ->
            val gadja = izabrani == null || stavka.id in izabrani
            if (gadja && stavka.readAt == null) {
                oznaceni += stavka.id
                stavka.copy(readAt = sada, cekaServer = true)
            } else {
                stavka
            }
        }
        upisiObavestenja(novo)
        oznaceni
    }

    override suspend fun spojiSaServerom(server: List<ObavestenjeDeteta>) {
        brava.withLock {
            val lokalno = procitajObavestenja(dao.procitaj(SnimakKljuc.OBAVESTENJA))
            upisiObavestenja(spojiObavestenja(lokalno, server))
        }
    }

    override suspend fun potvrdi(ids: List<String>) {
        if (ids.isEmpty()) return
        brava.withLock {
            val izabrani = ids.toSet()
            val novo = procitajObavestenja(dao.procitaj(SnimakKljuc.OBAVESTENJA)).map { stavka ->
                if (stavka.id in izabrani && stavka.readAt != null) stavka.copy(cekaServer = false) else stavka
            }
            upisiObavestenja(novo)
        }
    }

    override suspend fun cekajuci(): List<String> = brava.withLock {
        procitajObavestenja(dao.procitaj(SnimakKljuc.OBAVESTENJA))
            .filter { it.cekaServer && it.readAt != null }
            .map { it.id }
    }

    override suspend fun obrisi() {
        brava.withLock { dao.obrisiSve() }
    }

    private suspend fun upisiObavestenja(stavke: List<SacuvanoObavestenje>) {
        dao.upisi(
            SnimakRed(
                SnimakKljuc.OBAVESTENJA,
                kesJson.encodeToString(SnimakObavestenja.serializer(), SnimakObavestenja(stavke)),
            ),
        )
    }
}

private fun procitajObavestenja(json: String?): List<SacuvanoObavestenje> {
    if (json.isNullOrBlank()) return emptyList()
    return runCatching { kesJson.decodeFromString(SnimakObavestenja.serializer(), json).stavke }
        .getOrDefault(emptyList())
}

internal fun sadaIso(): String {
    val kalendar = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    return String.format(
        Locale.US,
        "%04d-%02d-%02dT%02d:%02d:%02dZ",
        kalendar.get(Calendar.YEAR),
        kalendar.get(Calendar.MONTH) + 1,
        kalendar.get(Calendar.DAY_OF_MONTH),
        kalendar.get(Calendar.HOUR_OF_DAY),
        kalendar.get(Calendar.MINUTE),
        kalendar.get(Calendar.SECOND),
    )
}
