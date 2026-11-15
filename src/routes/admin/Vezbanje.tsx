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

const STANJA: Array<[string, string]> = [
  ['', 'Sva stanja'],
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
  const [izbor, setIzbor] = useState<{ potpis: string; kljucevi: string[] }>({ potpis, kljucevi: [] })
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
    setIzbor({ potpis, kljucevi: izabrani.includes(kljuc) ? izabrani.filter(k => k !== kljuc) : [...izabrani, kljuc] })
  }

  function preklopiSve() {
    setIzbor({
      potpis,
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
      setIzbor({ potpis, kljucevi: [] })
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

  return <>
    {poruka && <p className="poruka poruka--uspeh" role="status">{poruka}</p>}
    {(greska || greskaBrisanja) && <p className="poruka poruka--greska" role="alert">
      {greskaBrisanja ?? greska}
      {!greskaBrisanja && <button className="dugme dugme--malo" onClick={() => void osvezi()}>Pokušaj ponovo</button>}
    </p>}

    <div className="roditelj-alati">
      <div className="roditelj-filteri-red">
        <label>Prikaži
          <select aria-label="Vrsta zadatka" value={vrsta} onChange={e => promeniFilter('vrsta', e.target.value)}>
            <option value="">Kvizovi i šah</option>
            <option value="quiz">Kvizovi</option>
            <option value="chess">Šah</option>
          </select>
        </label>
        <label>Stanje
          <select aria-label="Stanje zadatka" value={stanje} onChange={e => promeniFilter('stanje', e.target.value)}>
            {STANJA.map(([vrednost, naziv]) => <option key={vrednost} value={vrednost}>{naziv}</option>)}
          </select>
        </label>
        <label>Pretraga
          <input
            type="search" aria-label="Pretraga zadataka" placeholder="Naziv ili dete"
            value={pretraga} onChange={e => promeniFilter('pretraga', e.target.value)}
          />
        </label>
      </div>
      <Link to="/admin/kvizovi?prikaz=arhiva">Arhiva kvizova →</Link>
    </div>

    <div className="roditelj-alati">
      <label className="stiklir">
        <input
          type="checkbox" checked={sveIzabrano} disabled={sviKljucevi.length === 0}
          onChange={preklopiSve} aria-label="Izaberi sve zadatke u prikazu"
        />
        Izaberi sve ({zadaci.length})
      </label>
    </div>

    {izabraniZadaci.length > 0 && (
      <div className="kartica bulk-traka" style={{ background: 'var(--boja-primarna-svetla)' }}>
        <div className="red red--razmak" style={{ flexWrap: 'wrap' }}>
          <p style={{ fontWeight: 700 }}>{izabraniZadaci.length} izabrano</p>
          <div className="red">
            <button
              type="button" className="dugme dugme--opasno dugme--malo" disabled={brisanje}
              onClick={() => void obrisiIzabrane()}
            >
              {brisanje ? 'Brišem…' : 'Obriši izabrano'}
            </button>
            <button
              type="button" className="dugme dugme--senka dugme--malo" disabled={brisanje}
              onClick={() => setIzbor({ potpis, kljucevi: [] })}
            >
              Poništi izbor
            </button>
          </div>
        </div>
      </div>
    )}

    {podaci && [false, true].map(nedodeljeni => {
      if (nedodeljeni && deteId) return null
      const grupa = zadaci.filter(z => z.unassigned === nedodeljeni)
      return <section className="roditelj-sekcija" key={String(nedodeljeni)}>
        <h2>{nedodeljeni ? 'Nedodeljeni kvizovi' : 'Aktivni zadaci'}</h2>
        {grupa.length === 0
          ? <p className="blago">{filterAktivan ? 'Nema zadataka za izabrane filtere.' : nedodeljeni ? 'Nema nedodeljenih kvizova.' : 'Nema preostalih zadataka u ovom prikazu.'}</p>
          : <ul className="roditelj-lista">{grupa.map(z => {
            const kljuc = kljucZadatka(z)
            return <li className="roditelj-stavka" key={kljuc}>
              <label className="roditelj-stavka-izbor">
                <input
                  type="checkbox" checked={izabrani.includes(kljuc)}
                  onChange={() => preklopi(kljuc)} aria-label={`Izaberi ${z.title}`}
                />
              </label>
              <Link className="roditelj-red-veza" to={z.kind === 'quiz' ? `/admin/kvizovi/${z.id}` : `/admin/sah?partija=${z.id}`}>
                <span className="roditelj-red-ikona"><Ikona ime={z.kind === 'chess' ? 'sah' : 'zadaci'} /></span>
                <div>
                  <strong>{z.title}</strong>
                  <small>{z.childName ?? (z.unassigned ? 'Još nije dodeljen' : 'Deljeni link bez profila')} · {formatDatum(z.createdAt)}</small>
                </div>
                <span className="bedz">{z.state === 'in_progress' ? 'U toku' : z.unassigned ? 'Pripremljen' : 'Čeka'} →</span>
              </Link>
            </li>
          })}</ul>}
      </section>
    })}
  </>
}
