// Odbrojavanje do isteka vremena — računa se prema SERVERSKOM vremenu
// (offset = serverNow - lokalno vreme pri startu), pa pomeren sat uređaja ne vara
import { useEffect, useRef, useState } from 'react'
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

interface PauziraniProps {
  initialSeconds: number
  onCheckpoint: (preostalo: number) => void
  onIstek: () => void
}

// Profilni tajmer troši vreme samo dok je stranica vidljiva. Preostalo vreme se
// periodično potvrđuje serveru, koji nikada ne prihvata povećanje.
export function PauziraniTajmer({ initialSeconds, onCheckpoint, onIstek }: PauziraniProps) {
  const [preostalo, setPreostalo] = useState(Math.max(0, initialSeconds))
  const preostaloRef = useRef(Math.max(0, initialSeconds))
  const istekaoRef = useRef(false)
  const checkpointRef = useRef(onCheckpoint)
  const istekRef = useRef(onIstek)

  useEffect(() => { checkpointRef.current = onCheckpoint }, [onCheckpoint])
  useEffect(() => { istekRef.current = onIstek }, [onIstek])

  useEffect(() => {
    const novo = Math.max(0, initialSeconds)
    preostaloRef.current = novo
    setPreostalo(novo)
  }, [initialSeconds])

  useEffect(() => {
    const odbrojavanje = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || istekaoRef.current) return
      const novo = Math.max(0, preostaloRef.current - 1)
      preostaloRef.current = novo
      setPreostalo(novo)
      if (novo === 0) {
        istekaoRef.current = true
        checkpointRef.current(0)
        istekRef.current()
      }
    }, 1000)

    const potvrda = window.setInterval(() => {
      if (!istekaoRef.current) checkpointRef.current(preostaloRef.current)
    }, 5000)

    const priPromeniVidljivosti = () => {
      if (document.visibilityState !== 'visible') checkpointRef.current(preostaloRef.current)
    }
    const priIzlasku = () => checkpointRef.current(preostaloRef.current)
    document.addEventListener('visibilitychange', priPromeniVidljivosti)
    window.addEventListener('pagehide', priIzlasku)

    return () => {
      window.clearInterval(odbrojavanje)
      window.clearInterval(potvrda)
      document.removeEventListener('visibilitychange', priPromeniVidljivosti)
      window.removeEventListener('pagehide', priIzlasku)
      checkpointRef.current(preostaloRef.current)
    }
  }, [])

  const kriticno = preostalo <= 60
  return (
    <div
      className="bedz"
      style={kriticno ? { background: 'var(--boja-greska-svetla)', color: 'var(--boja-greska)', fontSize: '1rem' } : { fontSize: '1rem' }}
      aria-live={kriticno ? 'assertive' : 'off'}
      title="Tajmer se pauzira kada napustiš ovu stranicu"
    >
      ⏱ {formatOdbrojavanje(preostalo)}
    </div>
  )
}
