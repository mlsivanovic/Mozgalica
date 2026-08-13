// Aktivni i automatski arhivirani kvizovi administratora.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  listajDnevneRasporedeKvizova, listajKvizove, listajStatuseArhiveKvizova, obrisiKviz,
  type StatusArhiveKviza,
} from '../../lib/api'
import { podeliKvizove, type ArhiviraniKviz } from '../../lib/arhivaKvizova'
import { formatDatum } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import type { DnevniRasporedKviza, Kviz } from '../../types/db'
import { DnevniRasporedi } from './DnevniRasporedi'

type PrikazKvizova = 'aktivni' | 'arhiva' | 'rasporedi'

export function KvizoviLista() {
  const navigate = useNavigate()
  const [ucitava, setUcitava] = useState(true)
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])
  const [statusi, setStatusi] = useState<StatusArhiveKviza[]>([])
  const [rasporedi, setRasporedi] = useState<DnevniRasporedKviza[]>([])
  const [prikaz, setPrikaz] = useState<PrikazKvizova>('aktivni')
  const [greska, setGreska] = useState<string | null>(null)

  async function ucitaj() {
    setUcitava(true)
    setGreska(null)
    try {
      const [ucitaniKvizovi, ucitaniStatusi, ucitaniRasporedi] = await Promise.all([
        listajKvizove(), listajStatuseArhiveKvizova(), listajDnevneRasporedeKvizova(),
      ])
      setKvizovi(ucitaniKvizovi)
      setStatusi(ucitaniStatusi)
      setRasporedi(ucitaniRasporedi)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { void ucitaj() }, [])

  const { aktivni, arhivirani } = useMemo(
    () => podeliKvizove(kvizovi, statusi),
    [kvizovi, statusi],
  )

  async function obrisi(id: string) {
    if (!confirm(
      'Ukloniti ovaj kviz? Rezultati, osvojene zvezdice i istorija deteta ostaće sačuvani.',
    )) return
    try {
      await obrisiKviz(id)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  if (ucitava) return <Loader />

  const prikazaniAktivni = prikaz === 'aktivni' ? aktivni : []
  const prikazaniArhivirani = prikaz === 'arhiva' ? arhivirani : []
  const nemaPrikazanih = prikazaniAktivni.length === 0 && prikazaniArhivirani.length === 0

  return (
    <div>
      <div className="zaglavlje-strane">
        <h1>Kvizovi</h1>
        <button type="button" className="dugme dugme--akcenat" onClick={() => navigate('/admin/kvizovi/novi')}>
          + Novi kviz
        </button>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <div className="red razmak-dole" role="group" aria-label="Prikaz kvizova">
        <button
          type="button"
          className={`dugme ${prikaz === 'aktivni' ? '' : 'dugme--senka'}`}
          aria-pressed={prikaz === 'aktivni'}
          onClick={() => setPrikaz('aktivni')}
        >
          Aktivni <span className="bedz">{aktivni.length}</span>
        </button>
        <button
          type="button"
          className={`dugme ${prikaz === 'arhiva' ? '' : 'dugme--senka'}`}
          aria-pressed={prikaz === 'arhiva'}
          onClick={() => setPrikaz('arhiva')}
        >
          Arhiva <span className="bedz">{arhivirani.length}</span>
        </button>
        <button
          type="button"
          className={`dugme ${prikaz === 'rasporedi' ? '' : 'dugme--senka'}`}
          aria-pressed={prikaz === 'rasporedi'}
          onClick={() => setPrikaz('rasporedi')}
        >
          Dnevni rasporedi <span className="bedz">{rasporedi.length}</span>
        </button>
      </div>

      {prikaz === 'rasporedi' ? (
        <DnevniRasporedi rasporedi={rasporedi} onPromena={ucitaj} />
      ) : nemaPrikazanih ? (
        <p className="blago">
          {prikaz === 'aktivni'
            ? 'Nema aktivnih kvizova.'
            : 'Arhiva je prazna. Završeni kvizovi prelaze ovde narednog dana.'}
        </p>
      ) : (
        <div className="mreza-kartica">
          {prikazaniAktivni.map((kviz) => (
            <KvizKartica key={kviz.id} kviz={kviz} onObrisi={obrisi} />
          ))}
          {prikazaniArhivirani.map((stavka) => (
            <KvizKartica
              key={stavka.kviz.id}
              kviz={stavka.kviz}
              arhiviran={stavka}
              onObrisi={obrisi}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function KvizKartica({
  kviz, arhiviran, onObrisi,
}: {
  kviz: Kviz
  arhiviran?: ArhiviraniKviz
  onObrisi: (id: string) => Promise<void>
}) {
  return (
    <article className="kartica">
      {arhiviran && <span className="bedz bedz--neutral razmak-dole">Arhiviran</span>}
      <h2>{kviz.title}</h2>
      {kviz.description && <p className="blago malo">{kviz.description}</p>}
      <p className="malo blago razmak-gore">
        Kreiran: <time dateTime={kviz.created_at}>{formatDatum(kviz.created_at)}</time>
      </p>
      {arhiviran && (
        <p className="malo blago">
          Završen: <time dateTime={arhiviran.zavrsen_at}>{formatDatum(arhiviran.zavrsen_at)}</time>
        </p>
      )}
      <div className="red razmak-gore">
        <Link to={`/admin/kvizovi/${kviz.id}`} className="dugme dugme--senka dugme--malo">
          Otvori
        </Link>
        <button
          type="button"
          className="dugme dugme--opasno dugme--malo"
          onClick={() => { void onObrisi(kviz.id) }}
        >
          Obriši
        </button>
      </div>
    </article>
  )
}
