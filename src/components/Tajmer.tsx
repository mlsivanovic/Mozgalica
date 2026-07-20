// Odbrojavanje do isteka vremena — računa se prema SERVERSKOM vremenu
// (offset = serverNow - lokalno vreme pri startu), pa pomeren sat uređaja ne vara
import { useEffect, useState } from 'react'
import { formatOdbrojavanje } from '../lib/format'

interface Props {
  deadlineAt: string // ISO vreme sa servera
  serverOffsetMs: number // server_now - Date.now() u trenutku starta
  onIstek: () => void
}

export function Tajmer({ deadlineAt, serverOffsetMs, onIstek }: Props) {
  const [preostalo, setPreostalo] = useState(() => izracunaj(deadlineAt, serverOffsetMs))

  useEffect(() => {
    const interval = setInterval(() => {
      const novo = izracunaj(deadlineAt, serverOffsetMs)
      setPreostalo(novo)
      if (novo <= 0) {
        clearInterval(interval)
        onIstek()
      }
    }, 500)
    return () => clearInterval(interval)
    // onIstek namerno nije u zavisnostima — stabilnost intervala je bitnija
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineAt, serverOffsetMs])

  const kriticno = preostalo <= 60
  return (
    <div
      className="bedz"
      style={kriticno ? { background: 'var(--boja-greska-svetla)', color: 'var(--boja-greska)', fontSize: '1rem' } : { fontSize: '1rem' }}
      aria-live={kriticno ? 'assertive' : 'off'}
    >
      ⏱ {formatOdbrojavanje(preostalo)}
    </div>
  )
}

function izracunaj(deadlineAt: string, offsetMs: number): number {
  const sadaNaServeru = Date.now() + offsetMs
  return Math.floor((new Date(deadlineAt).getTime() - sadaNaServeru) / 1000)
}
