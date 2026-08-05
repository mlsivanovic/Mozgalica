import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { InboxObavestenja, Obavestenje } from '../types/db'
import { formatDatum } from '../lib/format'
import './obavestenja.css'

interface Props {
  inbox: InboxObavestenja
  onOznaciProcitanim: (ids?: string[]) => Promise<void>
  nazivPrimaoca: string
}

export function ObavestenjaZvonce({ inbox, onOznaciProcitanim, nazivPrimaoca }: Props) {
  const navigate = useNavigate()
  const koren = useRef<HTMLDivElement>(null)
  const [otvoreno, setOtvoreno] = useState(false)
  const [radi, setRadi] = useState(false)
  const [prikaziIstoriju, setPrikaziIstoriju] = useState(false)

  // Zatvaranje panela klikom van ili tasterom Escape.
  useEffect(() => {
    if (!otvoreno) return
    function naSpoljniKlik(dogadjaj: PointerEvent) {
      if (!koren.current?.contains(dogadjaj.target as Node)) setOtvoreno(false)
    }
    function naTaster(dogadjaj: KeyboardEvent) {
      if (dogadjaj.key === 'Escape') setOtvoreno(false)
    }
    document.addEventListener('pointerdown', naSpoljniKlik)
    document.addEventListener('keydown', naTaster)
    return () => {
      document.removeEventListener('pointerdown', naSpoljniKlik)
      document.removeEventListener('keydown', naTaster)
    }
  }, [otvoreno])

  // Svako otvaranje kreće iz prikaza novih obaveštenja.
  useEffect(() => {
    if (!otvoreno) setPrikaziIstoriju(false)
  }, [otvoreno])

  async function otvoriObavestenje(obavestenje: Obavestenje) {
    if (!obavestenje.read_at) await onOznaciProcitanim([obavestenje.id])
    setOtvoreno(false)
    navigate(obavestenje.target_url)
  }

  async function oznaciSve() {
    setRadi(true)
    try {
      await onOznaciProcitanim()
    } finally {
      setRadi(false)
    }
  }

  const nova = inbox.obavestenja.filter((o) => !o.read_at)
  const procitana = inbox.obavestenja.filter((o) => o.read_at)
  const lista = prikaziIstoriju ? procitana : nova
  const potpunoPrazno = inbox.obavestenja.length === 0

  return (
    <div className="obavestenja" ref={koren}>
      <button
        type="button"
        className="obavestenja-zvonce"
        aria-label={`Obaveštenja za ${nazivPrimaoca}${inbox.neprocitano ? `, ${inbox.neprocitano} nepročitanih` : ''}`}
        aria-expanded={otvoreno}
        onClick={() => setOtvoreno((prethodno) => !prethodno)}
      >
        <span aria-hidden="true">🔔</span>
        {inbox.neprocitano > 0 && (
          <span className="obavestenja-broj">{Math.min(inbox.neprocitano, 99)}</span>
        )}
      </button>

      {otvoreno && (
        <div className="obavestenja-panel" role="dialog" aria-label="Obaveštenja">
          <div className="obavestenja-zaglavlje">
            <strong>{prikaziIstoriju ? 'Istorija obaveštenja' : 'Obaveštenja'}</strong>
            <span className="obavestenja-zaglavlje-akcije">
              {!prikaziIstoriju && inbox.neprocitano > 0 && (
                <button type="button" disabled={radi} onClick={oznaciSve}>
                  Označi sve kao pročitano
                </button>
              )}
              {!prikaziIstoriju && procitana.length > 0 && (
                <button type="button" onClick={() => setPrikaziIstoriju(true)}>
                  Istorija ({procitana.length})
                </button>
              )}
              {prikaziIstoriju && (
                <button type="button" onClick={() => setPrikaziIstoriju(false)}>
                  ← Nazad na nova
                </button>
              )}
            </span>
          </div>
          <div className="obavestenja-lista">
            {potpunoPrazno ? (
              <p className="obavestenja-prazno">Još nema obaveštenja.</p>
            ) : lista.length === 0 ? (
              <p className="obavestenja-prazno">
                {prikaziIstoriju
                  ? 'Nema pročitanih obaveštenja.'
                  : 'Nema novih obaveštenja.'}
              </p>
            ) : lista.map((obavestenje) => (
              <button
                type="button"
                key={obavestenje.id}
                className={`obavestenja-stavka ${obavestenje.read_at ? '' : 'obavestenja-stavka--nova'}`}
                onClick={() => void otvoriObavestenje(obavestenje)}
              >
                <span className="obavestenja-ikona" aria-hidden="true">
                  {obavestenje.event_type === 'new_quiz' ? '📝' : '✅'}
                </span>
                <span>
                  <strong>{obavestenje.title}</strong>
                  <span>{obavestenje.body}</span>
                  <small>{formatDatum(obavestenje.created_at)}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
