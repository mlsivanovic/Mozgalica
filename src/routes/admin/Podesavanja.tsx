// Admin podešavanja: uključi/isključi mejl obaveštenja
import { useEffect, useState } from 'react'
import { ucitajPodesavanja, postaviEmailObavestenja } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Loader } from '../../components/Zajednicke'

export function Podesavanja() {
  const { session } = useAuth()
  const [ucitava, setUcitava] = useState(true)
  const [ukljucena, setUkljucena] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [sacuvano, setSacuvano] = useState(false)

  useEffect(() => {
    ucitajPodesavanja()
      .then((p) => setUkljucena(p?.email_notifications ?? true))
      .catch((e) => setGreska(String(e.message ?? e)))
      .finally(() => setUcitava(false))
  }, [])

  async function promeni(vrednost: boolean) {
    if (!session) return
    setUkljucena(vrednost)
    setSacuvano(false)
    try {
      await postaviEmailObavestenja(session.user.id, vrednost)
      setSacuvano(true)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  if (ucitava) return <Loader />

  return (
    <div className="sadrzaj sadrzaj--usko">
      <h1>Podešavanja</h1>
      <div className="kartica razmak-gore">
        <h2>Mejl obaveštenja</h2>
        <p className="blago razmak-dole">
          Kada dete završi kviz, na tvoju email adresu stiže obaveštenje sa rezultatom.
        </p>
        <label className="stiklir">
          <input type="checkbox" checked={ukljucena} onChange={(e) => promeni(e.target.checked)} />
          Pošalji mi mejl kada dete završi kviz
        </label>
        {sacuvano && <p className="poruka poruka--uspeh razmak-gore">Sačuvano.</p>}
        {greska && <p className="poruka poruka--greska razmak-gore" role="alert">{greska}</p>}
      </div>
    </div>
  )
}
