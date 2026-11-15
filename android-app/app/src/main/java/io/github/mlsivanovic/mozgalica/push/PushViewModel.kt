package io.github.mlsivanovic.mozgalica.push

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaAplikacije
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.push.IshodRegistracijePush
import io.github.mlsivanovic.mozgalica.podaci.push.IshodStatusaPush
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class PushUi(
    val ucitava: Boolean = true,
    val dostupan: Boolean = true,
    val ukljucen: Boolean = false,
    val greska: String? = null,
)

@HiltViewModel
class PushViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val repo: ProfilRepozitorijum,
    private val podesavanja: PodesavanjaAplikacije,
) : ViewModel() {
    private val ui = MutableStateFlow(PushUi())
    val stanje: StateFlow<PushUi> = ui

    init {
        osvezi()
    }

    fun osvezi() {
        viewModelScope.launch {
            ui.update { it.copy(ucitava = true, greska = null) }
            if (!FcmKlijent.dostupan(context)) {
                ui.update { it.copy(ucitava = false, dostupan = false, ukljucen = false) }
                return@launch
            }
            val ukljucen = podesavanja.pushUkljucen().first()
            if (!ukljucen) {
                ui.update { it.copy(ucitava = false, dostupan = true, ukljucen = false) }
                return@launch
            }
            val token = FcmKlijent.token(context)
            if (token == null) {
                ui.update {
                    it.copy(
                        ucitava = false,
                        dostupan = true,
                        ukljucen = false,
                        greska = "Firebase nije uspeo da izda token za ovaj uređaj.",
                    )
                }
                return@launch
            }
            when (val status = repo.statusFcm(token)) {
                is IshodStatusaPush.Aktivan -> ui.update {
                    it.copy(ucitava = false, dostupan = true, ukljucen = status.active)
                }
                is IshodStatusaPush.Odbijen -> ui.update {
                    it.copy(ucitava = false, dostupan = true, ukljucen = false, greska = "Status obaveštenja nije dostupan.")
                }
                IshodStatusaPush.Neuspesan -> ui.update {
                    it.copy(
                        ucitava = false,
                        dostupan = true,
                        ukljucen = false,
                        greska = "Nema veze sa serverom. Pokušaj ponovo.",
                    )
                }
            }
        }
    }

    fun ukljuci() {
        if (ui.value.ucitava) return
        viewModelScope.launch {
            ui.update { it.copy(ucitava = true, greska = null) }
            val token = FcmKlijent.token(context)
            if (token == null) {
                ui.update {
                    it.copy(
                        ucitava = false,
                        ukljucen = false,
                        greska = "Firebase nije podešen u ovoj gradnji.",
                    )
                }
                return@launch
            }
            when (val ishod = repo.registrujFcm(token, FcmKlijent.korisnickiAgent())) {
                is IshodRegistracijePush.Uspesna -> {
                    podesavanja.postaviPush(true)
                    ui.update { it.copy(ucitava = false, ukljucen = true, greska = null) }
                }
                is IshodRegistracijePush.Odbijena -> ui.update {
                    it.copy(ucitava = false, ukljucen = false, greska = porukaRegistracije(ishod.kod))
                }
                IshodRegistracijePush.Neuspesna -> ui.update {
                    it.copy(ucitava = false, ukljucen = false, greska = "Obaveštenja nisu uključena. Proveri vezu i pokušaj ponovo.")
                }
            }
        }
    }

    fun iskljuci() {
        viewModelScope.launch {
            ui.update { it.copy(ucitava = true, greska = null) }
            val token = FcmKlijent.token(context)
            if (token != null) repo.odjaviFcm(token)
            podesavanja.postaviPush(false)
            FcmKlijent.obrisiToken()
            ui.update { it.copy(ucitava = false, ukljucen = false) }
        }
    }

    fun prijaviDozvoluOdbijenu() {
        ui.update { it.copy(greska = "Dozvola za obaveštenja nije data. Možeš je uključiti u podešavanjima telefona.") }
    }

    private fun porukaRegistracije(kod: String?): String = when (kod) {
        "not_found" -> "Profil nije pronađen."
        "no_token" -> "Prvo poveži profil."
        "invalid_token" -> "Token uređaja nije ispravan."
        else -> "Obaveštenja nisu uključena."
    }
}
