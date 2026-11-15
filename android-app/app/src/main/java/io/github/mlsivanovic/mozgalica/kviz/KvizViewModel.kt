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
import io.github.mlsivanovic.mozgalica.podaci.PonovniOdgovor
import io.github.mlsivanovic.mozgalica.podaci.PonovnoPitanje
import io.github.mlsivanovic.mozgalica.podaci.RezultatOdgovor
import io.github.mlsivanovic.mozgalica.podaci.kviz.FazaKviza
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodPokusaja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodObjasnjenja
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodPonovnog
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
import io.github.mlsivanovic.mozgalica.podaci.kviz.upisiBelezkuCisto
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

// Isto ograničenje kao u save_attempt_notes (server skraćuje na 2000 znakova)
private const val MAKS_BELEZKA = 2000

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
    val ponovnaPitanja: List<PonovnoPitanje> = emptyList(),
    val ponovniOdgovori: Map<String, OdgovorDeteta> = emptyMap(),
    val ponovniIshod: PonovniOdgovor? = null,
    val ponovniZapocet: Boolean = false,
    val radniList: Boolean = false,
    val ponovniOtvoren: Boolean = false,
    val ponovniIndeks: Int = 0,
    val ponovniRadi: Boolean = false,
    val ponovniGreska: String? = null,
    val ponovniUpozorenje: Boolean = false,
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
                        ponovnaPitanja = snimak?.ponovnaPitanja ?: emptyList(),
                        ponovniOdgovori = snimak?.ponovniOdgovori ?: emptyMap(),
                        ponovniIshod = snimak?.ponovniIshod,
                        ponovniZapocet = snimak?.ponovniZapocet == true,
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

    fun radniList(otvoren: Boolean) = ui.update { it.copy(radniList = otvoren) }

    // Radni listić se upisuje odmah u Room; slanje ide kroz isti offline red kao
    // odgovori, pa tekst preživljava prekid i bez veze.
    fun belezka(pitanjeId: String, tekst: String) {
        viewModelScope.launch {
            skladiste.izmeni(token) { snimak ->
                val stanje = snimak.stanje ?: return@izmeni snimak
                snimak.copy(stanje = upisiBelezkuCisto(stanje, pitanjeId, tekst.take(MAKS_BELEZKA)))
            }
            if (!probni) KvizRad.zakazi(context, odmah = false)
        }
    }

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

    fun ponovniIndeks(vrednost: Int) {
        ui.update { if (it.ponovniIndeks == vrednost) it else it.copy(ponovniIndeks = vrednost, ponovniGreska = null) }
    }

    fun ponovniOdgovor(pitanjeId: String, vrednost: OdgovorDeteta) {
        viewModelScope.launch {
            skladiste.izmeni(token) { snimak ->
                snimak.copy(ponovniOdgovori = snimak.ponovniOdgovori + (pitanjeId to vrednost))
            }
        }
    }

    fun pokreniPonovni() {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        if (!trenutno.naMrezi && !probni) {
            ui.update { it.copy(ponovniOtvoren = true, ponovniGreska = porukaPonovnog(null)) }
            return
        }
        viewModelScope.launch {
            ui.update { it.copy(ponovniRadi = true, ponovniGreska = null, ponovniUpozorenje = false) }
            val zapocet = skladiste.procitaj(token)?.ponovniZapocet == true
            val snimakIzvor = if (probni) SnimakIzvor { context.ucitajUgovor(it) } else null

            if (!probni && !zapocet) {
                // Server mora da zna da su objašnjenja viđena pre nego što dozvoli retry.
                if (izvor.objasnjenja(stanje.attemptToken) !is IshodObjasnjenja.Potvrdeno) {
                    ui.update { it.copy(ponovniRadi = false, ponovniOtvoren = true, ponovniGreska = porukaPonovnog(null)) }
                    return@launch
                }
                skladiste.izmeni(token) { snimak ->
                    snimak.copy(
                        rezultat = snimak.rezultat?.let { rezultat ->
                            rezultat.copy(retry = rezultat.retry.copy(explanationsSeen = true))
                        },
                    )
                }
            }

            val prvi = if (probni) {
                if (zapocet) snimakIzvor!!.nastaviPonovni(stanje.attemptToken)
                else snimakIzvor!!.pripremiPonovni(stanje.attemptToken)
            } else {
                if (zapocet) izvor.nastaviPonovni(stanje.attemptToken) else izvor.pripremiPonovni(stanje.attemptToken)
            }

            // Ponovni pokušaj je možda pokrenut na drugom klijentu (web/native).
            val ishod = if (!probni && prvi is IshodPonovnog.Odbijen && prvi.kod == "already_started") {
                izvor.nastaviPonovni(stanje.attemptToken)
            } else {
                prvi
            }

            when (ishod) {
                is IshodPonovnog.Uspesan -> {
                    val odgovor = ishod.odgovor
                    skladiste.izmeni(token) { snimak ->
                        snimak.copy(
                            ponovnaPitanja = odgovor.questions,
                            ponovniIshod = if (odgovor.submitted) odgovor else null,
                            ponovniZapocet = !odgovor.submitted,
                            ponovniOdgovori = if (zapocet) snimak.ponovniOdgovori else emptyMap(),
                        )
                    }
                    ui.update { it.copy(ponovniRadi = false, ponovniOtvoren = true, ponovniIndeks = 0) }
                }
                is IshodPonovnog.Odbijen -> ui.update {
                    it.copy(ponovniRadi = false, ponovniOtvoren = true, ponovniGreska = porukaPonovnog(ishod.kod))
                }
                IshodPonovnog.Neuspesan -> ui.update {
                    it.copy(ponovniRadi = false, ponovniOtvoren = true, ponovniGreska = porukaPonovnog(null))
                }
            }
        }
    }

    fun predajPonovni() {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        if (trenutno.ponovnaPitanja.isEmpty()) return
        if (!trenutno.naMrezi && !probni) {
            ui.update { it.copy(ponovniGreska = "Predaja ponovnog pokušaja traži vezu.") }
            return
        }
        viewModelScope.launch {
            // Poslednji odgovor se upisuje u Room asinhrono — predaja čita sveže stanje.
            val odgovori = skladiste.procitaj(token)?.ponovniOdgovori ?: trenutno.ponovniOdgovori
            val praznih = trenutno.ponovnaPitanja.count { odgovorJePrazan(odgovori[it.id]) }
            if (praznih > 0) {
                ui.update { it.copy(ponovniUpozorenje = true) }
                return@launch
            }
            ui.update { it.copy(ponovniRadi = true, ponovniGreska = null, ponovniUpozorenje = false) }
            val ishod = if (probni) {
                SnimakIzvor { context.ucitajUgovor(it) }.predajPonovni(stanje.attemptToken, odgovori)
            } else {
                izvor.predajPonovni(stanje.attemptToken, odgovori)
            }
            when (ishod) {
                is IshodPonovnog.Uspesan -> {
                    val odgovor = ishod.odgovor
                    skladiste.izmeni(token) { snimak ->
                        val rezultat = snimak.rezultat?.let { postojeci ->
                            postojeci.copy(
                                starsAwarded = odgovor.starsAwarded ?: postojeci.starsAwarded,
                                retry = postojeci.retry.copy(
                                    available = false,
                                    submitted = true,
                                    allCorrect = odgovor.allCorrect,
                                ),
                            )
                        }
                        snimak.copy(
                            ponovniIshod = odgovor,
                            ponovniZapocet = false,
                            rezultat = rezultat,
                        )
                    }
                    ui.update { it.copy(ponovniRadi = false) }
                }
                is IshodPonovnog.Odbijen -> ui.update {
                    it.copy(ponovniRadi = false, ponovniGreska = porukaPonovnog(ishod.kod))
                }
                IshodPonovnog.Neuspesan -> ui.update {
                    it.copy(ponovniRadi = false, ponovniGreska = "Predaja ponovnog pokušaja traži vezu.")
                }
            }
        }
    }

    fun zatvoriPonovni() {
        ui.update { it.copy(ponovniOtvoren = false, ponovniUpozorenje = false, ponovniGreska = null) }
    }

    fun zatvoriPonovniIshod() {
        viewModelScope.launch {
            skladiste.izmeni(token) {
                it.copy(ponovniIshod = null, ponovnaPitanja = emptyList(), ponovniOdgovori = emptyMap())
            }
            ui.update {
                it.copy(
                    ponovniOtvoren = false,
                    ponovniIshod = null,
                    ponovnaPitanja = emptyList(),
                    ponovniOdgovori = emptyMap(),
                    ponovniGreska = null,
                )
            }
        }
    }

    fun zatvoriPonovniUpozorenje() {
        ui.update { it.copy(ponovniUpozorenje = false) }
    }

    fun idiNaPrvoPraznoPonovno() {
        val trenutno = ui.value
        val indeks = trenutno.ponovnaPitanja.indexOfFirst {
            odgovorJePrazan(trenutno.ponovniOdgovori[it.id])
        }
        ui.update {
            it.copy(
                ponovniUpozorenje = false,
                ponovniIndeks = if (indeks >= 0) indeks else it.ponovniIndeks,
            )
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
                    ponovnaPitanja = emptyList(),
                    ponovniOdgovori = emptyMap(),
                    ponovniIshod = null,
                    ponovniZapocet = false,
                )
            }
            ui.update {
                it.copy(
                    objasnjenja = false,
                    indeks = 0,
                    greska = null,
                    ponovnaPitanja = emptyList(),
                    ponovniOdgovori = emptyMap(),
                    ponovniIshod = null,
                    ponovniZapocet = false,
                    ponovniOtvoren = false,
                    ponovniGreska = null,
                )
            }
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

fun porukaPonovnog(kod: String?): String = when (kod) {
    "explanations_not_seen" -> "Prvo pogledaj objašnjenja netačnih zadataka."
    "already_locked" -> "Ponovni pokušaj je već iskorišćen — kviz je zaključan."
    "no_incorrect" -> "Nema netačnih zadataka za ponovni pokušaj."
    "pending_review" -> "Rezultat još čeka pregled odrasle osobe."
    "not_allowed" -> "Ponovni pokušaj je dostupan samo u matematici."
    "already_started" -> "Ponovni pokušaj je već pokrenut."
    "not_started" -> "Ponovni pokušaj nije pokrenut."
    else -> "Ponovni pokušaj trenutno nije dostupan. Proveri internet vezu."
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
