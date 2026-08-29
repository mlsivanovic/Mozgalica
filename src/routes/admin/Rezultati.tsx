// Tabela rezultata sa filterima + CSV izvoz
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listajKategorijeKvizova, listajKvizove, listajPokusaje, listajProfileDeteta,
  type KategorijaKviza,
} from '../../lib/api'
import { napraviCsv, preuzmiCsv } from '../../lib/csv'
import { kvizImaPredmet, kvizImaRazred, pokusajPripadaProfilu } from '../../lib/filterRezultata'
import { formatDatum, formatDatumZaInput, formatProcenat, formatTrajanje } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import {
  NAZIVI_PREDMETA, NAZIVI_RAZREDA, PREDMETI,
  RAZREDI, type Kviz, type Pokusaj, type Predmet, type ProfilDeteta, type Razred, type StatusPokusaja,
} from '../../types/db'

const NAZIVI_STATUSA: Record<StatusPokusaja, string> = {
  in_progress: 'U toku', submitted: 'Završen', expired: 'Istekao',
}

export function Rezultati() {
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [pokusaji, setPokusaji] = useState<Pokusaj[]>([])
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])
  const [profili, setProfili] = useState<ProfilDeteta[]>([])
  const [kategorijeKvizova, setKategorijeKvizova] = useState<KategorijaKviza[]>([])

  const [filterDete, setFilterDete] = useState('')
  const [filterPredmet, setFilterPredmet] = useState<Predmet | ''>('')
  const [filterRazred, setFilterRazred] = useState<Razred | ''>('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOd, setFilterOd] = useState(() => formatDatumZaInput())
  const [filterDo, setFilterDo] = useState(() => formatDatumZaInput())

  useEffect(() => {
    Promise.all([
      listajPokusaje(), listajKvizove(true), listajProfileDeteta(), listajKategorijeKvizova(),
    ])
      .then(([p, k, profiliDeteta, kategorije]) => {
        setPokusaji(p)
        setKvizovi(k)
        setProfili(profiliDeteta)
        setKategorijeKvizova(kategorije)
      })
      .catch((e) => setGreska(String(e.message ?? e)))
      .finally(() => setUcitava(false))
  }, [])

  const mapaKvizova = useMemo(() => new Map(kvizovi.map((k) => [k.id, k.title])), [kvizovi])
  const mapaRazredaKviza = useMemo(() => {
    const mapa = new Map<string, Razred>()
    for (const k of kvizovi) if (k.grade != null) mapa.set(k.id, k.grade)
    return mapa
  }, [kvizovi])
  const mapaProfila = useMemo(() => new Map(profili.map((profil) => [profil.id, profil])), [profili])
  const izabraniProfil = filterDete ? mapaProfila.get(filterDete) : undefined

  // Broj pokušaja na čekanju pregleda — nezavisan od aktivnih filtera, da uvek bude tačan.
  const brojCekaPregled = useMemo(
    () => pokusaji.filter((p) => p.status === 'submitted' && p.review_pending).length,
    [pokusaji],
  )

  const filtrirano = useMemo(() => pokusaji.filter((p) => {
    if (!pokusajPripadaProfilu(p, izabraniProfil)) return false
    if (!kvizImaPredmet(p, kategorijeKvizova, filterPredmet)) return false
    if (!kvizImaRazred(p.quiz_id, mapaRazredaKviza, filterRazred)) return false
    if (filterStatus === 'review_pending') {
      if (!(p.status === 'submitted' && p.review_pending)) return false
    } else if (filterStatus && p.status !== filterStatus) {
      return false
    }
    if (filterOd && new Date(p.started_at) < new Date(`${filterOd}T00:00:00`)) return false
    if (filterDo && new Date(p.started_at) > new Date(`${filterDo}T23:59:59.999`)) return false
    return true
  }), [
    pokusaji, izabraniProfil, kategorijeKvizova, filterPredmet, filterRazred,
    mapaRazredaKviza, filterStatus, filterOd, filterDo,
  ])

  function imeDeteta(pokusaj: Pokusaj): string {
    return (pokusaj.child_profile_id && mapaProfila.get(pokusaj.child_profile_id)?.name)
      || pokusaj.child_name
  }

  function izvezi() {
    const csv = napraviCsv(
      ['Dete', 'Oznaka', 'Kviz', 'Status', 'Poeni', 'Procenat', 'Zvezdice', 'Pokušaj br.', 'Početak', 'Kraj', 'Trajanje'],
      filtrirano.map((p) => [
        imeDeteta(p), p.child_label ?? '', mapaKvizova.get(p.quiz_id) ?? '', NAZIVI_STATUSA[p.status],
        p.total_points ?? '', p.score_pct ?? '', p.stars_awarded ?? p.stars_earned ?? '',
        p.attempt_no, formatDatum(p.started_at),
        formatDatum(p.submitted_at), formatTrajanje(p.duration_sec),
      ]),
    )
    preuzmiCsv(`mozgalica-rezultati-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  // Brza prečica: poništava sve filtere i prikazuje samo pokušaje na čekanju pregleda.
  function prikaziCekaPregled() {
    setFilterDete('')
    setFilterPredmet('')
    setFilterRazred('')
    setFilterOd('')
    setFilterDo('')
    setFilterStatus('review_pending')
  }

  if (ucitava) return <Loader />

  return (
    <div>
      <div className="zaglavlje-strane">
        <h1>Rezultati</h1>
        <button type="button" className="dugme dugme--senka" onClick={prikaziCekaPregled}>
          ⏳ Čeka pregled {brojCekaPregled > 0 && <span className="bedz">{brojCekaPregled}</span>}
        </button>
        <button type="button" className="dugme dugme--senka" disabled={filtrirano.length === 0} onClick={izvezi}>
          ⬇ Izvezi CSV
        </button>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <div className="kartica razmak-dole">
        <div className="red-polja">
          <div className="polje">
            <label htmlFor="rf-dete">Dete</label>
            <select id="rf-dete" value={filterDete} onChange={(e) => setFilterDete(e.target.value)}>
              <option value="">Sva deca</option>
              {profili.map((profil) => (
                <option key={profil.id} value={profil.id}>{profil.name}</option>
              ))}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="rf-kviz">Kviz</label>
            <select
              id="rf-kviz" value={filterPredmet}
              onChange={(e) => setFilterPredmet(e.target.value as Predmet | '')}
            >
              <option value="">Svi kvizovi</option>
              {PREDMETI.map((predmet) => (
                <option key={predmet} value={predmet}>{NAZIVI_PREDMETA[predmet]}</option>
              ))}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="rf-razred">Razred</label>
            <select
              id="rf-razred" value={filterRazred}
              onChange={(e) => setFilterRazred(e.target.value ? Number(e.target.value) as Razred : '')}
            >
              <option value="">Svi razredi</option>
              {RAZREDI.map((razred) => (
                <option key={razred} value={razred}>{NAZIVI_RAZREDA[razred]}</option>
              ))}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="rf-status">Status</label>
            <select id="rf-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Svi</option>
              {Object.entries(NAZIVI_STATUSA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              <option value="review_pending">Čeka pregled</option>
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
        <table className="tabela tabela--kartice">
          <thead>
            <tr><th>Dete</th><th>Kviz</th><th>Status</th><th>Rezultat</th><th>Zvezdice</th><th>Pokušaj</th><th>Kraj</th><th></th></tr>
          </thead>
          <tbody>
            {filtrirano.map((p) => (
              <tr key={p.id}>
                <td data-naslov="Dete">{imeDeteta(p)}{p.child_label ? ` (${p.child_label})` : ''}</td>
                <td data-naslov="Kviz">{mapaKvizova.get(p.quiz_id) ?? '—'}</td>
                <td data-naslov="Status">
                  <span className={`bedz ${
                    p.status === 'submitted' && p.review_pending ? 'bedz--neutral'
                    : p.status === 'submitted' ? (p.passed ? 'bedz--uspeh' : 'bedz--upozorenje')
                    : p.status === 'expired' ? 'bedz--greska' : 'bedz--neutral'
                  }`}>
                    {p.status === 'submitted' && p.review_pending ? 'Čeka pregled' : NAZIVI_STATUSA[p.status]}
                  </span>
                </td>
                <td data-naslov="Rezultat">{formatProcenat(p.score_pct)}</td>
                <td data-naslov="Zvezdice">
                  {p.stars_awarded == null && p.stars_earned == null
                    ? '—'
                    : `${p.stars_awarded ?? p.stars_earned} / 5 ⭐`}
                </td>
                <td data-naslov="Pokušaj">#{p.attempt_no}</td>
                <td data-naslov="Kraj">{formatDatum(p.submitted_at)}</td>
                <td><Link to={`/admin/rezultati/${p.id}`}>Detalji</Link></td>
              </tr>
            ))}
            {filtrirano.length === 0 && (
              <tr><td colSpan={8} className="centar blago" style={{ padding: '2rem' }}>Nema rezultata za izabrane filtere.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
