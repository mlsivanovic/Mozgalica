import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SahTabla } from '../../components/SahTabla'
import { Konfete, Loader, TemaDugme } from '../../components/Zajednicke'
import { sahAkcija } from '../../lib/api'
import { postaviDecjiManifest } from '../../pwa'
import type { SahStanjePayload } from '../../types/kviz'
import './sah.css'

const GRESKE: Record<string, string> = {
  not_found: 'Partija nije pronađena.',
  invalid_request: 'Zahtev nije ispravan.',
  not_in_progress: 'Partija nije u toku.',
  not_child_turn: 'Sačekaj potez računara.',
  invalid_move: 'Izaberi početno i završno polje.',
  invalid_promotion: 'Izbor figure za promociju nije ispravan.',
  illegal_move: 'Taj potez nije dozvoljen.',
  server_error: 'Partija trenutno nije dostupna. Pokušaj ponovo.',
}

function formatSat(ms: number | null | undefined): string {
  if (ms == null) return '∞'
  const ukupno = Math.max(0, Math.ceil(ms / 1000))
  const minuti = Math.floor(ukupno / 60)
  const sekunde = ukupno % 60
  return `${minuti}:${String(sekunde).padStart(2, '0')}`
}

function rezultatTekst(stanje: SahStanjePayload): string {
  if (stanje.result === 'child_win') return 'Pobeda!'
  if (stanje.result === 'draw') return 'Nerešeno'
  return 'Računar je pobedio'
}

function razlogTekst(razlog?: string | null): string {
  const mapa: Record<string, string> = {
    checkmate: 'mat', stalemate: 'pat', threefold_repetition: 'trostruko ponavljanje',
    fifty_move: 'pravilo 50 poteza', insufficient_material: 'nedovoljno materijala',
    timeout: 'istek vremena', resignation: 'predaja', draw: 'remi po pravilima',
  }
  return razlog ? mapa[razlog] ?? razlog : ''
}

export function SahPartija() {
  const { token = '' } = useParams<{ token: string }>()
  const [stanje, setStanje] = useState<SahStanjePayload | null>(null)
  const [ucitava, setUcitava] = useState(true)
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [primljenoAt, setPrimljenoAt] = useState(Date.now())
  const [sada, setSada] = useState(Date.now())

  const postavi = useCallback((novo: SahStanjePayload) => {
    setStanje(novo)
    setPrimljenoAt(Date.now())
    if (!novo.ok) setGreska(GRESKE[novo.error ?? ''] ?? novo.error ?? 'Partija nije dostupna.')
    else setGreska(null)
  }, [])

  const osvezi = useCallback(async () => {
    if (!token) return
    try {
      postavi(await sahAkcija(token, 'state'))
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }, [postavi, token])

  useEffect(() => {
    postaviDecjiManifest()
    void osvezi()
  }, [osvezi])

  useEffect(() => {
    const interval = window.setInterval(() => setSada(Date.now()), 250)
    const priFokusu = () => void osvezi()
    window.addEventListener('focus', priFokusu)
    document.addEventListener('visibilitychange', priFokusu)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', priFokusu)
      document.removeEventListener('visibilitychange', priFokusu)
    }
  }, [osvezi])

  const satovi = useMemo(() => {
    let white = stanje?.whiteRemainingMs ?? null
    let black = stanje?.blackRemainingMs ?? null
    if (stanje?.status === 'in_progress' && stanje.clockSeconds != null) {
      const proteklo = sada - primljenoAt
      if (stanje.turnColor === 'white' && white != null) white = Math.max(0, white - proteklo)
      if (stanje.turnColor === 'black' && black != null) black = Math.max(0, black - proteklo)
    }
    return { white, black }
  }, [stanje, primljenoAt, sada])

  useEffect(() => {
    if (stanje?.status !== 'in_progress' || stanje.clockSeconds == null || radi) return
    const aktivan = stanje.turnColor === 'white' ? satovi.white : satovi.black
    if (aktivan === 0) void osvezi()
  }, [osvezi, radi, satovi.black, satovi.white, stanje?.clockSeconds, stanje?.status, stanje?.turnColor])

  async function izvrsi(
    action: 'start' | 'move' | 'resign',
    move?: { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' },
  ) {
    if (!stanje?.ok || stanje.revision == null) return
    setRadi(true)
    setGreska(null)
    try {
      postavi(await sahAkcija(token, action, stanje.revision, move))
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      await osvezi()
    } finally {
      setRadi(false)
    }
  }

  if (ucitava) return <Loader tekst="Postavljam figure…" />
  if (!stanje?.ok || !stanje.fen || !stanje.childColor) {
    return (
      <main className="sah-strana">
        <div className="sadrzaj sadrzaj--usko centar">
          <h1>Partija nije dostupna</h1>
          <p className="poruka poruka--greska">{greska ?? 'Proveri link do partije.'}</p>
        </div>
      </main>
    )
  }

  const igra = new Chess(stanje.fen)
  const deteNaPotezu = stanje.status === 'in_progress' && stanje.turnColor === stanje.childColor
  const poslednji = stanje.moves?.at(-1)
  const redoviPoteza = Array.from({ length: Math.ceil((stanje.moves?.length ?? 0) / 2) }, (_, i) => ({
    broj: i + 1,
    beli: stanje.moves?.[i * 2]?.san ?? '',
    crni: stanje.moves?.[i * 2 + 1]?.san ?? '',
  }))

  return (
    <main className="sah-strana">
      {stanje.status === 'completed' && (stanje.starsAwarded ?? 0) > 0 && <Konfete />}
      <div className="sah-omot">
        <div className="red red--razmak razmak-dole">
          <div>
            <p className="malo blago">Šah protiv računara</p>
            <h1>{stanje.childName} · ELO {stanje.approximateElo}</h1>
          </div>
          <TemaDugme />
        </div>

        {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

        {stanje.status === 'assigned' ? (
          <section className="kartica centar sadrzaj--usko" style={{ margin: '2rem auto' }}>
            <div style={{ fontSize: '4rem' }} aria-hidden="true">♟️</div>
            <h2>Spreman/na za partiju?</h2>
            <p className="blago razmak-gore">
              Igraš {stanje.childColor === 'white' ? 'belim' : 'crnim'} figurama
              {stanje.clockSeconds ? `, sa ${stanje.clockSeconds / 60} minuta po igraču` : ', bez sata'}.
              {stanje.clockSeconds ? ' Sat se ne pauzira kada zatvoriš aplikaciju.' : ''}
            </p>
            <button type="button" className="dugme dugme--akcenat razmak-gore" disabled={radi} onClick={() => void izvrsi('start')}>
              {radi ? 'Pokrećem…' : 'Pokreni partiju'}
            </button>
          </section>
        ) : (
          <div className="sah-igra">
            <section>
              <SahTabla
                fen={stanje.fen}
                orientation={stanje.childColor}
                playerColor={stanje.childColor}
                disabled={!deteNaPotezu || radi || stanje.status !== 'in_progress'}
                lastMove={poslednji ? { from: poslednji.uci.slice(0, 2), to: poslednji.uci.slice(2, 4) } : null}
                onMove={(move) => void izvrsi('move', move)}
              />
            </section>

            <aside className="sah-panel">
              {stanje.clockSeconds != null && (
                <section className="kartica sah-satovi" aria-label="Šahovski satovi">
                  <div className={`sah-sat ${stanje.status === 'in_progress' && stanje.turnColor === 'white' ? 'sah-sat--aktivan' : ''}`}>
                    Beli<strong>{formatSat(satovi.white)}</strong>
                  </div>
                  <div className={`sah-sat ${stanje.status === 'in_progress' && stanje.turnColor === 'black' ? 'sah-sat--aktivan' : ''}`}>
                    Crni<strong>{formatSat(satovi.black)}</strong>
                  </div>
                </section>
              )}

              <section className="kartica">
                {stanje.status === 'completed' ? (
                  <div className={`sah-rezultat ${stanje.result === 'child_loss' ? 'sah-rezultat--poraz' : ''}`}>
                    <h2>{rezultatTekst(stanje)}</h2>
                    <p className="blago">{razlogTekst(stanje.termination)}</p>
                    <p style={{ fontSize: '1.5rem' }}>{'⭐'.repeat(stanje.starsAwarded ?? 0) || '☆'}</p>
                    <strong>{stanje.starsAwarded ?? 0} zvezdica</strong>
                  </div>
                ) : (
                  <>
                    <h2>{radi ? 'Računar razmišlja…' : deteNaPotezu ? 'Tvoj potez' : 'Potez računara'}</h2>
                    <p className="blago malo">
                      {igra.inCheck() ? 'Šah! ' : ''}Pomeraj figure prevlačenjem ili dodirom na dva polja.
                    </p>
                    <button
                      type="button" className="dugme dugme--opasno dugme--malo razmak-gore"
                      disabled={radi} onClick={() => {
                        if (confirm('Predati partiju? Ovo se računa kao poraz i donosi 0 zvezdica.')) void izvrsi('resign')
                      }}
                    >
                      Predaj partiju
                    </button>
                  </>
                )}
              </section>

              <section className="kartica">
                <h2>Potezi</h2>
                {redoviPoteza.length === 0 ? <p className="blago">Još nema poteza.</p> : (
                  <div className="sah-potezi razmak-gore">
                    {redoviPoteza.map((red) => (
                      <span key={red.broj} style={{ display: 'contents' }}>
                        <span>{red.broj}.</span><span>{red.beli}</span><span>{red.crni}</span>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {stanje.profileToken && (
                <Link className="dugme dugme--senka" to={`/dete/${stanje.profileToken}`}>
                  ← Nazad na profil
                </Link>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
