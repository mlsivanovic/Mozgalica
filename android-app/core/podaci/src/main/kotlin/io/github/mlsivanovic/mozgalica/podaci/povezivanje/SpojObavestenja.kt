package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.ObavestenjeDeteta

// Lokalno pročitano pobedi nepročitano sa servera. Inače bi pad mreže
// posle optimistične oznake vratio stavku u nepročitano na sledećem osvežavanju.
fun spojiObavestenja(
    lokalno: List<SacuvanoObavestenje>,
    server: List<ObavestenjeDeteta>,
): List<SacuvanoObavestenje> {
    val poId = lokalno.associateBy { it.id }
    return server.map { stavka ->
        val sacuvano = poId[stavka.id]
        when {
            stavka.readAt != null -> stavka.uSacuvano()
            sacuvano?.readAt != null -> sacuvano.copy(
                eventType = stavka.eventType,
                title = stavka.title,
                body = stavka.body,
                targetUrl = stavka.targetUrl,
                createdAt = stavka.createdAt,
                cekaServer = true,
            )
            else -> stavka.uSacuvano()
        }
    }
}

fun ObavestenjeDeteta.uSacuvano(): SacuvanoObavestenje = SacuvanoObavestenje(
    id = id,
    eventType = eventType,
    title = title,
    body = body,
    targetUrl = targetUrl,
    readAt = readAt,
    createdAt = createdAt,
    cekaServer = false,
)
