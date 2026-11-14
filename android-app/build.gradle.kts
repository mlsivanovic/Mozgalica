// Ugrađeni Kotlin u AGP 9 inače ostaje na 2.2.10, a Compose i serijalizacija traže 2.4.
buildscript {
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.21")
    }
}

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}

// Compose BOM 2026.06 poravna lifecycle na 2.11, a taj traži compileSdk 37.
subprojects {
    configurations.configureEach {
        resolutionStrategy {
            eachDependency {
                if (requested.group == "androidx.lifecycle") {
                    useVersion("2.9.4")
                    because("compileSdk 36 ne podnosi lifecycle 2.11")
                }
            }
        }
    }
}
