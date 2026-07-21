// Forma za ručno kreiranje/izmenu pitanja — polja zavise od izabranog tipa
import { useState } from 'react'
import { sacuvajPitanje, type NovoPitanje } from '../../lib/api'
import { grupisiOblastiPoPredmetu } from '../../lib/predmet'
import type { MatchingOpcije, Oblast, Opcija, Pitanje, Predmet, Tezina, TipPitanja } from '../../types/db'
import { NAZIVI_PREDMETA, NAZIVI_TEZINA, NAZIVI_TIPOVA } from '../../types/db'

interface Props {
  oblasti: Oblast[]
  predmet?: Predmet
  pitanje: Pitanje | null
  onSacuvano: () => void
  onOtkazano: () => void
}

let brojac = 0
function noviId() { return `o${++brojac}_${Date.now()}` }

export function PitanjeForma({ oblasti, predmet, pitanje, onSacuvano, onOtkazano }: Props) {
  // Kad je predmet poznat (aktivan tab u banci), prikazuju se samo njegove teme —
  // matematika i srpski se nikad ne mešaju u istoj formi. Bez predmeta (npr. buduća
  // upotreba forme van tabova) padaju sve teme grupisane po predmetu.
  const vidljiveOblasti = predmet ? oblasti.filter((o) => o.subject === predmet) : oblasti
  const [type, setType] = useState<TipPitanja>(pitanje?.type ?? 'single')
  const [topicId, setTopicId] = useState(pitanje?.topic_id ?? vidljiveOblasti[0]?.id ?? '')
  const [difficulty, setDifficulty] = useState<Tezina>(pitanje?.difficulty ?? 3)
  const [text, setText] = useState(pitanje?.text ?? '')
  const [explanation, setExplanation] = useState(pitanje?.explanation ?? '')
  const [hint, setHint] = useState(pitanje?.hint ?? '')
  const [points, setPoints] = useState(pitanje?.points ?? 1)
  const [rucnoOcenjivanje, setRucnoOcenjivanje] = useState(pitanje?.manual_review ?? false)

  // single/multi
  const [opcije, setOpcije] = useState<Opcija[]>(
    (type === 'single' || type === 'multi') && pitanje?.options ? (pitanje.options as Opcija[]) : [
      { id: noviId(), text: '' }, { id: noviId(), text: '' },
    ],
  )
  const [tacneId, setTacneId] = useState<string[]>(() => {
    if (!pitanje) return []
    if (pitanje.type === 'single') return [(pitanje.correct as { optionId: string }).optionId]
    if (pitanje.type === 'multi') return (pitanje.correct as { optionIds: string[] }).optionIds
    return []
  })

  // numeric
  const [brojVrednost, setBrojVrednost] = useState(
    pitanje?.type === 'numeric' ? String((pitanje.correct as { value: number }).value) : '',
  )
  // text
  const [prihvaceni, setPrihvaceni] = useState<string[]>(
    pitanje?.type === 'text' ? (pitanje.correct as { accept: string[] }).accept : [''],
  )
  // truefalse
  const [tacnoNetacno, setTacnoNetacno] = useState(
    pitanje?.type === 'truefalse' ? (pitanje.correct as { value: boolean }).value : true,
  )
  // matching
  const [levo, setLevo] = useState<Opcija[]>(
    pitanje?.type === 'matching' ? (pitanje.options as MatchingOpcije).left : [{ id: noviId(), text: '' }, { id: noviId(), text: '' }],
  )
  const [desno, setDesno] = useState<Opcija[]>(
    pitanje?.type === 'matching' ? (pitanje.options as MatchingOpcije).right : [{ id: noviId(), text: '' }, { id: noviId(), text: '' }],
  )
  const [parovi, setParovi] = useState<Record<string, string>>(
    pitanje?.type === 'matching' ? (pitanje.correct as { pairs: Record<string, string> }).pairs : {},
  )

  const [greska, setGreska] = useState<string | null>(null)
  const [cuva, setCuva] = useState(false)

  function validiraj(): string | null {
    if (!topicId) return 'Izaberi oblast.'
    if (text.trim().length < 3) return 'Unesi tekst pitanja.'
    if ((type === 'single' || type === 'multi')) {
      const popunjene = opcije.filter((o) => o.text.trim() !== '')
      if (popunjene.length < 2) return 'Unesi bar dve ponuđene opcije.'
      if (tacneId.length === 0) return 'Označi tačan odgovor.'
    }
    if (type === 'numeric' && brojVrednost.trim() === '') return 'Unesi tačan brojčani odgovor.'
    // Kod ručnog ocenjivanja je prihvaćen odgovor samo opcioni orijentir za administratora
    if (type === 'text' && !rucnoOcenjivanje && prihvaceni.every((p) => p.trim() === '')) return 'Unesi bar jedan prihvaćen odgovor.'
    if (type === 'matching') {
      const validLevo = levo.filter((o) => o.text.trim() !== '')
      const validDesno = desno.filter((o) => o.text.trim() !== '')
      if (validLevo.length < 2 || validDesno.length < 2) return 'Unesi bar dva pojma sa svake strane.'
      if (validLevo.some((o) => !parovi[o.id])) return 'Poveži svaki pojam sa leve strane.'
    }
    return null
  }

  async function posalji() {
    const err = validiraj()
    if (err) { setGreska(err); return }
    setGreska(null)
    setCuva(true)
    try {
      let options: Pitanje['options'] = null
      let correct: Pitanje['correct']
      if (type === 'single') {
        options = opcije.filter((o) => o.text.trim() !== '')
        correct = { optionId: tacneId[0] }
      } else if (type === 'multi') {
        options = opcije.filter((o) => o.text.trim() !== '')
        correct = { optionIds: tacneId }
      } else if (type === 'numeric') {
        correct = { value: Number(brojVrednost.replace(',', '.')) }
      } else if (type === 'text') {
        correct = { accept: prihvaceni.map((p) => p.trim()).filter(Boolean) }
      } else if (type === 'truefalse') {
        correct = { value: tacnoNetacno }
      } else {
        const validLevo = levo.filter((o) => o.text.trim() !== '')
        const validDesno = desno.filter((o) => o.text.trim() !== '')
        options = { left: validLevo, right: validDesno }
        correct = { pairs: parovi }
      }

      const novo: NovoPitanje = {
        topic_id: topicId, type, difficulty, text: text.trim(), options, correct,
        explanation: explanation.trim() || null, hint: hint.trim() || null, points,
        source: pitanje?.source ?? 'manual', gen_signature: pitanje?.gen_signature ?? null,
        // Tačno/netačno se uvek ocenjuje automatski, bez obzira na stanje čekboksa
        manual_review: type === 'truefalse' ? false : rucnoOcenjivanje,
      }
      await sacuvajPitanje(novo, pitanje?.id)
      onSacuvano()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuva(false)
    }
  }

  return (
    <div>
      <div className="red-polja">
        <div className="polje">
          <label htmlFor="pf-tip">Tip pitanja</label>
          <select id="pf-tip" value={type} onChange={(e) => setType(e.target.value as TipPitanja)}>
            {Object.entries(NAZIVI_TIPOVA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="polje">
          <label htmlFor="pf-oblast">Oblast</label>
          <select id="pf-oblast" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            {predmet
              ? vidljiveOblasti.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)
              : grupisiOblastiPoPredmetu(oblasti).map((g) => (
                <optgroup key={g.predmet} label={NAZIVI_PREDMETA[g.predmet]}>
                  {g.oblasti.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </optgroup>
              ))}
          </select>
        </div>
        <div className="polje">
          <label htmlFor="pf-tezina">Težina</label>
          <select id="pf-tezina" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as Tezina)}>
            {Object.entries(NAZIVI_TEZINA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="polje">
        <label htmlFor="pf-tekst">Tekst pitanja</label>
        <textarea id="pf-tekst" value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <label className="stiklir razmak-dole">
        <input
          type="checkbox" checked={type === 'truefalse' ? false : rucnoOcenjivanje}
          disabled={type === 'truefalse'}
          onChange={(e) => setRucnoOcenjivanje(e.target.checked)}
        />
        Ručno ocenjivanje (pregleda administrator)
        {type === 'truefalse' && <span className="malo blago"> — tačno/netačno se uvek ocenjuje automatski</span>}
      </label>

      {(type === 'single' || type === 'multi') && (
        <div className="polje">
          <label>Ponuđeni odgovori (označi {type === 'single' ? 'tačan' : 'tačne'})</label>
          {opcije.map((o) => (
            <div key={o.id} className="red razmak-dole">
              <input
                type={type === 'single' ? 'radio' : 'checkbox'} name="tacan-pf"
                checked={tacneId.includes(o.id)}
                onChange={() => setTacneId(type === 'single' ? [o.id] : tacneId.includes(o.id) ? tacneId.filter((x) => x !== o.id) : [...tacneId, o.id])}
              />
              <input
                type="text" value={o.text} style={{ flex: 1 }}
                onChange={(e) => setOpcije(opcije.map((x) => x.id === o.id ? { ...x, text: e.target.value } : x))}
              />
              {opcije.length > 2 && (
                <button type="button" className="dugme dugme--opasno dugme--malo" onClick={() => setOpcije(opcije.filter((x) => x.id !== o.id))}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setOpcije([...opcije, { id: noviId(), text: '' }])}>
            + Dodaj opciju
          </button>
        </div>
      )}

      {type === 'numeric' && (
        <div className="polje">
          <label htmlFor="pf-broj">Tačan brojčani odgovor</label>
          <input id="pf-broj" type="text" inputMode="numeric" value={brojVrednost} onChange={(e) => setBrojVrednost(e.target.value)} />
        </div>
      )}

      {type === 'text' && (
        <div className="polje">
          <label>
            {rucnoOcenjivanje
              ? 'Referentni/model odgovor (opciono — vidi ga administrator pri ocenjivanju)'
              : 'Prihvaćeni odgovori (svi se smatraju tačnim)'}
          </label>
          {prihvaceni.map((p, i) => (
            <div key={i} className="red razmak-dole">
              <input
                type="text" value={p} style={{ flex: 1 }}
                onChange={(e) => setPrihvaceni(prihvaceni.map((x, j) => j === i ? e.target.value : x))}
              />
              {prihvaceni.length > 1 && (
                <button type="button" className="dugme dugme--opasno dugme--malo" onClick={() => setPrihvaceni(prihvaceni.filter((_, j) => j !== i))}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setPrihvaceni([...prihvaceni, ''])}>
            + Dodaj varijantu odgovora
          </button>
        </div>
      )}

      {type === 'truefalse' && (
        <div className="polje">
          <label>Tačan odgovor</label>
          <div className="red">
            <label className="stiklir">
              <input type="radio" name="tn-pf" checked={tacnoNetacno} onChange={() => setTacnoNetacno(true)} /> Tačno
            </label>
            <label className="stiklir">
              <input type="radio" name="tn-pf" checked={!tacnoNetacno} onChange={() => setTacnoNetacno(false)} /> Netačno
            </label>
          </div>
        </div>
      )}

      {type === 'matching' && (
        <div className="polje">
          <label>Pojmovi i njihovi parovi</label>
          {levo.map((l, i) => (
            <div key={l.id} className="red razmak-dole">
              <input
                type="text" placeholder="Pojam" value={l.text} style={{ flex: 1 }}
                onChange={(e) => setLevo(levo.map((x) => x.id === l.id ? { ...x, text: e.target.value } : x))}
              />
              <select
                value={parovi[l.id] ?? ''}
                onChange={(e) => setParovi({ ...parovi, [l.id]: e.target.value })}
              >
                <option value="">— par —</option>
                {desno.map((d) => <option key={d.id} value={d.id}>{d.text || `Par ${desno.indexOf(d) + 1}`}</option>)}
              </select>
              <input
                type="text" placeholder="Vrednost para" value={desno[i]?.text ?? ''}
                onChange={(e) => setDesno(desno.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
              />
            </div>
          ))}
          <button
            type="button" className="dugme dugme--senka dugme--malo"
            onClick={() => { setLevo([...levo, { id: noviId(), text: '' }]); setDesno([...desno, { id: noviId(), text: '' }]) }}
          >
            + Dodaj par
          </button>
        </div>
      )}

      <div className="red-polja">
        <div className="polje">
          <label htmlFor="pf-poeni">Poeni</label>
          <input id="pf-poeni" type="number" min={1} max={100} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
        </div>
      </div>

      <div className="polje">
        <label htmlFor="pf-objasnjenje">Objašnjenje tačnog rešenja</label>
        <textarea id="pf-objasnjenje" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </div>

      <div className="polje">
        <label htmlFor="pf-hint">Savet / hint (opciono)</label>
        <input id="pf-hint" type="text" value={hint} onChange={(e) => setHint(e.target.value)} />
      </div>

      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

      <div className="red red--kraj">
        <button type="button" className="dugme dugme--senka" onClick={onOtkazano}>Otkaži</button>
        <button type="button" className="dugme" disabled={cuva} onClick={posalji}>
          {cuva ? 'Čuvam…' : 'Sačuvaj'}
        </button>
      </div>
    </div>
  )
}
