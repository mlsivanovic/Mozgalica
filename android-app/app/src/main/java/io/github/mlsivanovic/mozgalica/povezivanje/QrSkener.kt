package io.github.mlsivanovic.mozgalica.povezivanje

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import com.google.mlkit.common.MlKitException
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

fun Context.nadjiAktivnost(): Activity {
    var trenutni: Context = this
    while (trenutni is ContextWrapper) {
        if (trenutni is Activity) return trenutni
        trenutni = trenutni.baseContext
    }
    error("Nema aktivnosti za skener.")
}

fun pokreniQrSkener(
    aktivnost: Activity,
    onRezultat: (String) -> Unit,
    onGreska: () -> Unit,
) {
    val opcije = GmsBarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
        .enableAutoZoom()
        .build()
    GmsBarcodeScanning.getClient(aktivnost, opcije)
        .startScan()
        .addOnSuccessListener { barkod ->
            val sirovo = barkod.rawValue
            if (!sirovo.isNullOrBlank()) onRezultat(sirovo)
        }
        .addOnCanceledListener { }
        .addOnFailureListener { greska ->
            val otkazano = greska is MlKitException &&
                greska.errorCode == MlKitException.CODE_SCANNER_CANCELLED
            if (!otkazano) onGreska()
        }
}
