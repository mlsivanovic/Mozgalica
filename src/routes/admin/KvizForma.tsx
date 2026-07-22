// Brzo kreiranje novog kviza — detaljna podešavanja i izbor pitanja rade se
// odmah zatim na strani KvizDetalj
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sacuvajKviz } from '../../lib/api'
import type { FiksnoImeDeteta } from '../../types/db'
import { IzborFiksnogDeteta } from './FiksnoDete'

export function KvizForma() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fixedChildName, setFixedChildName] = useState<FiksnoImeDeteta | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [cuva, setCuva] = useState(false)

  async function napravi() {
    if (title.trim().length < 2) { setGreska('Unesi naziv kviza.'); return }
    setGreska(null)
    setCuva(true)
    try {
      const id = await sacuvajKviz({
        title: title.trim(), description: description.trim() || null, time_limit_seconds: null,
        default_max_attempts: 1, shuffle_questions: true, shuffle_answers: true,
        show_result: true, show_correct: true, pass_threshold_pct: 90,
        require_name: true, fixed_child_name: fixedChildName,
        require_label: false, label_name: 'Odeljenje',
      })
      navigate(`/admin/kvizovi/${id}`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuva(false)
    }
  }

  return (
    <div className="sadrzaj--usko">
      <h1>Novi kviz</h1>
      <div className="kartica">
        <div className="polje">
          <label htmlFor="kv-naziv">Naziv kviza</label>
          <input id="kv-naziv" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="npr. Množenje — leto 2026" />
        </div>
        <div className="polje">
          <label htmlFor="kv-opis">Poruka detetu (opciono)</label>
          <textarea id="kv-opis" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Srećno rešavanje! 🌟" />
        </div>
        <IzborFiksnogDeteta value={fixedChildName} onChange={setFixedChildName} />
        {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
        <button type="button" className="dugme dugme--akcenat" disabled={cuva} onClick={napravi}>
          {cuva ? 'Pravim…' : 'Napravi kviz i nastavi'}
        </button>
        <p className="malo blago razmak-gore">
          Detaljna podešavanja, izbor pitanja i linkovi za decu podešavaju se na sledećem koraku.
        </p>
      </div>
    </div>
  )
}
