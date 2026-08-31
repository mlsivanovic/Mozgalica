import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Ikona, type ImeIkone } from './Ikona'
import { Maskota } from './Maskota'

export function IkonaDugme({ ime, oznaka, className = '', ...props }: {
  ime: ImeIkone
  oznaka: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`ui-ikona-dugme ${className}`} aria-label={oznaka} title={oznaka} {...props}><Ikona ime={ime} /></button>
}

export function PraznoStanje({ naslov, opis, akcija }: {
  naslov: string
  opis: string
  akcija?: ReactNode
}) {
  return <div className="ui-prazno"><Maskota stanje="prazno" /><h3>{naslov}</h3><p>{opis}</p>{akcija}</div>
}

export function Skeleton({ visina = 96, className = '' }: { visina?: number, className?: string }) {
  return <span className={`ui-skeleton ${className}`} style={{ height: visina }} aria-hidden="true" />
}

export function StatusIkona({ vrsta, children }: {
  vrsta: 'uspeh' | 'upozorenje' | 'greska' | 'neutralno'
  children: ReactNode
}) {
  const ikona = vrsta === 'uspeh' ? 'gotovo' : vrsta === 'upozorenje' || vrsta === 'greska' ? 'upozorenje' : 'sacuvano'
  return <span className={`ui-status ui-status--${vrsta}`}><Ikona ime={ikona} velicina={18} />{children}</span>
}
