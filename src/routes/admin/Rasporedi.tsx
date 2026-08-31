import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import { listajDnevneRasporedeKvizova, listajDnevneRasporedeSaha, postaviAktivnostDnevnogRasporeda, postaviAktivnostDnevnogRasporedaSaha, obrisiDnevniRasporedKviza, obrisiDnevniRasporedSaha } from '../../lib/api'
import { ucitajRoditeljskiPregled } from '../../lib/roditeljskiPregled'
import { useRoditeljskiPodaci } from '../../lib/useRoditeljskiPodaci'
import { DnevniRasporedi } from './DnevniRasporedi'
import { DnevniRasporediSaha } from './DnevniRasporediSaha'
import { Loader } from '../../components/Zajednicke'
import { NAZIVI_PREDMETA, type Predmet } from '../../types/db'
import { formatDatum } from '../../lib/format'

function AkcijaIkona({ ime }: { ime: 'uredi' | 'pauziraj' | 'nastavi' | 'obrisi' }) {
  const crtezi = {
    uredi: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    pauziraj: <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>,
    nastavi: <path d="M8 5v14l11-7Z" />,
    obrisi: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {crtezi[ime]}
    </svg>
  )
}

async function ucitaj(id: string) {
  const [kvizovi, sah, pregled] = await Promise.all([listajDnevneRasporedeKvizova(), listajDnevneRasporedeSaha(), ucitajRoditeljskiPregled(id)])
  return { kvizovi, sah, pregled }
}
export function Rasporedi() {
  const { deteId, profili } = useRoditelj()
  const { podaci, greska, radi, osvezi } = useRoditeljskiPodaci(ucitaj)
  const [params,setParams] = useSearchParams()
  const [menja, setMenja] = useState<string | null>(null)
  const [greskaIzmene, setGreskaIzmene] = useState<string | null>(null)
  async function promeni(id: string, kind: string, active: boolean, brisanje = false) {
    if (menja) return
    if (brisanje && !confirm('Obrisati raspored? Već poslate aktivnosti ostaju sačuvane.')) return
    setMenja(id); setGreskaIzmene(null)
    try {
      if (brisanje) await (kind === 'chess' ? obrisiDnevniRasporedSaha(id) : obrisiDnevniRasporedKviza(id))
      else await (kind === 'chess' ? postaviAktivnostDnevnogRasporedaSaha(id, !active) : postaviAktivnostDnevnogRasporeda(id, !active))
      await osvezi()
    } catch(e) { setGreskaIzmene((e as Error).message) } finally { setMenja(null) }
  }
  const id = params.get('raspored') ?? ''
  const vrsta = params.get('vrsta')
  const problemi = params.get('problemi') === '1'
  function zatvori() { setParams(p => { p.delete('raspored'); p.delete('vrsta'); return p }) }
  async function sacuvano() { await osvezi(); zatvori() }
  if (!podaci && radi) return <Loader />
  if (!podaci) return <div role="alert">{greska}<button className="dugme" onClick={() => void osvezi()}>Pokušaj ponovo</button></div>
  if (id) {
    const lista = vrsta === 'chess' ? podaci.sah : podaci.kvizovi
    if (id !== 'novi' && !lista.some(r => r.id === id && (!deteId || r.child_profile_id === deteId))) return <p className="poruka poruka--greska">Raspored nije dostupan. <Link to="/admin/vezbanje/rasporedi">Nazad</Link></p>
    return <><p className="razmak-dole">Primalac je prikazan u formi. <button className="dugme dugme--senka dugme--malo" onClick={zatvori}>← Svi rasporedi</button></p>{vrsta === 'chess'
      ? <DnevniRasporediSaha profili={profili} rasporedi={podaci.sah} onPromena={sacuvano} otvoriId={id} pocetnoDete={deteId} samoForma onZatvori={zatvori} />
      : <DnevniRasporedi rasporedi={podaci.kvizovi} onPromena={sacuvano} otvoriId={id} pocetnoDete={deteId} samoForma onZatvori={zatvori} />}</>
  }
  const rasporedi = podaci.pregled.schedules.filter(s => !problemi || s.error)
  return <>
    <div className="roditelj-alati"><div className="red"><Link className="dugme dugme--senka" to="/admin/vezbanje/rasporedi?raspored=novi&vrsta=quiz">+ Raspored kviza</Link><Link className="dugme dugme--senka" to="/admin/vezbanje/rasporedi?raspored=novi&vrsta=chess">+ Raspored šaha</Link></div>
      <label className="stiklir"><input type="checkbox" checked={problemi} onChange={e => setParams(p => { if(e.target.checked) p.set('problemi','1'); else p.delete('problemi'); return p })} />Samo problemi</label>
    </div>
    {(greska || greskaIzmene) && <p className="poruka poruka--greska" role="alert">{greskaIzmene || greska}</p>}
    {rasporedi.length === 0 ? <p className="kartica">{problemi ? 'Nema problema sa rasporedima.' : 'Nema rasporeda. Dodaj kviz ili šah u željenom dnevnom terminu.'}</p> : <div className="roditelj-kartice">{rasporedi.map(s => {
      const pauzaLabel = s.active ? 'Pauziraj' : 'Uključi'
      return (
        <article key={s.id} className="kartica roditelj-dete">
          <div className="roditelj-alati">
            <h2>{s.childName}</h2>
            <span className={`bedz ${s.active ? 'bedz--uspeh' : 'bedz--neutral'}`}>{s.active ? 'Uključen' : 'Pauziran'}</span>
          </div>
          <p>{NAZIVI_PREDMETA[s.title as Predmet] ?? s.title}</p>
          <p className="blago malo razmak-gore">{s.active ? `Sledeći termin: ${formatDatum(s.nextAt)}` : 'Ne šalje nove aktivnosti.'}</p>
          {s.error && <div className="poruka poruka--greska"><strong>Poslednje izvršavanje nije uspelo</strong><p className="malo">{s.error}</p></div>}
          <div className="red razmak-gore raspored-akcije" role="group" aria-label="Akcije rasporeda">
            <Link to={`/admin/vezbanje/rasporedi?raspored=${s.id}&vrsta=${s.kind}`} className="dugme dugme--senka dugme--ikon" aria-label="Uredi raspored" title="Uredi raspored"><AkcijaIkona ime="uredi" /></Link>
            <button type="button" className="dugme dugme--senka dugme--ikon" disabled={!!menja} onClick={() => void promeni(s.id, s.kind, s.active)} aria-label={pauzaLabel} title={pauzaLabel}><AkcijaIkona ime={s.active ? 'pauziraj' : 'nastavi'} /></button>
            <button type="button" className="dugme dugme--opasno dugme--ikon" disabled={!!menja} onClick={() => void promeni(s.id, s.kind, s.active, true)} aria-label="Obriši raspored" title="Obriši raspored"><AkcijaIkona ime="obrisi" /></button>
          </div>
        </article>
      )
    })}</div>}
  </>
}
