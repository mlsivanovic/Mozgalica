// Lista kvizova admina
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listajKvizove, obrisiKviz } from '../../lib/api'
import { formatDatum } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import type { Kviz } from '../../types/db'
import { BedzDodeleKviza } from './FiksnoDete'

export function KvizoviLista() {
  const navigate = useNavigate()
  const [ucitava, setUcitava] = useState(true)
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])
  const [greska, setGreska] = useState<string | null>(null)

  async function ucitaj() {
    setUcitava(true)
    try {
      setKvizovi(await listajKvizove())
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { ucitaj() }, [])

  async function obrisi(id: string) {
    if (!confirm('Obrisati ovaj kviz i sve povezane linkove i rezultate?')) return
    try {
      await obrisiKviz(id)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  if (ucitava) return <Loader />

  return (
    <div>
      <div className="zaglavlje-strane">
        <h1>Kvizovi</h1>
        <button type="button" className="dugme dugme--akcenat" onClick={() => navigate('/admin/kvizovi/novi')}>
          + Novi kviz
        </button>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      {kvizovi.length === 0 ? (
        <p className="blago">Još nema kreiranih kvizova.</p>
      ) : (
        <div className="mreza-kartica">
          {kvizovi.map((k) => (
            <div key={k.id} className="kartica">
              <h2>{k.title}</h2>
              <div className="razmak-gore">
                <BedzDodeleKviza fixedChildName={k.fixed_child_name} />
              </div>
              {k.description && <p className="blago malo">{k.description}</p>}
              <p className="malo blago razmak-gore">Napravljen: {formatDatum(k.created_at)}</p>
              <div className="red razmak-gore">
                <Link to={`/admin/kvizovi/${k.id}`} className="dugme dugme--senka dugme--malo">Otvori</Link>
                <button type="button" className="dugme dugme--opasno dugme--malo" onClick={() => obrisi(k.id)}>Obriši</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
