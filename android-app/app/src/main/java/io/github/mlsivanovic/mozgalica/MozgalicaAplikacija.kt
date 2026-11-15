package io.github.mlsivanovic.mozgalica

import android.app.Application
import dagger.hilt.android.HiltAndroidApp
import io.github.mlsivanovic.mozgalica.push.PushKanali

// Supabase i Tink se ne dižu ovde. Prvi ekran čita Room, a mreža kreće tek posle toga.
@HiltAndroidApp
class MozgalicaAplikacija : Application() {
    override fun onCreate() {
        super.onCreate()
        PushKanali.napravi(this)
    }
}
