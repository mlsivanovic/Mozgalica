package io.github.mlsivanovic.mozgalica.vidzet

import android.content.Context
import android.content.Intent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import io.github.mlsivanovic.mozgalica.MainActivity
import io.github.mlsivanovic.mozgalica.podaci.povezivanje.LokalnoSkladiste

data class VidzetPodaci(
    val ime: String,
    val aktivno: Int,
    val zvezdice: Int,
)

class MozgalicaVidzet : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val podaci = ucitajPodatke(context)
        provideContent { SadrzajVidzeta(context, podaci) }
    }

    override suspend fun providePreview(context: Context, widgetCategory: Int) {
        provideContent { SadrzajVidzeta(context, VidzetPodaci("Proba", 2, 5)) }
    }
}

class MozgalicaVidzetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MozgalicaVidzet()
}

private suspend fun ucitajPodatke(context: Context): VidzetPodaci {
    val profil = LokalnoSkladiste(context).kes.procitaj()
    return VidzetPodaci(
        ime = profil?.ime.orEmpty(),
        aktivno = (profil?.aktivniKvizovi?.size ?: 0) + (profil?.aktivnePartije?.size ?: 0),
        zvezdice = profil?.ukupnoZvezdica ?: 0,
    )
}

@androidx.compose.runtime.Composable
private fun SadrzajVidzeta(context: Context, podaci: VidzetPodaci) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color(0xFF4F46E5)))
            .cornerRadius(20.dp)
            .padding(16.dp)
            .clickable(actionStartActivity(Intent(context, MainActivity::class.java))),
        verticalAlignment = Alignment.Vertical.CenterVertically,
    ) {
        Text(
            text = if (podaci.ime.isBlank()) "Mozgalica" else "Mozgalica · ${podaci.ime}",
            style = TextStyle(
                color = ColorProvider(Color.White),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
            ),
        )
        Spacer(GlanceModifier.height(6.dp))
        Text(
            text = if (podaci.aktivno > 0) {
                "Danas: ${podaci.aktivno} ${tekstZadataka(podaci.aktivno)}"
            } else {
                "Sve je završeno za danas"
            },
            style = TextStyle(color = ColorProvider(Color(0xFFE0E7FF)), fontSize = 14.sp),
        )
        Spacer(GlanceModifier.height(4.dp))
        Text(
            text = "⭐ ${podaci.zvezdice}",
            style = TextStyle(
                color = ColorProvider(Color(0xFFFDE68A)),
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
            ),
        )
    }
}

private fun tekstZadataka(broj: Int): String = when {
    broj == 1 -> "zadatak"
    broj in 2..4 -> "zadatka"
    else -> "zadataka"
}
