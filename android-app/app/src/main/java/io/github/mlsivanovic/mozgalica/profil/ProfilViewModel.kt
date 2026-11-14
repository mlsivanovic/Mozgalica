package io.github.mlsivanovic.mozgalica.profil

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IshodOsvezavanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IshodPovezivanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaAplikacije
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvanaObavestenja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniRaspored
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.StanjePodesavanja
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface UiStanje {
    data object Provera : UiStanje

    data class Povezivanje(
        val greska: String?,
        val radi: Boolean,
    ) : UiStanje

    data class Profil(
        val podaci: SacuvaniProfil,
        val raspored: SacuvaniRaspored?,
        val obavestenja: SacuvanaObavestenja,
        val osvezava: Boolean,
        val greskaMreze: String?,
    ) : UiStanje
}

@HiltViewModel
class ProfilViewModel @Inject constructor(
    private val repo: ProfilRepozitorijum,
    private val podesavanjaAplikacije: PodesavanjaAplikacije,
) : ViewModel() {
    private val radi = MutableStateFlow(false)
    private val rucno = MutableStateFlow(false)
    private val greska = MutableStateFlow<String?>(null)
    private val osvezavanje = Mutex()

    val podesavanja: StateFlow<StanjePodesavanja> = podesavanjaAplikacije.stanje()
        .stateIn(viewModelScope, SharingStarted.Eagerly, StanjePodesavanja())

    private val sadrzaj = combine(
        repo.posmatraj(),
        repo.posmatrajRaspored(),
        repo.posmatrajObavestenja(),
    ) { profil, raspored, obavestenja ->
        Trojka(profil, raspored, obavestenja)
    }

    val stanje: StateFlow<UiStanje> = combine(
        sadrzaj,
        radi,
        rucno,
        greska,
    ) { podaci, povezuje, rucnoOsvezava, poruka ->
        val profil = podaci.profil
        if (profil == null) {
            UiStanje.Povezivanje(poruka, povezuje)
        } else {
            UiStanje.Profil(
                podaci = profil,
                raspored = podaci.raspored,
                obavestenja = podaci.obavestenja,
                osvezava = rucnoOsvezava,
                greskaMreze = poruka,
            )
        }
    }.stateIn(viewModelScope, SharingStarted.Eagerly, UiStanje.Provera)

    init {
        viewModelScope.launch {
            if (podesavanjaAplikacije.probniPrikaz().first()) return@launch
            if (repo.posmatraj().first() != null) osvezi()
        }
    }

    fun povezi(unos: String) {
        if (radi.value) return
        viewModelScope.launch {
            radi.value = true
            greska.value = null
            when (val ishod = repo.povezi(unos)) {
                is IshodPovezivanja.Povezan -> greska.value = null
                is IshodPovezivanja.Greska -> greska.value = ishod.poruka
            }
            radi.value = false
        }
    }

    fun promeniProfil() {
        viewModelScope.launch {
            greska.value = null
            repo.promeniProfil()
        }
    }

    fun prijaviGresku(poruka: String) {
        greska.update { poruka }
    }

    fun osvezi(rucnoPovlacenje: Boolean = false) {
        viewModelScope.launch {
            if (!osvezavanje.tryLock()) return@launch
            try {
                // Probni snimak ne sme da ode na mrežu i prepiše lokalni keš.
                if (podesavanjaAplikacije.probniPrikaz().first()) return@launch
                if (rucnoPovlacenje) rucno.value = true
                greska.value = null
                when (val ishod = repo.osvezi()) {
                    IshodOsvezavanja.Osvezen, IshodOsvezavanja.NemaTokena -> Unit
                    is IshodOsvezavanja.ProfilObrisan -> greska.value = ishod.poruka
                    is IshodOsvezavanja.Greska -> greska.value = ishod.poruka
                }
            } finally {
                rucno.value = false
                osvezavanje.unlock()
            }
        }
    }

    fun oznaciProcitanim(ids: List<String>?) {
        viewModelScope.launch { repo.oznaciProcitanim(ids) }
    }

    fun postaviTemu(tema: io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzborTeme) {
        viewModelScope.launch { podesavanjaAplikacije.postaviTemu(tema) }
    }

    fun postaviZvuk(ukljucen: Boolean) {
        viewModelScope.launch { podesavanjaAplikacije.postaviZvuk(ukljucen) }
    }

    fun postaviHaptiku(ukljucena: Boolean) {
        viewModelScope.launch { podesavanjaAplikacije.postaviHaptiku(ukljucena) }
    }

    fun napuniProbniPrikaz(profil: String, raspored: String, obavestenja: String) {
        viewModelScope.launch {
            osvezavanje.withLock {
                val ishod = repo.napuniIzSnimka(profil, raspored, obavestenja)
                if (!ishod.uspeo) {
                    greska.value = "Probni podaci nisu ispravni."
                    return@withLock
                }
                greska.value = null
                podesavanjaAplikacije.postaviProbniPrikaz(true, ishod.bezTokena)
            }
        }
    }
}

private data class Trojka(
    val profil: SacuvaniProfil?,
    val raspored: SacuvaniRaspored?,
    val obavestenja: SacuvanaObavestenja,
)
