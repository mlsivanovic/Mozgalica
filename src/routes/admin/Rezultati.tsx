// Tabela rezultata sa filterima + CSV izvoz
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listajKvizove, listajPokusaje } from '../../lib/api'
import { napraviCsv, preuzmiCsv } from '../../lib/csv'
import { formatDatum, formatProcenat, formatTrajanje } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import type { Kviz, Pokusaj, StatusPokusaja } from '../../types/db'

const NAZIVI_STATUSA: Record<StatusPokusaja, string> = {
  in_progress: 'U toku', submitted: 'Završen', expired: 'Istekao',
}

export function Rezultati() {
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [pokusaji, setPokusaji] = useState<Pokusaj[]>([])
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])

  const [filterDete, setFilterDete] = useState('')
  const [filterKviz, setFilterKviz] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOd, setFilterOd] = useState('')
  const [filterDo, setFilterDo] = useState('')

  useEffect(() => {
    Promise.all([listajPokusaje(), listajKvizove()])
      .then(([p, k]) => { setPokusaji(p); setKvizovi(k) })
      .catch((e) => setGreska(String(e.message ?? e)))
      .finally(() => setUcitava(false))
  }, [])

  const mapaKvizova = useMemo(() => new Map(kvizovi.map((k) => [k.id, k.title])), [kvizovi])

  const filtrirano = useMemo(() => pokusaji.filter((p) => {
    if (filterDete && !p.child_name.toLowerCase().includes(filterDete.toLowerCase())) return false
    if (filterKviz && p.quiz_id !== filterKviz) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (filterOd && new Date(p.started_at) < new Date(filterOd)) return false
    if (filterDo && new Date(p.started_at) > new Date(filterDo + 'T23:59:59')) return false
    return true
  }), [pokusaji, filterDete, filterKviz, filterStatus, filterOd, filterDo])

  function izvezi() {
    const csv = napraviCsv(
      ['Dete', 'Oznaka', 'Kviz', 'Status', 'Poeni', 'Procenat', 'Pokušaj br.', 'Početak', 'Kraj', 'Trajanje'],
      filtrirano.map((p) => [
        p.child_name, p.child_label ?? '', mapaKvizova.get(p.quiz_id) ?? '', NAZIVI_STATUSA[p.status],
        p.total_points ?? '', p.score_pct ?? '', p.attempt_no, formatDatum(p.started_at),
        formatDatum(p.submitted_at), formatTrajanje(p.duration_sec),
      ]),
    )
    preuzmiCsv(`mozgalica-rezultati-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  if (ucitava) return <Loader />

  return (
    <div>
      <div className="zaglavlje-strane">
        <h1>Rezultati</h1>
        <button type="button" className="dugme dugme--senka" disabled={filtrirano.length === 0} onClick={izvezi}>
          ⬇ Izvezi CSV
        </button>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <div className="kartica razmak-dole">
        <div className="red-polja">
          <div className="polje">
            <label htmlFor="rf-dete">Dete</label>
            <input id="rf-dete" type="text" value={filterDete} onChange={(e) => setFilterDete(e.target.value)} />
          </div>
          <div className="polje">
            <label htmlFor="rf-kviz">Kviz</label>
            <select id="rf-kviz" value={filterKviz} onChange={(e) => setFilterKviz(e.target.value)}>
              <option value="">Svi kvizovi</option>
              {kvizovi.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="rf-status">Status</label>
            <select id="rf-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Svi</option>
              {Object.entries(NAZIVI_STATUSA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="rf-od">Od datuma</label>
            <input id="rf-od" type="date" value={filterOd} onChange={(e) => setFilterOd(e.target.value)} />
          </div>
          <div className="polje">
            <label htmlFor="rf-do">Do datuma</label>
            <input id="rf-do" type="date" value={filterDo} onChange={(e) => setFilterDo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="tabela-omot">
        <table className="tabela">
          <thead>
            <tr><th>Dete</th><th>Kviz</th><th>Status</th><th>Rezultat</th><th>Pokušaj</th><th>Kraj</th><th></th></tr>
          </thead>
          <tbody>
            {filtrirano.map((p) => (
              <tr key={p.id}>
                <td>{p.child_name}{p.child_label ? ` (${p.child_label})` : ''}</td>
                <td>{mapaKvizova.get(p.quiz_id) ?? '—'}</td>
                <td>
                  <span className={`bedz ${p.status === 'submitted' ? (p.passed ? 'bedz--uspeh' : 'bedz--upozorenje') : p.status === 'expired' ? 'bedz--greska' : 'bedz--neutral'}`}>
                    {NAZIVI_STATUSA[p.status]}
                  </span>
                </td>
                <td>{formatProcenat(p.score_pct)}</td>
                <td>#{p.attempt_no}</td>
                <td>{formatDatum(p.submitted_at)}</td>
                <td><Link to={`/admin/rezultati/${p.id}`}>Detalji</Link></td>
              </tr>
            ))}
            {filtrirano.length === 0 && (
              <tr><td colSpan={7} className="centar blago" style={{ padding: '2rem' }}>Nema rezultata za izabrane filtere.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
