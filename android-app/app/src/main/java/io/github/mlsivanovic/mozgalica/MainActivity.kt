package io.github.mlsivanovic.mozgalica

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import dagger.hilt.android.AndroidEntryPoint
import io.github.mlsivanovic.mozgalica.dizajn.MozgalicaTema
import io.github.mlsivanovic.mozgalica.navigacija.MozgalicaLjuska

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MozgalicaTema {
                MozgalicaLjuska()
            }
        }
    }
}
