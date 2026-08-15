// Prikaz rezultata detetu — poziva submit_attempt ponovo (idempotentno) preko
// sačuvanog attemptToken-a, pa je stranica bezbedna i posle osvežavanja (F5).
// Uz rezultat dete može da otvori objašnjenja netačnih zadataka, a zatim da ih
// reši ponovo sa novim brojevima (jedan ponovni pokušaj — posle njega je kviz
// zaključan; sve tačno u ponovnom pokušaju dopunjuje zvezdice do 5).
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PitanjeRenderer } from '../../components/pitanja/PitanjeRenderer'
import { Konfete, Loader } from '../../components/Zajednicke'
import {
  nastaviPonovniPokusaj, otvoriObjasnjenja, pokreniPonovniPokusaj, predajKviz,
  predajPonovniPokusaj,
} from '../../lib/api'
import { obrisiStanje, ucitajStanje } from '../../lib/offlineQueue'
import {
  generisiPonovne, obrisiPonovneOdgovore, sacuvajPonovneOdgovore, ucitajPonovneOdgovore,
} from '../../lib/ponovni'
import { MAKSIMALNO_ZVEZDICA, porukaOhrabrenja } from '../../lib/ocena'
import { formatProcenat } from '../../lib/format'
import type { MatchingOpcije, OdgovorDeteta, Opcija, OpcijeJson, TacanOdgovor, TipPitanja } from '../../types/db'
import type {
  PonovniPayloadPredat, PonovnoPitanjeZaDete, RezultatPayload,
} from '../../types/kviz'
import './kviz.css'

type Mode = 'rezultat' | 'objasnjenja' | 'ponovni' | 'ponovni-rezultat'

function Zvezdice({ broj }: { broj: number }) {
  return (
    <div className="kviz-zvezde" aria-label={`${broj} od ${MAKSIMALNO_ZVEZDICA} zvezdica`}>
      {Array.from({ length: MAKSIMALNO_ZVEZDICA }, (_, i) => (
        <span key={i} aria-hidden="true">{i < broj ? '⭐' : '☆'}</span>
      ))}
    </div>
  )
}

// Čitljiv prikaz tačnog odgovora ispod netačno rešenog pitanja (po tipu pitanja)
function tekstTacnogOdgovora(
  q: { type: TipPitanja; options: OpcijeJson; correct?: TacanOdgovor | null },
): string | null {
  if (!q.correct) return null
  switch (q.type) {
    case 'single': {
      const opcije = (q.options as Opcija[] | null) ?? []
      const id = (q.correct as { optionId: string }).optionId
      return opcije.find((o) => o.id === id)?.text ?? null
    }
    case 'multi': {
      const opcije = (q.options as Opcija[] | null) ?? []
      const ids = (q.correct as { optionIds: string[] }).optionIds
      const tekstovi = ids.map((id) => opcije.find((o) => o.id === id)?.text).filter(Boolean)
      return tekstovi.length ? tekstovi.join(', ') : null
    }
    case 'truefalse':
      return (q.correct as { value: boolean }).value ? 'Tačno' : 'Netačno'
    case 'numeric':
      return String((q.correct as { value: number }).value).replace('.', ',')
    case 'text': {
      const prihvaceni = (q.correct as { accept: string[] }).accept
      return prihvaceni.length ? prihvaceni.join(' / ') : null
    }
    case 'matching': {
      const parovi = (q.correct as { pairs: Record<string, string> }).pairs
      const opcije = q.options as MatchingOpcije | null
      if (!opcije) return null
      const levo = (id: string) => opcije.left.find((o) => o.id === id)?.text ?? id
      const desno = (id: string) => opcije.right.find((o) => o.id === id)?.text ?? id
      return Object.entries(parovi)
        .map(([l, d]) => `${levo(l)} → ${desno(d)}`)
        .join('; ')
    }
    default:
      return null
  }
}

function opisiPonovnuGresku(kod: string | undefined): string {
  switch (kod) {
    case 'explanations_not_seen': return 'Prvo pogledaj objašnjenja netačnih zadataka.'
    case 'already_locked': return 'Ponovni pokušaj je već iskorišćen — kviz je zaključan.'
    case 'no_incorrect': return 'Nema netačnih zadataka za ponovni pokušaj.'
    case 'pending_review': return 'Rezultat još čeka pregled odrasle osobe.'
    default: return 'Ponovni pokušaj trenutno nije dostupan. Proveri internet konekciju.'
  }
}

export function KvizRezultat() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [ucitava, setUcitava] = useState(true)
  const [rezultat, setRezultat] = useState<RezultatPayload | null>(null)
  const [attemptToken, setAttemptToken] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('rezultat')
  // Dugme „Probaj ponovo netačne" se otključa tek kad dete skroluje do kraja
  // objašnjenja — jednom viđeno dno ostaje otključano do kraja posete stranici.
  const [skrolovanDno, setSkrolovanDno] = useState(false)
  const [ponovnaPitanja, setPonovnaPitanja] = useState<PonovnoPitanjeZaDete[]>([])
  const [ponovniOdgovori, setPonovniOdgovori] = useState<Record<string, OdgovorDeteta>>({})
  const [ponovniIshod, setPonovniIshod] = useState<PonovniPayloadPredat | null>(null)
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const objasnjenjaRef = useRef<HTMLDivElement | null>(null)
  const dnoRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const stanje = ucitajStanje(localStorage, token)
    if (!stanje) { navigate(`/kviz/${token}`, { replace: true }); return }
    setAttemptToken(stanje.attemptToken)
    predajKviz(stanje.attemptToken, null)
      .then((r) => {
        setRezultat(r)
        // Ponovni pokušaj je već počet/predat (npr. osvežavanje stranice) — nastavi ga
        if (r.ok && r.retry?.started) {
          return nastaviPonovniPokusaj(stanje.attemptToken).then((p) => {
            if (!p.ok) return
            if (p.submitted) {
              setPonovniIshod(p)
              setMode('ponovni-rezultat')
            } else {
              setPonovnaPitanja(p.questions ?? [])
              setPonovniOdgovori(ucitajPonovneOdgovore(localStorage, token))
              setMode('ponovni')
            }
          })
        }
      })
      .catch((e) => setRezultat({ ok: false, error: String((e as Error).message ?? e) }))
      .finally(() => setUcitava(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Praćenje da li je dete stiglo do dna objašnjenja (otključavanje ponovnog pokušaja)
  useEffect(() => {
    if (mode !== 'objasnjenja' || !dnoRef.current) return
    const posmatrac = new IntersectionObserver(
      (unosi) => { if (unosi.some((u) => u.isIntersecting)) setSkrolovanDno(true) },
      { threshold: 0.9 },
    )
    posmatrac.observe(dnoRef.current)
    return () => posmatrac.disconnect()
  }, [mode])

  if (ucitava) return <Loader tekst="Učitavanje rezultata…" />
  if (!rezultat?.ok) {
    return (
      <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}>
        <p className="poruka poruka--greska">Rezultat trenutno nije dostupan. Proveri internet konekciju.</p>
      </div>
    )
  }

  const profilniKviz = rezultat.accessMode === 'profile' && !!rezultat.profileToken
  const povratak = profilniKviz ? `/dete/${rezultat.profileToken}` : `/kviz/${token}`

  if (rezultat.showResult === false) {
    return (
      <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}>
        <h1>✔ Kviz je predat!</h1>
        <p className="blago razmak-gore">Tvoj rezultat će videti osoba koja ti je poslala link.</p>
        <p className="razmak-gore"><Link to={povratak}>🏠 Nazad</Link></p>
      </div>
    )
  }

  // Neka pitanja čekaju ručnu ocenu administratora — bez zvezdica/procenta dok se ne oceni.
  if (rezultat.pendingReview) {
    return (
      <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}>
        <h1>Odgovori su poslati na pregled ✅</h1>
        <p className="blago razmak-gore">Rezultat stiže kada ih pregleda odrasla osoba.</p>
        <p className="razmak-gore">
          <Link to={povratak}>🏠 {profilniKviz ? 'Nazad na moj profil' : 'Nazad na početnu'}</Link>
        </p>
      </div>
    )
  }

  if (typeof rezultat.starsAwarded !== 'number') {
    return (
      <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}>
        <p className="poruka poruka--greska">Zvezdice trenutno nisu dostupne. Pokušaj ponovo malo kasnije.</p>
      </div>
    )
  }

  const zvezdice = rezultat.starsAwarded
  const retry = rezultat.retry
  const zakljucano = !!retry?.submitted
  const novPokusajMoguc = !profilniKviz && (rezultat.attemptsLeft ?? 0) > 0 && !zakljucano
  const netacni = (rezultat.questions ?? []).filter((q) => !q.isCorrect)
  const ponovniPregled = ponovniIshod?.questions ?? []
  const ponovnoTacnih = ponovniPregled.filter((q) => q.isCorrect).length

  function noviPokusaj() {
    obrisiStanje(localStorage, token)
    // Odgovori napuštenog ponovnog pokušaja (isti kvizToken preko pokušaja)
    obrisiPonovneOdgovore(localStorage, token)
    navigate(`/kviz/${token}`)
  }

  function prikaziObjasnjenja() {
    setGreska(null)
    setMode('objasnjenja')
    // Server beleži da su objašnjenja viđena (uslov za ponovni pokušaj) —
    // idempotentno i ne blokira prikaz, sadržaj je već u rezultatu.
    if (attemptToken) otvoriObjasnjenja(attemptToken).catch(() => {})
    requestAnimationFrame(() => objasnjenjaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function promeniPonovniOdgovor(id: string, novi: OdgovorDeteta) {
    const sledece = { ...ponovniOdgovori, [id]: novi }
    setPonovniOdgovori(sledece)
    sacuvajPonovneOdgovore(localStorage, token, sledece)
  }

  async function pokreniPonovni() {
    if (!rezultat?.questions || !attemptToken || radi) return
    setRadi(true)
    setGreska(null)
    try {
      const unos = generisiPonovne(netacni)
      // Osiguraj da je server zabeležio viđena objašnjenja pre pokretanja
      const obj = await otvoriObjasnjenja(attemptToken)
      if (!obj.ok) throw new Error(obj.error ?? 'Objašnjenja nisu potvrđena.')
      const r = await pokreniPonovniPokusaj(attemptToken, unos)
      if (!r.ok) throw new Error(r.error)
      if (r.submitted) {
        setPonovniIshod(r)
        setMode('ponovni-rezultat')
        return
      }
      setPonovnaPitanja(r.questions ?? [])
      setPonovniOdgovori(ucitajPonovneOdgovore(localStorage, token))
      setMode('ponovni')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setGreska(opisiPonovnuGresku(String((e as Error).message ?? e)))
    } finally {
      setRadi(false)
    }
  }

  async function predajPonovni() {
    if (!attemptToken || radi) return
    setRadi(true)
    setGreska(null)
    try {
      const r = await predajPonovniPokusaj(attemptToken, ponovniOdgovori)
      if (!r.ok) throw new Error(r.error)
      if (!r.submitted) return
      setPonovniIshod(r)
      obrisiPonovneOdgovore(localStorage, token)
      if (typeof r.starsAwarded === 'number') {
        setRezultat((prev) => (prev ? { ...prev, starsAwarded: r.starsAwarded } : prev))
      }
      setMode('ponovni-rezultat')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setGreska(opisiPonovnuGresku(String((e as Error).message ?? e)))
    } finally {
      setRadi(false)
    }
  }

  const procenat = Math.round(rezultat.scorePct ?? 0)
  const tokUI = mode === 'rezultat' || mode === 'objasnjenja'

  return (
    <div className="sadrzaj sadrzaj--usko" style={{ paddingBottom: '3rem' }}>
      {zvezdice > 0 && mode !== 'ponovni' && <Konfete />}
      <div className="kartica centar">
        <h1>{rezultat.childName ? `Bravo, ${rezultat.childName}!` : 'Kviz je završen!'}</h1>
        <Zvezdice broj={zvezdice} />
        <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          Na ovom pokušaju: {zvezdice} / {MAKSIMALNO_ZVEZDICA} ⭐
        </p>
        <p className="razmak-gore" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {porukaOhrabrenja(zvezdice)}
        </p>

        <div className="kviz-krug-rezultat" style={{ '--procenat': procenat } as CSSProperties}>
          <div className="kviz-krug-rezultat-unutra">
            <span className="kviz-krug-rezultat-broj">{formatProcenat(rezultat.scorePct)}</span>
          </div>
        </div>

        <p className="blago">{rezultat.totalPoints} / {rezultat.maxPoints} poena</p>
        <div className="kviz-tacnost-cipovi razmak-gore">
          <span className="bedz bedz--uspeh">✓ {rezultat.correctCount} tačnih</span>
          <span className="bedz bedz--greska">✗ {rezultat.incorrectCount} netačnih</span>
        </div>

        {retry?.available && tokUI && (
          <button type="button" className="dugme dugme--akcenat razmak-gore" onClick={prikaziObjasnjenja}>
            💡 Objasni netačne
          </button>
        )}

        {novPokusajMoguc && tokUI && (
          <button type="button" className="dugme dugme--akcenat razmak-gore" onClick={noviPokusaj}>
            Pokušaj ponovo 🔄
          </button>
        )}
      </div>

      {greska && <p className="poruka poruka--greska razmak-gore">{greska}</p>}

      {mode === 'objasnjenja' && netacni.length > 0 && (
        <div className="razmak-gore kviz-objasnjenja" ref={objasnjenjaRef}>
          <h2>Objašnjenja netačnih zadataka</h2>
          <div className="kviz-ponovni-lista razmak-gore">
            {netacni.map((q, i) => {
              const tacan = tekstTacnogOdgovora(q)
              return (
                <div
                  key={q.id} className="kartica"
                  style={{ borderLeft: `5px solid var(--boja-greska)` }}
                >
                  <p className="malo blago">✗ Zadatak {i + 1}</p>
                  <p style={{ fontWeight: 700 }}>{q.text}</p>
                  <div className="razmak-gore">
                    <p className="malo blago">Tvoj odgovor:</p>
                    <PitanjeRenderer pitanje={q} value={q.answer} onChange={() => {}} disabled />
                  </div>
                  {tacan && <p className="kviz-objasnjenje-tacan malo">✔ Tačan odgovor: {tacan}</p>}
                  {q.explanation && (
                    <p className="kviz-objasnjenje-tekst malo razmak-gore">💡 {q.explanation}</p>
                  )}
                </div>
              )
            })}
          </div>
          <div ref={dnoRef} className="kviz-ponovni-dno" />
          <div className="centar razmak-gore">
            <button
              type="button"
              className="dugme dugme--akcenat"
              disabled={!skrolovanDno || radi}
              onClick={pokreniPonovni}
            >
              🔄 Probaj ponovo netačne
            </button>
            {!skrolovanDno && (
              <p className="malo blago">Skroluj do kraja objašnjenja da otključaš dugme.</p>
            )}
          </div>
        </div>
      )}

      {mode === 'rezultat' && rezultat.questions && (
        <div className="razmak-gore">
          <h2>Pregled odgovora</h2>
          <div className="mreza-kartica razmak-gore">
            {rezultat.questions.map((q, i) => (
              <div
                key={q.id} className="kartica"
                style={{ borderLeft: `5px solid ${q.isCorrect ? 'var(--boja-uspeh)' : 'var(--boja-greska)'}` }}
              >
                <p className="malo blago">
                  {q.isCorrect ? '✓' : '✗'} Pitanje {i + 1} · {q.awardedPoints} / {q.points} poena
                </p>
                <p style={{ fontWeight: 700 }}>{q.text}</p>
                <div className="razmak-gore">
                  <PitanjeRenderer pitanje={q} value={q.answer} onChange={() => {}} disabled />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === 'ponovni' && (
        <div className="razmak-gore">
          <h2>Probaj ponovo netačne zadatke</h2>
          <p className="blago">
            Zadaci su iste vrste kao pre, samo sa drugim brojevima. Ako ih sve rešiš tačno,
            dopunićeš zvezdice do svih {MAKSIMALNO_ZVEZDICA}!
          </p>
          <div className="kviz-ponovni-lista razmak-gore">
            {ponovnaPitanja.map((p, i) => (
              <div key={p.id} className="kartica kviz-pitanje-kartica">
                <p className="malo blago">
                  Zadatak {i + 1} od {ponovnaPitanja.length} · {p.points} poena
                </p>
                <p className="kviz-pitanje-tekst">{p.text}</p>
                <div className="razmak-gore">
                  <PitanjeRenderer
                    pitanje={p}
                    value={ponovniOdgovori[p.id] ?? null}
                    onChange={(novi) => promeniPonovniOdgovor(p.id, novi)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="centar razmak-gore">
            <button type="button" className="dugme dugme--akcenat" onClick={predajPonovni} disabled={radi}>
              {radi ? 'Predaja…' : 'Predaj odgovore ✅'}
            </button>
          </div>
        </div>
      )}

      {mode === 'ponovni-rezultat' && ponovniIshod && (
        <div className="razmak-gore">
          {ponovniIshod.allCorrect ? (
            <div className="kartica centar kviz-ponovni-uspeh">
              <h2>🎉 Sve ispravljeno!</h2>
              <Zvezdice broj={MAKSIMALNO_ZVEZDICA} />
              <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Sve netačne zadatke si rešio/la tačno — osvajaš svih {MAKSIMALNO_ZVEZDICA} zvezdica!
              </p>
              <p className="blago razmak-gore">Kviz je sada zaključan.</p>
            </div>
          ) : (
            <div className="kartica centar">
              <h2>Skoro pa savršeno! 💪</h2>
              <p style={{ fontWeight: 700 }}>
                Tačno {ponovnoTacnih} od {ponovniPregled.length} zadataka u ponovnom pokušaju.
              </p>
              <p className="blago razmak-gore">
                Zvezdice ostaju kao u prvom pokušaju ({zvezdice} / {MAKSIMALNO_ZVEZDICA}) — dopuna
                važi samo kad su svi zadaci tačni.
              </p>
              <p className="blago">Kviz je sada zaključan.</p>
            </div>
          )}

          <h2 className="razmak-gore">Pregled ponovnog pokušaja</h2>
          <div className="kviz-ponovni-lista razmak-gore">
            {ponovniPregled.map((q, i) => {
              const tacan = tekstTacnogOdgovora(q)
              return (
                <div
                  key={q.id} className="kartica"
                  style={{ borderLeft: `5px solid ${q.isCorrect ? 'var(--boja-uspeh)' : 'var(--boja-greska)'}` }}
                >
                  <p className="malo blago">
                    {q.isCorrect ? '✓' : '✗'} Zadatak {i + 1} · {q.points} poena
                  </p>
                  <p style={{ fontWeight: 700 }}>{q.text}</p>
                  <div className="razmak-gore">
                    <PitanjeRenderer pitanje={q} value={q.answer} onChange={() => {}} disabled />
                  </div>
                  {!q.isCorrect && tacan && (
                    <p className="kviz-objasnjenje-tacan malo">✔ Tačan odgovor: {tacan}</p>
                  )}
                  {!q.isCorrect && q.explanation && (
                    <p className="kviz-objasnjenje-tekst malo razmak-gore">💡 {q.explanation}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="centar razmak-gore">
        <Link to={povratak}>
          🏠 {profilniKviz ? 'Nazad na moj profil' : 'Nazad na početnu'}
        </Link>
      </p>
    </div>
  )
}
