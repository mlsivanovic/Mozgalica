package io.github.mlsivanovic.mozgalica.podaci.povezivanje

// Isti oblik kao izdvojiProfilniToken na webu: čist token ili link sa /dete/<token>.
private val PROFILNI_TOKEN = Regex("^[A-Za-z0-9_-]{20,200}$")
private val TOKEN_U_LINKU = Regex("(?:#/|/)dete/([A-Za-z0-9_-]{20,200})(?:[/?#]|$)")

fun izdvojiProfilniToken(vrednost: String): String? {
    val cista = vrednost.trim()
    if (PROFILNI_TOKEN.matches(cista)) return cista
    val izLinka = TOKEN_U_LINKU.find(cista)?.groupValues?.getOrNull(1)
    return izLinka?.takeIf { PROFILNI_TOKEN.matches(it) }
}
