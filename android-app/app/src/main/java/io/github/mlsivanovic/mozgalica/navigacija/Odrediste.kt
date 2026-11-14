package io.github.mlsivanovic.mozgalica.navigacija

enum class Odrediste {
    POVEZIVANJE,
    POCETNA,
    RASPORED,
    NAGRADE,
    REZULTATI,
    KVIZ,
    SAH,
}

fun prikazujeDonjuNavigaciju(odrediste: Odrediste): Boolean = when (odrediste) {
    Odrediste.POCETNA, Odrediste.RASPORED, Odrediste.NAGRADE, Odrediste.REZULTATI -> true
    Odrediste.POVEZIVANJE, Odrediste.KVIZ, Odrediste.SAH -> false
}
