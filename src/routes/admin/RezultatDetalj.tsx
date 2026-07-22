// Detaljan pregled jednog pokušaja: svi odgovori + ručna korekcija ocene
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PitanjeRenderer } from '../../components/pitanja/PitanjeRenderer'
import { Loader } from '../../components/Zajednicke'
import {
  listajOdgovorePokusaja, listajPitanjaKviza, overrideOcene, ucitajPokusaj,
} from '../../lib/api'
import { formatDatum, formatProcenat, formatTrajanje } from '../../lib/format'
import type { KvizPitanje, Pokusaj, PokusajOdgovor } from '../../types/db'

export function RezultatDetalj() {
  const { id } = useParams<{ id: string }>()
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [pokusaj, setPokusaj] = useState<Pokusaj | null>(null)
  const [pitanja, setPitanja] = useState<KvizPitanje[]>([])
  const [odgovori, setOdgovori] = useState<PokusajOdgovor[]>([])

  async function ucitaj() {
    if (!id) return
    setUcitava(true)
    try {
      const p = await ucitajPokusaj(id)
      const [qq, ans] = await Promise.all([listajPitanjaKviza(p.quiz_id), listajOdgovorePokusaja(id)])
      setPokusaj(p); setPitanja(qq); setOdgovori(ans)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { ucitaj() }, [id])

  async function ispravi(answerId: string, isCorrect: boolean, points: number) {
    try {
      await overrideOcene(answerId, isCorrect, points)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  if (ucitava) return <Loader />
  if (!pokusaj) return <p className="poruka poruka--greska">{greska ?? 'Pokušaj nije pronađen.'}</p>

  const mapaOdgovora = new Map(odgovori.map((o) => [o.quiz_question_id, o]))

  return (
    <div>
      <h1>{pokusaj.child_name}{pokusaj.child_label ? ` (${pokusaj.child_label})` : ''}</h1>
      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <div className="mreza-kartica razmak-dole">
        <div className="kartica centar"><p className="blago malo">Rezultat</p><h2>{formatProcenat(pokusaj.score_pct)}</h2></div>
        <div className="kartica centar"><p className="blago malo">Poeni</p><h2>{pokusaj.total_points} / {pokusaj.max_points}</h2></div>
        <div className="kartica centar"><p className="blago malo">Zvezdice</p><h2>{pokusaj.stars_earned == null ? '—' : `${pokusaj.stars_earned} / 3 ⭐`}</h2></div>
        <div className="kartica centar"><p className="blago malo">Trajanje</p><h2>{formatTrajanje(pokusaj.duration_sec)}</h2></div>
        <div className="kartica centar"><p className="blago malo">Pokušaj</p><h2>#{pokusaj.attempt_no}</h2></div>
      </div>
      <p className="blago razmak-dole">Predato: {formatDatum(pokusaj.submitted_at)}</p>

      {pokusaj.review_pending && (
        <p className="poruka poruka--upozorenje razmak-dole">
          ⏳ Ovaj pokušaj ima odgovore koji čekaju tvoju ocenu — prikazani rezultat je zato privremeno umanjen.
        </p>
      )}

      <div className="mreza-kartica">
        {pitanja.map((q, i) => {
          const odg = mapaOdgovora.get(q.id)
          const cekaOcenu = odg?.graded_by === 'pending'
          const boja = cekaOcenu ? 'var(--boja-ivica)' : odg?.is_correct ? 'var(--boja-uspeh)' : 'var(--boja-greska)'
          const labela = cekaOcenu ? '⏳ Čeka ocenu' : odg?.is_correct ? '✓ Tačno' : '✗ Netačno'
          const referentniOdgovor = q.type === 'text' ? (q.correct as { accept: string[] }).accept : []
          return (
            <div key={q.id} className="kartica" style={{ borderLeft: `5px solid ${boja}` }}>
              <p className="malo blago">
                <span style={{ fontWeight: 700, color: boja }}>{labela}</span>
                {' · '}Pitanje {i + 1} · {odg?.awarded_points ?? 0} / {q.points} poena{' '}
                {cekaOcenu ? '(čeka ručnu ocenu)' : odg?.graded_by === 'manual' ? '(ručno ocenjeno)' : '(automatski ocenjeno)'}
              </p>
              <p style={{ fontWeight: 700 }}>{q.text}</p>
              <div className="razmak-gore">
                <PitanjeRenderer pitanje={q} value={odg?.answer ?? null} onChange={() => {}} disabled />
              </div>
              {cekaOcenu && referentniOdgovor.length > 0 && (
                <p className="malo razmak-gore blago">Referentni odgovor: {referentniOdgovor.join(', ')}</p>
              )}
              {q.explanation && <p className="malo razmak-gore blago">💡 {q.explanation}</p>}

              {odg && (
                <div className="red razmak-gore">
                  <button
                    type="button" className="dugme dugme--senka dugme--malo"
                    disabled={odg.is_correct === true}
                    onClick={() => ispravi(odg.id, true, q.points)}
                  >
                    Označi tačnim
                  </button>
                  <button
                    type="button" className="dugme dugme--senka dugme--malo"
                    disabled={odg.is_correct === false}
                    onClick={() => ispravi(odg.id, false, 0)}
                  >
                    Označi netačnim
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
