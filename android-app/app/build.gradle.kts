plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.google.services) apply false
    alias(libs.plugins.androidx.baselineprofile)
}

// Bez google-services.json (javni repo/CI bez Firebase tajni) build i dalje prolazi;
// push se tada prijavljuje kao nedostupan na uređaju.
if (rootProject.file("app/google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
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
        versionCode = 7
        versionName = "1.0.6"
        buildConfigField("String", "SUPABASE_URL", zaBuildConfig(vrednostIzEnv("VITE_SUPABASE_URL")))
        buildConfigField("String", "SUPABASE_ANON_KLJUC", zaBuildConfig(vrednostIzEnv("VITE_SUPABASE_ANON_KEY")))
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        create("benchmark") {
            initWith(getByName("release"))
            signingConfig = signingConfigs.getByName("debug")
            matchingFallbacks += listOf("release")
            isDebuggable = false
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

baselineProfile {
    saveInSrc = true
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
    implementation(libs.compose.material.icons)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.navigation.compose)
    implementation(libs.serialization.json)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.hilt.android)
    implementation(libs.hilt.compose)
    implementation(libs.code.scanner)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.chesslib)
    implementation(libs.work.runtime)
    implementation(libs.glance.appwidget)
    implementation(libs.metrics.performance)
    baselineProfile(project(":baselineprofile"))
    ksp(libs.hilt.compiler)
    coreLibraryDesugaring(libs.desugar)

    testImplementation(libs.junit)
    testImplementation(libs.coroutines.test)
}
