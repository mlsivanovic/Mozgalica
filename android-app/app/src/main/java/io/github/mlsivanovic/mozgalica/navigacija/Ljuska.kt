package io.github.mlsivanovic.mozgalica.navigacija

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Modifier
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import io.github.mlsivanovic.mozgalica.povezivanje.PovezivanjeEkran
import io.github.mlsivanovic.mozgalica.povezivanje.porukaSkeniranja
import io.github.mlsivanovic.mozgalica.profil.FokusiranEkran
import io.github.mlsivanovic.mozgalica.profil.PocetnaEkran
import io.github.mlsivanovic.mozgalica.profil.PrazanTab
import io.github.mlsivanovic.mozgalica.profil.ProfilViewModel
import io.github.mlsivanovic.mozgalica.profil.ProveraEkran
import io.github.mlsivanovic.mozgalica.profil.UiStanje

private data class Tab(
    val odrediste: Odrediste,
    val naziv: String,
    val oznaka: String,
    val ruta: Any,
)

private val tabovi = listOf(
    Tab(Odrediste.POCETNA, "Početna", "🏠", PocetnaRuta),
    Tab(Odrediste.RASPORED, "Raspored", "📅", RasporedRuta),
    Tab(Odrediste.NAGRADE, "Nagrade", "⭐", NagradeRuta),
    Tab(Odrediste.REZULTATI, "Rezultati", "📊", RezultatiRuta),
)

@Composable
fun MozgalicaLjuska(viewModel: ProfilViewModel = hiltViewModel()) {
    val stanje by viewModel.stanje.collectAsStateWithLifecycle()
    when (val trenutno = stanje) {
        UiStanje.Provera -> Scaffold { margina ->
            Box(Modifier.fillMaxSize().padding(margina)) {
                ProveraEkran()
            }
        }
        else -> key(trenutno is UiStanje.Profil) {
            Navigacija(
                povezan = trenutno is UiStanje.Profil,
                stanje = trenutno,
                onPovezi = viewModel::povezi,
                onGreskaSkenera = { viewModel.prijaviGresku(porukaSkeniranja()) },
                onPromeniProfil = viewModel::promeniProfil,
            )
        }
    }
}

@Composable
private fun Navigacija(
    povezan: Boolean,
    stanje: UiStanje,
    onPovezi: (String) -> Unit,
    onGreskaSkenera: () -> Unit,
    onPromeniProfil: () -> Unit,
) {
    val nav = rememberNavController()
    val unos = nav.currentBackStackEntryAsState()
    val odrediste = unos.value?.destination.odrediste()
    val traka = odrediste != null && prikazujeDonjuNavigaciju(odrediste)
    Scaffold(
        bottomBar = {
            if (traka) {
                NavigationBar {
                    tabovi.forEach { tab ->
                        NavigationBarItem(
                            selected = odrediste == tab.odrediste,
                            onClick = {
                                nav.navigate(tab.ruta) {
                                    popUpTo(nav.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Text(tab.oznaka) },
                            label = { Text(tab.naziv) },
                        )
                    }
                }
            }
        },
    ) { margina ->
        NavHost(
            navController = nav,
            startDestination = if (povezan) PocetnaRuta else PovezivanjeRuta,
            modifier = Modifier.padding(margina),
        ) {
            composable<PovezivanjeRuta> {
                val povezivanje = stanje as? UiStanje.Povezivanje
                PovezivanjeEkran(
                    greska = povezivanje?.greska,
                    radi = povezivanje?.radi == true,
                    onPovezi = onPovezi,
                    onGreskaSkenera = onGreskaSkenera,
                )
            }
            composable<PocetnaRuta> {
                val profil = stanje as? UiStanje.Profil
                if (profil == null) {
                    ProveraEkran()
                } else {
                    PocetnaEkran(
                        profil = profil.podaci,
                        osvezava = profil.osvezava,
                        greskaMreze = profil.greskaMreze,
                        onPromeniProfil = onPromeniProfil,
                        onKviz = { nav.navigate(KvizRuta) },
                        onSah = { nav.navigate(SahRuta) },
                    )
                }
            }
            composable<RasporedRuta> { PrazanTab("Raspored") }
            composable<NagradeRuta> { PrazanTab("Nagrade") }
            composable<RezultatiRuta> { PrazanTab("Rezultati") }
            composable<KvizRuta> { FokusiranEkran("Kviz", onNazad = { nav.popBackStack() }) }
            composable<SahRuta> { FokusiranEkran("Šah", onNazad = { nav.popBackStack() }) }
        }
    }
}

private fun androidx.navigation.NavDestination?.odrediste(): Odrediste? = when {
    this == null -> null
    hasRoute<PovezivanjeRuta>() -> Odrediste.POVEZIVANJE
    hasRoute<PocetnaRuta>() -> Odrediste.POCETNA
    hasRoute<RasporedRuta>() -> Odrediste.RASPORED
    hasRoute<NagradeRuta>() -> Odrediste.NAGRADE
    hasRoute<RezultatiRuta>() -> Odrediste.REZULTATI
    hasRoute<KvizRuta>() -> Odrediste.KVIZ
    hasRoute<SahRuta>() -> Odrediste.SAH
    else -> null
}
