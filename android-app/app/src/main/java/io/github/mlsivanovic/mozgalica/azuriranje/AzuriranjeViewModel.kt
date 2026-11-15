package io.github.mlsivanovic.mozgalica.azuriranje

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.mlsivanovic.mozgalica.BuildConfig
import java.io.File
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface StanjeAzuriranja {
    data object Mirno : StanjeAzuriranja
    data object Proverava : StanjeAzuriranja
    data class NemaNove(val verzija: String) : StanjeAzuriranja
    data class Dostupno(val izdanje: Izdanje) : StanjeAzuriranja
    data class Preuzima(val procenat: Int?) : StanjeAzuriranja
    data class Preuzeto(val verzija: String, val fajl: File, val poruka: String? = null) : StanjeAzuriranja
    data class Greska(val poruka: String, val izdanje: Izdanje? = null) : StanjeAzuriranja
}

@HiltViewModel
class AzuriranjeViewModel @Inject constructor(
    @ApplicationContext private val kontekst: Context,
    private val izdanja: GitHubIzdanja,
) : ViewModel() {
    private val _stanje = MutableStateFlow<StanjeAzuriranja>(StanjeAzuriranja.Mirno)
    val stanje: StateFlow<StanjeAzuriranja> = _stanje.asStateFlow()

    val verzija: String = BuildConfig.VERSION_NAME
    val verzijaKod: Int = BuildConfig.VERSION_CODE

    private var posao: Job? = null

    init {
        // Preuzimanje je 4–5 MB; posle povratka na ekran ne treba ga ponavljati.
        viewModelScope.launch {
            val sacuvano = withContext(Dispatchers.IO) { PreuzimanjeAzuriranja.sacuvano(kontekst) }
                ?: return@launch
            val greska = withContext(Dispatchers.IO) { ProveraApk.greska(kontekst, sacuvano) }
            if (greska == null) {
                if (_stanje.value is StanjeAzuriranja.Mirno) {
                    _stanje.value = StanjeAzuriranja.Preuzeto(verzijaIzImena(sacuvano), sacuvano)
                }
            } else {
                withContext(Dispatchers.IO) { sacuvano.delete() }
            }
        }
    }

    fun proveri() {
        if (posao?.isActive == true) return
        posao = viewModelScope.launch {
            _stanje.value = StanjeAzuriranja.Proverava
            try {
                val izdanje = withContext(Dispatchers.IO) { izdanja.najnovije() }
                _stanje.value = when {
                    izdanje == null -> StanjeAzuriranja.Greska(
                        "Provera trenutno nije moguća. Pokušaj ponovo kasnije.",
                    )
                    ProveraAzuriranja.jeNovije(izdanje, verzija, verzijaKod) ->
                        StanjeAzuriranja.Dostupno(izdanje)
                    else -> StanjeAzuriranja.NemaNove(verzija)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _stanje.value = StanjeAzuriranja.Greska(
                    "Nema veze sa internetom ili GitHub trenutno ne odgovara.",
                )
            }
        }
    }

    fun preuzmi() {
        val dostupno = _stanje.value as? StanjeAzuriranja.Dostupno ?: return
        preuzmi(dostupno.izdanje)
    }

    fun ponovi() {
        val greska = _stanje.value as? StanjeAzuriranja.Greska ?: return
        if (greska.izdanje != null) preuzmi(greska.izdanje) else proveri()
    }

    private fun preuzmi(izdanje: Izdanje) {
        if (posao?.isActive == true) return
        posao = viewModelScope.launch {
            _stanje.value = StanjeAzuriranja.Preuzima(null)
            try {
                val fajl = PreuzimanjeAzuriranja.preuzmi(kontekst, izdanje) { procenat ->
                    _stanje.value = StanjeAzuriranja.Preuzima(procenat)
                }
                val greska = ProveraApk.greska(kontekst, fajl)
                if (greska == null) {
                    _stanje.value = StanjeAzuriranja.Preuzeto(izdanje.verzija, fajl)
                } else {
                    fajl.delete()
                    _stanje.value = StanjeAzuriranja.Greska(greska, izdanje)
                }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _stanje.value = StanjeAzuriranja.Greska(
                    "Preuzimanje nije uspelo. Proveri vezu i pokušaj ponovo.",
                    izdanje,
                )
            }
        }
    }

    fun instaliraj() {
        val preuzeto = _stanje.value as? StanjeAzuriranja.Preuzeto ?: return
        if (!preuzeto.fajl.exists()) {
            _stanje.value = StanjeAzuriranja.Greska(
                "Preuzeti fajl više nije dostupan. Proveri ponovo.",
            )
            return
        }
        if (!InstalacijaApk.moze(kontekst)) {
            InstalacijaApk.otvoriPodesavanjaDozvole(kontekst)
            _stanje.value = preuzeto.copy(
                poruka = "Dozvoli instalaciju iz Mozgalice, pa ponovo dodirni Instaliraj.",
            )
            return
        }
        try {
            InstalacijaApk.instaliraj(kontekst, preuzeto.fajl)
            _stanje.value = preuzeto.copy(poruka = null)
        } catch (_: Exception) {
            _stanje.value = preuzeto.copy(
                poruka = "Instalater nije otvoren. Pokušaj ponovo.",
            )
        }
    }

    private fun verzijaIzImena(fajl: File): String =
        fajl.name.removePrefix("Mozgalica-").removeSuffix(".apk")
}
