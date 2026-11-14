package io.github.mlsivanovic.mozgalica.nagrade

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.mlsivanovic.mozgalica.podaci.ProdavnicaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.StavkaProdavnice
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.prodavnica.IshodKupovine
import io.github.mlsivanovic.mozgalica.podaci.prodavnica.IshodProdavnice
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProdavnicaUi(
    val ucitava: Boolean = true,
    val podaci: ProdavnicaOdgovor? = null,
    val greska: String? = null,
    val poruka: String? = null,
    val potvrda: StavkaProdavnice? = null,
    val kupuje: Boolean = false,
)

@HiltViewModel
class ProdavnicaViewModel @Inject constructor(
    private val repo: ProfilRepozitorijum,
) : ViewModel() {
    private val ui = MutableStateFlow(ProdavnicaUi())
    val stanje: StateFlow<ProdavnicaUi> = ui

    init {
        osvezi()
    }

    fun osvezi() {
        viewModelScope.launch {
            ui.update { it.copy(ucitava = it.podaci == null) }
            when (val ishod = repo.prodavnica()) {
                is IshodProdavnice.Uspesna -> ui.update {
                    it.copy(podaci = ishod.podaci, ucitava = false, greska = null)
                }
                is IshodProdavnice.Odbijena -> ui.update {
                    it.copy(ucitava = false, greska = porukaGreske(ishod.kod))
                }
                IshodProdavnice.Neuspesna -> ui.update {
                    it.copy(ucitava = false, greska = "Prodavnica trenutno nije dostupna. Pokušaj ponovo.")
                }
            }
        }
    }

    fun otvoriPotvrdu(stavka: StavkaProdavnice) {
        ui.update { it.copy(potvrda = stavka, greska = null, poruka = null) }
    }

    fun zatvoriPotvrdu() {
        if (ui.value.kupuje) return
        ui.update { it.copy(potvrda = null, greska = null) }
    }

    fun kupi() {
        val trenutno = ui.value
        val stavka = trenutno.potvrda ?: return
        if (trenutno.kupuje) return
        viewModelScope.launch {
            ui.update { it.copy(kupuje = true, greska = null, poruka = null) }
            when (val ishod = repo.kupi(stavka.id)) {
                is IshodKupovine.Uspesna -> {
                    val noviBalans = ishod.odgovor.newBalance
                    repo.azurirajBalans(noviBalans)
                    ui.update {
                        it.copy(
                            podaci = it.podaci?.copy(balance = noviBalans),
                            potvrda = null,
                            poruka = "Hura! Kupio/la si „${stavka.title}”. Čeka isporuku.",
                            kupuje = false,
                        )
                    }
                    osvezi()
                }
                is IshodKupovine.Odbijena -> ui.update {
                    it.copy(
                        kupuje = false,
                        greska = porukaKupovine(ishod.kod, ishod.balance, ishod.cost),
                    )
                }
                IshodKupovine.Neuspesna -> ui.update {
                    it.copy(
                        kupuje = false,
                        greska = "Kupovina nije uspela. Proveri vezu i pokušaj ponovo.",
                    )
                }
            }
        }
    }

    fun ocistiPoruke() {
        ui.update { it.copy(greska = null, poruka = null) }
    }

    private fun porukaGreske(kod: String?): String = when (kod) {
        "not_found" -> "Profil nije pronađen."
        "no_token" -> "Profil nije povezan."
        null -> "Prodavnica trenutno nije dostupna."
        else -> "Prodavnica trenutno nije dostupna."
    }

    private fun porukaKupovine(kod: String?, balans: Int?, cena: Int?): String = when (kod) {
        "already_purchased" -> "Ovu nagradu si već kupio/la."
        "awaiting_consumption" -> "Već si kupio/la ovu nagradu — sačekaj da bude isporučena pre novog kupovanja."
        "insufficient_balance" -> "Nemaš dovoljno zvezdica. Potrebno je ${cena ?: 0}⭐, a raspoloživo je ${balans ?: 0}⭐."
        "item_not_found" -> "Ova nagrada više nije dostupna."
        "profile_not_found" -> "Profil nije pronađen."
        "no_token" -> "Profil nije povezan."
        else -> "Kupovina nije uspela."
    }
}
