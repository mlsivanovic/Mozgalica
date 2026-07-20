// Prikaz jednog pitanja sa unosom odgovora — deli ga dečji kviz i admin pregled.
// Kontrolisana komponenta: value/onChange, disabled za pregled rezultata.
import type { MatchingOpcije, OdgovorDeteta, Opcija, TipPitanja } from '../../types/db'
import type { PitanjeZaDete } from '../../types/kviz'
import './pitanja.css'

export interface PitanjeProps {
  pitanje: Pick<PitanjeZaDete, 'id' | 'type' | 'text' | 'options'>
  value: OdgovorDeteta
  onChange: (novi: OdgovorDeteta) => void
  disabled?: boolean
}

export function PitanjeRenderer(props: PitanjeProps) {
  switch (props.pitanje.type as TipPitanja) {
    case 'single': return <JedanIzbor {...props} />
    case 'multi': return <ViseIzbora {...props} />
    case 'numeric': return <UnosBroja {...props} />
    case 'text': return <UnosTeksta {...props} />
    case 'truefalse': return <TacnoNetacno {...props} />
    case 'matching': return <Uparivanje {...props} />
    default: return <p className="poruka poruka--greska">Nepoznat tip pitanja.</p>
  }
}

function JedanIzbor({ pitanje, value, onChange, disabled }: PitanjeProps) {
  const opcije = (pitanje.options as Opcija[]) ?? []
  const izabrano = (value as { optionId?: string } | null)?.optionId ?? null
  return (
    <div className="opcije" role="radiogroup" aria-label="Ponuđeni odgovori">
      {opcije.map((o) => (
        <label key={o.id} className={`opcija ${izabrano === o.id ? 'opcija--izabrana' : ''}`}>
          <input
            type="radio" name={`p-${pitanje.id}`} value={o.id} disabled={disabled}
            checked={izabrano === o.id}
            onChange={() => onChange({ optionId: o.id })}
          />
          <span>{o.text}</span>
        </label>
      ))}
    </div>
  )
}

function ViseIzbora({ pitanje, value, onChange, disabled }: PitanjeProps) {
  const opcije = (pitanje.options as Opcija[]) ?? []
  const izabrani = (value as { optionIds?: string[] } | null)?.optionIds ?? []
  const preklopi = (id: string) => {
    const novi = izabrani.includes(id) ? izabrani.filter((x) => x !== id) : [...izabrani, id]
    onChange({ optionIds: novi })
  }
  return (
    <div className="opcije" role="group" aria-label="Ponuđeni odgovori (više tačnih)">
      <p className="malo blago">Izaberi sve tačne odgovore.</p>
      {opcije.map((o) => (
        <label key={o.id} className={`opcija ${izabrani.includes(o.id) ? 'opcija--izabrana' : ''}`}>
          <input
            type="checkbox" value={o.id} disabled={disabled}
            checked={izabrani.includes(o.id)}
            onChange={() => preklopi(o.id)}
          />
          <span>{o.text}</span>
        </label>
      ))}
    </div>
  )
}

function UnosBroja({ pitanje, value, onChange, disabled }: PitanjeProps) {
  const trenutno = (value as { value?: string } | null)?.value ?? ''
  return (
    <div className="polje">
      <label htmlFor={`broj-${pitanje.id}`}>Upiši odgovor (broj):</label>
      <input
        id={`broj-${pitanje.id}`} type="text" inputMode="numeric" autoComplete="off"
        className="unos-broja" disabled={disabled} value={trenutno}
        onChange={(e) => {
          const očišćeno = e.target.value.replace(/[^0-9.,-]/g, '')
          onChange(očišćeno === '' ? null : { value: očišćeno })
        }}
        placeholder="npr. 42"
      />
    </div>
  )
}

function UnosTeksta({ pitanje, value, onChange, disabled }: PitanjeProps) {
  const trenutno = (value as { text?: string } | null)?.text ?? ''
  return (
    <div className="polje">
      <label htmlFor={`tekst-${pitanje.id}`}>Upiši odgovor:</label>
      <input
        id={`tekst-${pitanje.id}`} type="text" autoComplete="off" maxLength={120}
        disabled={disabled} value={trenutno}
        onChange={(e) => onChange(e.target.value === '' ? null : { text: e.target.value })}
      />
    </div>
  )
}

function TacnoNetacno({ pitanje, value, onChange, disabled }: PitanjeProps) {
  const izabrano = (value as { value?: boolean } | null)?.value ?? null
  return (
    <div className="opcije opcije--red" role="radiogroup" aria-label="Tačno ili netačno">
      {([[true, '✔ Tačno'], [false, '✘ Netačno']] as const).map(([v, tekst]) => (
        <label key={String(v)} className={`opcija opcija--pola ${izabrano === v ? 'opcija--izabrana' : ''}`}>
          <input
            type="radio" name={`p-${pitanje.id}`} disabled={disabled}
            checked={izabrano === v}
            onChange={() => onChange({ value: v })}
          />
          <span>{tekst}</span>
        </label>
      ))}
    </div>
  )
}

function Uparivanje({ pitanje, value, onChange, disabled }: PitanjeProps) {
  const opcije = pitanje.options as MatchingOpcije | null
  if (!opcije?.left || !opcije?.right) return <p className="poruka poruka--greska">Pitanje nema parove.</p>
  const parovi = (value as { pairs?: Record<string, string> } | null)?.pairs ?? {}
  const postavi = (levoId: string, desnoId: string) => {
    const novi = { ...parovi }
    if (desnoId === '') delete novi[levoId]
    else novi[levoId] = desnoId
    onChange(Object.keys(novi).length === 0 ? null : { pairs: novi })
  }
  return (
    <div className="uparivanje">
      <p className="malo blago">Za svaki pojam sa leve strane izaberi par sa desne.</p>
      {opcije.left.map((levo) => (
        <div key={levo.id} className="uparivanje-red">
          <span className="uparivanje-levo">{levo.text}</span>
          <select
            aria-label={`Par za: ${levo.text}`} disabled={disabled}
            value={parovi[levo.id] ?? ''}
            onChange={(e) => postavi(levo.id, e.target.value)}
          >
            <option value="">— izaberi —</option>
            {opcije.right.map((desno) => (
              <option key={desno.id} value={desno.id}>{desno.text}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

// Da li je odgovor „prazan" (pitanje se računa kao neodgovoreno)
export function odgovorJePrazan(value: OdgovorDeteta): boolean {
  if (value == null) return true
  if ('optionId' in value) return value.optionId == null
  if ('optionIds' in value) return value.optionIds.length === 0
  if ('text' in value) return value.text.trim() === ''
  if ('pairs' in value) return Object.keys(value.pairs).length === 0
  if ('value' in value) return value.value == null || value.value === ''
  return true
}
