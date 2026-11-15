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
import androidx.compose.ui.geometry.lerp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.foundation.Image
import io.github.mlsivanovic.mozgalica.R
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.CustomAccessibilityAction
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.customActions
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

// Klasična braon tabla (ista kao u PWA / react-chessboard), sa isticanjima u stilu lichess-a.
private val svetloPolje = Color(0xFFF0D9B5)
private val tamnoPolje = Color(0xFFB58863)
private val bojaSelekcije = Color(0xFF14551E)
private val bojaPoslednjeg = Color(0xFF9BC700)
private val bojaNajave = Color(0xFFEF554F)
private val bojaSaha = Color(0xFFFF0000)

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
    val figure = figurePaintera()
    val merac = rememberTextMeasurer()
    val stilKoordinata = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold)
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

        val mojeFigure = Square.values().filter { mojaFigura(it) }
        val akcijePristupacnosti = when {
            !mozeIgrati -> emptyList()
            izabrano == null -> mojeFigure.map { sq ->
                CustomAccessibilityAction("Izaberi ${sq.value().lowercase()}, ${opisFigure(tabla, sq)}") {
                    izabrano = sq
                    true
                }
            }
            else -> dostupniPotezi.map { potez ->
                CustomAccessibilityAction("Odigraj na ${potez.to.value().lowercase()}") {
                    pokusaj(potez.from, potez.to)
                    true
                }
            }
        }
        val opisTablice = buildString {
            append("Šahovska tabla. ")
            append(if (belaNaDnu) "Beli" else "Crni")
            append(" su na dnu.")
            izabrano?.let { append(" Izabrano ${it.value().lowercase()}, ${opisFigure(tabla, it)}.") }
            if (uSahu) append(" Šah.")
        }
        Canvas(
            modifier = Modifier
                .size(strana)
                .shadow(6.dp, RoundedCornerShape(10.dp))
                .clip(RoundedCornerShape(10.dp))
                .background(svetloPolje)
                .semantics {
                    contentDescription = opisTablice
                    customActions = akcijePristupacnosti
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
            val kvadrat = androidx.compose.ui.geometry.Size(poPolju, poPolju)
            fun gore(sq: Square) = centar(sq) - Offset(poPolju / 2, poPolju / 2)

            for (red in 0..7) {
                for (kolona in 0..7) {
                    val svetlo = (red + kolona) % 2 == 0
                    drawRect(
                        color = if (svetlo) svetloPolje else tamnoPolje,
                        topLeft = Offset(kolona * poPolju, red * poPolju),
                        size = kvadrat,
                    )
                }
            }

            // Koordinate na ivici, u boji suprotnog polja (kao lichess/chess.com).
            for (i in 0..7) {
                val brojReda = if (belaNaDnu) 8 - i else i + 1
                val bojaReda = if (i % 2 == 0) tamnoPolje else svetloPolje
                drawText(
                    merac, "$brojReda",
                    topLeft = Offset(poPolju * 0.06f, i * poPolju + poPolju * 0.03f),
                    style = stilKoordinata.copy(color = bojaReda),
                )
                val slovo = ('a' + if (belaNaDnu) i else 7 - i).toString()
                val bojaKolone = if ((7 + i) % 2 == 0) tamnoPolje else svetloPolje
                val izmereno = merac.measure(slovo, stilKoordinata)
                drawText(
                    izmereno,
                    color = bojaKolone,
                    topLeft = Offset(
                        (i + 1) * poPolju - izmereno.size.width - poPolju * 0.06f,
                        stranaPx - izmereno.size.height - poPolju * 0.02f,
                    ),
                )
            }

            poslednjiPotez?.let { potez ->
                listOf(potez.from, potez.to).forEach { ime ->
                    square(ime)?.let { sq -> drawRect(bojaPoslednjeg.copy(alpha = 0.41f), gore(sq), kvadrat) }
                }
            }

            izabrano?.let { sq -> drawRect(bojaSelekcije.copy(alpha = 0.5f), gore(sq), kvadrat) }

            kraljUSahu?.let { kralj ->
                drawRect(
                    brush = Brush.radialGradient(
                        0f to bojaSaha,
                        0.25f to bojaSaha,
                        0.9f to bojaSaha.copy(alpha = 0f),
                        center = centar(kralj),
                        radius = poPolju * 0.62f,
                    ),
                    topLeft = gore(kralj),
                    size = kvadrat,
                )
            }

            najavljeniPotez?.let { potez ->
                listOf(potez.from, potez.to).forEach { ime ->
                    square(ime)?.let { sq ->
                        drawRect(bojaNajave.copy(alpha = 0.24f), gore(sq), kvadrat)
                        drawRect(bojaNajave, gore(sq), kvadrat, style = Stroke(width = poPolju * 0.07f))
                    }
                }
            }

            val animira = animacija != null && napredak.value < 1f
            val animiranoOd = if (animira) animacija?.let { square(it.from) } else null
            val animiranoDo = if (animira) animacija?.let { square(it.to) } else null
            val velicinaFigure = poPolju * 0.94f

            for (sq in Square.values()) {
                if (sq == Square.NONE) continue
                val figura = tabla.getPiece(sq)
                if (figura == Piece.NONE) continue
                if (sq == animiranoOd || sq == animiranoDo) continue
                if (sq == izabrano && prevuceno != null) continue
                figure[figura]?.let { crtajFiguru(it, centar(sq), velicinaFigure) }
            }

            // Legalni potezi: tačka na praznom polju, prsten oko figure koja može da se uzme.
            izabrano?.let {
                ciljevi.forEach { cilj ->
                    if (tabla.getPiece(cilj) == Piece.NONE) {
                        drawCircle(bojaSelekcije.copy(alpha = 0.5f), radius = poPolju * 0.16f, center = centar(cilj))
                    } else {
                        drawCircle(
                            bojaSelekcije.copy(alpha = 0.5f),
                            radius = poPolju * 0.46f,
                            center = centar(cilj),
                            style = Stroke(width = poPolju * 0.08f),
                        )
                    }
                }
            }

            if (animira && animiranoOd != null && animiranoDo != null) {
                val figura = tabla.getPiece(animiranoDo)
                if (figura != Piece.NONE) {
                    val pozicija = lerp(centar(animiranoOd), centar(animiranoDo), napredak.value)
                    figure[figura]?.let { crtajFiguru(it, pozicija, velicinaFigure) }
                }
            }

            prevuceno?.let { offset ->
                polje(offset)?.let { ispod ->
                    drawRect(Color.White.copy(alpha = 0.35f), gore(ispod), kvadrat, style = Stroke(width = poPolju * 0.06f))
                }
                val sq = izabrano
                if (sq != null) {
                    val figura = tabla.getPiece(sq)
                    // Podignuta figura je veća i malo iznad prsta, da je dete vidi dok je vuče.
                    figure[figura]?.let { crtajFiguru(it, offset - Offset(0f, poPolju * 0.35f), poPolju * 1.25f) }
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
                                    modifier = Modifier.fillMaxWidth().heightIn(min = 64.dp),
                                    shape = MaterialTheme.shapes.medium,
                                ) {
                                    FiguraIkona(Piece.make(boja, tip), 44.dp)
                                    Spacer(Modifier.width(16.dp))
                                    Text(naziv, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
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
fun FiguraIkona(figura: Piece, velicina: androidx.compose.ui.unit.Dp, modifier: Modifier = Modifier) {
    val res = resursFigure(figura) ?: return
    Image(painterResource(res), contentDescription = null, modifier = modifier.size(velicina))
}

fun resursFigure(figura: Piece): Int? = when (figura) {
    Piece.WHITE_PAWN -> R.drawable.figura_bela_pesak
    Piece.WHITE_KNIGHT -> R.drawable.figura_bela_skakac
    Piece.WHITE_BISHOP -> R.drawable.figura_bela_lovac
    Piece.WHITE_ROOK -> R.drawable.figura_bela_top
    Piece.WHITE_QUEEN -> R.drawable.figura_bela_dama
    Piece.WHITE_KING -> R.drawable.figura_bela_kralj
    Piece.BLACK_PAWN -> R.drawable.figura_crna_pesak
    Piece.BLACK_KNIGHT -> R.drawable.figura_crna_skakac
    Piece.BLACK_BISHOP -> R.drawable.figura_crna_lovac
    Piece.BLACK_ROOK -> R.drawable.figura_crna_top
    Piece.BLACK_QUEEN -> R.drawable.figura_crna_dama
    Piece.BLACK_KING -> R.drawable.figura_crna_kralj
    else -> null
}

private val SVE_FIGURE = listOf(
    Piece.WHITE_PAWN, Piece.WHITE_KNIGHT, Piece.WHITE_BISHOP, Piece.WHITE_ROOK, Piece.WHITE_QUEEN, Piece.WHITE_KING,
    Piece.BLACK_PAWN, Piece.BLACK_KNIGHT, Piece.BLACK_BISHOP, Piece.BLACK_ROOK, Piece.BLACK_QUEEN, Piece.BLACK_KING,
)

@Composable
private fun figurePaintera(): Map<Piece, Painter> =
    SVE_FIGURE.associateWith { painterResource(resursFigure(it)!!) }

private fun DrawScope.crtajFiguru(slika: Painter, centar: Offset, velicina: Float) {
    translate(centar.x - velicina / 2f, centar.y - velicina / 2f) {
        with(slika) { draw(androidx.compose.ui.geometry.Size(velicina, velicina)) }
    }
}

private fun opisFigure(tabla: Board, sq: Square): String {
    val figura = tabla.getPiece(sq)
    if (figura == Piece.NONE) return "prazno polje"
    val boja = if (figura.pieceSide == Side.WHITE) "beli" else "crni"
    val tip = when (figura.pieceType) {
        PieceType.PAWN -> "pešak"
        PieceType.KNIGHT -> "skakač"
        PieceType.BISHOP -> "lovac"
        PieceType.ROOK -> "top"
        PieceType.QUEEN -> "dama"
        PieceType.KING -> "kralj"
        else -> "figura"
    }
    return "$boja $tip"
}
