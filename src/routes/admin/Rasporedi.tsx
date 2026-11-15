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
import { Ikona } from '../../components/Ikona'

function AkcijaIkona({ ime }: { ime: 'obrisi' }) {
  const crtezi = {
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
    return <>{vrsta === 'chess'
      ? <DnevniRasporediSaha profili={profili} rasporedi={podaci.sah} onPromena={sacuvano} otvoriId={id} pocetnoDete={deteId} samoForma onZatvori={zatvori} />
      : <DnevniRasporedi rasporedi={podaci.kvizovi} onPromena={sacuvano} otvoriId={id} pocetnoDete={deteId} samoForma onZatvori={zatvori} />}</>
  }
  const rasporedi = podaci.pregled.schedules.filter(s => !problemi || s.error)
  return <>
    <div className="roditelj-cipovi" role="group" aria-label="Rasporedi">
      <Link className="roditelj-cip roditelj-cip--akcija" to="/admin/vezbanje/rasporedi?raspored=novi&vrsta=quiz"><Ikona ime="dodaj" velicina={18} />Kviz</Link>
      <Link className="roditelj-cip roditelj-cip--akcija" to="/admin/vezbanje/rasporedi?raspored=novi&vrsta=chess"><Ikona ime="dodaj" velicina={18} />Šah</Link>
      <span className="roditelj-cipovi-razdelnik" aria-hidden="true" />
      <button type="button" aria-pressed={problemi} className={`roditelj-cip${problemi ? ' aktivan' : ''}`}
        onClick={() => setParams(p => { if (!problemi) p.set('problemi', '1'); else p.delete('problemi'); return p })}>
        {problemi && <Ikona ime="potvrda" velicina={16} />}Samo problemi
      </button>
    </div>
    {(greska || greskaIzmene) && <p className="poruka poruka--greska" role="alert">{greskaIzmene || greska}</p>}
    {rasporedi.length === 0 ? <p className="kartica">{problemi ? 'Nema problema sa rasporedima.' : 'Nema rasporeda. Dodaj kviz ili šah u željenom dnevnom terminu.'}</p> : <ul className="roditelj-lista roditelj-gusta-lista">{rasporedi.map(s => {
      const naziv = `${s.childName} · ${NAZIVI_PREDMETA[s.title as Predmet] ?? s.title}`
      return (
        <li key={s.id} className="roditelj-raspored">
          <Link to={`/admin/vezbanje/rasporedi?raspored=${s.id}&vrsta=${s.kind}`} aria-label={`Uredi raspored: ${naziv}`}>
            <span className="roditelj-red-ikona" aria-hidden="true"><Ikona ime={s.kind === 'chess' ? 'sah' : 'raspored'} velicina={20} /></span>
            <span className="roditelj-gusta-tekst">
              <strong>{naziv}</strong>
              <small>{s.active ? `Sledeći: ${formatDatum(s.nextAt)}` : 'Pauziran · ne šalje nove aktivnosti'}</small>
              {s.error && <small className="roditelj-greska-red"><Ikona ime="upozorenje" velicina={14} />{s.error}</small>}
            </span>
          </Link>
          <button type="button" role="switch" aria-checked={s.active} className="roditelj-prekidac" disabled={!!menja}
            onClick={() => void promeni(s.id, s.kind, s.active)} aria-label={s.active ? `Pauziraj: ${naziv}` : `Uključi: ${naziv}`}>
            <span />
          </button>
          <button type="button" className="roditelj-ikona-dugme roditelj-ikona-dugme--opasno" disabled={!!menja}
            onClick={() => void promeni(s.id, s.kind, s.active, true)} aria-label={`Obriši raspored: ${naziv}`} title="Obriši raspored">
            <AkcijaIkona ime="obrisi" />
          </button>
        </li>
      )
    })}</ul>}
  </>
}
