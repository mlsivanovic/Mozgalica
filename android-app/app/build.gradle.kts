plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

// Anon ključ je javan po dizajnu, ali ne ide u git. CI bez .env.local i dalje gradi.
fun vrednostIzEnv(ime: String): String {
    val fajl = rootProject.file("../.env.local")
    if (!fajl.exists()) return ""
    val linija = fajl.readLines().firstOrNull { it.startsWith("$ime=") } ?: return ""
    return linija.substringAfter("=").trim().trim('"')
}

fun zaBuildConfig(vrednost: String): String =
    "\"" + vrednost.replace("\\", "\\\\").replace("\"", "\\\"").replace("$", "\\$") + "\""

android {
    namespace = "io.github.mlsivanovic.mozgalica"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.mlsivanovic.mozgalica"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "SUPABASE_URL", zaBuildConfig(vrednostIzEnv("VITE_SUPABASE_URL")))
        buildConfigField("String", "SUPABASE_ANON_KLJUC", zaBuildConfig(vrednostIzEnv("VITE_SUPABASE_ANON_KEY")))
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        abortOnError = true
    }
}

dependencies {
    implementation(project(":core:dizajn"))
    implementation(project(":core:podaci"))
    implementation(libs.core.ktx)
    implementation(libs.core.splashscreen)
    implementation(libs.activity.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.navigation.compose)
    implementation(libs.serialization.json)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.hilt.android)
    implementation(libs.hilt.compose)
    implementation(libs.code.scanner)
    ksp(libs.hilt.compiler)
    coreLibraryDesugaring(libs.desugar)

    testImplementation(libs.junit)
    testImplementation(libs.coroutines.test)
}
