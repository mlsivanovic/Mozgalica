// Prikaz rezultata detetu — poziva submit_attempt ponovo (idempotentno) preko
// sačuvanog attemptToken-a, pa je stranica bezbedna i posle osvežavanja (F5)
import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PitanjeRenderer } from '../../components/pitanja/PitanjeRenderer'
import { Konfete, Loader } from '../../components/Zajednicke'
import { predajKviz } from '../../lib/api'
import { obrisiStanje, ucitajStanje } from '../../lib/offlineQueue'
import { brojZvezdica, porukaOhrabrenja } from '../../lib/ocena'
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

  if (rezultat.showResult === false) {
    return (
      <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}>
        <h1>✔ Kviz je predat!</h1>
        <p className="blago razmak-gore">Tvoj rezultat će videti osoba koja ti je poslala link.</p>
      </div>
    )
  }

  const zvezdice = brojZvezdica(rezultat.scorePct ?? 0, rezultat.passThresholdPct ?? 50)
  const novPokusajMoguc = (rezultat.attemptsLeft ?? 0) > 0

  function noviPokusaj() {
    obrisiStanje(localStorage, token)
    navigate(`/kviz/${token}`)
  }

  const polozio = rezultat.passed ?? false
  const procenat = Math.round(rezultat.scorePct ?? 0)

  return (
    <div className="sadrzaj sadrzaj--usko" style={{ paddingBottom: '3rem' }}>
      {polozio && <Konfete />}
      <div className="kartica centar">
        <div className="kviz-zvezde" aria-label={`${zvezdice} od 3 zvezdice`}>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i}>{i < zvezdice ? '⭐' : '☆'}</span>
          ))}
        </div>

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
        <p className="razmak-gore" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {porukaOhrabrenja(rezultat.scorePct ?? 0, rezultat.passThresholdPct ?? 50)}
        </p>

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
        <Link to="/">Nazad na početnu</Link>
      </p>
    </div>
  )
}
