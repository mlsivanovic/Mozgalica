package io.github.mlsivanovic.mozgalica.navigacija

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.LifecycleStartEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import io.github.mlsivanovic.mozgalica.BuildConfig
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IzborTeme
import io.github.mlsivanovic.mozgalica.povezivanje.PovezivanjeEkran
import io.github.mlsivanovic.mozgalica.povezivanje.porukaSkeniranja
import io.github.mlsivanovic.mozgalica.profil.CiljObavestenja
import io.github.mlsivanovic.mozgalica.profil.FokusiranEkran
import io.github.mlsivanovic.mozgalica.profil.PocetnaEkran
import io.github.mlsivanovic.mozgalica.profil.PodesavanjaEkran
import io.github.mlsivanovic.mozgalica.profil.PrazanTab
import io.github.mlsivanovic.mozgalica.profil.ProfilViewModel
import io.github.mlsivanovic.mozgalica.profil.ProveraEkran
import io.github.mlsivanovic.mozgalica.profil.RasporedEkran
import io.github.mlsivanovic.mozgalica.profil.RezultatiEkran
import io.github.mlsivanovic.mozgalica.profil.UiStanje
import io.github.mlsivanovic.mozgalica.profil.ciljObavestenja
import java.io.IOException

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
    LifecycleStartEffect(Unit) {
        viewModel.osvezi()
        onStopOrDispose { }
    }
    val stanje by viewModel.stanje.collectAsStateWithLifecycle()
    val podesavanja by viewModel.podesavanja.collectAsStateWithLifecycle()
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
                tema = podesavanja.tema,
                zvuk = podesavanja.zvuk,
                haptika = podesavanja.haptika,
                onPovezi = viewModel::povezi,
                onGreska = viewModel::prijaviGresku,
                onGreskaSkenera = { viewModel.prijaviGresku(porukaSkeniranja()) },
                onPromeniProfil = viewModel::promeniProfil,
                onOsvezi = { viewModel.osvezi(rucnoPovlacenje = true) },
                onOznaciProcitanim = viewModel::oznaciProcitanim,
                onTemu = viewModel::postaviTemu,
                onZvuk = viewModel::postaviZvuk,
                onHaptiku = viewModel::postaviHaptiku,
                onProbni = if (BuildConfig.DEBUG) {
                    { telo ->
                        viewModel.napuniProbniPrikaz(telo.profil, telo.raspored, telo.obavestenja)
                    }
                } else {
                    null
                },
            )
        }
    }
}

private data class ProbnaTela(val profil: String, val raspored: String, val obavestenja: String)

@Composable
private fun Navigacija(
    povezan: Boolean,
    stanje: UiStanje,
    tema: IzborTeme,
    zvuk: Boolean,
    haptika: Boolean,
    onPovezi: (String) -> Unit,
    onGreska: (String) -> Unit,
    onGreskaSkenera: () -> Unit,
    onPromeniProfil: () -> Unit,
    onOsvezi: () -> Unit,
    onOznaciProcitanim: (List<String>?) -> Unit,
    onTemu: (IzborTeme) -> Unit,
    onZvuk: (Boolean) -> Unit,
    onHaptiku: (Boolean) -> Unit,
    onProbni: ((ProbnaTela) -> Unit)?,
) {
    val nav = rememberNavController()
    val unos = nav.currentBackStackEntryAsState()
    val odrediste = unos.value?.destination.odrediste()
    val traka = odrediste != null && prikazujeDonjuNavigaciju(odrediste)
    val kontekst = LocalContext.current
    Scaffold(
        bottomBar = {
            if (traka) {
                NavigationBar {
                    tabovi.forEach { tab ->
                        NavigationBarItem(
                            selected = odrediste == tab.odrediste,
                            onClick = { otvoriTab(nav, tab.ruta) },
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
                    onProbniPrikaz = onProbni?.let { predaj ->
                        {
                            try {
                                predaj(
                                    ProbnaTela(
                                        profil = kontekst.ucitajUgovor("get_child_profile.json"),
                                        raspored = kontekst.ucitajUgovor("get_child_school_timetable.json"),
                                        obavestenja = kontekst.ucitajUgovor("get_child_notifications.json"),
                                    ),
                                )
                            } catch (_: IOException) {
                                onGreska("Probni podaci nisu dostupni u ovoj gradnji.")
                            }
                        }
                    },
                )
            }
            composable<PocetnaRuta> {
                val profil = stanje as? UiStanje.Profil
                if (profil == null) {
                    ProveraEkran()
                } else {
                    PocetnaEkran(
                        profil = profil.podaci,
                        rasporedPostoji = profil.raspored?.postoji == true,
                        obavestenja = profil.obavestenja,
                        osvezava = profil.osvezava,
                        greskaMreze = profil.greskaMreze,
                        onOsvezi = onOsvezi,
                        onPodesavanja = { nav.navigate(PodesavanjaRuta) },
                        onRaspored = { otvoriTab(nav, RasporedRuta) },
                        onKviz = { token -> nav.navigate(KvizRuta(token)) },
                        onSah = { token -> nav.navigate(SahRuta(token)) },
                        onOznaciProcitanim = onOznaciProcitanim,
                        onObavestenje = { url ->
                            when (val cilj = ciljObavestenja(url)) {
                                is CiljObavestenja.Kviz -> nav.navigate(KvizRuta(cilj.token))
                                is CiljObavestenja.Sah -> nav.navigate(SahRuta(cilj.token))
                                null -> Unit
                            }
                        },
                    )
                }
            }
            composable<RasporedRuta> {
                val profil = stanje as? UiStanje.Profil
                if (profil == null) ProveraEkran()
                else RasporedEkran(profil.raspored, profil.osvezava, onOsvezi)
            }
            composable<NagradeRuta> { PrazanTab("Nagrade") }
            composable<RezultatiRuta> {
                val profil = stanje as? UiStanje.Profil
                if (profil == null) ProveraEkran()
                else RezultatiEkran(profil.podaci, profil.osvezava, onOsvezi)
            }
            composable<PodesavanjaRuta> {
                PodesavanjaEkran(
                    stanje = io.github.mlsivanovic.mozgalica.podaci.povezivanje.StanjePodesavanja(
                        tema = tema,
                        zvuk = zvuk,
                        haptika = haptika,
                    ),
                    onNazad = { nav.popBackStack() },
                    onTemu = onTemu,
                    onZvuk = onZvuk,
                    onHaptiku = onHaptiku,
                    onPromeniProfil = onPromeniProfil,
                )
            }
            composable<KvizRuta> {
                FokusiranEkran(
                    naslov = "Kviz",
                    poruka = "Ovaj kviz ćeš moći da rešiš u narednoj verziji aplikacije.",
                    onNazad = { nav.popBackStack() },
                )
            }
            composable<SahRuta> {
                FokusiranEkran(
                    naslov = "Šah",
                    poruka = "Ovu partiju ćeš moći da igraš u narednoj verziji aplikacije.",
                    onNazad = { nav.popBackStack() },
                )
            }
        }
    }
}

private fun otvoriTab(nav: NavHostController, ruta: Any) {
    nav.navigate(ruta) {
        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

private fun androidx.navigation.NavDestination?.odrediste(): Odrediste? = when {
    this == null -> null
    hasRoute<PovezivanjeRuta>() -> Odrediste.POVEZIVANJE
    hasRoute<PocetnaRuta>() -> Odrediste.POCETNA
    hasRoute<RasporedRuta>() -> Odrediste.RASPORED
    hasRoute<NagradeRuta>() -> Odrediste.NAGRADE
    hasRoute<RezultatiRuta>() -> Odrediste.REZULTATI
    hasRoute<PodesavanjaRuta>() -> Odrediste.PODESAVANJA
    hasRoute<KvizRuta>() -> Odrediste.KVIZ
    hasRoute<SahRuta>() -> Odrediste.SAH
    else -> null
}

internal fun android.content.Context.ucitajUgovor(ime: String): String =
    assets.open("ugovori/$ime").bufferedReader().use { it.readText() }
