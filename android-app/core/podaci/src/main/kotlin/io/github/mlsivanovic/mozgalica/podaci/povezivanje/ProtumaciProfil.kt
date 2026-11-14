package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import io.github.mlsivanovic.mozgalica.podaci.ProfilOdgovor
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

private val strogo = Json { ignoreUnknownKeys = false }
private val labavo = Json { ignoreUnknownKeys = true }

@Serializable
private data class OmotOdgovora(val ok: Boolean = false, val error: String? = null)

fun protumaciProfil(telo: String): IshodUcitavanja {
    val omot = labavo.decodeFromString(OmotOdgovora.serializer(), telo)
    if (!omot.ok) {
        return if (omot.error == "not_found") IshodUcitavanja.NijePronadjen
        else IshodUcitavanja.Odbijen(PorukePovezivanja.ODBIJEN)
    }
    val odgovor = strogo.decodeFromString(ProfilOdgovor.serializer(), telo)
    return IshodUcitavanja.Uspesan(odgovor.uSacuvani())
}

private fun ProfilOdgovor.uSacuvani(): SacuvaniProfil = SacuvaniProfil(
    ime = name,
    avatar = avatar,
    ukupnoZvezdica = totalStars,
    raspolozivoZvezdica = spendableStars,
    titula = currentTitle?.name,
    aktivniKvizovi = activeQuizzes,
    aktivnePartije = activeChessGames,
    istorijaKvizova = history,
    istorijaSaha = chessHistory,
)
