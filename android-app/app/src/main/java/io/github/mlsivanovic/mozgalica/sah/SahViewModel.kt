package io.github.mlsivanovic.mozgalica.sah

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.navigation.toRoute
import androidx.lifecycle.viewModelScope
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.PieceType
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.mlsivanovic.mozgalica.navigacija.SahRuta
import io.github.mlsivanovic.mozgalica.podaci.SahStanjeOdgovor
import io.github.mlsivanovic.mozgalica.podaci.sah.IshodSaha
import io.github.mlsivanovic.mozgalica.podaci.sah.IzvorSaha
import io.github.mlsivanovic.mozgalica.podaci.sah.SahAkcija
import io.github.mlsivanovic.mozgalica.podaci.sah.SahPotezUnos
import java.util.UUID
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.launch

data class EfekatSaha(
    val id: Long,
    val potez: Boolean,
    val uzimanje: Boolean,
    val sah: Boolean,
    val kraj: Boolean,
)

data class SahUi(
    val ucitava: Boolean = true,
    val stanje: SahStanjeOdgovor? = null,
    val greska: String? = null,
    val obavestenje: String? = null,
    val radi: Boolean = false,
    val faza: SahFaza = SahFaza.MIRUJE,
    val prikazaniFen: String? = null,
    val prikazaniPoslednji: PotezPolja? = null,
    val najavljeniPotez: PotezPolja? = null,
    val animacija: PotezPolja? = null,
    val trajanjeAnimacije: Int = PODRAZUMEVANA_ANIMACIJA_MS.toInt(),
    val primljenoAt: Long = System.currentTimeMillis(),
    val sada: Long = System.currentTimeMillis(),
    val naMrezi: Boolean = true,
    val pregledPly: Int? = null,
    val biraElo: Boolean = false,
    val potvrdaPredaje: Boolean = false,
    val efekat: EfekatSaha? = null,
)

@HiltViewModel
class SahViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val izvor: IzvorSaha,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val token: String = savedStateHandle.toRoute<SahRuta>().token
    private val ui = MutableStateFlow(SahUi())
    val stanje: StateFlow<SahUi> = ui

    private val _noviToken = MutableStateFlow<String?>(null)
    val noviToken: StateFlow<String?> = _noviToken

    private var posaoRacunara: Job? = null
    private var posaoSata: Job? = null
    private var mrezniPoziv: ConnectivityManager.NetworkCallback? = null
    private var akcijaTok = 0L
    private var efekatId = 0L
    private var istekPoslat = false

    init {
        pratiMrezu()
        pokreniSat()
        osvezi()
    }

    fun osvezi() {
        if (ui.value.radi) return
        viewModelScope.launch {
            ui.update { it.copy(ucitava = it.stanje == null, greska = null) }
            when (val ishod = ucitajStanje()) {
                is IshodSaha.Uspesan -> {
                    postavi(ishod.stanje)
                    ui.update { it.copy(ucitava = false) }
                }
                is IshodSaha.Odbijen -> {
                    ui.update { it.copy(ucitava = false, greska = porukaSaha(ishod.kod)) }
                }
                IshodSaha.Neuspesan -> ui.update {
                    it.copy(ucitava = false, greska = "Nema veze sa serverom. Pokušaj ponovo.")
                }
            }
        }
    }

    fun pocni() {
        val stanje = ui.value.stanje ?: return
        if (ui.value.radi || stanje.status != "assigned") return
        val prethodno = stanje.moves.size
        val tok = ++akcijaTok
        viewModelScope.launch {
            ui.update { it.copy(radi = true, faza = SahFaza.RAZMISLJANJE, greska = null) }
            when (val ishod = akcija(SahAkcija.POCNI, stanje.revision)) {
                is IshodSaha.Uspesan -> prikaziRacunarovPotez(ishod.stanje, prethodno, tok)
                is IshodSaha.Odbijen -> odbij(ishod.kod)
                IshodSaha.Neuspesan -> prekini("Nema veze sa serverom. Pokušaj ponovo.")
            }
            if (tok == akcijaTok) ui.update { it.copy(radi = false, faza = SahFaza.MIRUJE) }
        }
    }

    fun odigrajPotez(potez: SahPotezUnos) {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        if (trenutno.radi || stanje.status != "in_progress" || stanje.turnColor != stanje.childColor) return
        val fen = trenutno.prikazaniFen ?: stanje.fen
        val tabla = Board().apply { loadFromFen(fen) }
        val from = square(potez.from) ?: return
        val to = square(potez.to) ?: return
        val promocija = potez.promotion?.let { slovo ->
            val tip = when (slovo) {
                "q" -> PieceType.QUEEN
                "r" -> PieceType.ROOK
                "b" -> PieceType.BISHOP
                "n" -> PieceType.KNIGHT
                else -> return
            }
            Piece.make(tabla.sideToMove, tip)
        }
        val move = tabla.legalMoves().firstOrNull {
            it.from == from && it.to == to &&
                (promocija == null || it.promotion?.pieceType == promocija.pieceType)
        } ?: return
        val uzimanje = tabla.getPiece(to) != Piece.NONE
        val kopija = Board().apply { loadFromFen(fen); doMove(move) }
        val polja = PotezPolja(potez.from, potez.to)
        ui.update {
            it.copy(
                prikazaniFen = kopija.fen,
                prikazaniPoslednji = polja,
                animacija = polja,
                trajanjeAnimacije = PODRAZUMEVANA_ANIMACIJA_MS.toInt(),
                radi = true,
                faza = SahFaza.CUVANJE,
                greska = null,
                obavestenje = null,
            )
        }
        val tok = ++akcijaTok
        viewModelScope.launch {
            when (val ishod = akcija(SahAkcija.DETE_POTEZ, stanje.revision, potez)) {
                is IshodSaha.Uspesan -> {
                    val novo = ishod.stanje
                    if (novo.fen != kopija.fen) {
                        postavi(novo)
                    } else {
                        // Optimistična tabla već ima tačan FEN; sačuvaj je da animacija ne trza.
                        ui.update {
                            it.copy(
                                stanje = novo,
                                primljenoAt = System.currentTimeMillis(),
                                sada = System.currentTimeMillis(),
                                greska = null,
                            )
                        }
                        istekPoslat = false
                        zakaziRacunar()
                    }
                    ui.update {
                        it.copy(
                            radi = false,
                            faza = SahFaza.MIRUJE,
                            efekat = efekat(potez = true, uzimanje = uzimanje, sah = kopija.isKingAttacked(), kraj = novo.status == "completed"),
                        )
                    }
                }
                is IshodSaha.Odbijen -> odbij(ishod.kod)
                IshodSaha.Neuspesan -> prekini("Nema veze sa serverom. Potez nije sačuvan.")
            }
            if (tok == akcijaTok && ui.value.radi && ui.value.faza == SahFaza.MIRUJE) {
                ui.update { it.copy(radi = false) }
            }
        }
    }

    fun ponistiPotez() {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        if (trenutno.radi || !stanje.undoAvailable) return
        posaoRacunara?.cancel()
        val tok = ++akcijaTok
        viewModelScope.launch {
            ui.update { it.copy(radi = true, faza = SahFaza.PONISTAVANJE, greska = null) }
            when (val ishod = akcija(SahAkcija.PONISTI, stanje.revision)) {
                is IshodSaha.Uspesan -> {
                    postavi(ishod.stanje)
                    ui.update {
                        it.copy(
                            obavestenje = "Potez je poništen. Sada ponovo izaberi potez pažljivo.",
                            radi = false,
                            faza = SahFaza.MIRUJE,
                        )
                    }
                }
                is IshodSaha.Odbijen -> odbij(ishod.kod)
                IshodSaha.Neuspesan -> prekini("Nema veze sa serverom. Potez nije poništen.")
            }
            if (tok == akcijaTok) ui.update { it.copy(radi = false, faza = SahFaza.MIRUJE) }
        }
    }

    fun predaj() {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        if (trenutno.radi || stanje.status != "in_progress" || stanje.turnColor != stanje.childColor) return
        ui.update { it.copy(potvrdaPredaje = false) }
        val tok = ++akcijaTok
        viewModelScope.launch {
            ui.update { it.copy(radi = true, faza = SahFaza.CUVANJE, greska = null) }
            when (val ishod = akcija(SahAkcija.PREDAJ, stanje.revision)) {
                is IshodSaha.Uspesan -> postavi(ishod.stanje)
                is IshodSaha.Odbijen -> odbij(ishod.kod)
                IshodSaha.Neuspesan -> prekini("Nema veze sa serverom. Predaja nije sačuvana.")
            }
            if (tok == akcijaTok) ui.update { it.copy(radi = false, faza = SahFaza.MIRUJE) }
        }
    }

    fun pokusajPonovo(elo: Int) {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        if (trenutno.radi || !stanje.retryAvailable) return
        val tok = ++akcijaTok
        viewModelScope.launch {
            ui.update { it.copy(radi = true, faza = SahFaza.CUVANJE, greska = null, biraElo = false) }
            when (val ishod = akcija(SahAkcija.PONOVO, stanje.revision, elo = elo)) {
                is IshodSaha.Uspesan -> {
                    _noviToken.value = ishod.stanje.playToken
                }
                is IshodSaha.Odbijen -> odbij(ishod.kod)
                IshodSaha.Neuspesan -> prekini("Nema veze sa serverom. Ponovni pokušaj nije uspeo.")
            }
            if (tok == akcijaTok) ui.update { it.copy(radi = false, faza = SahFaza.MIRUJE) }
        }
    }

    fun potrosiNoviToken() { _noviToken.value = null }

    fun biraElo(vrednost: Boolean) { ui.update { it.copy(biraElo = vrednost) } }

    fun potvrdaPredaje(vrednost: Boolean) { ui.update { it.copy(potvrdaPredaje = vrednost) } }

    fun idiNaPly(ply: Int) {
        val stanje = ui.value.stanje ?: return
        if (stanje.status != "completed") return
        ui.update { it.copy(pregledPly = ogranicenPlyPregleda(ply, stanje.moves.size)) }
    }

    fun vidljivost(vidljiv: Boolean) {
        if (!vidljiv) {
            posaoRacunara?.cancel()
        } else if (!ui.value.radi && ui.value.stanje?.status == "in_progress") {
            osvezi()
        }
    }

    private suspend fun prikaziRacunarovPotez(novo: SahStanjeOdgovor, prethodno: Int, tok: Long) {
        val poslednji = novo.moves.lastOrNull()
        if (poslednji == null || novo.moves.size <= prethodno || poslednji.player != "engine") {
            postavi(novo)
            return
        }
        val polja = poljaPoteza(poslednji.uci)
        val trenutno = ui.value.stanje
        if (trenutno != null && novo.revision < trenutno.revision) return
        val tablaPre = trenutno?.fen?.let { Board().apply { loadFromFen(it) } }
        val tablaPosle = Board().apply { loadFromFen(novo.fen) }
        ui.update {
            it.copy(
                stanje = novo,
                primljenoAt = System.currentTimeMillis(),
                sada = System.currentTimeMillis(),
                greska = null,
                najavljeniPotez = polja,
                faza = SahFaza.NAJAVA,
                ucitava = false,
            )
        }
        delay(NAJAVA_POTEZA_MS)
        if (tok != akcijaTok) return
        ui.update {
            it.copy(
                najavljeniPotez = null,
                prikazaniFen = novo.fen,
                prikazaniPoslednji = polja,
                animacija = polja,
                trajanjeAnimacije = ANIMACIJA_RACUNARA_MS.toInt(),
                faza = SahFaza.ANIMACIJA,
            )
        }
        delay(ANIMACIJA_RACUNARA_MS)
        if (tok != akcijaTok) return
        val uzimanje = tablaPre != null && polja != null && tablaPre.getPiece(square(polja.to)) != Piece.NONE
        ui.update {
            it.copy(
                animacija = polja,
                faza = SahFaza.MIRUJE,
                efekat = efekat(
                    potez = true,
                    uzimanje = uzimanje,
                    sah = tablaPosle.isKingAttacked(),
                    kraj = novo.status == "completed",
                ),
            )
        }
        istekPoslat = false
        zakaziRacunar()
    }

    private fun zakaziRacunar() {
        posaoRacunara?.cancel()
        val stanje = ui.value.stanje ?: return
        if (stanje.status != "in_progress" || stanje.turnColor == stanje.childColor) return
        posaoRacunara = viewModelScope.launch {
            delay(PAUZA_PRE_RACUNARA_MS)
            if (ui.value.radi) return@launch
            izvrsiRacunar()
        }
    }

    private fun izvrsiRacunar() {
        val trenutno = ui.value
        val stanje = trenutno.stanje ?: return
        if (trenutno.radi || stanje.status != "in_progress" || stanje.turnColor == stanje.childColor) return
        val prethodno = stanje.moves.size
        val tok = ++akcijaTok
        viewModelScope.launch {
            ui.update { it.copy(radi = true, faza = SahFaza.RAZMISLJANJE, greska = null) }
            when (val ishod = akcija(SahAkcija.RACUNAR, stanje.revision)) {
                is IshodSaha.Uspesan -> prikaziRacunarovPotez(ishod.stanje, prethodno, tok)
                is IshodSaha.Odbijen -> odbij(ishod.kod)
                IshodSaha.Neuspesan -> prekini("Nema veze sa serverom. Računar nije odigrao potez.")
            }
            if (tok == akcijaTok) ui.update { it.copy(radi = false, faza = SahFaza.MIRUJE) }
        }
    }

    private fun postavi(novo: SahStanjeOdgovor) {
        val trenutno = ui.value.stanje
        if (trenutno != null && novo.revision < trenutno.revision) return
        val sada = System.currentTimeMillis()
        ui.update {
            it.copy(
                stanje = novo,
                ucitava = false,
                greska = null,
                primljenoAt = sada,
                sada = sada,
                prikazaniFen = novo.fen,
                prikazaniPoslednji = poljaPoteza(novo.moves.lastOrNull()?.uci),
                najavljeniPotez = null,
                animacija = null,
                faza = SahFaza.MIRUJE,
                pregledPly = null,
                biraElo = false,
                obavestenje = null,
            )
        }
        istekPoslat = false
        zakaziRacunar()
    }

    private fun odbij(kod: String?) {
        val poruka = porukaSaha(kod)
        vratiTablu()
        ui.update { it.copy(radi = false, faza = SahFaza.MIRUJE, greska = poruka) }
        viewModelScope.launch { osveziNakonGreske(poruka) }
    }

    private fun prekini(poruka: String) {
        vratiTablu()
        ui.update { it.copy(radi = false, faza = SahFaza.MIRUJE, greska = poruka) }
        viewModelScope.launch { osveziNakonGreske(poruka) }
    }

    // Optimističan potez se vraća na poslednje potvrđeno stanje ako server odbije.
    private fun vratiTablu() {
        ui.update {
            val stanje = it.stanje ?: return@update it
            it.copy(
                prikazaniFen = stanje.fen,
                prikazaniPoslednji = poljaPoteza(stanje.moves.lastOrNull()?.uci),
                najavljeniPotez = null,
                animacija = null,
            )
        }
    }

    private suspend fun osveziNakonGreske(poruka: String) {
        when (val ishod = ucitajStanje()) {
            is IshodSaha.Uspesan -> {
                postavi(ishod.stanje)
                // Osvežavanje ne sme da sakrije razlog zbog kog je akcija odbijena.
                ui.update { it.copy(greska = poruka) }
            }
            else -> Unit
        }
    }

    // Mreža može da visi bez odgovora (npr. wifi se ugasi usred poteza). Bez
    // roka bi `radi` zauvek ostao true, pa se tabla ne bi vratila na potvrđeno stanje.
    private suspend fun ucitajStanje(): IshodSaha =
        withTimeoutOrNull(15_000) { izvor.stanje(token) } ?: IshodSaha.Neuspesan

    private suspend fun akcija(
        vrsta: SahAkcija,
        expectedRevision: Int,
        potez: SahPotezUnos? = null,
        elo: Int? = null,
    ): IshodSaha = withTimeoutOrNull(15_000) {
        izvor.akcija(token, vrsta, expectedRevision, potez, noviRequestId(), elo)
    } ?: IshodSaha.Neuspesan

    private fun pokreniSat() {
        posaoSata?.cancel()
        posaoSata = viewModelScope.launch {
            while (isActive) {
                delay(250)
                val sada = System.currentTimeMillis()
                val trenutno = ui.value
                ui.update { it.copy(sada = sada) }
                val stanje = trenutno.stanje ?: continue
                if (stanje.status != "in_progress" || stanje.clockSeconds == null || trenutno.radi) continue
                val sat = satovi(stanje, trenutno.primljenoAt, sada)
                val aktivno = if (stanje.turnColor == "white") sat.white else sat.black
                if (aktivno != null && aktivno <= 0 && !istekPoslat) {
                    istekPoslat = true
                    osvezi()
                }
            }
        }
    }

    private fun pratiMrezu() {
        val manager = context.getSystemService(ConnectivityManager::class.java)
        val poziv = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                ui.update { it.copy(naMrezi = true) }
                if (!ui.value.radi && ui.value.stanje != null) osvezi()
            }

            override fun onLost(network: Network) {
                ui.update { it.copy(naMrezi = false) }
            }
        }
        mrezniPoziv = poziv
        runCatching { manager.registerDefaultNetworkCallback(poziv) }
    }

    private fun efekat(potez: Boolean, uzimanje: Boolean, sah: Boolean, kraj: Boolean): EfekatSaha =
        EfekatSaha(++efekatId, potez, uzimanje, sah, kraj)

    private fun noviRequestId(): String = UUID.randomUUID().toString()

    override fun onCleared() {
        posaoRacunara?.cancel()
        posaoSata?.cancel()
        mrezniPoziv?.let {
            runCatching { context.getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(it) }
        }
        super.onCleared()
    }
}
