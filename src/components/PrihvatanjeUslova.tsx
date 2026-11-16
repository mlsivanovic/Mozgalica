// Ekran pre ulaska u administratorski panel: roditelj mora da prihvati uslove i politiku privatnosti.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { prihvatiUslove } from '../lib/api'

export function PrihvatanjeUslova() {
  const { odjavi, osveziPodesavanja } = useAuth()
  const [saglasan, setSaglasan] = useState(false)
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)

  async function nastavi() {
    setRadi(true)
    setGreska(null)
    try {
      await prihvatiUslove()
      osveziPodesavanja()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
      setRadi(false)
    }
  }

  return (
    <div className="sadrzaj sadrzaj--usko">
      <div className="kartica">
        <h1>Pre nastavka prihvati uslove</h1>
        <p className="blago razmak-dole">Pre prvog ulaska potrebno je da pročitaš i prihvatiš:</p>
        <ul>
          <li><Link to="/uslovi">Uslove korišćenja</Link></li>
          <li><Link to="/privatnost">Politiku privatnosti</Link></li>
        </ul>
        <label className="stiklir razmak-gore">
          <input type="checkbox" checked={saglasan} onChange={(e) => setSaglasan(e.target.checked)} />
          Pročitao/la sam i prihvatam uslove korišćenja i politiku privatnosti.
        </label>
        {greska && <p className="poruka poruka--greska razmak-gore" role="alert">{greska}</p>}
        <div className="red razmak-gore">
          <button type="button" className="dugme" disabled={!saglasan || radi} onClick={() => void nastavi()}>
            {radi ? 'Čuvam…' : 'Nastavi'}
          </button>
          <button type="button" className="dugme dugme--senka" onClick={() => void odjavi()}>Odjavi se</button>
        </div>
      </div>
    </div>
  )
}
