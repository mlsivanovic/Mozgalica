package io.github.mlsivanovic.mozgalica.vidzet

import android.content.Context
import androidx.work.Configuration
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.glance.appwidget.updateAll
import java.util.concurrent.TimeUnit

class VidzetRadnik(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        MozgalicaVidzet().updateAll(applicationContext)
        return Result.success()
    }
}

object VidzetRad {
    private val brava = Any()

    @Volatile
    private var spremno = false

    fun zakazi(context: Context) {
        val aplikacija = context.applicationContext
        pripremi(aplikacija)
        val periodican = PeriodicWorkRequestBuilder<VidzetRadnik>(30, TimeUnit.MINUTES).build()
        WorkManager.getInstance(aplikacija).enqueueUniquePeriodicWork(
            "vidzet-osvezavanje",
            ExistingPeriodicWorkPolicy.UPDATE,
            periodican,
        )
        osvezi(aplikacija)
    }

    fun osvezi(context: Context) {
        val aplikacija = context.applicationContext
        pripremi(aplikacija)
        val odmah = OneTimeWorkRequestBuilder<VidzetRadnik>().build()
        WorkManager.getInstance(aplikacija).enqueueUniqueWork(
            "vidzet-odmah",
            ExistingWorkPolicy.REPLACE,
            odmah,
        )
    }

    private fun pripremi(aplikacija: Context) {
        synchronized(brava) {
            if (spremno) return
            try {
                WorkManager.getInstance(aplikacija)
            } catch (_: IllegalStateException) {
                WorkManager.initialize(aplikacija, Configuration.Builder().build())
            }
            spremno = true
        }
    }
}
