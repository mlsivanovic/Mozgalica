package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine

class ProfilRepozitorijum(
    private val kes: KesProfila,
    private val tokeni: SkladisteTokena,
    private val izvor: IzvorProfila,
    private val podesavanja: PodesavanjaPovezivanja,
) {
    // Samo lokalni podaci. Mreža se ne zove dok neko ne pozove osvezi ili povezi.
    fun posmatraj(): Flow<SacuvaniProfil?> = combine(kes.posmatraj(), podesavanja.izabrani()) { profil, izabrani ->
        if (izabrani == null || profil == null) null else profil
    }

    suspend fun povezi(unos: String): IshodPovezivanja {
        val token = izdvojiProfilniToken(unos)
            ?: return IshodPovezivanja.Greska(PorukePovezivanja.NEPRAVILAN_UNOS)
        return when (val ishod = izvor.ucitaj(token)) {
            is IshodUcitavanja.Uspesan -> sacuvaj(token, ishod.profil)
            IshodUcitavanja.NijePronadjen -> IshodPovezivanja.Greska(PorukePovezivanja.NIJE_PRONADJEN)
            is IshodUcitavanja.Odbijen -> IshodPovezivanja.Greska(ishod.poruka)
            is IshodUcitavanja.Neuspesan -> IshodPovezivanja.Greska(ishod.poruka)
        }
    }

    suspend fun osvezi(): IshodOsvezavanja {
        val token = tokeni.procitaj() ?: return IshodOsvezavanja.NemaTokena
        return when (val ishod = izvor.ucitaj(token)) {
            is IshodUcitavanja.Uspesan -> {
                kes.upisi(ishod.profil)
                IshodOsvezavanja.Osvezen
            }
            IshodUcitavanja.NijePronadjen -> {
                obrisiSve()
                IshodOsvezavanja.ProfilObrisan(PorukePovezivanja.PROFIL_VISE_NE_POSTOJI)
            }
            is IshodUcitavanja.Odbijen -> IshodOsvezavanja.Greska(ishod.poruka)
            is IshodUcitavanja.Neuspesan -> IshodOsvezavanja.Greska(ishod.poruka)
        }
    }

    suspend fun promeniProfil() {
        obrisiSve()
    }

    private suspend fun sacuvaj(token: String, profil: SacuvaniProfil): IshodPovezivanja {
        return try {
            tokeni.upisi(token)
            kes.upisi(profil)
            podesavanja.zapamtiIzabrani()
            IshodPovezivanja.Povezan(profil.ime)
        } catch (e: kotlinx.coroutines.CancellationException) {
            obrisiSve()
            throw e
        } catch (_: Exception) {
            obrisiSve()
            IshodPovezivanja.Greska(PorukePovezivanja.CUVANJE)
        }
    }

    private suspend fun obrisiSve() {
        runCatching { tokeni.obrisi() }
        runCatching { kes.obrisi() }
        runCatching { podesavanja.zaboravi() }
    }
}
