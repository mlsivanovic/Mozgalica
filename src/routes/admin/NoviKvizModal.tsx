import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Zajednicke'
import type { FiksnoImeDeteta } from '../../types/db'
import { IzborFiksnogDeteta } from './FiksnoDete'

export interface NoviKvizPodaci {
  naziv: string
  fixedChildName: FiksnoImeDeteta | null
}

interface Props {
  naslov?: string
  pocetniNaziv?: string
  potvrdaTekst?: string
  onPotvrdi: (podaci: NoviKvizPodaci) => Promise<void>
  onZatvori: () => void
}

export function NoviKvizModal({
  naslov = 'Novi kviz', pocetniNaziv = '', potvrdaTekst = 'Napravi kviz', onPotvrdi, onZatvori,
}: Props) {
  const [naziv, setNaziv] = useState(pocetniNaziv)
  const [fixedChildName, setFixedChildName] = useState<FiksnoImeDeteta | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [cuva, setCuva] = useState(false)

  async function potvrdi(e: FormEvent) {
    e.preventDefault()
    if (naziv.trim().length < 2) {
      setGreska('Unesi naziv kviza.')
      return
    }

    setCuva(true)
    setGreska(null)
    try {
      await onPotvrdi({ naziv: naziv.trim(), fixedChildName })
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuva(false)
    }
  }

  return (
    <Modal naslov={naslov} onZatvori={() => { if (!cuva) onZatvori() }}>
      <form onSubmit={potvrdi}>
        <div className="polje">
          <label htmlFor="novi-kviz-naziv">Naziv kviza</label>
          <input
            id="novi-kviz-naziv" type="text" autoFocus value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            placeholder="npr. Množenje — leto 2026"
          />
        </div>
        <IzborFiksnogDeteta value={fixedChildName} onChange={setFixedChildName} />
        {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
        <div className="red razmak-gore">
          <button type="submit" className="dugme dugme--akcenat" disabled={cuva}>
            {cuva ? 'Pravim…' : potvrdaTekst}
          </button>
          <button type="button" className="dugme dugme--senka" disabled={cuva} onClick={onZatvori}>
            Otkaži
          </button>
        </div>
      </form>
    </Modal>
  )
}
