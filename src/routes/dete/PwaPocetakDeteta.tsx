import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader, TemaDugme } from '../../components/Zajednicke'
import { Maskota } from '../../components/Maskota'
import { ucitajJavniProfil } from '../../lib/api'
import {
  izdvojiProfilniToken, poveziProfilSaPwa, ucitajPovezaniProfil,
  ucitajProfilZaInstalaciju, zaboraviPovezaniProfil, zaboraviProfilZaInstalaciju,
} from '../../lib/profilPwa'
import { postaviDecjiManifest } from '../../pwa'
import './profil.css'

export function PwaPocetakDeteta() {
  const navigate = useNavigate()
  const [unos, setUnos] = useState('')
  const [proverava, setProverava] = useState(true)
  const [povezuje, setPovezuje] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)

  useEffect(() => {
    postaviDecjiManifest()
    const token = ucitajPovezaniProfil() ?? ucitajProfilZaInstalaciju()
    if (!token) {
      setProverava(false)
      return
    }

    let aktivna = true
    ucitajJavniProfil(token)
      .then((profil) => {
        if (!aktivna) return
        if (profil.ok) {
          poveziProfilSaPwa(token)
          navigate(`/dete/${token}`, { replace: true })
          return
        }
        if (profil.error === 'not_found') {
          zaboraviPovezaniProfil()
          zaboraviProfilZaInstalaciju()
          setGreska('Sačuvani profil više nije dostupan. Poveži aplikaciju ponovo.')
        } else {
          setGreska('Profil trenutno nije moguće proveriti. Proveri internet vezu.')
        }
        setProverava(false)
      })
      .catch(() => {
        if (!aktivna) return
        setGreska('Profil trenutno nije moguće proveriti. Proveri internet vezu.')
        setProverava(false)
      })

    return () => { aktivna = false }
  }, [navigate])

  async function poveziProfil(dogadjaj: FormEvent<HTMLFormElement>) {
    dogadjaj.preventDefault()
    const token = izdvojiProfilniToken(unos)
    if (!token) {
      setGreska('Nalepi ceo profilni link koji je kopiran u administratorskim podešavanjima.')
      return
    }

    setPovezuje(true)
    setGreska(null)
    try {
      const profil = await ucitajJavniProfil(token)
      if (!profil.ok) {
        setGreska('Profil nije pronađen. Proveri da li je link ispravno kopiran.')
        return
      }
      poveziProfilSaPwa(token)
      navigate(`/dete/${token}`, { replace: true })
    } catch {
      setGreska('Profil trenutno nije moguće proveriti. Proveri internet vezu.')
    } finally {
      setPovezuje(false)
    }
  }

  if (proverava) return <Loader tekst="Otvaram profil…" />

  return (
    <main className="profil-strana profil-pwa-strana">
      <div className="profil-omot profil-pwa-pocetak">
        <div className="red red--kraj"><TemaDugme /></div>
        <section className="kartica centar">
          <div className="prijava-maskota"><Maskota stanje="pozdrav" velicina={92} /></div>
          <p className="profil-nadnaslov">Moja Mozgalica</p>
          <h1>Poveži profil deteta</h1>
          <p className="blago razmak-gore">
            Ovo je potrebno samo pri prvom pokretanju na ovom uređaju.
            U administratorskim podešavanjima kopiraj profilni link i nalepi ga ispod.
          </p>

          <form className="profil-pwa-forma razmak-gore" onSubmit={poveziProfil}>
            <div className="polje">
              <label htmlFor="profilni-link">Profilni link</label>
              <input
                id="profilni-link"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="https://…/#/dete/…"
                value={unos}
                onChange={(dogadjaj) => setUnos(dogadjaj.target.value)}
              />
            </div>
            {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
            <button type="submit" className="dugme dugme--akcenat" disabled={povezuje}>
              {povezuje ? 'Povezujem…' : 'Poveži profil'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
