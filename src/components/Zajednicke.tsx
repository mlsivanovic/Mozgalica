// Male zajedničke komponente: loader, modal, progres traka, dugme za temu
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { pratiSistemskuTemu, preklopiTemu, trenutnaTema } from '../lib/tema'

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
  return (
    <div className="modal-pozadina" onClick={onZatvori} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={naslov} onClick={(e) => e.stopPropagation()}>
        <div className="zaglavlje-strane">
          <h2>{naslov}</h2>
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
export function TemaDugme() {
  const [tema, setTema] = useState(trenutnaTema)

  useEffect(() => pratiSistemskuTemu(setTema), [])

  function preklopi() {
    setTema(preklopiTemu())
  }

  return (
    <button
      type="button" className="dugme dugme--senka dugme--malo" onClick={preklopi}
      aria-label={tema === 'tamna' ? 'Uključi svetlu temu' : 'Uključi tamnu temu'}
      title={tema === 'tamna' ? 'Svetla tema' : 'Tamna tema'}
    >
      {tema === 'tamna' ? '☀️' : '🌙'}
    </button>
  )
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
