package io.github.mlsivanovic.mozgalica.macrobenchmark

import androidx.benchmark.macro.BaselineProfileMode
import androidx.benchmark.macro.CompilationMode
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Direction
import androidx.test.uiautomator.Until
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FrameTimingBenchmark {
    @get:Rule
    val pravilo = MacrobenchmarkRule()

    @Test
    fun skrolPocetne() = pravilo.measureRepeated(
        packageName = "io.github.mlsivanovic.mozgalica",
        metrics = listOf(FrameTimingMetric()),
        iterations = 5,
        startupMode = StartupMode.WARM,
        compilationMode = CompilationMode.Partial(BaselineProfileMode.Require),
    ) {
        startActivityAndWait()
        device.wait(Until.hasObject(By.text("Moj profil")), 8_000)
        val lista = device.findObject(By.scrollable(true))
        lista?.setGestureMargin(device.displayWidth / 5)
        repeat(3) {
            lista?.fling(Direction.DOWN)
            device.waitForIdle(1_000)
        }
    }
}
