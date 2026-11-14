package io.github.mlsivanovic.mozgalica.profil

import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun Osveziv(
    osvezava: Boolean,
    onOsvezi: () -> Unit,
    sadrzaj: @Composable BoxScope.() -> Unit,
) {
    PullToRefreshBox(
        isRefreshing = osvezava,
        onRefresh = onOsvezi,
        modifier = Modifier.fillMaxSize(),
        content = sadrzaj,
    )
}
