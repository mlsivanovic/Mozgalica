package io.github.mlsivanovic.mozgalica.push

import android.content.Context
import android.os.Build
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.google.android.gms.tasks.Tasks
import io.github.mlsivanovic.mozgalica.BuildConfig
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object FcmKlijent {
    fun dostupan(context: Context): Boolean =
        runCatching { FirebaseApp.getApps(context).isNotEmpty() }.getOrDefault(false)

    suspend fun token(context: Context): String? = withContext(Dispatchers.IO) {
        if (!dostupan(context)) return@withContext null
        runCatching {
            Tasks.await(FirebaseMessaging.getInstance().token, 10, TimeUnit.SECONDS)
        }.getOrNull()
    }

    fun obrisiToken() {
        runCatching { FirebaseMessaging.getInstance().deleteToken() }
    }

    fun korisnickiAgent(): String = "Mozgalica-Android/${BuildConfig.VERSION_NAME} (${Build.MODEL})"
}
