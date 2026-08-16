import { Chess } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SahTabla } from '../../components/SahTabla'
import { Konfete, Loader, TemaDugme } from '../../components/Zajednicke'
import { sahAkcija } from '../../lib/api'
import { postaviDecjiManifest } from '../../pwa'
import { dozvoljeniEloZaPokusaj, preostaloPokusaja } from '../../sah/pokusaj'
import type { SahStanjePayload } from '../../types/kviz'
import './sah.css'

const GRESKE: Record<string, string> = {
  not_found: 'Partija nije pronađena.',
  invalid_request: 'Zahtev nije ispravan.',
  not_in_progress: 'Partija nije u toku.',
  not_child_turn: 'Sačekaj potez računara.',
  not_engine_turn: 'Računar sada nije na potezu.',
  invalid_move: 'Izaberi početno i završno polje.',
  invalid_promotion: 'Izbor figure za promociju nije ispravan.',
  illegal_move: 'Taj potez nije dozvoljen.',
  undo_unavailable: 'Ovaj potez više nije moguće poništiti.',
  retry_not_allowed: 'Ovu partiju više nije moguće ponoviti.',
  invalid_elo: 'Izabrana jačina protivnika nije ispravna.',
  elo_too_high: 'Možeš izabrati samo istu ili slabiju jačinu protivnika.',
  retries_exhausted: 'Nemaš više pravo na ponovni pokušaj.',
  server_error: 'Partija trenutno nije dostupna. Pokušaj ponovo.',
}

const PAUZA_PRE_RACUNARA_MS = 2800
const NAJAVA_POTEZA_MS = 800
const ANIMACIJA_RACUNARA_MS = 1000
const PODRAZUMEVANA_ANIMACIJA_MS = 180

type SahPotez = { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }
type FazaPoteza = 'miruje' | 'cuvanje' | 'razmisljanje' | 'najava' | 'animacija' | 'ponistavanje'

function poljaPoteza(uci?: string | null): { from: string; to: string } | null {
  return uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null
}

function sačekaj(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
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
  const navigate = useNavigate()
  const [stanje, setStanje] = useState<SahStanjePayload | null>(null)
  const [ucitava, setUcitava] = useState(true)
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [biraElo, setBiraElo] = useState(false)
  const [primljenoAt, setPrimljenoAt] = useState(Date.now())
  const [sada, setSada] = useState(Date.now())
  const [prikazaniFen, setPrikazaniFen] = useState<string | null>(null)
  const [prikazaniPoslednji, setPrikazaniPoslednji] = useState<{ from: string; to: string } | null>(null)
  const [najavljeniPotez, setNajavljeniPotez] = useState<{ from: string; to: string } | null>(null)
  const [trajanjeAnimacije, setTrajanjeAnimacije] = useState(PODRAZUMEVANA_ANIMACIJA_MS)
  const [faza, setFaza] = useState<FazaPoteza>('miruje')
  const [obavestenje, setObavestenje] = useState<string | null>(null)
  const tajmerRacunara = useRef<number | null>(null)
  const tokAkcije = useRef(0)
  const radiRef = useRef(false)
  const izvrsiPotezRacunaraRef = useRef<(revision: number, brojPoteza: number) => void>(() => undefined)

  const postavi = useCallback((novo: SahStanjePayload, prikaziOdmah = true) => {
    if (novo.ok) {
      setStanje(novo)
      setPrimljenoAt(Date.now())
      if (prikaziOdmah && novo.fen) {
        setPrikazaniFen(novo.fen)
        setPrikazaniPoslednji(poljaPoteza(novo.moves?.at(-1)?.uci))
      }
      setGreska(null)
    } else {
      setGreska(GRESKE[novo.error ?? ''] ?? novo.error ?? 'Partija nije dostupna.')
    }
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
    setBiraElo(false)
  }, [token])

  useEffect(() => {
    radiRef.current = radi
  }, [radi])

  useEffect(() => () => {
    if (tajmerRacunara.current != null) window.clearTimeout(tajmerRacunara.current)
    tokAkcije.current += 1
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setSada(Date.now()), 250)
    const priFokusu = () => {
      if (!radiRef.current) void osvezi()
    }
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
      const odlaganjeStarta = stanje.turnStartedAt && stanje.serverNow
        ? Math.max(0, new Date(stanje.turnStartedAt).getTime() - new Date(stanje.serverNow).getTime())
        : 0
      const proteklo = Math.max(0, sada - primljenoAt - odlaganjeStarta)
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

  const racunarNaPotezu = stanje?.status === 'in_progress'
    && !!stanje.childColor
    && stanje.turnColor !== stanje.childColor
  izvrsiPotezRacunaraRef.current = (revision, brojPoteza) => {
    void izvrsiPotezRacunara(revision, brojPoteza)
  }

  useEffect(() => {
    if (tajmerRacunara.current != null) {
      window.clearTimeout(tajmerRacunara.current)
      tajmerRacunara.current = null
    }
    if (!racunarNaPotezu || radi || stanje?.revision == null) return

    const revision = stanje.revision
    const brojPoteza = stanje.moves?.length ?? 0
    tajmerRacunara.current = window.setTimeout(() => {
      tajmerRacunara.current = null
      izvrsiPotezRacunaraRef.current(revision, brojPoteza)
    }, PAUZA_PRE_RACUNARA_MS)

    return () => {
      if (tajmerRacunara.current != null) {
        window.clearTimeout(tajmerRacunara.current)
        tajmerRacunara.current = null
      }
    }
  }, [racunarNaPotezu, radi, stanje?.moves?.length, stanje?.revision])

  async function prikaziPotezRacunara(
    novo: SahStanjePayload,
    prethodniBrojPoteza: number,
    tok: number,
  ) {
    const potezi = novo.moves ?? []
    const poslednji = potezi.at(-1)
    if (!novo.ok || !novo.fen || !poslednji || poslednji.player !== 'engine' || potezi.length <= prethodniBrojPoteza) {
      postavi(novo)
      return
    }

    const polja = poljaPoteza(poslednji.uci)
    postavi(novo, false)
    setNajavljeniPotez(polja)
    setFaza('najava')
    await sačekaj(NAJAVA_POTEZA_MS)
    if (tokAkcije.current !== tok) return

    setNajavljeniPotez(null)
    setPrikazaniPoslednji(polja)
    setTrajanjeAnimacije(ANIMACIJA_RACUNARA_MS)
    setPrikazaniFen(novo.fen)
    setFaza('animacija')
    await sačekaj(ANIMACIJA_RACUNARA_MS)
    if (tokAkcije.current !== tok) return

    setTrajanjeAnimacije(PODRAZUMEVANA_ANIMACIJA_MS)
    setFaza('miruje')
  }

  async function izvrsiPotezRacunara(expectedRevision: number, prethodniBrojPoteza: number) {
    const tok = ++tokAkcije.current
    setRadi(true)
    setFaza('razmisljanje')
    setGreska(null)
    try {
      const novo = await sahAkcija(token, 'engine', expectedRevision)
      await prikaziPotezRacunara(novo, prethodniBrojPoteza, tok)
      if (!novo.ok) await osvezi()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      await osvezi()
    } finally {
      if (tokAkcije.current === tok) {
        setRadi(false)
        setFaza('miruje')
      }
    }
  }

  async function izvrsi(
    action: 'start' | 'resign',
  ) {
    if (!stanje?.ok || stanje.revision == null) return
    const tok = ++tokAkcije.current
    const prethodniBrojPoteza = stanje.moves?.length ?? 0
    setRadi(true)
    setFaza(action === 'start' ? 'razmisljanje' : 'cuvanje')
    setGreska(null)
    try {
      const novo = await sahAkcija(token, action, stanje.revision)
      if (action === 'start') await prikaziPotezRacunara(novo, prethodniBrojPoteza, tok)
      else postavi(novo)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      await osvezi()
    } finally {
      if (tokAkcije.current === tok) {
        setRadi(false)
        setFaza('miruje')
      }
    }
  }

  async function odigrajPotezDeteta(move: SahPotez) {
    if (!stanje?.ok || !stanje.fen || stanje.revision == null) return
    const tok = ++tokAkcije.current
    const kopija = new Chess(stanje.fen)
    try {
      kopija.move(move)
    } catch {
      return
    }

    setPrikazaniFen(kopija.fen())
    setPrikazaniPoslednji(move)
    setObavestenje(null)
    setRadi(true)
    setFaza('cuvanje')
    setGreska(null)
    try {
      const novo = await sahAkcija(token, 'child_move', stanje.revision, move)
      postavi(novo)
      if (!novo.ok) await osvezi()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      await osvezi()
    } finally {
      if (tokAkcije.current === tok) {
        setRadi(false)
        setFaza('miruje')
      }
    }
  }

  async function poništiPoslednjiPotez() {
    if (!stanje?.ok || !stanje.undoAvailable || stanje.revision == null) return
    if (tajmerRacunara.current != null) {
      window.clearTimeout(tajmerRacunara.current)
      tajmerRacunara.current = null
    }
    const tok = ++tokAkcije.current
    setRadi(true)
    setFaza('ponistavanje')
    setGreska(null)
    try {
      const novo = await sahAkcija(token, 'undo', stanje.revision)
      setTrajanjeAnimacije(360)
      postavi(novo)
      if (novo.ok) setObavestenje('Potez je poništen. Sada ponovo izaberi potez pažljivo.')
      else await osvezi()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      await osvezi()
    } finally {
      if (tokAkcije.current === tok) {
        window.setTimeout(() => setTrajanjeAnimacije(PODRAZUMEVANA_ANIMACIJA_MS), 360)
        setRadi(false)
        setFaza('miruje')
      }
    }
  }

  async function pokusajPonovo(elo: number) {
    if (!stanje?.ok || stanje.revision == null) return
    const tok = ++tokAkcije.current
    setRadi(true)
    setFaza('cuvanje')
    setGreska(null)
    try {
      const novo = await sahAkcija(token, 'retry', stanje.revision, undefined, crypto.randomUUID(), elo)
      if (novo.ok && novo.playToken) {
        setUcitava(true)
        navigate(`/sah/${novo.playToken}`)
        return
      }
      setGreska(GRESKE[novo.error ?? ''] ?? novo.error ?? 'Pokušaj ponovo nije uspeo.')
      await osvezi()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      await osvezi()
    } finally {
      if (tokAkcije.current === tok) {
        setRadi(false)
        setFaza('miruje')
      }
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

  const igra = new Chess(prikazaniFen ?? stanje.fen)
  const deteNaPotezu = stanje.status === 'in_progress' && stanje.turnColor === stanje.childColor
  const prikazujeRezultat = stanje.status === 'completed' && faza === 'miruje'
  const redoviPoteza = Array.from({ length: Math.ceil((stanje.moves?.length ?? 0) / 2) }, (_, i) => ({
    broj: i + 1,
    beli: stanje.moves?.[i * 2]?.san ?? '',
    crni: stanje.moves?.[i * 2 + 1]?.san ?? '',
  }))

  return (
    <main className="sah-strana">
      {prikazujeRezultat && (stanje.starsAwarded ?? 0) > 0 && <Konfete />}
      <div className="sah-omot">
        <div className="red red--razmak razmak-dole">
          <div>
            <p className="malo blago">Šah protiv računara</p>
            <h1>{stanje.childName} · ELO {stanje.approximateElo}</h1>
          </div>
          <TemaDugme />
        </div>

        {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
        {obavestenje && <p className="poruka poruka--uspeh" role="status">{obavestenje}</p>}

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
                fen={prikazaniFen ?? stanje.fen}
                orientation={stanje.childColor}
                playerColor={stanje.childColor}
                disabled={!deteNaPotezu || radi || stanje.status !== 'in_progress'}
                lastMove={prikazaniPoslednji}
                announcedMove={najavljeniPotez}
                animationDurationInMs={trajanjeAnimacije}
                onMove={(move) => void odigrajPotezDeteta(move)}
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
                {prikazujeRezultat ? (
                  <div className={`sah-rezultat ${stanje.result === 'child_loss' ? 'sah-rezultat--poraz' : ''}`}>
                    <h2>{rezultatTekst(stanje)}</h2>
                    <p className="blago">{razlogTekst(stanje.termination)}</p>
                    <p style={{ fontSize: '1.5rem' }}>{'⭐'.repeat(stanje.starsAwarded ?? 0) || '☆'}</p>
                    <strong>{stanje.starsAwarded ?? 0} zvezdica</strong>
                    {stanje.result === 'child_loss' && (
                      <div className="sah-pokusaj">
                        {stanje.retryAvailable ? (
                          biraElo ? (
                            <>
                              <p className="blago malo">Izaberi jačinu protivnika:</p>
                              <div className="sah-pokusaj__opcije">
                                {dozvoljeniEloZaPokusaj(stanje.approximateElo ?? 700).map((nivo) => (
                                  <button
                                    key={nivo} type="button" className="dugme dugme--senka dugme--malo"
                                    disabled={radi} onClick={() => void pokusajPonovo(nivo)}
                                  >
                                    ELO {nivo}{nivo === stanje.approximateElo ? ' · ista jačina' : ' · lakše'}
                                  </button>
                                ))}
                              </div>
                              <button type="button" className="sah-pokusaj__otkazi malo" disabled={radi} onClick={() => setBiraElo(false)}>
                                Odustani od izbora
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button" className="dugme dugme--akcenat"
                                disabled={radi} onClick={() => setBiraElo(true)}
                              >
                                ↻ Pokušaj ponovo
                              </button>
                              <p className="malo blago">
                                {radi
                                  ? 'Pravim novu partiju…'
                                  : preostaloPokusaja(stanje.retriesUsed) === 1
                                    ? 'Preostao ti je još 1 pokušaj, protiv istog ili slabijeg protivnika.'
                                    : `Preostalo ti je još ${preostaloPokusaja(stanje.retriesUsed)} pokušaja, protiv istog ili slabijeg protivnika.`}
                              </p>
                            </>
                          )
                        ) : stanje.retriesUsed != null && stanje.retriesUsed >= 3 ? (
                          <p className="malo blago">Za ovu partiju više nemaš pravo na ponovni pokušaj.</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <h2>{
                      faza === 'cuvanje' ? 'Čuvam potez…'
                        : faza === 'ponistavanje' ? 'Poništavam potez…'
                          : faza === 'najava' ? 'Računar će odigrati…'
                            : faza === 'animacija' ? 'Računar igra…'
                              : faza === 'razmisljanje' ? 'Računar razmišlja…'
                                : deteNaPotezu ? 'Tvoj potez' : 'Kratka pauza'
                    }</h2>
                    <p className="blago malo">
                      {igra.inCheck() ? 'Šah! ' : ''}Pomeraj figure prevlačenjem ili dodirom na dva polja.
                    </p>
                    {racunarNaPotezu && !radi && (
                      <p className="sah-pauza-tekst malo" role="status">
                        Računar će odigrati za oko 3 sekunde.
                      </p>
                    )}
                    {stanje.undoAvailable && racunarNaPotezu && !radi && (
                      <button
                        type="button" className="dugme dugme--senka dugme--malo sah-ponisti razmak-gore"
                        onClick={() => void poništiPoslednjiPotez()}
                      >
                        ↶ Poništi moj potez
                      </button>
                    )}
                    <button
                      type="button" className="dugme dugme--opasno dugme--malo razmak-gore"
                      disabled={radi || !deteNaPotezu} onClick={() => {
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
