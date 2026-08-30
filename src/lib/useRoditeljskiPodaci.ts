import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoditelj } from './roditelj'
import { slusajPushPoruke } from './push'

export function useRoditeljskiPodaci<T>(ucitaj: (id: string) => Promise<T>) {
  const { deteId } = useRoditelj()
  const [stanje, setStanje] = useState<{ id: string; podaci: T } | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState(true)
  const poslednji = useRef(0)
  const osvezi = useCallback(async () => {
    const zahtev = ++poslednji.current
    setRadi(true)
    try {
      const podaci = await ucitaj(deteId)
      if (zahtev === poslednji.current) { setStanje({ id: deteId, podaci }); setGreska(null) }
    } catch (e) {
      if (zahtev === poslednji.current) setGreska((e as Error).message)
    } finally { if (zahtev === poslednji.current) setRadi(false) }
  }, [deteId, ucitaj])
  useEffect(() => {
    void osvezi()
    const priFokusu = () => { if (document.visibilityState === 'visible') void osvezi() }
    const interval = window.setInterval(priFokusu, 60_000)
    window.addEventListener('focus', priFokusu)
    document.addEventListener('visibilitychange', priFokusu)
    const odjava = slusajPushPoruke(priFokusu)
    return () => { ++poslednji.current; clearInterval(interval); window.removeEventListener('focus', priFokusu); document.removeEventListener('visibilitychange', priFokusu); odjava() }
  }, [osvezi])
  return { podaci: stanje?.id === deteId ? stanje.podaci : null, greska, radi, osvezi }
}
