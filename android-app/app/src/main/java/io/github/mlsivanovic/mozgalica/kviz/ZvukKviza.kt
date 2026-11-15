package io.github.mlsivanovic.mozgalica.kviz

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator

class ZvukKviza(context: Context, private val ukljucen: Boolean) {
    private val audio = context.getSystemService(AudioManager::class.java)
    private val ton = runCatching { ToneGenerator(AudioManager.STREAM_MUSIC, 55) }.getOrNull()

    fun zavrsen(uspeh: Boolean) {
        if (!ukljucen) return
        if (audio?.ringerMode == AudioManager.RINGER_MODE_SILENT) return
        val tip = if (uspeh) ToneGenerator.TONE_PROP_ACK else ToneGenerator.TONE_PROP_PROMPT
        runCatching { ton?.startTone(tip, 240) }
    }

    fun otpusti() {
        runCatching { ton?.release() }
    }
}
