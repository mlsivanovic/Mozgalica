package io.github.mlsivanovic.mozgalica.azuriranje

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import java.io.File

/** Predaje preuzeti APK sistemskom instalateru. */
object InstalacijaApk {
    fun moze(kontekst: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
            kontekst.packageManager.canRequestPackageInstalls()

    fun otvoriPodesavanjaDozvole(kontekst: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val namera = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
            .setData("package:${kontekst.packageName}".toUri())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            kontekst.startActivity(namera)
        } catch (_: ActivityNotFoundException) {
            // Stariji Android nema poseban ekran; dozvola se daje u sistemskim podešavanjima.
        }
    }

    fun instaliraj(kontekst: Context, fajl: File) {
        val adresa = FileProvider.getUriForFile(
            kontekst,
            "${kontekst.packageName}.fajlovi",
            fajl,
        )
        val namera = Intent(Intent.ACTION_VIEW)
            .setDataAndType(adresa, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        kontekst.startActivity(namera)
    }
}
