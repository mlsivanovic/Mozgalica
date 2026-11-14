package io.github.mlsivanovic.mozgalica.sah

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.lerp
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.github.bhlangonijr.chesslib.Board
import com.github.bhlangonijr.chesslib.File
import com.github.bhlangonijr.chesslib.Piece
import com.github.bhlangonijr.chesslib.PieceType
import com.github.bhlangonijr.chesslib.Rank
import com.github.bhlangonijr.chesslib.Side
import com.github.bhlangonijr.chesslib.Square
import com.github.bhlangonijr.chesslib.move.Move
import io.github.mlsivanovic.mozgalica.podaci.sah.SahPotezUnos

private val svetloPolje = Color(0xFFE8EDF5)
private val tamnoPolje = Color(0xFF7187A8)
private val bojaSelekcije = Color(0xFF4F46E5)
private val bojaPoslednjeg = Color(0xFFFFD64A)
private val bojaNajave = Color(0xFFEF554F)
private val bojaSaha = Color(0xFFD92D20)
private val bojaBelihFigura = Color(0xFFF7F4EA)
private val bojaCrnihFigura = Color(0xFF23262F)
private val ivicaBeleFigure = Color(0xFF2B2B33)
private val ivicaCrneFigure = Color(0xFFF1EBDD)

private data class Promocija(val from: Square, val to: Square)

@Composable
fun SahTabla(
    fen: String,
    orijentacija: String,
    mozeIgrati: Boolean,
    poslednjiPotez: PotezPolja?,
    najavljeniPotez: PotezPolja?,
    animacija: PotezPolja?,
    trajanjeAnimacije: Int,
    onPotez: (SahPotezUnos) -> Unit,
    modifier: Modifier = Modifier,
) {
    val belaNaDnu = orijentacija != "black"
    val tabla = remember(fen) { Board().apply { loadFromFen(fen) } }
    val legalni = remember(fen) { tabla.legalMoves() }
    var izabrano by remember(fen) { mutableStateOf<Square?>(null) }
    var promocija by remember(fen) { mutableStateOf<Promocija?>(null) }
    var prevuceno by remember(fen) { mutableStateOf<Offset?>(null) }
    val napredak = remember { Animatable(1f) }

    LaunchedEffect(animacija, trajanjeAnimacije) {
        if (animacija != null) {
            napredak.snapTo(0f)
            napredak.animateTo(1f, tween(trajanjeAnimacije))
        } else {
            napredak.snapTo(1f)
        }
    }

    val dostupniPotezi = remember(izabrano, legalni) {
        izabrano?.let { od -> legalni.filter { it.from == od } }.orEmpty()
    }
    val ciljevi = dostupniPotezi.map { it.to }.toSet()
    val uSahu = tabla.isKingAttacked()
    val kraljUSahu = if (uSahu) tabla.getKingSquare(tabla.sideToMove) else null

    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val strana = maxWidth
        val stranaPx = constraints.maxWidth.toFloat().coerceAtLeast(1f)
        val poPolju = stranaPx / 8f

        fun polje(offset: Offset): Square? {
            if (offset.x < 0f || offset.y < 0f || offset.x >= stranaPx || offset.y >= stranaPx) return null
            val col = (offset.x / poPolju).toInt().coerceIn(0, 7)
            val row = (offset.y / poPolju).toInt().coerceIn(0, 7)
            val f = if (belaNaDnu) col else 7 - col
            val r = if (belaNaDnu) 7 - row else row
            return Square.encode(Rank.values()[r], File.values()[f])
        }

        fun centar(sq: Square): Offset {
            val f = if (belaNaDnu) sq.file.ordinal else 7 - sq.file.ordinal
            val r = if (belaNaDnu) 7 - sq.rank.ordinal else sq.rank.ordinal
            return Offset((f + 0.5f) * poPolju, (r + 0.5f) * poPolju)
        }

        fun mojaFigura(sq: Square): Boolean {
            val figura = tabla.getPiece(sq)
            return figura != Piece.NONE && figura.pieceSide == tabla.sideToMove
        }

        fun odigraj(from: Square, to: Square, prom: Piece? = null) {
            val potez = if (prom == null) {
                dostupniPoteziZa(tabla, from, to, null)
            } else {
                dostupniPoteziZa(tabla, from, to, prom.pieceType)
            }
            if (potez != null) {
                val slovo = potez.promotion?.pieceType?.let {
                    when (it) {
                        PieceType.QUEEN -> "q"
                        PieceType.ROOK -> "r"
                        PieceType.BISHOP -> "b"
                        PieceType.KNIGHT -> "n"
                        else -> null
                    }
                }
                onPotez(SahPotezUnos(from.value().lowercase(), to.value().lowercase(), slovo))
                izabrano = null
            } else {
                izabrano = if (mojaFigura(to)) to else null
            }
        }

        fun pokusaj(from: Square, to: Square) {
            if (!mozeIgrati) return
            val figura = tabla.getPiece(from)
            if (figura == Piece.NONE || figura.pieceSide != tabla.sideToMove) return
            val jePromocija = figura.pieceType == PieceType.PAWN &&
                (to.rank == Rank.RANK_8 || to.rank == Rank.RANK_1)
            val legalno = dostupniPoteziZa(tabla, from, to, if (jePromocija) PieceType.QUEEN else null)
            if (jePromocija && legalno != null) {
                promocija = Promocija(from, to)
                izabrano = null
                return
            }
            if (legalno != null) {
                odigraj(from, to)
            } else {
                izabrano = if (mojaFigura(to)) to else null
            }
        }

        Canvas(
            modifier = Modifier
                .size(strana)
                .clip(RoundedCornerShape(16.dp))
                .background(svetloPolje)
                .semantics {
                    contentDescription = "Šahovska tabla. ${if (belaNaDnu) "Beli" else "Crni"} su na dnu."
                }
                .pointerInput(fen, mozeIgrati, belaNaDnu) {
                    detectTapGestures { offset ->
                        if (!mozeIgrati) return@detectTapGestures
                        val polje = polje(offset) ?: return@detectTapGestures
                        val izabranoTrenutno = izabrano
                        if (izabranoTrenutno == null) {
                            if (mojaFigura(polje)) izabrano = polje
                        } else {
                            if (izabranoTrenutno == polje) {
                                izabrano = null
                            } else if (mojaFigura(polje)) {
                                izabrano = polje
                            } else {
                                pokusaj(izabranoTrenutno, polje)
                            }
                        }
                    }
                }
                .pointerInput(fen, mozeIgrati, belaNaDnu) {
                    detectDragGestures(
                        onDragStart = { offset ->
                            if (!mozeIgrati) return@detectDragGestures
                            val polje = polje(offset) ?: return@detectDragGestures
                            if (mojaFigura(polje)) {
                                izabrano = polje
                                prevuceno = offset
                            }
                        },
                        onDrag = { promena, _ ->
                            promena.consume()
                            prevuceno = promena.position
                        },
                        onDragEnd = {
                            val sa = izabrano
                            val na = prevuceno?.let { polje(it) }
                            prevuceno = null
                            if (mozeIgrati && sa != null && na != null && sa != na) pokusaj(sa, na)
                        },
                        onDragCancel = { prevuceno = null },
                    )
                },
        ) {
            for (red in 0..7) {
                for (kolona in 0..7) {
                    val svetlo = (red + kolona) % 2 == 0
                    drawRect(
                        color = if (svetlo) svetloPolje else tamnoPolje,
                        topLeft = Offset(kolona * poPolju, red * poPolju),
                        size = androidx.compose.ui.geometry.Size(poPolju, poPolju),
                    )
                }
            }

            poslednjiPotez?.let { potez ->
                listOf(potez.from, potez.to).forEach { ime ->
                    square(ime)?.let { sq ->
                        drawRect(
                            color = bojaPoslednjeg.copy(alpha = if (ime == potez.to) 0.62f else 0.42f),
                            topLeft = centar(sq) - Offset(poPolju / 2, poPolju / 2),
                            size = androidx.compose.ui.geometry.Size(poPolju, poPolju),
                        )
                    }
                }
            }

            izabrano?.let { sq ->
                drawRect(
                    color = bojaSelekcije.copy(alpha = 0.28f),
                    topLeft = centar(sq) - Offset(poPolju / 2, poPolju / 2),
                    size = androidx.compose.ui.geometry.Size(poPolju, poPolju),
                )
                drawRect(
                    color = bojaSelekcije,
                    topLeft = centar(sq) - Offset(poPolju / 2, poPolju / 2),
                    size = androidx.compose.ui.geometry.Size(poPolju, poPolju),
                    style = Stroke(width = 5f),
                )
            }

            izabrano?.let {
                ciljevi.forEach { cilj ->
                    drawCircle(
                        color = bojaSelekcije.copy(alpha = if (tabla.getPiece(cilj) == Piece.NONE) 0.42f else 0.18f),
                        radius = poPolju * 0.13f,
                        center = centar(cilj),
                    )
                }
            }

            kraljUSahu?.let { kralj ->
                drawCircle(
                    color = bojaSaha.copy(alpha = 0.42f),
                    radius = poPolju * 0.44f,
                    center = centar(kralj),
                )
            }

            najavljeniPotez?.let { potez ->
                listOf(potez.from, potez.to).forEach { ime ->
                    square(ime)?.let { sq ->
                        drawRect(
                            color = bojaNajave.copy(alpha = 0.24f),
                            topLeft = centar(sq) - Offset(poPolju / 2, poPolju / 2),
                            size = androidx.compose.ui.geometry.Size(poPolju, poPolju),
                        )
                        drawRect(
                            color = bojaNajave,
                            topLeft = centar(sq) - Offset(poPolju / 2, poPolju / 2),
                            size = androidx.compose.ui.geometry.Size(poPolju, poPolju),
                            style = Stroke(width = 6f),
                        )
                    }
                }
            }

            val animira = animacija != null && napredak.value < 1f
            val animiranoOd = if (animira) animacija?.let { square(it.from) } else null
            val animiranoDo = if (animira) animacija?.let { square(it.to) } else null

            for (sq in Square.values()) {
                if (sq == Square.NONE) continue
                val figura = tabla.getPiece(sq)
                if (figura == Piece.NONE) continue
                if (sq == animiranoOd || sq == animiranoDo) continue
                if (sq == izabrano && prevuceno != null) continue
                drawFigura(figura, centar(sq), poPolju * 0.86f)
            }

            if (animira && animiranoOd != null && animiranoDo != null) {
                val figura = tabla.getPiece(animiranoDo)
                if (figura != Piece.NONE) {
                    val pozicija = lerp(centar(animiranoOd), centar(animiranoDo), napredak.value)
                    drawFigura(figura, pozicija, poPolju * 0.86f)
                }
            }

            prevuceno?.let { offset ->
                val sq = izabrano
                if (sq != null) {
                    val figura = tabla.getPiece(sq)
                    if (figura != Piece.NONE) drawFigura(figura, offset, poPolju * 0.9f)
                }
            }
        }

        if (promocija != null) {
            val p = promocija
            val boja = tabla.sideToMove
            AlertDialog(
                onDismissRequest = { promocija = null },
                title = { Text("Promocija pešaka") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Izaberi figuru u koju se pešak pretvara.")
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf(
                                PieceType.QUEEN to "Dama",
                                PieceType.ROOK to "Top",
                                PieceType.BISHOP to "Lovac",
                                PieceType.KNIGHT to "Skakač",
                            ).forEach { (tip, naziv) ->
                                OutlinedButton(
                                    onClick = {
                                        promocija = null
                                        if (p != null) pokusajPromociju(tabla, p, tip, onPotez)
                                    },
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                                ) {
                                    FiguraIkona(Piece.make(boja, tip), 28.dp)
                                    Spacer(Modifier.width(12.dp))
                                    Text(naziv, style = MaterialTheme.typography.titleMedium)
                                }
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { promocija = null }) { Text("Otkaži") }
                },
            )
        }
    }
}

private fun pokusajPromociju(
    tabla: Board,
    promocija: Promocija,
    tip: PieceType,
    onPotez: (SahPotezUnos) -> Unit,
) {
    val potez = dostupniPoteziZa(tabla, promocija.from, promocija.to, tip) ?: return
    val slovo = when (tip) {
        PieceType.QUEEN -> "q"
        PieceType.ROOK -> "r"
        PieceType.BISHOP -> "b"
        PieceType.KNIGHT -> "n"
        else -> return
    }
    onPotez(SahPotezUnos(potez.from.value().lowercase(), potez.to.value().lowercase(), slovo))
}

private fun dostupniPoteziZa(
    tabla: Board,
    from: Square,
    to: Square,
    promocija: PieceType?,
): Move? {
    val kandidati = tabla.legalMoves().filter { it.from == from && it.to == to }
    if (promocija == null) {
        return kandidati.firstOrNull { it.promotion == null || it.promotion == Piece.NONE }
            ?: kandidati.firstOrNull()
    }
    return kandidati.firstOrNull { it.promotion?.pieceType == promocija }
}

@Composable
fun FiguraIkona(figura: Piece, velicina: androidx.compose.ui.unit.Dp) {
    Canvas(Modifier.size(velicina)) {
        drawFigura(figura, Offset(size.width / 2, size.height / 2), size.minDimension)
    }
}

private fun DrawScope.drawFigura(figura: Piece, centar: Offset, velicina: Float) {
    if (figura == Piece.NONE) return
    val putanja = putanjaFigure(figura.pieceType)
    val bela = figura.pieceSide == Side.WHITE
    val unutrasnjost = if (bela) bojaBelihFigura else bojaCrnihFigura
    val ivica = if (bela) ivicaBeleFigure else ivicaCrneFigure
    withTransform({
        translate(centar.x - velicina / 2f, centar.y - velicina / 2f)
        scale(velicina / 100f, velicina / 100f, Offset.Zero)
    }) {
        withTransform({ translate(0.8f, 2.6f) }) {
            drawPath(putanja, Color.Black.copy(alpha = 0.22f))
        }
        drawPath(putanja, unutrasnjost)
        drawPath(putanja, ivica, style = Stroke(width = 4f, join = StrokeJoin.Round))
        if (figura.pieceType == PieceType.KNIGHT) {
            drawCircle(if (bela) ivica else unutrasnjost, radius = 2.2f, center = Offset(60f, 38f))
            drawCircle(if (bela) unutrasnjost else ivica, radius = 1f, center = Offset(60f, 38f))
        }
    }
}

private fun putanjaFigure(tip: PieceType): Path {
    val p = Path()
    when (tip) {
        PieceType.PAWN -> {
            p.addOval(Rect(34f, 12f, 66f, 44f))
            p.moveTo(38f, 44f)
            p.cubicTo(34f, 58f, 30f, 70f, 28f, 80f)
            p.lineTo(72f, 80f)
            p.cubicTo(70f, 70f, 66f, 58f, 62f, 44f)
            p.close()
            p.addRoundRect(RoundRect(24f, 80f, 76f, 92f, 5f, 5f))
        }
        PieceType.ROOK -> {
            p.addRoundRect(RoundRect(24f, 80f, 76f, 92f, 4f, 4f))
            p.addRect(Rect(30f, 42f, 70f, 82f))
            p.addRect(Rect(28f, 20f, 40f, 42f))
            p.addRect(Rect(44f, 20f, 56f, 42f))
            p.addRect(Rect(60f, 20f, 72f, 42f))
            p.addRect(Rect(28f, 38f, 72f, 46f))
        }
        PieceType.KNIGHT -> {
            p.addRoundRect(RoundRect(24f, 80f, 76f, 92f, 4f, 4f))
            p.moveTo(30f, 82f)
            p.lineTo(35f, 62f)
            p.lineTo(26f, 54f)
            p.lineTo(30f, 38f)
            p.lineTo(40f, 26f)
            p.lineTo(52f, 20f)
            p.lineTo(63f, 25f)
            p.lineTo(69f, 36f)
            p.lineTo(60f, 45f)
            p.lineTo(56f, 54f)
            p.lineTo(60f, 82f)
            p.close()
            p.moveTo(50f, 24f)
            p.lineTo(54f, 9f)
            p.lineTo(60f, 24f)
            p.close()
        }
        PieceType.BISHOP -> {
            p.addRoundRect(RoundRect(24f, 80f, 76f, 92f, 4f, 4f))
            p.moveTo(38f, 80f)
            p.cubicTo(40f, 60f, 38f, 48f, 44f, 40f)
            p.lineTo(50f, 27f)
            p.lineTo(56f, 40f)
            p.cubicTo(62f, 48f, 60f, 60f, 62f, 80f)
            p.close()
            p.addOval(Rect(44f, 17f, 56f, 29f))
        }
        PieceType.QUEEN -> {
            p.addRoundRect(RoundRect(22f, 80f, 78f, 92f, 4f, 4f))
            p.moveTo(30f, 80f)
            p.lineTo(34f, 46f)
            p.lineTo(66f, 46f)
            p.lineTo(70f, 80f)
            p.close()
            p.moveTo(32f, 46f)
            p.lineTo(26f, 22f)
            p.lineTo(38f, 34f)
            p.lineTo(44f, 18f)
            p.lineTo(50f, 32f)
            p.lineTo(56f, 18f)
            p.lineTo(62f, 34f)
            p.lineTo(74f, 22f)
            p.lineTo(68f, 46f)
            p.close()
        }
        PieceType.KING -> {
            p.addRoundRect(RoundRect(22f, 80f, 78f, 92f, 4f, 4f))
            p.moveTo(30f, 80f)
            p.lineTo(34f, 44f)
            p.lineTo(66f, 44f)
            p.lineTo(70f, 80f)
            p.close()
            p.moveTo(36f, 44f)
            p.lineTo(32f, 26f)
            p.lineTo(44f, 32f)
            p.lineTo(50f, 18f)
            p.lineTo(56f, 32f)
            p.lineTo(68f, 26f)
            p.lineTo(64f, 44f)
            p.close()
            p.addRect(Rect(47f, 5f, 53f, 20f))
            p.addRect(Rect(40f, 9f, 60f, 15f))
        }
        else -> Unit
    }
    return p
}
