// Prijava administratora: lozinka (primarno) ili magic link (sekundarno —
// Supabase besplatni SMTP šalje svega par mejlova na sat)
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { backendPodesen } from '../../lib/supabase'

export function Prijava() {
  const { session, prijaviLozinkom, posaljiMagicLink } = useAuth()
  const [nacin, setNacin] = useState<'lozinka' | 'magic'>('lozinka')
  const [email, setEmail] = useState('')
  const [lozinka, setLozinka] = useState('')
  const [greska, setGreska] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [radi, setRadi] = useState(false)

  if (session) return <Navigate to="/admin" replace />

  if (!backendPodesen) {
    return (
      <div className="sadrzaj sadrzaj--usko">
        <div className="kartica">
          <h1>Mozgalica — administracija</h1>
          <p className="poruka poruka--upozorenje razmak-gore">
            Backend još nije podešen. Popuni <code>VITE_SUPABASE_URL</code> i{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> po uputstvu iz <code>SETUP.md</code>.
          </p>
        </div>
      </div>
    )
  }

  async function posalji(e: FormEvent) {
    e.preventDefault()
    setGreska(null)
    setInfo(null)
    setRadi(true)
    try {
      if (nacin === 'lozinka') {
        const gr = await prijaviLozinkom(email.trim(), lozinka)
        if (gr) setGreska(gr)
      } else {
        const gr = await posaljiMagicLink(email.trim())
        if (gr) setGreska(gr)
        else setInfo('Poslali smo ti link za prijavu na email. Otvori ga na ovom uređaju.')
      }
    } finally {
      setRadi(false)
    }
  }

  return (
    <div className="sadrzaj sadrzaj--usko">
      <div className="kartica" style={{ marginTop: '8vh' }}>
        <h1 className="centar">🧠 Mozgalica</h1>
        <p className="centar blago razmak-dole">Prijava za administratora</p>

        <form onSubmit={posalji}>
          <div className="polje">
            <label htmlFor="email">Email adresa</label>
            <input
              id="email" type="email" required autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {nacin === 'lozinka' && (
            <div className="polje">
              <label htmlFor="lozinka">Lozinka</label>
              <input
                id="lozinka" type="password" required autoComplete="current-password"
                value={lozinka} onChange={(e) => setLozinka(e.target.value)}
              />
            </div>
          )}

          {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
          {info && <p className="poruka poruka--uspeh" role="status">{info}</p>}

          <button type="submit" className="dugme" disabled={radi} style={{ width: '100%' }}>
            {radi ? 'Sačekaj…' : nacin === 'lozinka' ? 'Prijavi se' : 'Pošalji magic link'}
          </button>
        </form>

        <p className="centar razmak-gore">
          <button
            type="button" className="dugme dugme--senka dugme--malo"
            onClick={() => { setNacin(nacin === 'lozinka' ? 'magic' : 'lozinka'); setGreska(null); setInfo(null) }}
          >
            {nacin === 'lozinka' ? 'Prijava magic linkom umesto lozinke' : 'Prijava lozinkom'}
          </button>
        </p>
      </div>
    </div>
  )
}
