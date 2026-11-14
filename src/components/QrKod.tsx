import { useEffect, useRef } from 'react'

// Crta se u pregledaču. Nema poziva ka trećoj strani.
export function QrKod({ vrednost, oznaka }: { vrednost: string; oznaka: string }) {
  const platno = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const element = platno.current
    if (!element) return
    let otkazan = false
    void import('qrcode').then((modul) => {
      if (otkazan) return
      return modul.default.toCanvas(element, vrednost, {
        width: 168,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#191B2A', light: '#FFFFFF' },
      })
    }).catch(() => {
      // Kopiranje linka i dalje radi i ako crtanje ne uspe.
    })
    return () => { otkazan = true }
  }, [vrednost])

  return <canvas ref={platno} width={168} height={168} role="img" aria-label={oznaka} />
}
