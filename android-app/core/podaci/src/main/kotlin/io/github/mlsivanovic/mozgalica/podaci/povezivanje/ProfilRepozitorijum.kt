package io.github.mlsivanovic.mozgalica.podaci.povezivanje

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine

class ProfilRepozitorijum(
    private val kes: KesProfila,
    private val tokeni: SkladisteTokena,
    private val izvor: IzvorProfila,
    private val podesavanja: PodesavanjaPovezivanja,
    private val kesSadrzaja: KesSadrzaja = PrazanKesSadrzaja(),
    private val izvorSadrzaja: IzvorSadrzaja = PrazanIzvorSadrzaja,
) {
    // Samo lokalni podaci. Mreža se ne zove dok neko ne pozove osvezi ili povezi.
    fun posmatraj(): Flow<SacuvaniProfil?> = combine(kes.posmatraj(), podesavanja.izabrani()) { profil, izabrani ->
        if (izabrani == null || profil == null) null else profil
    }

    fun posmatrajRaspored(): Flow<SacuvaniRaspored?> = kesSadrzaja.raspored()

    fun posmatrajObavestenja(): Flow<SacuvanaObavestenja> = kesSadrzaja.obavestenja()

    suspend fun povezi(unos: String): IshodPovezivanja {
        val token = izdvojiProfilniToken(unos)
            ?: return IshodPovezivanja.Greska(PorukePovezivanja.NEPRAVILAN_UNOS)
        return when (val ishod = izvor.ucitaj(token)) {
            is IshodUcitavanja.Uspesan -> {
                val sacuvano = sacuvaj(token, ishod.profil)
                if (sacuvano is IshodPovezivanja.Povezan) osveziSadrzaj(token)
                sacuvano
            }
            IshodUcitavanja.NijePronadjen -> IshodPovezivanja.Greska(PorukePovezivanja.NIJE_PRONADJEN)
            is IshodUcitavanja.Odbijen -> IshodPovezivanja.Greska(ishod.poruka)
            is IshodUcitavanja.Neuspesan -> IshodPovezivanja.Greska(ishod.poruka)
        }
    }

    suspend fun osvezi(): IshodOsvezavanja {
        val token = tokeni.procitaj() ?: return IshodOsvezavanja.NemaTokena
        val ishod = when (val ucitano = izvor.ucitaj(token)) {
            is IshodUcitavanja.Uspesan -> {
                kes.upisi(ucitano.profil)
                IshodOsvezavanja.Osvezen
            }
            IshodUcitavanja.NijePronadjen -> {
                obrisiSve()
                IshodOsvezavanja.ProfilObrisan(PorukePovezivanja.PROFIL_VISE_NE_POSTOJI)
            }
            is IshodUcitavanja.Odbijen -> IshodOsvezavanja.Greska(ucitano.poruka)
            is IshodUcitavanja.Neuspesan -> IshodOsvezavanja.Greska(ucitano.poruka)
        }
        if (ishod is IshodOsvezavanja.Osvezen) osveziSadrzaj(token)
        if (ishod !is IshodOsvezavanja.ProfilObrisan) pokusajSlanje(kesSadrzaja.cekajuci())
        return ishod
    }

    suspend fun oznaciProcitanim(ids: List<String>?) {
        val zaSlanje = kesSadrzaja.oznaciLokalno(ids)
        pokusajSlanje(zaSlanje)
    }

    suspend fun napuniIzSnimka(profilTelo: String, rasporedTelo: String, obavestenjaTelo: String): IshodSnimka {
        val bezTokena = tokeni.procitaj() == null
        val profil = protumaciProfil(profilTelo) as? IshodUcitavanja.Uspesan
            ?: return IshodSnimka(false, bezTokena)
        val raspored = when (val ishod = protumaciRaspored(rasporedTelo)) {
            is IshodRasporeda.Postoji -> ishod.raspored
            IshodRasporeda.Nema -> SacuvaniRaspored.NEMA
            else -> return IshodSnimka(false, bezTokena)
        }
        val obavestenja = protumaciObavestenja(obavestenjaTelo) as? IshodObavestenja.Uspesna
            ?: return IshodSnimka(false, bezTokena)
        kesSadrzaja.obrisi()
        kes.upisi(profil.profil)
        kesSadrzaja.upisiRaspored(raspored)
        kesSadrzaja.zameniObavestenja(obavestenja.stavke)
        podesavanja.zapamtiIzabrani()
        return IshodSnimka(true, bezTokena)
    }

    suspend fun promeniProfil() {
        obrisiSve()
    }

    private suspend fun osveziSadrzaj(token: String) {
        when (val raspored = izvorSadrzaja.raspored(token)) {
            is IshodRasporeda.Postoji -> kesSadrzaja.upisiRaspored(raspored.raspored)
            IshodRasporeda.Nema -> kesSadrzaja.upisiRaspored(SacuvaniRaspored.NEMA)
            else -> Unit
        }
        when (val obavestenja = izvorSadrzaja.obavestenja(token)) {
            is IshodObavestenja.Uspesna -> kesSadrzaja.spojiSaServerom(obavestenja.stavke.map { it.uDeteta() })
            else -> Unit
        }
    }

    private suspend fun pokusajSlanje(ids: List<String>) {
        if (ids.isEmpty()) return
        val token = tokeni.procitaj() ?: return
        if (izvorSadrzaja.oznaciProcitanim(token, ids) is IshodOznake.Uspesno) {
            kesSadrzaja.potvrdi(ids)
        }
    }

    private suspend fun sacuvaj(token: String, profil: SacuvaniProfil): IshodPovezivanja {
        return try {
            tokeni.upisi(token)
            kesSadrzaja.obrisi()
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
        runCatching { kesSadrzaja.obrisi() }
        runCatching { podesavanja.zaboravi() }
    }
}

private fun SacuvanoObavestenje.uDeteta() = io.github.mlsivanovic.mozgalica.podaci.ObavestenjeDeteta(
    id = id,
    eventType = eventType,
    title = title,
    body = body,
    targetUrl = targetUrl,
    readAt = readAt,
    createdAt = createdAt,
)

private object PrazanIzvorSadrzaja : IzvorSadrzaja {
    override suspend fun raspored(token: String) = IshodRasporeda.Neuspesan
    override suspend fun obavestenja(token: String) = IshodObavestenja.Neuspesan
    override suspend fun oznaciProcitanim(token: String, ids: List<String>) = IshodOznake.Neuspesan
}

private class PrazanKesSadrzaja : KesSadrzaja {
    private val rasporedStanje = MutableStateFlow<SacuvaniRaspored?>(null)
    private val obavestenjaStanje = MutableStateFlow(SacuvanaObavestenja(emptyList()))

    override fun raspored(): Flow<SacuvaniRaspored?> = rasporedStanje
    override fun obavestenja(): Flow<SacuvanaObavestenja> = obavestenjaStanje
    override suspend fun upisiRaspored(raspored: SacuvaniRaspored) { rasporedStanje.value = raspored }
    override suspend fun zameniObavestenja(stavke: List<SacuvanoObavestenje>) {
        obavestenjaStanje.value = SacuvanaObavestenja(stavke)
    }
    override suspend fun oznaciLokalno(ids: List<String>?): List<String> = emptyList()
    override suspend fun spojiSaServerom(server: List<io.github.mlsivanovic.mozgalica.podaci.ObavestenjeDeteta>) = Unit
    override suspend fun potvrdi(ids: List<String>) = Unit
    override suspend fun cekajuci(): List<String> = emptyList()
    override suspend fun obrisi() {
        rasporedStanje.value = null
        obavestenjaStanje.value = SacuvanaObavestenja(emptyList())
    }
}
