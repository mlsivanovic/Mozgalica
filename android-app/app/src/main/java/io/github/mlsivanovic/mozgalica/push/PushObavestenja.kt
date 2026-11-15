package io.github.mlsivanovic.mozgalica.push

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import io.github.mlsivanovic.mozgalica.MainActivity
import io.github.mlsivanovic.mozgalica.R

object PushObavestenja {
    const val AKCIJA_OTVORI = "io.github.mlsivanovic.mozgalica.OPEN"
    const val DODATNO_CILJ = "targetUrl"

    fun prikazi(
        context: Context,
        naslov: String,
        telo: String,
        targetUrl: String?,
        eventType: String?,
        id: Int,
    ) {
        PushKanali.napravi(context)
        val intent = Intent(context, MainActivity::class.java).apply {
            action = AKCIJA_OTVORI
            data = Uri.parse("mozgalica://obavestenje/$id")
            putExtra(DODATNO_CILJ, targetUrl.orEmpty())
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pending = PendingIntent.getActivity(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val kanal = PushKanali.zaEvent(eventType)
        val obavestenje = NotificationCompat.Builder(context, kanal)
            .setSmallIcon(R.drawable.ic_obavestenje)
            .setContentTitle(naslov)
            .setContentText(telo)
            .setStyle(NotificationCompat.BigTextStyle().bigText(telo))
            .setPriority(
                if (kanal == PushKanali.NOVI_ZADACI) {
                    NotificationCompat.PRIORITY_HIGH
                } else {
                    NotificationCompat.PRIORITY_DEFAULT
                },
            )
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setColor(0xFF4F46E5.toInt())
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        runCatching { NotificationManagerCompat.from(context).notify(id, obavestenje) }
    }
}
