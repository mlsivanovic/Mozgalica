// Male zajedničke komponente: loader, modal, progres traka, dugme za temu
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { izborTeme, postaviIzborTeme, pratiSistemskuTemu, preklopiTemu, trenutnaTema, type IzborTeme } from '../lib/tema'
import { Ikona } from './Ikona'

export function Loader({ tekst = 'Učitavanje…' }: { tekst?: string }) {
  return (
    <div className="loader-omot" role="status">
      <span className="loader" aria-hidden="true" />
      <span>{tekst}</span>
    </div>
  )
}

export function Modal({
  naslov, onZatvori, children,
}: { naslov: string; onZatvori: () => void; children: ReactNode }) {
  const naslovId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    dialogRef.current?.focus()
    const naTaster = (e: KeyboardEvent) => { if (e.key === 'Escape') onZatvori() }
    window.addEventListener('keydown', naTaster)
    return () => window.removeEventListener('keydown', naTaster)
  }, [onZatvori])
  return (
    <div className="modal-pozadina" onClick={onZatvori} role="presentation">
      <div ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-labelledby={naslovId} onClick={(e) => e.stopPropagation()}>
        <div className="zaglavlje-strane">
          <h2 id={naslovId}>{naslov}</h2>
          <button type="button" className="dugme dugme--senka dugme--malo" onClick={onZatvori}>
            Zatvori
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Dugme za preklapanje svetle/tamne teme. Prati sistemsku temu dok korisnik
// ne izabere svoju (izbor se pamti u localStorage preko src/lib/tema.ts).
export function TemaDugme({ className }: { className?: string } = {}) {
  const [tema, setTema] = useState(trenutnaTema)

  useEffect(() => pratiSistemskuTemu(setTema), [])

  function preklopi() {
    setTema(preklopiTemu())
  }

  return (
    <button
      type="button"
      className={className ?? 'dugme dugme--senka dugme--malo'}
      onClick={preklopi}
      aria-label={tema === 'tamna' ? 'Uključi svetlu temu' : 'Uključi tamnu temu'}
      title={tema === 'tamna' ? 'Svetla tema' : 'Tamna tema'}
    >
      <Ikona ime={tema === 'tamna' ? 'svetla' : 'tamna'} />
    </button>
  )
}

export function TemaIzbor() {
  const [izbor, setIzbor] = useState<IzborTeme>(izborTeme)
  const opcije = [
    ['sistem', 'izgled', 'Sistem'], ['svetla', 'svetla', 'Svetla'], ['tamna', 'tamna', 'Tamna'],
  ] as const
  return <div className="podesavanja-tema" role="radiogroup" aria-label="Tema aplikacije">
    {opcije.map(([vrednost, ikona, naziv]) => <button key={vrednost} type="button" role="radio" aria-checked={izbor === vrednost} className={izbor === vrednost ? 'aktivna' : ''} onClick={() => { setIzbor(vrednost); postaviIzborTeme(vrednost) }}><Ikona ime={ikona} />{naziv}</button>)}
  </div>
}

export function ProgresTraka({ vrednost, ukupno }: { vrednost: number; ukupno: number }) {
  const procenat = ukupno > 0 ? Math.round((vrednost / ukupno) * 100) : 0
  const gotovo = procenat === 100 && ukupno > 0
  return (
    <div className="red" style={{ gap: '0.4rem' }}>
      <div
        style={{ flex: 1, background: 'var(--boja-primarna-svetla)', borderRadius: 999, height: 14, overflow: 'hidden' }}
        role="progressbar" aria-valuenow={vrednost} aria-valuemin={0} aria-valuemax={ukupno}
        aria-label={`Odgovoreno ${vrednost} od ${ukupno} pitanja`}
      >
        <div
          style={{
            width: `${procenat}%`, height: '100%',
            background: 'linear-gradient(90deg, var(--boja-primarna), var(--boja-uspeh))',
            borderRadius: 999, transition: 'width 0.3s ease',
          }}
        />
      </div>
      {gotovo && <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>⭐</span>}
    </div>
  )
}

interface Konfeta { id: number; x: number; kasnjenje: string; boja: string }

// Kratkotrajna CSS konfeta animacija — koristi se kada dete osvoji zvezdice.
// Poštuje prefers-reduced-motion (vidi kviz.css).
export function Konfete({ broj = 18 }: { broj?: number }) {
  const boje = ['var(--boja-akcenat)', 'var(--boja-primarna)', 'var(--boja-uspeh)', 'var(--boja-zvezda)']
  const [komadi] = useState<Konfeta[]>(() =>
    Array.from({ length: broj }, (_, i) => ({
      id: i,
      x: Math.round(Math.random() * 100),
      kasnjenje: (Math.random() * 0.6).toFixed(2),
      boja: boje[i % boje.length],
    })),
  )
  return (
    <div className="kviz-konfete" aria-hidden="true">
      {komadi.map((k) => (
        <span
          key={k.id}
          style={{ '--x': `${k.x}%`, '--kasnjenje': `${k.kasnjenje}s`, '--boja': k.boja } as CSSProperties}
        />
      ))}
    </div>
  )
}
