// Banka pitanja: filteri + tabela + CRUD + bulk selekcija (dodaj u kviz / novi kviz)
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  dodajPitanjaUKviz, listajKvizove, listajOblasti, listajPitanja, obrisiPitanja, obrisiPitanje,
  postaviPitanjaKviza, sacuvajKviz, ucitajPocetnaPitanja,
} from '../../lib/api'
import { Loader, Modal } from '../../components/Zajednicke'
import { NAZIVI_TEZINA, NAZIVI_TIPOVA, type Kviz, type Oblast, type Pitanje } from '../../types/db'
import { PitanjeForma } from './PitanjeForma'

export function PitanjaLista() {
  const navigate = useNavigate()
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  const [pitanja, setPitanja] = useState<Pitanje[]>([])
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])
  const [filterOblast, setFilterOblast] = useState('')
  const [filterTip, setFilterTip] = useState('')
  const [filterTezina, setFilterTezina] = useState('')
  const [filterIzvor, setFilterIzvor] = useState('')
  const [pretraga, setPretraga] = useState('')
  const [uredjivanje, setUredjivanje] = useState<Pitanje | 'novo' | null>(null)
  const [izabrana, setIzabrana] = useState<string[]>([])
  const [izabraniKviz, setIzabraniKviz] = useState('')
  const [radiBulk, setRadiBulk] = useState(false)

  async function ucitaj() {
    setUcitava(true)
    try {
      const [o, p, k] = await Promise.all([
        listajOblasti(),
        listajPitanja({
          topicId: filterOblast || undefined,
          type: filterTip || undefined,
          difficulty: filterTezina ? Number(filterTezina) : undefined,
          source: filterIzvor || undefined,
          pretraga: pretraga || undefined,
        }),
        listajKvizove(),
      ])
      setOblasti(o)
      setPitanja(p)
      setKvizovi(k)
      setIzabrana([])
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

  function preklopi(id: string) {
    setIzabrana(izabrana.includes(id) ? izabrana.filter((x) => x !== id) : [...izabrana, id])
  }

  function preklopiSve() {
    const sviVidljivi = pitanja.map((p) => p.id)
    const svePrisutne = sviVidljivi.every((id) => izabrana.includes(id))
    setIzabrana(svePrisutne ? [] : sviVidljivi)
  }

  function snapshotIzabranih() {
    return pitanja.filter((p) => izabrana.includes(p.id)).map((p) => ({
      source_question_id: p.id, topic_id: p.topic_id, topic_name: mapaOblasti.get(p.topic_id) ?? '—',
      type: p.type, text: p.text, options: p.options, correct: p.correct,
      explanation: p.explanation, hint: p.hint, points: p.points,
    }))
  }

  async function dodajUKviz() {
    if (!izabraniKviz) { setGreska('Izaberi kviz kome dodaješ pitanja.'); return }
    setGreska(null)
    setRadiBulk(true)
    try {
      await dodajPitanjaUKviz(izabraniKviz, snapshotIzabranih())
      alert(`Dodato je ${izabrana.length} pitanja u kviz.`)
      setIzabrana([])
      setIzabraniKviz('')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadiBulk(false)
    }
  }

  async function obrisiIzabrana() {
    if (!confirm(`Obrisati ${izabrana.length} izabranih pitanja? Ova radnja se ne može poništiti.`)) return
    setGreska(null)
    setRadiBulk(true)
    try {
      await obrisiPitanja(izabrana)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadiBulk(false)
    }
  }

  async function napraviNoviKvizOdIzabranih() {
    const naziv = prompt('Naziv novog kviza?', '')
    if (!naziv || naziv.trim().length < 2) return
    setGreska(null)
    setRadiBulk(true)
    try {
      const kvizId = await sacuvajKviz({
        title: naziv.trim(), description: null, time_limit_seconds: null,
        default_max_attempts: 1, shuffle_questions: true, shuffle_answers: true,
        show_result: true, show_correct: true, pass_threshold_pct: 90,
        require_name: true, require_label: false, label_name: 'Odeljenje',
      })
      const unosi = snapshotIzabranih().map((u, i) => ({ ...u, quiz_id: kvizId, position: i }))
      await postaviPitanjaKviza(kvizId, unosi)
      navigate(`/admin/kvizovi/${kvizId}`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      setRadiBulk(false)
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

      {izabrana.length > 0 && (
        <div className="kartica razmak-dole bulk-traka" style={{ background: 'var(--boja-primarna-svetla)' }}>
          <div className="red red--razmak" style={{ flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 700 }}>{izabrana.length} pitanja izabrano</p>
            <div className="red">
              <select value={izabraniKviz} onChange={(e) => setIzabraniKviz(e.target.value)}>
                <option value="">— izaberi kviz —</option>
                {kvizovi.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
              </select>
              <button type="button" className="dugme dugme--senka dugme--malo" disabled={radiBulk || !izabraniKviz} onClick={dodajUKviz}>
                Dodaj u postojeći kviz
              </button>
              <button type="button" className="dugme dugme--akcenat dugme--malo" disabled={radiBulk} onClick={napraviNoviKvizOdIzabranih}>
                Napravi novi kviz od izabranih
              </button>
              <button type="button" className="dugme dugme--opasno dugme--malo" disabled={radiBulk} onClick={obrisiIzabrana}>
                Obriši izabrana
              </button>
            </div>
          </div>
        </div>
      )}

      {ucitava ? <Loader /> : (
        <div className="tabela-omot">
          <table className="tabela tabela--kartice">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={pitanja.length > 0 && pitanja.every((p) => izabrana.includes(p.id))}
                    onChange={preklopiSve}
                    aria-label="Izaberi sva vidljiva pitanja"
                  />
                </th>
                <th>Pitanje</th><th>Oblast</th><th>Tip</th><th>Težina</th><th>Poeni</th><th>Izvor</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pitanja.map((p) => (
                <tr key={p.id}>
                  <td data-naslov="Izaberi"><input type="checkbox" checked={izabrana.includes(p.id)} onChange={() => preklopi(p.id)} /></td>
                  <td data-naslov="Pitanje" style={{ maxWidth: 340 }}>{p.text}</td>
                  <td data-naslov="Oblast">{mapaOblasti.get(p.topic_id) ?? '—'}</td>
                  <td data-naslov="Tip">{NAZIVI_TIPOVA[p.type]}</td>
                  <td data-naslov="Težina">{NAZIVI_TEZINA[p.difficulty]}</td>
                  <td data-naslov="Poeni">{p.points}</td>
                  <td data-naslov="Izvor">
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
                <tr><td colSpan={8} className="centar blago" style={{ padding: '2rem' }}>Nema pitanja za izabrane filtere.</td></tr>
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
