// Prikaz rezultata detetu — poziva submit_attempt ponovo (idempotentno) preko
// sačuvanog attemptToken-a, pa je stranica bezbedna i posle osvežavanja (F5)
import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PitanjeRenderer } from '../../components/pitanja/PitanjeRenderer'
import { Konfete, Loader } from '../../components/Zajednicke'
import { predajKviz } from '../../lib/api'
import { obrisiStanje, ucitajStanje } from '../../lib/offlineQueue'
import { MAKSIMALNO_ZVEZDICA, porukaOhrabrenja } from '../../lib/ocena'
import { formatProcenat } from '../../lib/format'
import type { RezultatPayload } from '../../types/kviz'
import './kviz.css'

export function KvizRezultat() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [ucitava, setUcitava] = useState(true)
  const [rezultat, setRezultat] = useState<RezultatPayload | null>(null)

  useEffect(() => {
    const stanje = ucitajStanje(localStorage, token)
    if (!stanje) { navigate(`/kviz/${token}`, { replace: true }); return }
    predajKviz(stanje.attemptToken, null)
      .then((r) => setRezultat(r))
      .catch((e) => setRezultat({ ok: false, error: String((e as Error).message ?? e) }))
      .finally(() => setUcitava(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
  const novPokusajMoguc = !profilniKviz && (rezultat.attemptsLeft ?? 0) > 0

  function noviPokusaj() {
    obrisiStanje(localStorage, token)
    navigate(`/kviz/${token}`)
  }

  const procenat = Math.round(rezultat.scorePct ?? 0)

  return (
    <div className="sadrzaj sadrzaj--usko" style={{ paddingBottom: '3rem' }}>
      {zvezdice > 0 && <Konfete />}
      <div className="kartica centar">
        <h1>{rezultat.childName ? `Bravo, ${rezultat.childName}!` : 'Kviz je završen!'}</h1>
        <div className="kviz-zvezde" aria-label={`${zvezdice} od ${MAKSIMALNO_ZVEZDICA} zvezdica`}>
          {Array.from({ length: MAKSIMALNO_ZVEZDICA }, (_, i) => (
            <span key={i} aria-hidden="true">{i < zvezdice ? '⭐' : '☆'}</span>
          ))}
        </div>
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

        {novPokusajMoguc && (
          <button type="button" className="dugme dugme--akcenat razmak-gore" onClick={noviPokusaj}>
            Pokušaj ponovo 🔄
          </button>
        )}
      </div>

      {rezultat.questions && (
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
                {q.explanation && (
                  <p className="malo razmak-gore" style={{ background: 'var(--boja-primarna-svetla)', padding: '0.5rem 0.7rem', borderRadius: 8 }}>
                    💡 {q.explanation}
                  </p>
                )}
              </div>
            ))}
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
