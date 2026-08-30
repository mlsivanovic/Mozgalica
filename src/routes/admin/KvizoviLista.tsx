// Aktivni i automatski arhivirani kvizovi administratora.
import { useSearchParams } from 'react-router-dom'
import { useRoditelj } from '../../lib/roditelj'
import { supabase } from '../../lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import { RoditeljskiLink as Link, useRoditeljskiNavigate as useNavigate } from '../../lib/roditelj'
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
  const { deteId } = useRoditelj()
  const [params,setParams] = useSearchParams()
  const prikaz = (params.get('prikaz') ?? 'aktivni') as PrikazKvizova
  const setPrikaz = (v: PrikazKvizova) => setParams(p => {p.set('prikaz',v);return p})
  const [dodele,setDodele] = useState<Array<{quiz_id:string; child_profile_id:string|null}>>([])
  const [greska, setGreska] = useState<string | null>(null)

  async function ucitaj() {
    setUcitava(true)
    setGreska(null)
    try {
      const [ucitaniKvizovi, ucitaniStatusi, ucitaniRasporedi] = await Promise.all([
        listajKvizove(), listajStatuseArhiveKvizova(), listajDnevneRasporedeKvizova(),
      ])
      const { data: veze, error: greskaVeza } = await supabase().from('quiz_links').select('quiz_id,child_profile_id')
      if(greskaVeza) throw greskaVeza
      setDodele(veze ?? [])
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
  useEffect(() => { if (prikaz === 'rasporedi') navigate('/admin/vezbanje/rasporedi', { replace: true }) }, [prikaz, navigate])

  const { aktivni, arhivirani } = useMemo(
    () => podeliKvizove(kvizovi.filter(k => !deteId || dodele.some(d => d.quiz_id === k.id && d.child_profile_id === deteId)), statusi),
    [kvizovi, statusi, deteId, dodele],
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
  if (greska && kvizovi.length === 0) return <div className="poruka poruka--greska" role="alert">{greska}<button className="dugme" onClick={() => void ucitaj()}>Pokušaj ponovo</button></div>

  const prikazaniAktivni = prikaz === 'aktivni' ? aktivni : []
  const prikazaniArhivirani = prikaz === 'arhiva' ? arhivirani : []
  const nemaPrikazanih = prikazaniAktivni.length === 0 && prikazaniArhivirani.length === 0

  return (
    <div>
      <div className="zaglavlje-strane">
        <h2>Kvizovi i arhiva</h2>
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
          onClick={() => navigate('/admin/vezbanje/rasporedi')}
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
        <details><summary>Radnje</summary><button
          type="button"
          className="dugme dugme--senka dugme--malo"
          onClick={() => { void onObrisi(kviz.id) }}
        >
          Obriši
        </button></details>
      </div>
    </article>
  )
}
