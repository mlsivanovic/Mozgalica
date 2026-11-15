package io.github.mlsivanovic.mozgalica.push

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Configuration
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.IshodOsvezavanja
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.PodesavanjaAplikacije
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.ProfilRepozitorijum
import io.github.mlsivanovic.mozgalica.podaci.push.IshodRegistracijePush
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.flow.first

@EntryPoint
@InstallIn(SingletonComponent::class)
interface PushRadniUlaz {
    fun repo(): ProfilRepozitorijum
    fun podesavanja(): PodesavanjaAplikacije
}

class PushRegistracijaRadnik(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val ulaz = EntryPointAccessors.fromApplication(applicationContext, PushRadniUlaz::class.java)
        if (!ulaz.podesavanja().pushUkljucen().first()) return Result.success()
        val token = inputData.getString("fcmToken") ?: FcmKlijent.token(applicationContext)
            ?: return Result.retry()
        val repo = ulaz.repo()
        return when (val ishod = repo.registrujFcm(token, FcmKlijent.korisnickiAgent())) {
            is IshodRegistracijePush.Uspesna -> Result.success()
            is IshodRegistracijePush.Odbijena -> when (ishod.kod) {
                "no_token", "not_found", "invalid_token" -> Result.failure()
                else -> Result.retry()
            }
            IshodRegistracijePush.Neuspesna -> Result.retry()
        }
    }
}

class PushOsvezavanjeRadnik(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val repo = EntryPointAccessors
            .fromApplication(applicationContext, PushRadniUlaz::class.java)
            .repo()
        return when (repo.osvezi()) {
            IshodOsvezavanja.Osvezen, IshodOsvezavanja.NemaTokena -> Result.success()
            is IshodOsvezavanja.ProfilObrisan -> Result.failure()
            is IshodOsvezavanja.Greska -> Result.retry()
        }
    }
}

object PushRad {
    private val brava = Any()

    @Volatile
    private var spremno = false

    fun zakaziRegistraciju(context: Context, fcmToken: String? = null) {
        val aplikacija = context.applicationContext
        pripremi(aplikacija)
        val podaci = if (fcmToken == null) workDataOf() else workDataOf("fcmToken" to fcmToken)
        val zahtev = OneTimeWorkRequestBuilder<PushRegistracijaRadnik>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInputData(podaci)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(aplikacija).enqueueUniqueWork(
            "push-registracija",
            ExistingWorkPolicy.REPLACE,
            zahtev,
        )
    }

    fun zakaziOsvezavanje(context: Context) {
        val aplikacija = context.applicationContext
        pripremi(aplikacija)
        val zahtev = OneTimeWorkRequestBuilder<PushOsvezavanjeRadnik>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(aplikacija).enqueueUniqueWork(
            "push-osvezavanje",
            ExistingWorkPolicy.REPLACE,
            zahtev,
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
