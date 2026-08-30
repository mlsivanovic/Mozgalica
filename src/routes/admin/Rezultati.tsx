// Tabela rezultata sa filterima + CSV izvoz
import { lazy, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRoditelj } from '../../lib/roditelj'
import { usePeriodNapretka } from '../../lib/periodNapretka'
import { danasUBeogradu } from '../../lib/statistikaDeteta'
import { RoditeljskiLink as Link } from '../../lib/roditelj'
import {
  listajKategorijeKvizova, listajKvizove, listajPokusaje, listajProfileDeteta,
  type KategorijaKviza,
} from '../../lib/api'
import { napraviCsv, preuzmiCsv } from '../../lib/csv'
import { kvizImaPredmet, kvizImaRazred } from '../../lib/filterRezultata'
import { formatDatum, formatProcenat, formatTrajanje } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import {
  NAZIVI_PREDMETA, NAZIVI_RAZREDA, PREDMETI,
  RAZREDI, type Kviz, type Pokusaj, type Predmet, type ProfilDeteta, type Razred, type StatusPokusaja,
} from '../../types/db'

const Sah = lazy(() => import('./Sah').then(m => ({default:m.Sah})))

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

  const { deteId: filterDete } = useRoditelj()
  const [parametri, postaviParametre] = useSearchParams()
  const { from: filterOd, to: filterDo } = usePeriodNapretka()
  const filterPredmet = (parametri.get('predmet') ?? '') as Predmet | ''
  const filterRazred = (Number(parametri.get('razred')) || '') as Razred | ''
  const filterStatus = parametri.get('status') ?? ''
  function promeniFilter(ime: string, vrednost: string) { postaviParametre(p => { if(vrednost) p.set(ime,vrednost); else p.delete(ime); return p }) }
  const setFilterPredmet = (v: string) => promeniFilter('predmet',v)
  const setFilterRazred = (v: number | '') => promeniFilter('razred',String(v))
  const setFilterStatus = (v: string) => promeniFilter('status',v)

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

  // Broj pokušaja na čekanju pregleda — nezavisan od aktivnih filtera, da uvek bude tačan.
  const brojCekaPregled = useMemo(
    () => pokusaji.filter((p) => p.status === 'submitted' && p.review_pending && (!filterDete || p.child_profile_id === filterDete)).length,
    [pokusaji, filterDete],
  )

  const filtrirano = useMemo(() => pokusaji.filter((p) => {
    if (filterDete && p.child_profile_id !== filterDete) return false
    if (!kvizImaPredmet(p, kategorijeKvizova, filterPredmet)) return false
    if (!kvizImaRazred(p.quiz_id, mapaRazredaKviza, filterRazred)) return false
    if (filterStatus === 'review_pending') {
      if (!(p.status === 'submitted' && p.review_pending)) return false
    } else if (filterStatus && p.status !== filterStatus) {
      return false
    }
    if (filterOd && danasUBeogradu(new Date(p.submitted_at ?? p.started_at)) < filterOd) return false
    if (filterDo && danasUBeogradu(new Date(p.submitted_at ?? p.started_at)) > filterDo) return false
    return true
  }), [
    pokusaji, filterDete, kategorijeKvizova, filterPredmet, filterRazred,
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
    postaviParametre(p => { p.set('vrsta','quiz'); p.set('status','review_pending'); p.set('period','all'); p.delete('predmet'); p.delete('razred'); return p })
  }

  if (ucitava) return <Loader />
  if (greska) return <p className="poruka poruka--greska" role="alert">{greska} Osveži stranicu za ponovni pokušaj.</p>

  return (
    <div>
      <div className="roditelj-alati"><label>Aktivnost <select aria-label="Vrsta rezultata" value={parametri.get('vrsta') ?? 'quiz'} onChange={e => promeniFilter('vrsta',e.target.value)}><option value="quiz">Kvizovi</option><option value="chess">Šah</option></select></label>
        <button type="button" className="dugme dugme--senka" onClick={prikaziCekaPregled}>Čeka pregled ({brojCekaPregled})</button>
      </div>
      {parametri.get('vrsta') === 'chess' ? <Sah istorija /> : <>
      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <details className="roditelj-filteri"><summary>Filteri{filterPredmet || filterRazred || filterStatus ? ' · aktivni' : ''}</summary>
        <p className="malo blago">{filterPredmet ? NAZIVI_PREDMETA[filterPredmet] : 'Svi predmeti'} · {filterRazred ? `${filterRazred}. razred` : 'Svi razredi'} · {filterStatus === 'review_pending' ? 'Čeka pregled' : filterStatus || 'Svi statusi'}</p>
        <div className="red-polja razmak-gore">
          <div className="polje">
            <label htmlFor="rf-kviz">Predmet</label>
            <select
              id="rf-kviz" value={filterPredmet}
              onChange={(e) => setFilterPredmet(e.target.value as Predmet | '')}
            >
              <option value="">Svi predmeti</option>
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
        </div>
        <button type="button" className="dugme dugme--senka" onClick={() => postaviParametre(p => {p.delete('predmet');p.delete('razred');p.delete('status');return p})}>Poništi filtere</button>
        <button type="button" className="dugme dugme--senka" disabled={filtrirano.length === 0} onClick={izvezi}>Izvezi CSV</button>
      </details>
      <p className="malo blago razmak-dole">{filtrirano.length} rezultata{filterStatus === 'review_pending' ? ' · čeka pregled' : ''}{filterPredmet ? ` · ${NAZIVI_PREDMETA[filterPredmet]}` : ''}</p>
      <div className="tabela-omot">
        <table className="tabela tabela--kartice">
          <thead>
            <tr><th>Dete</th><th>Kviz</th><th>Status</th><th>Rezultat</th><th>Zvezdice</th><th>Pokušaj</th><th>Kraj</th><th></th></tr>
          </thead>
          <tbody>
            {filtrirano.map((p) => (
              <tr key={p.id}>
                <td data-naslov="Dete">{imeDeteta(p)}{p.child_label ? ` (${p.child_label})` : ''}{!p.child_profile_id && <small className="blago"> · bez profila</small>}</td>
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
                <td data-naslov="Rezultat">{p.review_pending ? 'Čeka ocenu' : formatProcenat(p.score_pct)}</td>
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
      </>}
    </div>
  )
}
