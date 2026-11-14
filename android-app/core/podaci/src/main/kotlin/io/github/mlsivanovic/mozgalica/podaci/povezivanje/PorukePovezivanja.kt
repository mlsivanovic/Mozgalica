package io.github.mlsivanovic.mozgalica.podaci.povezivanje

object PorukePovezivanja {
    const val NEPRAVILAN_UNOS =
        "Nalepi ceo profilni link (#/dete/…) ili sam token. Ovaj unos nije profilni link."
    const val NIJE_PRONADJEN =
        "Profil nije pronađen. Proveri da li je link ispravno kopiran."
    const val PROFIL_VISE_NE_POSTOJI =
        "Sačuvani profil više nije dostupan. Poveži aplikaciju ponovo."
    const val MREZA =
        "Profil trenutno nije moguće proveriti. Proveri internet vezu."
    const val BAZA_NIJE_PODESENA =
        "Aplikacija nema podešen pristup bazi. Povezivanje sa mreže nije moguće."
    const val CUVANJE =
        "Profil je pronađen, ali ga uređaj nije mogao da sačuva."
    const val ODBIJEN =
        "Profil nije prihvaćen. Proveri link i pokušaj ponovo."
    const val SKENER =
        "Skener nije dostupan na ovom uređaju. Nalepi profilni link."
}
