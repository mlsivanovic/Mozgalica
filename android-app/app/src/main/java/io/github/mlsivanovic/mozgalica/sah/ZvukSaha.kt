package io.github.mlsivanovic.mozgalica.sah

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator

// Kratki tonovi umesto audio fajlova: dovoljno za povratnu informaciju o potezu,
// uzimanju i šahu, bez dodatnih resursa u APK-u. Poštuje prekidač zvuka i tihi režim.
class ZvukSaha(context: Context, private val ukljucen: Boolean) {
    private val audio = context.getSystemService(AudioManager::class.java)
    private val ton = runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 55) }.getOrNull()

    fun potez() = pusti(ToneGenerator.TONE_PROP_BEEP, 70)

    fun uzimanje() = pusti(ToneGenerator.TONE_PROP_ACK, 120)

    fun sah() = pusti(ToneGenerator.TONE_PROP_NACK, 180)

    fun kraj() = pusti(ToneGenerator.TONE_PROP_PROMPT, 260)

    fun otpusti() {
        runCatching { ton?.release() }
    }

    private fun pusti(tip: Int, ms: Int) {
        if (!ukljucen) return
        if (audio?.ringerMode == AudioManager.RINGER_MODE_SILENT) return
        runCatching { ton?.startTone(tip, ms) }
    }
}
