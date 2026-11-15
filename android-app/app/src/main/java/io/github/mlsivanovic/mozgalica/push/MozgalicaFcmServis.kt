package io.github.mlsivanovic.mozgalica.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MozgalicaFcmServis : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        PushRad.zakaziRegistraciju(applicationContext, token)
    }

    override fun onMessageReceived(poruka: RemoteMessage) {
        val podaci = poruka.data
        if (podaci["silent"] == "1") {
            PushRad.zakaziOsvezavanje(applicationContext)
            return
        }
        val naslov = poruka.notification?.title
            ?: podaci["title"]
            ?: "Mozgalica"
        val telo = poruka.notification?.body
            ?: podaci["body"]
            ?: "Stiglo je novo obaveštenje."
        val event = podaci["eventType"]
        PushObavestenja.prikazi(
            context = this,
            naslov = naslov,
            telo = telo,
            targetUrl = podaci["targetUrl"],
            eventType = event,
            id = poruka.messageId?.hashCode() ?: System.currentTimeMillis().toInt(),
        )
        if (podaci["refresh"] == "1") PushRad.zakaziOsvezavanje(applicationContext)
    }
}
