package io.github.mlsivanovic.mozgalica.podaci.kviz

// Red koji WorkManager poziva. Bez veze ne dira mrežu. Predaja ide tek pošto
// save_answers potvrdi baš ove odgovore; submit_attempt šalje p_answers = null.
class KvizSinhronizacija(
    private val skladiste: SkladistePokusaja,
    private val izvor: IzvorKviza,
    private val veza: () -> Boolean,
    private val sat: () -> Long = { System.currentTimeMillis() },
) {
    suspend fun izvrsiSve(): IshodReda {
        if (!veza()) return IshodReda.CekaVezu
        var ceka = false
        for ((token, _) in skladiste.svi()) {
            when (izvrsi(token)) {
                IshodReda.Gotovo -> Unit
                IshodReda.CekaVezu, IshodReda.Privremeno -> ceka = true
            }
        }
        return if (ceka) IshodReda.CekaVezu else IshodReda.Gotovo
    }

    suspend fun izvrsi(kvizToken: String): IshodReda {
        if (!veza()) return IshodReda.CekaVezu
        var snimak = skladiste.procitaj(kvizToken) ?: return IshodReda.Gotovo
        if (!imaPosla(snimak)) return IshodReda.Gotovo

        val stanje = snimak.stanje
        if (stanje != null) {
            val neposlati = nesinhronizovani(stanje)
            if (neposlati.isNotEmpty()) {
                if (!veza()) return IshodReda.CekaVezu
                val vreme = sat()
                when (izvor.sacuvaj(stanje.attemptToken, neposlati)) {
                    is IshodCuvanja.Potvrdeno -> skladiste.izmeni(kvizToken) { sveze ->
                        val osnova = sveze.stanje ?: return@izmeni sveze
                        sveze.copy(stanje = oznaciSinhronizovaneCisto(osnova, neposlati, vreme))
                    }
                    else -> return IshodReda.Privremeno
                }
                snimak = skladiste.procitaj(kvizToken) ?: return IshodReda.Privremeno
            }
        }

        val checkpoint = snimak.checkpointSekunde
        val zaTajmer = snimak.stanje
        if (checkpoint != null && zaTajmer?.accessMode == "profile") {
            if (!veza()) return IshodReda.CekaVezu
            when (val potvrda = izvor.tajmer(zaTajmer.attemptToken, checkpoint)) {
                is IshodTajmera.Potvrden -> {
                    val saServera = potvrda.odgovor.remainingSeconds
                    skladiste.izmeni(kvizToken) {
                        it.copy(
                            checkpointSekunde = null,
                            preostaloProfil = spojiPreostalo(it.preostaloProfil, saServera),
                        )
                    }
                }
                else -> Unit
            }
            snimak = skladiste.procitaj(kvizToken) ?: snimak
        }

        if (snimak.objasnjenjaCekaju && snimak.stanje != null) {
            if (!veza()) return IshodReda.CekaVezu
            when (izvor.objasnjenja(snimak.stanje.attemptToken)) {
                is IshodObjasnjenja.Potvrdeno -> skladiste.izmeni(kvizToken) { it.copy(objasnjenjaCekaju = false) }
                else -> Unit
            }
            snimak = skladiste.procitaj(kvizToken) ?: snimak
        }

        if (snimak.predajaCeka && snimak.stanje != null) {
            snimak = dopuniAkoTreba(kvizToken, snimak) ?: return IshodReda.Privremeno
            val spremno = snimak.stanje ?: return IshodReda.Privremeno
            if (!sveSinhronizovano(spremno)) return IshodReda.Privremeno
            if (!veza()) return IshodReda.CekaVezu
            when (val predaja = izvor.predaj(spremno.attemptToken)) {
                is IshodPredaje.Prikazan -> skladiste.izmeni(kvizToken) {
                    it.copy(
                        predajaCeka = false,
                        rezultat = predaja.rezultat,
                        rezultatSkriven = false,
                        faza = FazaKviza.REZULTAT,
                    )
                }
                is IshodPredaje.Skriven -> skladiste.izmeni(kvizToken) {
                    it.copy(
                        predajaCeka = false,
                        rezultat = null,
                        rezultatSkriven = true,
                        skriveniAccessMode = predaja.accessMode,
                        skriveniProfilToken = predaja.profileToken,
                        faza = FazaKviza.REZULTAT,
                    )
                }
                else -> return IshodReda.Privremeno
            }
        }
        return IshodReda.Gotovo
    }

    private suspend fun dopuniAkoTreba(kvizToken: String, polazno: SnimakPokusaja): SnimakPokusaja? {
        val stanje = polazno.stanje ?: return polazno
        if (sveSinhronizovano(stanje)) return polazno
        val neposlati = nesinhronizovani(stanje)
        if (neposlati.isEmpty()) return polazno
        if (!veza()) return null
        val vreme = sat()
        when (izvor.sacuvaj(stanje.attemptToken, neposlati)) {
            is IshodCuvanja.Potvrdeno -> skladiste.izmeni(kvizToken) { sveze ->
                val osnova = sveze.stanje ?: return@izmeni sveze
                sveze.copy(stanje = oznaciSinhronizovaneCisto(osnova, neposlati, vreme))
            }
            else -> return null
        }
        return skladiste.procitaj(kvizToken)
    }

    private fun imaPosla(snimak: SnimakPokusaja): Boolean {
        val stanje = snimak.stanje
        val neposlati = stanje != null && nesinhronizovani(stanje).isNotEmpty()
        return neposlati || snimak.predajaCeka || snimak.checkpointSekunde != null || snimak.objasnjenjaCekaju
    }
}
