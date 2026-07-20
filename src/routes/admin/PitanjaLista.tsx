// Banka pitanja: filteri + tabela + CRUD
import { useEffect, useMemo, useState } from 'react'
import { listajOblasti, listajPitanja, obrisiPitanje, ucitajPocetnaPitanja } from '../../lib/api'
import { Loader, Modal } from '../../components/Zajednicke'
import { NAZIVI_TEZINA, NAZIVI_TIPOVA, type Oblast, type Pitanje } from '../../types/db'
import { PitanjeForma } from './PitanjeForma'

export function PitanjaLista() {
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  const [pitanja, setPitanja] = useState<Pitanje[]>([])
  const [filterOblast, setFilterOblast] = useState('')
  const [filterTip, setFilterTip] = useState('')
  const [filterTezina, setFilterTezina] = useState('')
  const [filterIzvor, setFilterIzvor] = useState('')
  const [pretraga, setPretraga] = useState('')
  const [uredjivanje, setUredjivanje] = useState<Pitanje | 'novo' | null>(null)

  async function ucitaj() {
    setUcitava(true)
    try {
      const [o, p] = await Promise.all([
        listajOblasti(),
        listajPitanja({
          topicId: filterOblast || undefined,
          type: filterTip || undefined,
          difficulty: filterTezina ? Number(filterTezina) : undefined,
          source: filterIzvor || undefined,
          pretraga: pretraga || undefined,
        }),
      ])
      setOblasti(o)
      setPitanja(p)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { ucitaj() }, [filterOblast, filterTip, filterTezina, filterIzvor])

  const mapaOblasti = useMemo(() => new Map(oblasti.map((o) => [o.id, o.name])), [oblasti])

  async function obrisi(id: string) {
    if (!confirm('Obrisati ovo pitanje? Ova radnja se ne može poništiti.')) return
    try {
      await obrisiPitanje(id)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  async function ucitajPocetna() {
    if (!confirm('Učitati 30 primera pitanja (po dva za svaku oblast)? Ako ovo već nisi uradio/la, ovo je bezbedno.')) return
    try {
      const broj = await ucitajPocetnaPitanja(oblasti)
      alert(`Dodato je ${broj} početnih pitanja.`)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  return (
    <div>
      <div className="zaglavlje-strane">
        <h1>Banka pitanja</h1>
        <div className="red">
          {pitanja.length === 0 && (
            <button type="button" className="dugme dugme--senka" onClick={ucitajPocetna}>
              Učitaj početna pitanja
            </button>
          )}
          <button type="button" className="dugme dugme--akcenat" onClick={() => setUredjivanje('novo')}>
            + Novo pitanje
          </button>
        </div>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <div className="kartica razmak-dole">
        <div className="red-polja">
          <div className="polje">
            <label htmlFor="f-oblast">Oblast</label>
            <select id="f-oblast" value={filterOblast} onChange={(e) => setFilterOblast(e.target.value)}>
              <option value="">Sve oblasti</option>
              {oblasti.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-tip">Tip pitanja</label>
            <select id="f-tip" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
              <option value="">Svi tipovi</option>
              {Object.entries(NAZIVI_TIPOVA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-tezina">Težina</label>
            <select id="f-tezina" value={filterTezina} onChange={(e) => setFilterTezina(e.target.value)}>
              <option value="">Sve težine</option>
              {Object.entries(NAZIVI_TEZINA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-izvor">Izvor</label>
            <select id="f-izvor" value={filterIzvor} onChange={(e) => setFilterIzvor(e.target.value)}>
              <option value="">Svi</option>
              <option value="manual">Ručno dodato</option>
              <option value="generated">Automatski generisano</option>
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-pretraga">Pretraga teksta</label>
            <input
              id="f-pretraga" type="text" value={pretraga}
              onChange={(e) => setPretraga(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ucitaj()}
              placeholder="Deo teksta pitanja…"
            />
          </div>
        </div>
      </div>

      {ucitava ? <Loader /> : (
        <div className="tabela-omot">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pitanje</th><th>Oblast</th><th>Tip</th><th>Težina</th><th>Poeni</th><th>Izvor</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pitanja.map((p) => (
                <tr key={p.id}>
                  <td style={{ maxWidth: 340 }}>{p.text}</td>
                  <td>{mapaOblasti.get(p.topic_id) ?? '—'}</td>
                  <td>{NAZIVI_TIPOVA[p.type]}</td>
                  <td>{NAZIVI_TEZINA[p.difficulty]}</td>
                  <td>{p.points}</td>
                  <td>
                    <span className={`bedz ${p.source === 'generated' ? 'bedz--upozorenje' : 'bedz--neutral'}`}>
                      {p.source === 'generated' ? 'Generisano' : 'Ručno'}
                    </span>
                  </td>
                  <td className="red">
                    <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setUredjivanje(p)}>
                      Izmeni
                    </button>
                    <button type="button" className="dugme dugme--opasno dugme--malo" onClick={() => obrisi(p.id)}>
                      Obriši
                    </button>
                  </td>
                </tr>
              ))}
              {pitanja.length === 0 && (
                <tr><td colSpan={7} className="centar blago" style={{ padding: '2rem' }}>Nema pitanja za izabrane filtere.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {uredjivanje && (
        <Modal naslov={uredjivanje === 'novo' ? 'Novo pitanje' : 'Izmena pitanja'} onZatvori={() => setUredjivanje(null)}>
          <PitanjeForma
            oblasti={oblasti}
            pitanje={uredjivanje === 'novo' ? null : uredjivanje}
            onSacuvano={() => { setUredjivanje(null); ucitaj() }}
            onOtkazano={() => setUredjivanje(null)}
          />
        </Modal>
      )}
    </div>
  )
}
