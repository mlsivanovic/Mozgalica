import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import {
  filtrirajZadatke, kljucZadatka, obrisiRoditeljskeZadatke, ucitajRoditeljskeZadatke,
} from '../../lib/roditeljskiPregled'
import { useRoditeljskiPodaci } from '../../lib/useRoditeljskiPodaci'
import { formatDatum } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import { Ikona } from '../../components/Ikona'

const VRSTE: Array<[string, string]> = [['quiz', 'Kvizovi'], ['chess', 'Šah']]
const STANJA: Array<[string, string]> = [
  ['assigned', 'Čeka'],
  ['in_progress', 'U toku'],
  ['unassigned', 'Pripremljeno'],
]

export function Vezbanje() {
  const { deteId } = useRoditelj()
  const { podaci, greska, radi, osvezi } = useRoditeljskiPodaci(ucitajRoditeljskeZadatke)
  const [params, setParams] = useSearchParams()
  const vrsta = params.get('vrsta') ?? ''
  const stanje = params.get('stanje') ?? ''
  const pretraga = params.get('pretraga') ?? ''
  // Izbor je vezan za trenutni filter: promena filtera ili deteta ga sama poništava.
  const potpis = `${deteId}|${vrsta}|${stanje}|${pretraga}`
  const [izbor, setIzbor] = useState<{ potpis: string; kljucevi: string[]; aktivan?: boolean }>({ potpis, kljucevi: [] })
  const izabrani = izbor.potpis === potpis ? izbor.kljucevi : []
  const [brisanje, setBrisanje] = useState(false)
  const [poruka, setPoruka] = useState<string | null>(null)
  const [greskaBrisanja, setGreskaBrisanja] = useState<string | null>(null)

  const zadaci = useMemo(
    () => filtrirajZadatke(podaci ?? [], { vrsta, stanje, pretraga }),
    [podaci, vrsta, stanje, pretraga],
  )
  const sviKljucevi = useMemo(() => zadaci.map(kljucZadatka), [zadaci])
  const izabraniZadaci = zadaci.filter(z => izabrani.includes(kljucZadatka(z)))
  const sveIzabrano = sviKljucevi.length > 0 && sviKljucevi.every(k => izabrani.includes(k))

  function promeniFilter(kljuc: string, vrednost: string) {
    setParams(stari => {
      const novi = new URLSearchParams(stari)
      if (vrednost) novi.set(kljuc, vrednost)
      else novi.delete(kljuc)
      return novi
    })
  }

  function preklopi(kljuc: string) {
    setIzbor({ potpis, aktivan: true, kljucevi: izabrani.includes(kljuc) ? izabrani.filter(k => k !== kljuc) : [...izabrani, kljuc] })
  }

  function preklopiSve() {
    setIzbor({
      potpis,
      aktivan: true,
      kljucevi: sveIzabrano
        ? izabrani.filter(k => !sviKljucevi.includes(k))
        : Array.from(new Set([...izabrani, ...sviKljucevi])),
    })
  }

  async function obrisiIzabrane() {
    if (brisanje || izabraniZadaci.length === 0) return
    const broj = izabraniZadaci.length
    if (!confirm(`Obrisati ${broj} ${broj === 1 ? 'zadatak' : 'zadataka'}? Dodeljeni kvizovi nestaju sa profila deteta, a šahovske partije se otkazuju.`)) return
    setBrisanje(true)
    setPoruka(null)
    setGreskaBrisanja(null)
    try {
      const rezultat = await obrisiRoditeljskeZadatke(izabraniZadaci)
      setIzbor({ potpis, kljucevi: [], aktivan: false })
      await osvezi()
      const delovi = [`Uklonjeno: ${rezultat.removed}`]
      if (rezultat.archived) delovi.push(`U arhivi: ${rezultat.archived}`)
      if (rezultat.preserved) delovi.push(`Sačuvana istorija: ${rezultat.preserved}`)
      if (rezultat.errors.length) delovi.push(`Nije obrisano: ${rezultat.errors.length}`)
      setPoruka(delovi.join(' · '))
      if (rezultat.errors.length) {
        setGreskaBrisanja(rezultat.errors.slice(0, 3).map(e => e.message).join(' '))
      }
    } catch (e) {
      setGreskaBrisanja((e as Error).message)
    } finally {
      setBrisanje(false)
    }
  }

  if (!podaci && radi) return <Loader />
  const filterAktivan = !!(vrsta || stanje || pretraga.trim())
  const rezimIzbora = izbor.potpis === potpis && izbor.aktivan

  return <>
    {poruka && <p className="poruka poruka--uspeh" role="status">{poruka}</p>}
    {(greska || greskaBrisanja) && <p className="poruka poruka--greska" role="alert">
      {greskaBrisanja ?? greska}
      {!greskaBrisanja && <button className="dugme dugme--malo" onClick={() => void osvezi()}>Pokušaj ponovo</button>}
    </p>}

    <div className="roditelj-pretraga">
      <Ikona ime="pretraga" velicina={20} />
      <input
        type="search" aria-label="Pretraga zadataka" placeholder="Pretraži zadatke ili decu"
        value={pretraga} onChange={e => promeniFilter('pretraga', e.target.value)}
      />
    </div>
    <div className="roditelj-cipovi" role="group" aria-label="Filteri zadataka">
      {VRSTE.map(([vrednost, naziv]) => <button key={vrednost} type="button" aria-pressed={vrsta === vrednost}
        className={`roditelj-cip${vrsta === vrednost ? ' aktivan' : ''}`} onClick={() => promeniFilter('vrsta', vrsta === vrednost ? '' : vrednost)}>
        {vrsta === vrednost && <Ikona ime="potvrda" velicina={16} />}{naziv}
      </button>)}
      <span className="roditelj-cipovi-razdelnik" aria-hidden="true" />
      {STANJA.map(([vrednost, naziv]) => <button key={vrednost} type="button" aria-pressed={stanje === vrednost}
        className={`roditelj-cip${stanje === vrednost ? ' aktivan' : ''}`} onClick={() => promeniFilter('stanje', stanje === vrednost ? '' : vrednost)}>
        {stanje === vrednost && <Ikona ime="potvrda" velicina={16} />}{naziv}
      </button>)}
    </div>

    <div className="roditelj-lista-alati">
      {rezimIzbora
        ? <label className="stiklir">
          <input
            type="checkbox" checked={sveIzabrano} disabled={sviKljucevi.length === 0}
            onChange={preklopiSve} aria-label="Izaberi sve zadatke u prikazu"
          />
          Sve ({zadaci.length})
        </label>
        : <span className="blago">{zadaci.length} {zadaci.length === 1 ? 'zadatak' : 'zadataka'}</span>}
      <div className="red">
        <Link className="roditelj-tekst-dugme" to="/admin/kvizovi?prikaz=arhiva">Arhiva</Link>
        <button type="button" className="roditelj-tekst-dugme" disabled={!rezimIzbora && sviKljucevi.length === 0}
          onClick={() => setIzbor({ potpis, kljucevi: [], aktivan: !rezimIzbora })}>
          {rezimIzbora ? 'Gotovo' : 'Izaberi'}
        </button>
      </div>
    </div>

    {rezimIzbora && <div className="roditelj-kontekst-traka" role="toolbar" aria-label="Izabrani zadaci">
      <button type="button" className="roditelj-ikona-dugme" aria-label="Poništi izbor" disabled={brisanje}
        onClick={() => setIzbor({ potpis, kljucevi: [], aktivan: false })}><Ikona ime="zatvori" /></button>
      <strong>{izabraniZadaci.length} izabrano</strong>
      <button
        type="button" className="dugme dugme--opasno dugme--malo" disabled={brisanje || izabraniZadaci.length === 0}
        onClick={() => void obrisiIzabrane()}
      >
        {brisanje ? 'Brišem…' : 'Obriši'}
      </button>
    </div>}

    {podaci && [false, true].map(nedodeljeni => {
      if (nedodeljeni && deteId) return null
      const grupa = zadaci.filter(z => z.unassigned === nedodeljeni)
      if (nedodeljeni && grupa.length === 0) return null
      return <section className="roditelj-grupa" key={String(nedodeljeni)}>
        <h2 className="roditelj-podnaslov">{nedodeljeni ? 'Nedodeljeni kvizovi' : 'Aktivni zadaci'}</h2>
        {grupa.length === 0
          ? <p className="blago">{filterAktivan ? 'Nema zadataka za izabrane filtere.' : 'Nema preostalih zadataka u ovom prikazu.'}</p>
          : <ul className="roditelj-lista roditelj-gusta-lista">{grupa.map(z => {
            const kljuc = kljucZadatka(z)
            const sadrzaj = <>
              <span className="roditelj-red-ikona" aria-hidden="true">{!deteId && z.avatar ? z.avatar : <Ikona ime={z.kind === 'chess' ? 'sah' : 'zadaci'} velicina={20} />}</span>
              <span className="roditelj-gusta-tekst">
                <strong>{z.title}</strong>
                <small>{z.childName ?? (z.unassigned ? 'Još nije dodeljen' : 'Deljeni link bez profila')} · {formatDatum(z.createdAt)}</small>
              </span>
              <span className={`bedz${z.state === 'in_progress' ? ' bedz--uspeh' : z.unassigned ? ' bedz--neutral' : ''}`}>{z.state === 'in_progress' ? 'U toku' : z.unassigned ? 'Pripremljen' : 'Čeka'}</span>
            </>
            return <li key={kljuc}>
              {rezimIzbora
                ? <label className={izabrani.includes(kljuc) ? 'izabran' : ''}>
                  <input
                    type="checkbox" checked={izabrani.includes(kljuc)}
                    onChange={() => preklopi(kljuc)} aria-label={`Izaberi ${z.title}`}
                  />
                  {sadrzaj}
                </label>
                : <Link to={z.kind === 'quiz' ? `/admin/kvizovi/${z.id}` : `/admin/sah?partija=${z.id}`}>{sadrzaj}</Link>}
            </li>
          })}</ul>}
      </section>
    })}
  </>
}
