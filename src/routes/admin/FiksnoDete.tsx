import { useId } from 'react'
import type { FiksnoImeDeteta } from '../../types/db'

interface IzborFiksnogDetetaProps {
  value: FiksnoImeDeteta | null
  onChange: (value: FiksnoImeDeteta | null) => void
  disabled?: boolean
  prikaziObjasnjenje?: boolean
}

function nazivDodeleKviza(fixedChildName: FiksnoImeDeteta | null): string {
  return fixedChildName
    ? `Za ${fixedChildName === 'Andrej' ? 'Andreja' : 'Filipa'}`
    : 'Slobodan unos imena'
}

export function IzborFiksnogDeteta({
  value, onChange, disabled = false, prikaziObjasnjenje = true,
}: IzborFiksnogDetetaProps) {
  const id = useId()

  return (
    <div className="polje">
      <label htmlFor={id}>Kome je kviz namenjen</label>
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const novoIme = e.target.value
          onChange(novoIme === 'Andrej' || novoIme === 'Filip' ? novoIme : null)
        }}
      >
        <option value="">Bez fiksnog imena</option>
        <option value="Andrej">Andrej</option>
        <option value="Filip">Filip</option>
      </select>
      {prikaziObjasnjenje && (
        <p className="malo blago">
          Kod dodeljenog kviza dete ne unosi ime. Bez dodele, ime se unosi pri otvaranju kviza.
        </p>
      )}
    </div>
  )
}

export function BedzDodeleKviza({ fixedChildName }: { fixedChildName: FiksnoImeDeteta | null }) {
  return (
    <span className={`bedz ${fixedChildName ? 'bedz--uspeh' : 'bedz--neutral'}`}>
      {nazivDodeleKviza(fixedChildName)}
    </span>
  )
}
