// Admin početna: brzi pregled i prečice
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listajKvizove, listajPokusaje, statistikaKvizova, type StatistikaKviza } from '../../lib/api'
import { formatDatum, formatProcenat } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import type { Kviz, Pokusaj } from '../../types/db'

export function Kontrolna() {
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])
  const [poslednji, setPoslednji] = useState<Pokusaj[]>([])
  const [statistika, setStatistika] = useState<StatistikaKviza[]>([])

  useEffect(() => {
    Promise.all([listajKvizove(), listajPokusaje(), statistikaKvizova()])
      .then(([k, p, s]) => {
        setKvizovi(k)
        setPoslednji(p.filter((a) => a.status === 'submitted').slice(0, 5))
        setStatistika(s)
      })
      .catch((e) => setGreska(String(e.message ?? e)))
      .finally(() => setUcitava(false))
  }, [])

  if (ucitava) return <Loader />

  const ukupnoZavrsenih = statistika.reduce((s, x) => s + x.attempts_count, 0)

  return (
    <div>
      <div className="zaglavlje-strane">
        <h1>Dobrodošao/la nazad 👋</h1>
        <div className="red">
          <Link to="/admin/pitanja" className="dugme dugme--senka">+ Novo pitanje</Link>
          <Link to="/admin/kvizovi" className="dugme dugme--akcenat">+ Novi kviz</Link>
        </div>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <div className="mreza-kartica razmak-dole">
        <div className="kartica centar">
          <p className="blago malo">Aktivnih kvizova</p>
          <h2>{kvizovi.length}</h2>
        </div>
        <div className="kartica centar">
          <p className="blago malo">Završenih pokušaja</p>
          <h2>{ukupnoZavrsenih}</h2>
        </div>
      </div>

      <div className="kartica">
        <h2>Poslednji rezultati</h2>
        {poslednji.length === 0 ? (
          <p className="blago razmak-gore">Još nema završenih kvizova.</p>
        ) : (
          <div className="tabela-omot razmak-gore">
            <table className="tabela">
              <thead>
                <tr><th>Dete</th><th>Datum</th><th>Rezultat</th><th></th></tr>
              </thead>
              <tbody>
                {poslednji.map((p) => (
                  <tr key={p.id}>
                    <td>{p.child_name}{p.child_label ? ` (${p.child_label})` : ''}</td>
                    <td>{formatDatum(p.submitted_at)}</td>
                    <td>{formatProcenat(p.score_pct)}</td>
                    <td><Link to={`/admin/rezultati/${p.id}`}>Detalji</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to="/admin/rezultati" className="dugme dugme--senka dugme--malo razmak-gore">Svi rezultati</Link>
      </div>
    </div>
  )
}
