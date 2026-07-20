// Male zajedničke komponente: loader, modal, progres traka
import type { ReactNode } from 'react'

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

export function ProgresTraka({ vrednost, ukupno }: { vrednost: number; ukupno: number }) {
  const procenat = ukupno > 0 ? Math.round((vrednost / ukupno) * 100) : 0
  return (
    <div
      style={{ background: 'var(--boja-primarna-svetla)', borderRadius: 999, height: 14, overflow: 'hidden' }}
      role="progressbar" aria-valuenow={vrednost} aria-valuemin={0} aria-valuemax={ukupno}
      aria-label={`Odgovoreno ${vrednost} od ${ukupno} pitanja`}
    >
      <div
        style={{
          width: `${procenat}%`, height: '100%', background: 'var(--boja-uspeh)',
          borderRadius: 999, transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}
