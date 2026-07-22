// Admin podešavanja: uključi/isključi mejl obaveštenja
import { useEffect, useState } from 'react'
import {
  postaviEmailObavestenja,
  ucitajPodesavanja,
  ucitajStatuseTitula,
  zapocniNovuSezonuTitula,
  type StatusTituleDeteta,
} from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Loader } from '../../components/Zajednicke'
import { formatDatum } from '../../lib/format'
import type { FiksnoImeDeteta } from '../../types/db'

export function Podesavanja() {
  const { session } = useAuth()
  const [ucitava, setUcitava] = useState(true)
  const [ukljucena, setUkljucena] = useState(true)
  const [titule, setTitule] = useState<StatusTituleDeteta[]>([])
  const [resetuje, setResetuje] = useState<FiksnoImeDeteta | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [sacuvano, setSacuvano] = useState(false)

  useEffect(() => {
    Promise.all([ucitajPodesavanja(), ucitajStatuseTitula()])
      .then(([p, statusi]) => {
        setUkljucena(p?.email_notifications ?? true)
        setTitule(statusi)
      })
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

  async function novaSezona(dete: FiksnoImeDeteta) {
    const potvrda = `Započeti novu sezonu titula za ${dete}? Ukupan zbir zvezdica ostaje sačuvan, ali nova sezona kreće od 0 zvezdica.`
    if (!window.confirm(potvrda)) return

    setGreska(null)
    setResetuje(dete)
    try {
      const status = await zapocniNovuSezonuTitula(dete)
      setTitule((prethodne) => prethodne.map((t) => t.childName === dete ? status : t))
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setResetuje(null)
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
      </div>

      <section className="razmak-gore">
        <h2>Titule dece</h2>
        <p className="blago razmak-dole">
          Titule su sezonski trofeji. Nova sezona ne briše ukupan broj osvojenih zvezdica.
        </p>
        <div className="mreza-kartica">
          {(['Andrej', 'Filip'] as const).map((ime) => {
            const status = titule.find((t) => t.childName === ime)
            const napredak = status?.titleProgress
            return (
              <div className="kartica" key={ime}>
                <h3>{ime} {napredak?.currentTitle ?? '—'}</h3>
                <p className="razmak-gore"><strong>Ova sezona:</strong> {napredak?.seasonStars ?? 0} ⭐</p>
                <p className="blago malo">
                  {napredak?.nextTitle && napredak.starsToNextTitle !== null
                    ? `Još ${napredak.starsToNextTitle} ⭐ do ${napredak.nextTitle}.`
                    : 'LegendPrime je dostignut za ovu sezonu!'}
                </p>
                <p className="blago malo razmak-gore">Ukupno: {status?.totalStars ?? 0} ⭐</p>
                {status && <p className="blago malo">Sezona počela: {formatDatum(status.seasonStartedAt)}</p>}
                <button
                  type="button"
                  className="dugme dugme--senka dugme--malo razmak-gore"
                  disabled={resetuje !== null}
                  onClick={() => novaSezona(ime)}
                >
                  {resetuje === ime ? 'Pokrećem…' : 'Započni novu sezonu'}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {greska && <p className="poruka poruka--greska razmak-gore" role="alert">{greska}</p>}
    </div>
  )
}
