package io.github.mlsivanovic.mozgalica.profil

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IshodOsvezavanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IshodPovezivanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface UiStanje {
    data object Provera : UiStanje

    data class Povezivanje(
        val greska: String?,
        val radi: Boolean,
    ) : UiStanje

    data class Profil(
        val podaci: SacuvaniProfil,
        val osvezava: Boolean,
        val greskaMreze: String?,
    ) : UiStanje
}

@HiltViewModel
class ProfilViewModel @Inject constructor(
    private val repo: ProfilRepozitorijum,
) : ViewModel() {
    private val radi = MutableStateFlow(false)
    private val osvezava = MutableStateFlow(false)
    private val greska = MutableStateFlow<String?>(null)

    val stanje: StateFlow<UiStanje> = combine(
        repo.posmatraj(),
        radi,
        osvezava,
        greska,
    ) { profil, povezuje, osvezavaSe, poruka ->
        if (profil == null) UiStanje.Povezivanje(poruka, povezuje)
        else UiStanje.Profil(profil, osvezavaSe, poruka)
    }.stateIn(viewModelScope, SharingStarted.Eagerly, UiStanje.Provera)

    init {
        viewModelScope.launch {
            val kes = repo.posmatraj().first()
            if (kes != null) osvezi()
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

    private suspend fun osvezi() {
        osvezava.value = true
        greska.value = null
        when (val ishod = repo.osvezi()) {
            IshodOsvezavanja.Osvezen, IshodOsvezavanja.NemaTokena -> Unit
            is IshodOsvezavanja.ProfilObrisan -> greska.value = ishod.poruka
            is IshodOsvezavanja.Greska -> greska.value = ishod.poruka
        }
        osvezava.value = false
    }
}
