import { useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, type PieceSymbol, type Square } from 'chess.js'

interface Props {
  fen: string
  orientation: 'white' | 'black'
  disabled?: boolean
  playerColor?: 'white' | 'black'
  lastMove?: { from: string; to: string } | null
  announcedMove?: { from: string; to: string } | null
  animationDurationInMs?: number
  onMove?: (move: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }) => void
}

interface Promocija {
  from: string
  to: string
}

export function SahTabla({
  fen, orientation, disabled = false, playerColor, lastMove, announcedMove,
  animationDurationInMs = 180, onMove,
}: Props) {
  const [izabrano, setIzabrano] = useState<string | null>(null)
  const [promocija, setPromocija] = useState<Promocija | null>(null)
  const igra = useMemo(() => new Chess(fen), [fen])
  const bojaIgraca = playerColor === 'white' ? 'w' : playerColor === 'black' ? 'b' : null
  const smeDaIgra = !disabled && !!onMove && (!bojaIgraca || igra.turn() === bojaIgraca)

  function jeFiguraIgraca(square: string): boolean {
    const figura = igra.get(square as Square)
    return !!figura && (!bojaIgraca || figura.color === bojaIgraca)
  }

  function pokušaj(from: string, to: string): boolean {
    if (!smeDaIgra) return false
    const figura = igra.get(from as Square)
    if (!figura || (bojaIgraca && figura.color !== bojaIgraca)) return false
    const jePromocija = figura.type === 'p' && (to.endsWith('8') || to.endsWith('1'))
    if (jePromocija) {
      const legalna = igra.moves({ square: from as Square, verbose: true }).some((p) => p.to === to)
      if (!legalna) return false
      setPromocija({ from, to })
      setIzabrano(null)
      return false
    }
    try {
      const kopija = new Chess(fen)
      kopija.move({ from: from as Square, to: to as Square })
      onMove?.({ from, to })
      setIzabrano(null)
      return true
    } catch {
      setIzabrano(jeFiguraIgraca(to) ? to : null)
      return false
    }
  }

  const stilovi: Record<string, React.CSSProperties> = {}
  if (lastMove) {
    stilovi[lastMove.from] = { background: 'rgba(255, 214, 74, 0.48)' }
    stilovi[lastMove.to] = { background: 'rgba(255, 214, 74, 0.7)' }
  }
  if (announcedMove) {
    stilovi[announcedMove.from] = {
      ...stilovi[announcedMove.from],
      boxShadow: 'inset 0 0 0 4px rgba(239, 85, 79, .88)',
    }
    stilovi[announcedMove.to] = {
      ...stilovi[announcedMove.to],
      backgroundImage: 'radial-gradient(circle, rgba(239, 85, 79, .96) 0 14%, rgba(255,255,255,.9) 16% 21%, transparent 23%)',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      animation: 'sah-cilj-puls 700ms ease-in-out infinite',
    }
  }
  if (izabrano) {
    stilovi[izabrano] = { ...stilovi[izabrano], boxShadow: 'inset 0 0 0 4px #5b6ee1' }
    for (const potez of igra.moves({ square: izabrano as Square, verbose: true })) {
      stilovi[potez.to] = {
        ...stilovi[potez.to],
        backgroundImage: 'radial-gradient(circle, rgba(91,110,225,.72) 0 16%, transparent 18%)',
      }
    }
  }

  return (
    <div className="sah-tabla-omot">
      <Chessboard options={{
        id: `sah-${orientation}`,
        position: fen,
        boardOrientation: orientation,
        allowDragging: smeDaIgra,
        canDragPiece: ({ square }) => !!square && jeFiguraIgraca(square),
        onPieceDrop: ({ sourceSquare, targetSquare }) => (
          targetSquare ? pokušaj(sourceSquare, targetSquare) : false
        ),
        onSquareClick: ({ square }) => {
          if (!smeDaIgra) return
          if (!izabrano) {
            if (jeFiguraIgraca(square)) setIzabrano(square)
            return
          }
          void pokušaj(izabrano, square)
        },
        squareStyles: stilovi,
        darkSquareStyle: { backgroundColor: '#7187a8' },
        lightSquareStyle: { backgroundColor: '#e8edf5' },
        boardStyle: { borderRadius: 12, boxShadow: 'var(--senka-jaka)' },
        animationDurationInMs,
        allowDrawingArrows: false,
      }} />

      {promocija && (
        <div className="sah-promocija" role="dialog" aria-label="Izbor figure za promociju">
          <strong>Promocija pešaka</strong>
          <div className="red">
            {([['q', 'Dama'], ['r', 'Top'], ['b', 'Lovac'], ['n', 'Skakač']] as const).map(([figura, naziv]) => (
              <button
                type="button" className="dugme dugme--senka dugme--malo" key={figura}
                onClick={() => {
                  onMove?.({ ...promocija, promotion: figura as PieceSymbol as 'q' | 'r' | 'b' | 'n' })
                  setPromocija(null)
                }}
              >
                {naziv}
              </button>
            ))}
          </div>
          <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setPromocija(null)}>
            Otkaži
          </button>
        </div>
      )}
    </div>
  )
}
