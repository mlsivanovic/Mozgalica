import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ObavestenjaZvonce } from '../../components/ObavestenjaZvonce'
import { PushKontrole } from '../../components/PushKontrole'
import { Loader, TemaDugme } from '../../components/Zajednicke'
import {
  listajObavestenjaDeteta, oznaciObavestenjaDetetaProcitanim, ucitajJavniProfil,
} from '../../lib/api'
import { formatDatum, formatOdbrojavanje, formatProcenat } from '../../lib/format'
import { oznaciInboxProcitanim } from '../../lib/obavestenja'
import {
  iskljuciPushZaDete, postaviBedzAplikacije, slusajPushPoruke,
} from '../../lib/push'
import {
  jeSamostalnaPwa, poveziProfilSaPwa, zaboraviPovezaniProfil,
  zapamtiProfilZaInstalaciju,
} from '../../lib/profilPwa'
import {
  imaPonuduZaInstalaciju, ponudiInstalaciju, postaviDecjiManifest,
  slusajPonuduZaInstalaciju,
} from '../../pwa'
import type { JavniProfilPayload } from '../../types/kviz'
import type { InboxObavestenja } from '../../types/db'
import { TitleAvatar } from '../../components/TitleAvatar'
import './profil.css'

export function ProfilDeteta() {
  const { profilToken = '' } = useParams<{ profilToken: string }>()
  const [profil, setProfil] = useState<JavniProfilPayload | null>(null)
  const [ucitava, setUcitava] = useState(true)
  const [inbox, setInbox] = useState<InboxObavestenja>({ obavestenja: [], neprocitano: 0 })

  const osveziObavestenja = useCallback(async () => {
    if (!profilToken) return
    try {
      const noviInbox = await listajObavestenjaDeteta(profilToken)
      setInbox(noviInbox)
    } catch {
      // Profil i kvizovi ostaju dostupni i kada inbox privremeno ne može da se osveži.
    }
  }, [profilToken])

  useEffect(() => {
    void postaviBedzAplikacije(inbox.neprocitano)
  }, [inbox.neprocitano])

  useEffect(() => {
    postaviDecjiManifest()
    setUcitava(true)
    ucitajJavniProfil(profilToken)
      .then((ucitaniProfil) => {
        setProfil(ucitaniProfil)
        if (!ucitaniProfil.ok) return

        zapamtiProfilZaInstalaciju(profilToken)
        if (jeSamostalnaPwa()) poveziProfilSaPwa(profilToken)
      })
      .catch((e) => setProfil({ ok: false, error: String((e as Error).message ?? e) }))
      .finally(() => setUcitava(false))
  }, [profilToken])

  useEffect(() => {
    void osveziObavestenja()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void osveziObavestenja()
    }, 30_000)
    const priFokusu = () => void osveziObavestenja()
    window.addEventListener('focus', priFokusu)
    document.addEventListener('visibilitychange', priFokusu)
    const odjaviPush = slusajPushPoruke(priFokusu)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', priFokusu)
      document.removeEventListener('visibilitychange', priFokusu)
      odjaviPush()
    }
  }, [osveziObavestenja])

  async function oznaciProcitanim(ids?: string[]) {
    await oznaciObavestenjaDetetaProcitanim(profilToken, ids)
    setInbox((prethodni) => oznaciInboxProcitanim(prethodni, ids))
  }

  if (ucitava) return <Loader tekst="Učitavanje profila…" />
  if (!profil?.ok) {
    return (
      <div className="sadrzaj sadrzaj--usko centar profil-greska">
        <div className="profil-avatar profil-avatar--mali" aria-hidden="true">😕</div>
        <h1>Profil nije pronađen</h1>
        <p className="poruka poruka--greska razmak-gore">
          Proveri da li je profilni link ispravno kopiran.
        </p>
      </div>
    )
  }

  const ukupnoZvezdica = profil.totalStars ?? 0
  const raspolozivoZvezdica = profil.spendableStars ?? ukupnoZvezdica
  const trenutna = profil.currentTitle
  const sledeca = profil.nextTitle
  const odPraga = trenutna?.minStars ?? 0
  const doPraga = sledeca?.minStars ?? Math.max(ukupnoZvezdica, 1)
  const napredak = sledeca
    ? Math.max(0, Math.min(100, Math.round(100 * (ukupnoZvezdica - odPraga) / Math.max(1, doPraga - odPraga))))
    : 100
  const brojAktivnih = (profil.activeQuizzes?.length ?? 0) + (profil.activeChessGames?.length ?? 0)
  const brojIstorije = (profil.history?.length ?? 0) + (profil.chessHistory?.length ?? 0)

  return (
    <main className="profil-strana">
      <div className="profil-omot">
        <div className="red red--kraj">
          <ObavestenjaZvonce
            inbox={inbox}
            onOznaciProcitanim={oznaciProcitanim}
            nazivPrimaoca={profil.name ?? 'deteta'}
          />
          <TemaDugme />
        </div>

        <section className="profil-zaglavlje">
          <div className="profil-avatar" aria-hidden="true">{profil.avatar}</div>
          <div>
            <p className="profil-nadnaslov">Moj profil</p>
            <h1>{profil.name}</h1>
            <div className="profil-statistike">
              <span>⭐ <strong>{ukupnoZvezdica}</strong> zvezdica</span>
              <span title="Zvezdice raspoložive za trošenje u prodavnici">
                🛒 Raspoloživo: <strong>{raspolozivoZvezdica}</strong>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <TitleAvatar name={trenutna?.name ?? 'ShadowNoob'} avatar={trenutna?.avatar} size={18} />
                <strong>{trenutna?.name ?? 'ShadowNoob'}</strong>
              </span>
            </div>
          </div>
        </section>

        <ProfilPwaKontrole ime={profil.name ?? 'dete'} profilToken={profilToken} />
        <section className="kartica profil-push-kontrole">
          <PushKontrole profilToken={profilToken} />
        </section>

        <section className="kartica profil-napredak" aria-label="Napredak do sledeće titule">
          <div className="red red--razmak" style={{ alignItems: 'center' }}>
            <div>
              <p className="malo blago">Trenutna titula</p>
              <h2>{trenutna?.name ?? 'ShadowNoob'}</h2>
            </div>
            <TitleAvatar
              name={trenutna?.name ?? 'ShadowNoob'}
              avatar={trenutna?.avatar}
              size={72}
            />
          </div>
          <div
            className="profil-progres"
            role="progressbar"
            aria-valuenow={napredak}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={sledeca ? `Napredak do titule ${sledeca.name}` : 'Najviša titula je osvojena'}
          >
            <span style={{ width: `${napredak}%` }} />
          </div>
          <p className="malo blago">
            {sledeca
              ? `Još ${sledeca.starsNeeded} zvezdica do titule „${sledeca.name}”.`
              : 'Osvojena je najviša titula — svaka čast!'}
          </p>
        </section>

        <section className="kartica profil-prodavnica-link" aria-label="Prodavnica nagrada">
          <div className="red red--razmak" style={{ alignItems: 'center' }}>
            <div>
              <p className="malo blago">Zameni zvezdice za nagrade</p>
              <h2 style={{ margin: 0 }}>🛒 Prodavnica</h2>
            </div>
            <Link className="dugme dugme--akcenat" to={`/prodavnica/${profilToken}`}>
              Otvori prodavnicu →
            </Link>
          </div>
        </section>

        <section className="profil-sekcija">
          <div className="profil-sekcija-naslov">
            <div>
              <p className="profil-nadnaslov">Vreme je za vežbu</p>
              <h2>Aktivne aktivnosti</h2>
            </div>
            <span className="bedz">{brojAktivnih}</span>
          </div>

          {brojAktivnih === 0 ? (
            <div className="kartica profil-prazno">
              <span aria-hidden="true">🌟</span>
              <div>
                <h3>Sve je završeno!</h3>
                <p className="blago">Novi kvizovi će se pojaviti ovde kada budu dodeljeni.</p>
              </div>
            </div>
          ) : (
            <div className="profil-kvizovi">
              {profil.activeChessGames?.map((partija) => (
                <article className="kartica profil-kviz profil-kviz--sah" key={partija.playToken}>
                  <div className="red red--razmak">
                    <span className={`bedz ${partija.status === 'in_progress' ? 'bedz--upozorenje' : ''}`}>
                      {partija.status === 'in_progress' ? 'Partija u toku' : 'Novi šah'}
                    </span>
                    <span className="malo blago">♟️ ELO {partija.approximateElo}</span>
                  </div>
                  <h3>Šah protiv računara</h3>
                  <p className="malo">
                    Igraš {partija.childColor === 'white' ? 'belim' : 'crnim'}
                    {' · '}{partija.clockSeconds ? `${partija.clockSeconds / 60}+0` : 'bez sata'}
                  </p>
                  <Link className="dugme dugme--akcenat" to={`/sah/${partija.playToken}`}>
                    {partija.status === 'in_progress' ? 'Nastavi partiju →' : 'Pokreni partiju ♟️'}
                  </Link>
                </article>
              ))}
              {profil.activeQuizzes!.map((kviz) => (
                <article className="kartica profil-kviz" key={kviz.quizToken}>
                  <div className="red red--razmak">
                    <span className={`bedz ${kviz.attemptState === 'in_progress' ? 'bedz--upozorenje' : ''}`}>
                      {kviz.attemptState === 'in_progress' ? 'U toku' : 'Novi kviz'}
                    </span>
                    {kviz.timeLimitSeconds != null && (
                      <span className="malo blago">
                        ⏱ {formatOdbrojavanje(kviz.remainingSeconds ?? kviz.timeLimitSeconds)}
                      </span>
                    )}
                  </div>
                  <h3>{kviz.title}</h3>
                  {kviz.description && <p className="blago malo">{kviz.description}</p>}
                  <p className="malo">
                    📝 {kviz.questionCount} pitanja
                    {kviz.attemptState === 'in_progress' && ` · ${kviz.answeredCount} odgovoreno`}
                  </p>
                  <Link className="dugme dugme--akcenat" to={`/kviz/${kviz.quizToken}`}>
                    {kviz.attemptState === 'in_progress' ? 'Nastavi →' : 'Počni kviz 🚀'}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <details className="kartica profil-istorija">
          <summary>
            <span>Prethodni rezultati</span>
            <span className="bedz">{brojIstorije}</span>
          </summary>
          <div className="profil-istorija-lista">
            {brojIstorije === 0 ? (
              <p className="blago">Još nema završenih aktivnosti.</p>
            ) : <>
              {profil.chessHistory?.map((rezultat) => (
                <div className="profil-rezultat" key={rezultat.gameId}>
                  <div>
                    <strong>♟️ Šah protiv ELO {rezultat.approximateElo}</strong>
                    <p className="malo blago">{formatDatum(rezultat.completedAt)}</p>
                  </div>
                  <div className="profil-rezultat-broj">
                    <span aria-label={`${rezultat.starsAwarded} zvezdica`}>
                      {'⭐'.repeat(rezultat.starsAwarded) || '☆'}
                    </span>
                    <strong>{rezultat.result === 'child_win' ? 'Pobeda' : rezultat.result === 'draw' ? 'Remi' : 'Poraz'}</strong>
                  </div>
                </div>
              ))}
              {profil.history!.map((rezultat) => (
                <div className="profil-rezultat" key={rezultat.attemptId}>
                  <div>
                    <strong>{rezultat.title}</strong>
                    <p className="malo blago">{formatDatum(rezultat.submittedAt)}</p>
                  </div>
                  {rezultat.pendingReview ? (
                    <span className="bedz bedz--upozorenje">Čeka pregled</span>
                  ) : (
                    <div className="profil-rezultat-broj">
                      <span aria-label={`${rezultat.starsAwarded ?? 0} zvezdica`}>
                        {'⭐'.repeat(rezultat.starsAwarded ?? 0) || '☆'}
                      </span>
                      <strong>{formatProcenat(rezultat.scorePct)}</strong>
                    </div>
                  )}
                </div>
              ))}
            </>}
          </div>
        </details>
      </div>
    </main>
  )
}

function ProfilPwaKontrole({ ime, profilToken }: { ime: string, profilToken: string }) {
  const navigate = useNavigate()
  const samostalnaPwa = jeSamostalnaPwa()
  const [instalacijaDostupna, setInstalacijaDostupna] = useState(imaPonuduZaInstalaciju)
  const [poruka, setPoruka] = useState<string | null>(null)

  useEffect(() => slusajPonuduZaInstalaciju(setInstalacijaDostupna), [])

  async function promeniProfil() {
    try {
      await iskljuciPushZaDete(profilToken)
    } catch {
      // Promena profila mora da radi i kada je uređaj trenutno offline.
    }
    zaboraviPovezaniProfil()
    navigate('/dete/pocetak')
  }

  async function instaliraj() {
    zapamtiProfilZaInstalaciju(profilToken)
    const ishod = await ponudiInstalaciju()
    if (ishod === 'accepted') {
      setPoruka('Aplikacija je instalirana. Otvori „Moju Mozgalicu” sa početnog ekrana.')
    } else if (ishod === 'dismissed') {
      setPoruka('Instalacija je otkazana. Možeš da pokušaš ponovo iz menija pregledača.')
    }
  }

  if (samostalnaPwa) {
    return (
      <div className="profil-pwa-status">
        <span>📱 Aplikacija je povezana sa profilom: <strong>{ime}</strong></span>
        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => void promeniProfil()}>
          Promeni profil
        </button>
      </div>
    )
  }

  return (
    <details className="kartica profil-pwa-instalacija">
      <summary>📲 Instaliraj aplikaciju za {ime}</summary>
      <div className="profil-pwa-sadrzaj">
        <p className="blago">
          Instalirana „Moja Mozgalica” otvaraće direktno ovaj profil, bez administratorske prijave.
        </p>
        {instalacijaDostupna ? (
          <button type="button" className="dugme dugme--akcenat" onClick={instaliraj}>
            Instaliraj aplikaciju
          </button>
        ) : (
          <p className="malo">
            U meniju pregledača izaberi <strong>Instaliraj aplikaciju</strong> ili
            {' '}<strong>Dodaj na početni ekran</strong>. Ako uređaj pri prvom pokretanju
            zatraži profil, samo nalepi ovaj profilni link.
          </p>
        )}
        {poruka && <p className="poruka poruka--info">{poruka}</p>}
      </div>
    </details>
  )
}
