package io.github.mlsivanovic.mozgalica.kviz

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
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import io.github.mlsivanovic.mozgalica.podaci.OdgovorDeteta
import io.github.mlsivanovic.mozgalica.podaci.kviz.IshodReda
import io.github.mlsivanovic.mozgalica.podaci.kviz.IzvorKviza
import io.github.mlsivanovic.mozgalica.podaci.kviz.KvizSinhronizacija
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciCuvanje
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciMeta
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciObjasnjenja
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciPokusaj
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciPonovni
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciRezultat
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciSavet
import io.github.mlsivanovic.mozgalica.podaci.kviz.protumaciTajmer
import java.util.concurrent.TimeUnit

@EntryPoint
@InstallIn(SingletonComponent::class)
interface KvizRadniUlaz {
    fun sinhronizacija(): KvizSinhronizacija
}

class KvizSlanjeRadnik(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val sinhronizacija = EntryPointAccessors.fromApplication(
            applicationContext,
            KvizRadniUlaz::class.java,
        ).sinhronizacija()
        return when (sinhronizacija.izvrsiSve()) {
            IshodReda.Gotovo -> Result.success()
            IshodReda.CekaVezu, IshodReda.Privremeno -> Result.retry()
        }
    }
}

object KvizRad {
    private val brava = Any()

    @Volatile
    private var spremno = false

    fun zakazi(context: Context, odmah: Boolean) {
        val aplikacija = context.applicationContext
        synchronized(brava) {
            if (!spremno) {
                try {
                    WorkManager.getInstance(aplikacija)
                } catch (_: IllegalStateException) {
                    WorkManager.initialize(aplikacija, Configuration.Builder().build())
                }
                spremno = true
            }
        }
        val zahtev = OneTimeWorkRequestBuilder<KvizSlanjeRadnik>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInitialDelay(if (odmah) 0 else 2, TimeUnit.SECONDS)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(aplikacija).enqueueUniqueWork(
            "kviz-slanje",
            ExistingWorkPolicy.REPLACE,
            zahtev,
        )
    }
}

class SnimakIzvor(
    private val ucitaj: (String) -> String,
) : IzvorKviza {
    override suspend fun meta(token: String) = protumaciMeta(ucitaj("get_quiz_by_token.json"))

    override suspend fun zapocni(token: String, ime: String, oznaka: String?) =
        protumaciPokusaj(ucitaj("start_attempt.json"))

    override suspend fun nastavi(attemptToken: String) = protumaciPokusaj(ucitaj("resume_attempt.json"))

    override suspend fun sacuvaj(attemptToken: String, odgovori: Map<String, OdgovorDeteta>) =
        protumaciCuvanje(ucitaj("save_answers.json"))

    override suspend fun tajmer(attemptToken: String, sekunde: Int) =
        protumaciTajmer(ucitaj("checkpoint_attempt_timer.json"))

    override suspend fun savet(attemptToken: String, pitanjeId: String) =
        protumaciSavet(ucitaj("use_hint.json"))

    override suspend fun predaj(attemptToken: String) = protumaciRezultat(ucitaj("submit_attempt.json"))

    override suspend fun objasnjenja(attemptToken: String) =
        protumaciObjasnjenja(ucitaj("mark_explanations_seen.json"))

    override suspend fun pripremiPonovni(attemptToken: String) =
        protumaciPonovni(ucitaj("start_retry.json"))

    override suspend fun nastaviPonovni(attemptToken: String) =
        protumaciPonovni(ucitaj("resume_retry.json"))

    override suspend fun predajPonovni(attemptToken: String, odgovori: Map<String, OdgovorDeteta>) =
        protumaciPonovni(ucitaj("submit_retry.json"))
}
