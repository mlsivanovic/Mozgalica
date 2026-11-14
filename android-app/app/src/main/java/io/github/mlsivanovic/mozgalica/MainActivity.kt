package io.github.mlsivanovic.mozgalica

import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.AndroidEntryPoint
import io.github.mlsivanovic.mozgalica.dizajn.Efekti
import io.github.mlsivanovic.mozgalica.dizajn.LocalEfekti
import io.github.mlsivanovic.mozgalica.dizajn.MozgalicaTema
import io.github.mlsivanovic.mozgalica.navigacija.MozgalicaLjuska
import io.github.mlsivanovic.mozgalica.navigacija.ucitajUgovor
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaAplikacije
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.jeTamna
import io.github.mlsivanovic.mozgalica.profil.ProfilViewModel
import javax.inject.Inject
import kotlinx.coroutines.runBlocking

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var repo: ProfilRepozitorijum
    @Inject lateinit var podesavanjaAplikacije: PodesavanjaAplikacije

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (BuildConfig.DEBUG) obradiProbniIntent()
        setContent {
            val viewModel: ProfilViewModel = hiltViewModel()
            val podesavanja by viewModel.podesavanja.collectAsStateWithLifecycle()
            val sistemTamna = isSystemInDarkTheme()
            val animacije = LocalContext.current.animacijeDozvoljene()
            MozgalicaTema(tamnaTema = podesavanja.jeTamna(sistemTamna)) {
                CompositionLocalProvider(
                    LocalEfekti provides Efekti(
                        zvuk = podesavanja.zvuk,
                        haptika = podesavanja.haptika,
                        animacije = animacije,
                    ),
                ) {
                    MozgalicaLjuska(viewModel)
                }
            }
        }
    }

    private fun obradiProbniIntent() {
        if (intent.getBooleanExtra("kraj_probnog", false)) {
            runBlocking {
                val bezTokena = podesavanjaAplikacije.probniJeBezTokena()
                podesavanjaAplikacije.postaviProbniPrikaz(false)
                if (bezTokena) repo.promeniProfil()
            }
            return
        }
        if (!intent.getBooleanExtra("probni", false)) return
        runBlocking {
            val ishod = repo.napuniIzSnimka(
                ucitajUgovor("get_child_profile.json"),
                ucitajUgovor("get_child_school_timetable.json"),
                ucitajUgovor("get_child_notifications.json"),
            )
            if (ishod.uspeo) podesavanjaAplikacije.postaviProbniPrikaz(true, ishod.bezTokena)
        }
    }
}

private fun android.content.Context.animacijeDozvoljene(): Boolean {
    val skala = Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
    return skala != 0f
}
