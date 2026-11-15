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
