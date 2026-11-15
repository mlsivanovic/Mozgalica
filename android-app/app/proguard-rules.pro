# Kotlin serialization čuva generisane serializere i prateće objekte.
-keepattributes Signature, *Annotation*, InnerClasses, EnclosingMethod
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class io.github.mlsivanovic.mozgalica.**$$serializer { *; }
-keepclassmembers class io.github.mlsivanovic.mozgalica.** {
    *** Companion;
}
-keepclasseswithmembers class io.github.mlsivanovic.mozgalica.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Neke tranzitivne biblioteke ostavljaju opcione SLF4J reference.
-dontwarn org.slf4j.**

# Code Scanner iz Play usluga: R8 full mode spaja i skraćuje interne ML Kit klase, pa
# GmsBarcodeScanning.startScan() u release-u pada sa NPE (debug radi). Ne skraćivati ih.
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_code_scanner.** { *; }
