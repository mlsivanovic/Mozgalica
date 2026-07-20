// Prikaz rezultata detetu — poziva submit_attempt ponovo (idempotentno) preko
// sačuvanog attemptToken-a, pa je stranica bezbedna i posle osvežavanja (F5)
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PitanjeRenderer } from '../../components/pitanja/PitanjeRenderer'
import { Loader } from '../../components/Zajednicke'
import { predajKviz } from '../../lib/api'
import { obrisiStanje, ucitajStanje } from '../../lib/offlineQueue'
import { brojZvezdica, porukaOhrabrenja } from '../../lib/ocena'
import { formatProcenat } from '../../lib/format'
import type { RezultatPayload } from '../../types/kviz'

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

  return (
    <div className="sadrzaj sadrzaj--usko" style={{ paddingBottom: '3rem' }}>
      <div className="kartica centar">
        <div style={{ fontSize: '2.4rem' }}>
          {'⭐'.repeat(zvezdice)}{'☆'.repeat(3 - zvezdice)}
        </div>
        <h1>{formatProcenat(rezultat.scorePct)}</h1>
        <p className="blago">{rezultat.totalPoints} / {rezultat.maxPoints} poena</p>
        <p className="malo blago">
          {rezultat.correctCount} tačnih · {rezultat.incorrectCount} netačnih
        </p>
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
                <p className="malo blago">Pitanje {i + 1} · {q.awardedPoints} / {q.points} poena</p>
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
