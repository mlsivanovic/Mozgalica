package io.github.mlsivanovic.mozgalica.azuriranje

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import io.github.mlsivanovic.mozgalica.BuildConfig
import java.io.File

/**
 * Proverava da je preuzeti APK zaista novija verzija iste aplikacije i da ju je
 * potpisao isti ključ. Bez toga telefon odbija instalaciju, ali bi poruka bila
 * nejasna („aplikacija nije instalirana"), a loš fajl bi ostao u kešu.
 */
object ProveraApk {
    fun greska(kontekst: Context, fajl: File): String? {
        val arhiva = arhiva(kontekst, fajl) ?: return "Preuzeti fajl nije ispravna Android aplikacija."
        if (arhiva.packageName != kontekst.packageName) return "Preuzeti fajl nije Mozgalica."
        if (kod(arhiva) <= BuildConfig.VERSION_CODE.toLong()) {
            return "Preuzeta verzija nije novija od instalirane."
        }
        val instalirana = instalirana(kontekst) ?: return "Instalirana aplikacija nije pronađena."
        val mojiPotpisi = potpisi(instalirana)
        val njegoviPotpisi = potpisi(arhiva)
        if (mojiPotpisi.isEmpty() || njegoviPotpisi.isEmpty() || mojiPotpisi != njegoviPotpisi) {
            return if (BuildConfig.DEBUG) {
                "Probna gradnja se ne može ažurirati zvaničnom verzijom."
            } else {
                "Preuzeti fajl nije potpisao isti izdavač, pa se ne instalira."
            }
        }
        return null
    }

    private fun instalirana(kontekst: Context): PackageInfo? = runCatching {
        kontekst.packageManager.getPackageInfo(kontekst.packageName, zastavice())
    }.getOrNull()

    private fun arhiva(kontekst: Context, fajl: File): PackageInfo? = runCatching {
        kontekst.packageManager.getPackageArchiveInfo(fajl.absolutePath, zastavice())
    }.getOrNull()

    @Suppress("DEPRECATION")
    private fun zastavice(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            PackageManager.GET_SIGNATURES
        }

    private fun kod(info: PackageInfo): Long =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.longVersionCode
        } else {
            @Suppress("DEPRECATION")
            info.versionCode.toLong()
        }

    @Suppress("DEPRECATION")
    private fun potpisi(info: PackageInfo): Set<String> {
        val potpisnici = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.signingInfo?.apkContentsSigners.orEmpty()
        } else {
            info.signatures.orEmpty()
        }
        return potpisnici.map { it.toByteArray().uHex() }.toSet()
    }

    private fun ByteArray.uHex(): String = joinToString("") { "%02x".format(it) }
}
