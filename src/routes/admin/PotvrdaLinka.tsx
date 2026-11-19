// Potvrda jednokratnog linka iz mejla (pozivnica, oporavak lozinke, magic link).
// Token se NE troši pri otvaranju stranice već tek klikom na dugme, da ga email
// bezbednosni skeneri (Safe Links, Defender, Proofpoint) ne bi unapred iskoristili.
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import {
  obrisiSacuvanuPotvrduLinka, procitajPotvrduLinka, procitajSacuvanuPotvrduLinka,
  sacuvajPotvrduLinka, type PotvrdaLinkaPodaci, type TipPotvrdeLinka,
} from '../../lib/authPovratak'
import { backendPodesen } from '../../lib/supabase'
import { Maskota } from '../../components/Maskota'

const TEKSTOVI: Record<TipPotvrdeLinka, {
  naslov: string
  opis: string
  dugme: string
  dugmeRadi: string
}> = {
  invite: {
    naslov: 'Dobro došli u Mozgalicu',
    opis: 'Klikni na dugme ispod da potvrdiš pozivnicu i izabereš lozinku za svoj roditeljski nalog.',
    dugme: 'Prihvati pozivnicu',
    dugmeRadi: 'Proveravam pozivnicu…',
  },
  recovery: {
    naslov: 'Nova lozinka',
    opis: 'Klikni na dugme ispod da potvrdiš zahtev i izabereš novu lozinku za svoj nalog.',
    dugme: 'Nastavi na izbor lozinke',
    dugmeRadi: 'Proveravam link…',
  },
  email: {
    naslov: 'Prijava u Mozgalicu',
    opis: 'Klikni na dugme ispod da potvrdiš prijavu i uđeš u roditeljski panel.',
    dugme: 'Prijavi se',
    dugmeRadi: 'Prijavljujem…',
  },
}

function ucitajPodatkePotvrde(): PotvrdaLinkaPodaci | null {
  const izAdrese = procitajPotvrduLinka(window.location.hash, window.location.search)
  if (izAdrese) {
    sacuvajPotvrduLinka(izAdrese)
    return izAdrese
  }
  return procitajSacuvanuPotvrduLinka()
}

export function PotvrdaLinka() {
  const { potvrdiLinkIzMejla } = useAuth()
  const navigate = useNavigate()
  const lokacija = useLocation()
  const [podaci, setPodaci] = useState<PotvrdaLinkaPodaci | null>(ucitajPodatkePotvrde)
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState(false)

  useEffect(() => {
    const izAdrese = procitajPotvrduLinka(window.location.hash, window.location.search)
    if (!izAdrese) return
    sacuvajPotvrduLinka(izAdrese)
    setPodaci(izAdrese)
    setGreska(null)
    window.history.replaceState(null, '', `${window.location.pathname}#/potvrda`)
  }, [lokacija.search])

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

  async function potvrdi() {
    if (!podaci || radi) return
    setGreska(null)
    setRadi(true)
    try {
      const rezultat = await potvrdiLinkIzMejla(podaci.tokenHash, podaci.tip)
      if (!rezultat.greska) {
        obrisiSacuvanuPotvrduLinka()
        navigate('/admin', { replace: true })
        return
      }
      if (rezultat.neispravan) {
        obrisiSacuvanuPotvrduLinka()
        setPodaci(null)
      }
      setGreska(rezultat.greska)
    } finally {
      setRadi(false)
    }
  }

  const tekst = podaci ? TEKSTOVI[podaci.tip] : null

  return (
    <div className="sadrzaj sadrzaj--usko">
      <div className="kartica prijava-kartica">
        <div className="prijava-maskota"><Maskota stanje="pozdrav" velicina={92} /></div>

        {podaci && tekst ? (
          <>
            <h1 className="centar">{tekst.naslov}</h1>
            <p className="centar blago razmak-dole">{tekst.opis}</p>

            {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

            <button
              type="button"
              className="dugme"
              disabled={radi}
              onClick={() => void potvrdi()}
              style={{ width: '100%' }}
            >
              {radi ? tekst.dugmeRadi : tekst.dugme}
            </button>

            <p className="centar razmak-gore">
              <Link to="/prijava" className="dugme dugme--senka dugme--malo">
                Nazad na prijavu
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="centar">Link nije važeći</h1>
            <p className="poruka poruka--greska razmak-gore" role="alert">
              {greska ?? 'Link za potvrdu nije pronađen ili je već iskorišćen. Zatraži novi link na ekranu za prijavu.'}
            </p>
            <Link to="/prijava" className="dugme razmak-gore" style={{ width: '100%', textAlign: 'center' }}>
              Idi na prijavu
            </Link>
          </>
        )}

        <p className="malo blago centar razmak-gore">
          <Link to="/privatnost">Politika privatnosti</Link> · <Link to="/uslovi">Uslovi korišćenja</Link>
        </p>
      </div>
    </div>
  )
}
