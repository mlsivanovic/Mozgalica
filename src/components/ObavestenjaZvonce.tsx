import { useState } from 'react'
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
  const [otvoreno, setOtvoreno] = useState(false)
  const [radi, setRadi] = useState(false)

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

  return (
    <div className="obavestenja">
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
            <strong>Obaveštenja</strong>
            {inbox.neprocitano > 0 && (
              <button type="button" disabled={radi} onClick={oznaciSve}>
                Označi sve kao pročitano
              </button>
            )}
          </div>
          <div className="obavestenja-lista">
            {inbox.obavestenja.length === 0 ? (
              <p className="obavestenja-prazno">Još nema obaveštenja.</p>
            ) : inbox.obavestenja.map((obavestenje) => (
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
