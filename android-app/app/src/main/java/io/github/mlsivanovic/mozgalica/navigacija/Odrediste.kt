package io.github.mlsivanovic.mozgalica.navigacija

enum class Odrediste {
    POVEZIVANJE,
    POCETNA,
    RASPORED,
    NAGRADE,
    REZULTATI,
    PODESAVANJA,
    KVIZ,
    SAH,
}

fun prikazujeDonjuNavigaciju(odrediste: Odrediste): Boolean = when (odrediste) {
    Odrediste.POCETNA, Odrediste.RASPORED, Odrediste.NAGRADE, Odrediste.REZULTATI -> true
    Odrediste.POVEZIVANJE, Odrediste.PODESAVANJA, Odrediste.KVIZ, Odrediste.SAH -> false
}
