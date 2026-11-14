package io.github.mlsivanovic.mozgalica.kviz

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.toRoute
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.mlsivanovic.mozgalica.di.imaVezu
import io.github.mlsivanovic.mozgalica.navigacija.KvizRuta
import io.github.mlsivanovic.mozgalica.navigacija.ucitajUgovor
import io.github.mlsivanovic.mozgalica.podaci.KvizMetaOdgovor
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.PitanjeZaDete
import io.github.mlsivanovic.mozgalica.podaci.RezultatOdgovor
import io.github.mlsivanovic.mozgalica.podaci.kviz.FazaKviza
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodPokusaja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodSaveta
import io.github.mlsivanovic.mozgalica.podaci.kviz.KvizSinhronizacija
import io.github.mlsivanovic.mozgalica.podaci.kviz.OdlukaCheckpointa
import io.github.mlsivanovic.mozgalica.podaci.kviz.ProfilniSat
import io.github.mlsivanovic.mozgalica.podaci.kviz.RezimTajmera
import io.github.mlsivanovic.mozgalica.podaci.kviz.SkladistePokusaja
import io.github.mlsivanovic.mozgalica.podaci.kviz.SnimakPokusaja
import io.github.mlsivanovic.mozgalica.podaci.kviz.StanjePokusaja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IzvorKviza
import io.github.mlsivanovic.mozgalica.podaci.kviz.odlukaCheckpointa
import io.github.mlsivanovic.mozgalica.podaci.kviz.odgovorJePrazan
import io.github.mlsivanovic.mozgalica.podaci.kviz.preostaloDoRoka
import io.github.mlsivanovic.mozgalica.podaci.kviz.prviNeodgovoren
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciPokusaj
import io.github.mlsivanovic.mozgalica.podaci.kviz.rezimTajmera
import io.github.mlsivanovic.mozgalica.podaci.kviz.serverOffsetMs
import io.github.mlsivanovic.mozgalica.podaci.kviz.spojiPreostalo
import io.github.mlsivanovic.mozgalica.podaci.kviz.spojiSaServerom
import io.github.mlsivanovic.mozgalica.podaci.kviz.upisiHintCisto
import io.github.mlsivanovic.mozgalica.podaci.kviz.upisiOdgovorCisto
import io.github.mlsivanovic.mozgalica.podaci.kviz.isoUMilisekunde
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaAplikacije
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class KvizUi(
    val faza: FazaKviza = FazaKviza.ULAZ,
    val ucitavaMeta: Boolean = true,
    val pokrece: Boolean = false,
    val greska: String? = null,
    val meta: KvizMetaOdgovor? = null,
    val pitanja: List<PitanjeZaDete> = emptyList(),
    val stanje: StanjePokusaja? = null,
    val indeks: Int = 0,
    val naMrezi: Boolean = true,
    val preostaloSekundi: Int? = null,
    val upozorenje: Boolean = false,
    val pregled: Boolean = false,
    val porukaSaveta: String? = null,
    val trazimSavet: Boolean = false,
    val rezultat: RezultatOdgovor? = null,
    val rezultatSkriven: Boolean = false,
    val skriveniAccessMode: String? = null,
    val skriveniProfilToken: String? = null,
    val objasnjenja: Boolean = false,
    val probni: Boolean = false,
    val ime: String = "",
    val oznaka: String = "",
    val tekstFokus: Boolean = false,
    val preostaloSavetaSaServera: Int? = null,
)

@HiltViewModel
class KvizViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val skladiste: SkladistePokusaja,
    private val izvor: IzvorKviza,
    private val podesavanja: PodesavanjaAplikacije,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val token: String = savedStateHandle.toRoute<KvizRuta>().token
    private val ui = MutableStateFlow(KvizUi())
    val stanje: StateFlow<KvizUi> = ui

    private var probni = false
    private var probnaVeza = false
    private var vidljivo = true
    private var satPosao: Job? = null
    private var satPokrenut = false
    private var profilniSat: ProfilniSat? = null
    private var preostaloTekuce: Int? = null
    private var mrezniPoziv: ConnectivityManager.NetworkCallback? = null

    init {
        viewModelScope.launch {
            skladiste.posmatraj(token).collect { snimak ->
                ui.update { staro ->
                    val metaStigla = snimak?.meta != null
                    staro.copy(
                        faza = snimak?.faza ?: staro.faza,
                        meta = snimak?.meta ?: staro.meta,
                        pitanja = snimak?.pitanja?.takeIf { it.isNotEmpty() } ?: staro.pitanja,
                        stanje = snimak?.stanje ?: staro.stanje,
                        rezultat = snimak?.rezultat,
                        rezultatSkriven = snimak?.rezultatSkriven == true,
                        skriveniAccessMode = snimak?.skriveniAccessMode,
                        skriveniProfilToken = snimak?.skriveniProfilToken,
                        preostaloSavetaSaServera = snimak?.preostaloSavetaSaServera ?: staro.preostaloSavetaSaServera,
                        ucitavaMeta = if (metaStigla) false else staro.ucitavaMeta,
                    )
                }
                if (snimak?.faza == FazaKviza.RESAVANJE && !satPokrenut) {
                    satPokrenut = true
                    pokreniSat(snimak)
                }
            }
        }
        viewModelScope.launch { ucitajUlaz() }
    }

    fun ime(vrednost: String) = ui.update { it.copy(ime = vrednost.take(60)) }

    fun oznaka(vrednost: String) = ui.update { it.copy(oznaka = vrednost.take(60)) }

    fun indeks(vrednost: Int) {
        ui.update { if (it.indeks == vrednost) it else it.copy(indeks = vrednost, porukaSaveta = null) }
    }

    fun tekstFokus(fokus: Boolean) = ui.update { it.copy(tekstFokus = fokus) }

    fun pregled(otvoren: Boolean) = ui.update { it.copy(pregled = otvoren) }

    fun zatvoriUpozorenje() = ui.update { it.copy(upozorenje = false) }

    fun pokreni() {
        val meta = ui.value.meta ?: return
        if (meta.accessMode != "profile" && meta.requireName && ui.value.ime.isBlank()) {
            ui.update { it.copy(greska = "Unesi svoje ime pre početka.") }
            return
        }
        if (meta.accessMode != "profile" && meta.requireLabel && ui.value.oznaka.isBlank()) {
            ui.update { it.copy(greska = "Popuni ${(meta.labelName ?: "oznaku")} pre početka.") }
            return
        }
        viewModelScope.launch {
            ui.update { it.copy(pokrece = true, greska = null) }
            val lokalno = skladiste.procitaj(token)?.stanje
            val ishod = if (probni) {
                val ime = if (meta.attemptState == "in_progress" && lokalno != null) "resume_attempt.json" else "start_attempt.json"
                protumaciPokusaj(context.ucitajUgovor(ime))
            } else if (meta.attemptState == "in_progress" && lokalno != null) {
                val nastavak = izvor.nastavi(lokalno.attemptToken)
                if (nastavak is IshodPokusaja.Uspesan) nastavak else zapocniNaServeru(meta)
            } else {
                zapocniNaServeru(meta)
            }
            when (ishod) {
                is IshodPokusaja.Uspesan -> primeniPokusaj(lokalno, ishod.pokusaj)
                is IshodPokusaja.Odbijen -> ui.update { it.copy(pokrece = false, greska = porukaKviza(ishod.kod)) }
                IshodPokusaja.Neuspesan -> ui.update {
                    it.copy(pokrece = false, greska = "Nije uspelo pokretanje kviza. Pokušaj ponovo.")
                }
            }
        }
    }

    fun odgovor(pitanjeId: String, vrednost: OdgovorDeteta) {
        viewModelScope.launch {
            skladiste.izmeni(token) { snimak ->
                val stanje = snimak.stanje ?: return@izmeni snimak
                snimak.copy(stanje = upisiOdgovorCisto(stanje, pitanjeId, vrednost))
            }
            if (!probni) KvizRad.zakazi(context, odmah = false)
        }
    }

    fun zatraziPredaju() {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        val praznih = trenutno.pitanja.count { odgovorJePrazan(stanje.answers[it.id]?.answer) }
        if (praznih > 0) ui.update { it.copy(upozorenje = true) } else predaj()
    }

    fun idiNaPrvoPrazno() {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        val indeks = trenutno.pitanja.indexOfFirst { odgovorJePrazan(stanje.answers[it.id]?.answer) }
        ui.update { it.copy(upozorenje = false, pregled = false, indeks = if (indeks >= 0) indeks else it.indeks) }
    }

    fun predaj() {
        satPosao?.cancel()
        satPokrenut = true
        viewModelScope.launch {
            ui.update { it.copy(upozorenje = false, pokrece = true) }
            val sekunde = preostaloTekuce
            skladiste.izmeni(token) { snimak ->
                snimak.copy(
                    predajaCeka = true,
                    faza = FazaKviza.CEKA,
                    preostaloProfil = sekunde ?: snimak.preostaloProfil,
                    checkpointSekunde = if (snimak.stanje?.accessMode == "profile") sekunde ?: snimak.checkpointSekunde else snimak.checkpointSekunde,
                )
            }
            if (!probni) KvizRad.zakazi(context, odmah = true)
            ui.update { it.copy(pokrece = false) }
        }
    }

    fun vratiProbnuVezu() {
        if (!probni) return
        viewModelScope.launch {
            probnaVeza = true
            ui.update { it.copy(pokrece = true, naMrezi = true) }
            KvizSinhronizacija(skladiste, SnimakIzvor { context.ucitajUgovor(it) }, veza = { true }).izvrsi(token)
            ui.update { it.copy(pokrece = false) }
        }
    }

    fun savet(pitanjeId: String) {
        val stanje = ui.value.stanje ?: return
        if (probni || !ui.value.naMrezi) {
            ui.update { it.copy(porukaSaveta = "Savet traži vezu.") }
            return
        }
        viewModelScope.launch {
            ui.update { it.copy(trazimSavet = true, porukaSaveta = null) }
            val poruka = when (val odgovor = izvor.savet(stanje.attemptToken, pitanjeId)) {
                is IshodSaveta.Otkljucan -> {
                    skladiste.izmeni(token) { snimak ->
                        val osnova = snimak.stanje ?: return@izmeni snimak
                        snimak.copy(
                            stanje = upisiHintCisto(osnova, pitanjeId, odgovor.odgovor.hint, odgovor.odgovor.hintsUsed),
                            preostaloSavetaSaServera = odgovor.odgovor.remaining,
                        )
                    }
                    null
                }
                is IshodSaveta.Odbijen -> if (odgovor.kod == "limit_reached") {
                    "Iskoristio/la si sve savete za ovaj pokušaj."
                } else {
                    "Savet trenutno nije dostupan."
                }
                IshodSaveta.Neuspesan -> "Savet traži vezu."
            }
            ui.update { it.copy(trazimSavet = false, porukaSaveta = poruka) }
        }
    }

    fun otvoriObjasnjenja() {
        ui.update { it.copy(objasnjenja = true) }
        viewModelScope.launch {
            skladiste.izmeni(token) { it.copy(objasnjenjaCekaju = true) }
            if (probni && probnaVeza) {
                KvizSinhronizacija(skladiste, SnimakIzvor { context.ucitajUgovor(it) }, veza = { true }).izvrsi(token)
            } else if (!probni) {
                KvizRad.zakazi(context, odmah = true)
            }
        }
    }

    fun noviPokusaj() {
        viewModelScope.launch {
            satPosao?.cancel()
            satPokrenut = false
            skladiste.izmeni(token) {
                it.copy(
                    stanje = null,
                    pitanja = emptyList(),
                    predajaCeka = false,
                    rezultat = null,
                    rezultatSkriven = false,
                    faza = FazaKviza.ULAZ,
                    checkpointSekunde = null,
                )
            }
            ui.update { it.copy(objasnjenja = false, indeks = 0, greska = null) }
        }
    }

    fun vidljivost(vidljiv: Boolean) {
        val bioVidljiv = vidljivo
        vidljivo = vidljiv
        if (bioVidljiv && !vidljiv) {
            profilniSat?.sakrij()?.checkpoint?.let { zapamtiCheckpoint(it) }
            napusti()
        }
    }

    fun napusti() {
        val sekunde = preostaloTekuce
        viewModelScope.launch {
            if (sekunde != null && ui.value.stanje?.accessMode == "profile" && ui.value.faza == FazaKviza.RESAVANJE) {
                skladiste.izmeni(token) { it.copy(preostaloProfil = sekunde, checkpointSekunde = sekunde) }
            }
            if (!probni && ui.value.faza == FazaKviza.RESAVANJE) KvizRad.zakazi(context, odmah = true)
        }
    }

    override fun onCleared() {
        mrezniPoziv?.let { poziv ->
            runCatching { context.getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(poziv) }
        }
        super.onCleared()
    }

    private suspend fun ucitajUlaz() {
        probni = podesavanja.probniPrikaz().first()
        ui.update { it.copy(probni = probni, naMrezi = if (probni) false else imaVezu(context)) }
        val postojeci = skladiste.procitaj(token)
        if (probni) {
            when (val meta = protumaciMeta(context.ucitajUgovor("get_quiz_by_token.json"))) {
                is IshodMeta.Uspesna -> skladiste.izmeni(token) { it.copy(meta = meta.meta) }
                else -> ui.update { it.copy(ucitavaMeta = false, greska = "Probni podaci nisu dostupni u ovoj gradnji.") }
            }
            return
        }
        if (postojeci?.predajaCeka == true) KvizRad.zakazi(context, odmah = true)
        val lokalnoStanje = postojeci?.stanje
        if (lokalnoStanje != null && postojeci.faza == FazaKviza.RESAVANJE) {
            when (val nastavak = izvor.nastavi(lokalnoStanje.attemptToken)) {
                is IshodPokusaja.Uspesan -> primeniPokusaj(lokalnoStanje, nastavak.pokusaj, tiho = true)
                else -> Unit
            }
        }
        when (val meta = izvor.meta(token)) {
            is IshodMeta.Uspesna -> skladiste.izmeni(token) { it.copy(meta = meta.meta) }
            is IshodMeta.Odbijena -> if (postojeci?.meta == null) {
                ui.update { it.copy(ucitavaMeta = false, greska = porukaKviza(meta.kod)) }
            }
            IshodMeta.Neuspesna -> if (postojeci?.meta == null) {
                ui.update { it.copy(ucitavaMeta = false, greska = "Nema veze. Kviz nije sačuvan na uređaju.") }
            } else {
                ui.update { it.copy(ucitavaMeta = false) }
            }
        }
        pratiMrezu()
    }

    private suspend fun zapocniNaServeru(meta: KvizMetaOdgovor): IshodPokusaja {
        val ime = if (meta.accessMode == "profile") meta.childName.orEmpty() else ui.value.ime.trim()
        val oznaka = if (meta.accessMode == "profile") null else ui.value.oznaka.trim().ifBlank { null }
        return izvor.zapocni(token, ime, oznaka)
    }

    private suspend fun primeniPokusaj(lokalno: StanjePokusaja?, server: io.github.mlsivanovic.mozgalica.podaci.PokusajOdgovor, tiho: Boolean = false) {
        if (server.childName.isNullOrBlank()) {
            ui.update { it.copy(pokrece = false, greska = "Server nije vratio ime za ovaj pokušaj. Pokušaj ponovo.") }
            return
        }
        val isti = lokalno != null && lokalno.attemptToken == server.attemptToken
        val baza = if (isti) {
            lokalno
        } else {
            StanjePokusaja(
                attemptToken = server.attemptToken,
                childName = server.childName ?: "",
                accessMode = server.accessMode,
                profileToken = server.profileToken,
            )
        }
        val spojeno = spojiSaServerom(baza, server)
        val offset = runCatching { serverOffsetMs(server.serverNow, System.currentTimeMillis()) }.getOrDefault(0L)
        val lokalnoPreostalo = if (isti) skladiste.procitaj(token)?.preostaloProfil else null
        val preostalo = spojiPreostalo(lokalnoPreostalo, if (server.accessMode == "profile") server.remainingSeconds else null)
        skladiste.izmeni(token) {
            it.copy(
                stanje = spojeno,
                pitanja = server.questions,
                deadlineAt = server.deadlineAt,
                preostaloProfil = preostalo,
                serverOffsetMs = offset,
                faza = FazaKviza.RESAVANJE,
                predajaCeka = false,
                rezultat = null,
                rezultatSkriven = false,
            )
        }
        val indeks = prviNeodgovoren(server.questions.map { pitanje -> pitanje.id }, spojeno)
        ui.update { it.copy(pokrece = false, greska = null, indeks = if (tiho) it.indeks else indeks) }
    }

    private fun pokreniSat(snimak: SnimakPokusaja) {
        satPosao?.cancel()
        val stanje = snimak.stanje ?: return
        val rezim = rezimTajmera(stanje.accessMode, snimak.deadlineAt, snimak.preostaloProfil ?: stanje.let { snimak.preostaloProfil })
        satPosao = viewModelScope.launch {
            when (rezim) {
                RezimTajmera.PROFILNI -> {
                    val sat = ProfilniSat(snimak.preostaloProfil ?: 0)
                    profilniSat = sat
                    preostaloTekuce = sat.preostalo
                    ui.update { it.copy(preostaloSekundi = sat.preostalo) }
                    while (isActive) {
                        delay(1_000)
                        val korak = sat.otkucaj(System.currentTimeMillis(), vidljivo)
                        preostaloTekuce = korak.preostalo
                        ui.update { it.copy(preostaloSekundi = korak.preostalo) }
                        korak.checkpoint?.let { zapamtiCheckpoint(it) }
                        if (korak.istekao) {
                            predaj()
                            break
                        }
                    }
                }
                RezimTajmera.ROK -> {
                    val deadline = snimak.deadlineAt?.let { tekst -> runCatching { isoUMilisekunde(tekst) }.getOrNull() } ?: return@launch
                    while (isActive) {
                        val preostalo = preostaloDoRoka(deadline, snimak.serverOffsetMs, System.currentTimeMillis())
                        ui.update { it.copy(preostaloSekundi = preostalo.coerceAtLeast(0)) }
                        if (preostalo <= 0) {
                            predaj()
                            break
                        }
                        delay(500)
                    }
                }
                RezimTajmera.NEMA -> ui.update { it.copy(preostaloSekundi = null) }
            }
        }
    }

    private fun zapamtiCheckpoint(sekunde: Int) {
        val salji = odlukaCheckpointa(sekunde, naMrezi = !probni && imaVezu(context))
        viewModelScope.launch {
            skladiste.izmeni(token) { it.copy(preostaloProfil = sekunde, checkpointSekunde = sekunde) }
            if (salji is OdlukaCheckpointa.Posalji) KvizRad.zakazi(context, odmah = true)
        }
    }

    private fun pratiMrezu() {
        val manager = context.getSystemService(ConnectivityManager::class.java)
        val poziv = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                ui.update { it.copy(naMrezi = true) }
                if (!probni) KvizRad.zakazi(context, odmah = true)
            }

            override fun onLost(network: Network) {
                ui.update { it.copy(naMrezi = false) }
            }
        }
        mrezniPoziv = poziv
        runCatching { manager.registerDefaultNetworkCallback(poziv) }
    }
}

fun porukaKviza(kod: String?): String = when (kod) {
    "not_found" -> "Ovaj link ne postoji. Proveri da li si ga ispravno otkucao/la ili zalepio/la."
    "inactive" -> "Ovaj link je deaktiviran."
    "expired" -> "Ovom linku je istekao rok važenja."
    "no_attempts_left" -> "Iskorišćeni su svi dozvoljeni pokušaji za ovaj kviz."
    "name_required" -> "Unesi svoje ime."
    "no_questions" -> "Ovaj kviz još nema pitanja."
    "too_many_tries" -> "Previše pokušaja sa ovog linka. Obratite se osobi koja vam je poslala link."
    "already_completed" -> "Ovaj kviz je već završen i nalazi se u prethodnim rezultatima."
    else -> "Nešto nije u redu sa ovim linkom."
}

fun tekstNeodgovorenih(broj: Int): String = when (broj) {
    1 -> "Ostalo je 1 neodgovoreno pitanje."
    else -> "Ostalo je $broj neodgovorenih."
}
