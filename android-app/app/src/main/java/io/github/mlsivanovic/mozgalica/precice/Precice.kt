package io.github.mlsivanovic.mozgalica.precice

import android.content.Context
import android.content.Intent
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import io.github.mlsivanovic.mozgalica.MainActivity
import io.github.mlsivanovic.mozgalica.R
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.SacuvaniProfil
import io.github.mlsivanovic.mozgalica.push.PushObavestenja

object Precice {
    fun azuriraj(context: Context, profil: SacuvaniProfil?) {
        val lista = mutableListOf<ShortcutInfoCompat>()
        profil?.aktivniKvizovi?.firstOrNull()?.let { kviz ->
            lista += precka(
                context = context,
                id = "nastavi-kviz",
                kratko = "Kviz",
                dugo = "Nastavi kviz: ${kviz.title}",
                ruta = "/kviz/${kviz.quizToken}",
            )
        }
        profil?.aktivnePartije?.firstOrNull()?.let { partija ->
            lista += precka(
                context = context,
                id = "nastavi-sah",
                kratko = "Šah",
                dugo = "Nastavi šah partiju",
                ruta = "/sah/${partija.playToken}",
            )
        }
        runCatching {
            if (lista.isEmpty()) {
                ShortcutManagerCompat.removeAllDynamicShortcuts(context)
            } else {
                ShortcutManagerCompat.setDynamicShortcuts(context, lista)
            }
        }
    }

    private fun precka(
        context: Context,
        id: String,
        kratko: String,
        dugo: String,
        ruta: String,
    ): ShortcutInfoCompat {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = PushObavestenja.AKCIJA_OTVORI
            putExtra(PushObavestenja.DODATNO_CILJ, ruta)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return ShortcutInfoCompat.Builder(context, id)
            .setShortLabel(kratko)
            .setLongLabel(dugo)
            .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
            .setIntent(intent)
            .build()
    }
}
