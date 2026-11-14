plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
}

android {
    namespace = "io.github.mlsivanovic.mozgalica.podaci"
    compileSdk = 36

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests.isIncludeAndroidResources = true
        unitTests.isReturnDefaultValues = true
    }

    lint {
        abortOnError = true
    }
}

dependencies {
    implementation(libs.serialization.json)
    implementation(libs.supabase.kt)
    implementation(libs.supabase.postgrest)
    // OkHttp 5.5 (ktor-client-okhttp 3.6) traži compileSdk 37. Plan drži 36.
    implementation(libs.ktor.android)
    implementation(libs.coroutines.android)
    implementation(libs.room.runtime)
    implementation(libs.datastore)
    implementation(libs.tink.android)
    ksp(libs.room.compiler)

    testImplementation(libs.junit)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
}
