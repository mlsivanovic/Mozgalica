package io.github.mlsivanovic.mozgalica.navigacija

import kotlinx.serialization.Serializable

@Serializable
data object PovezivanjeRuta

@Serializable
data object PocetnaRuta

@Serializable
data object RasporedRuta

@Serializable
data object NagradeRuta

@Serializable
data object RezultatiRuta

@Serializable
data object PodesavanjaRuta

@Serializable
data class KvizRuta(val token: String)

@Serializable
data class SahRuta(val token: String)
