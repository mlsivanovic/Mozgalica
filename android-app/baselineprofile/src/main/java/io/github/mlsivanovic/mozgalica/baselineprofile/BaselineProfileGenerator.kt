package io.github.mlsivanovic.mozgalica.baselineprofile

import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    @get:Rule
    val pravilo = BaselineProfileRule()

    @Test
    fun generisi() = pravilo.collect(
        packageName = "io.github.mlsivanovic.mozgalica",
    ) {
        pressHome()
        startActivityAndWait()
        device.wait(Until.hasObject(By.text("Moj profil")), 8_000)
    }
}
