package io.github.mlsivanovic.mozgalica.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object PushKanali {
    const val NOVI_ZADACI = "novi_zadaci"
    const val REZULTATI = "rezultati_nagrade"
    const val OPSTE = "opste"

    fun napravi(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val menadzer = context.getSystemService(NotificationManager::class.java) ?: return
        menadzer.createNotificationChannel(
            NotificationChannel(
                NOVI_ZADACI,
                "Novi zadaci",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Novi kvizovi i šahovske partije"
            },
        )
        menadzer.createNotificationChannel(
            NotificationChannel(
                REZULTATI,
                "Rezultati i nagrade",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Rezultati kvizova, šahovskih partija i nagrade"
            },
        )
        menadzer.createNotificationChannel(
            NotificationChannel(
                OPSTE,
                "Mozgalica",
                NotificationManager.IMPORTANCE_DEFAULT,
            ),
        )
    }

    fun zaEvent(eventType: String?): String = when (eventType) {
        "new_quiz", "new_chess_game" -> NOVI_ZADACI
        "quiz_completed", "chess_game_completed", "weekly_report" -> REZULTATI
        else -> OPSTE
    }
}
