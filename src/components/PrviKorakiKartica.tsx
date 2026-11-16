// Kartica „Prvi koraci“ na kontrolnoj tabli. Stanje dolazi iz postojećeg pregleda i push statusa.
import { useEffect, useState } from 'react'
import { RoditeljskiLink as Link } from '../lib/roditelj'
import type { RoditeljskiPregled } from '../lib/roditeljskiPregled'
import { statusPushObavestenja } from '../lib/push'
import {
  KLJUC_LINK_POSLAT, KLJUC_SAKRIVANJA_PRVIH_KORAKA, prviKorakiZavrseni, stavkePrvihKoraka,
  type StanjePrvihKoraka,
} from '../lib/prviKoraci'
import { Ikona } from './Ikona'

function procitajFlag(kljuc: string): boolean {
  try {
    return localStorage.getItem(kljuc) === '1'
  } catch {
    return false
  }
}

function upisiFlag(kljuc: string) {
  try {
    localStorage.setItem(kljuc, '1')
  } catch {
    // Bez localStorage-a kartica ostaje otvorena; nije kritično.
  }
}

export function PrviKorakiKartica({ podaci }: { podaci: RoditeljskiPregled }) {
  const [sakriveno, setSakriveno] = useState(() => procitajFlag(KLJUC_SAKRIVANJA_PRVIH_KORAKA))
  const [linkPoslat, setLinkPoslat] = useState(() => procitajFlag(KLJUC_LINK_POSLAT))
  const [pushUkljucen, setPushUkljucen] = useState(false)

  useEffect(() => {
    statusPushObavestenja()
      .then((status) => setPushUkljucen(status.aktivno))
      .catch(() => setPushUkljucen(false))
  }, [])

  const stanje: StanjePrvihKoraka = {
    brojDece: podaci.children.length,
    imaDnevniRaspored: podaci.schedules.some((raspored) => raspored.kind === 'quiz'),
    imaDodeljenKviz: podaci.children.some((dete) => dete.quizCount > 0),
    pushUkljucen,
    imaRezultatDeteta: podaci.children.some((dete) => dete.lastResult !== null),
    linkOznacenPoslat: linkPoslat,
  }
  const stavke = stavkePrvihKoraka(stanje)

  if (sakriveno || prviKorakiZavrseni(stavke)) return null

  function oznaciLinkPoslat() {
    upisiFlag(KLJUC_LINK_POSLAT)
    setLinkPoslat(true)
  }

  function sakrij() {
    upisiFlag(KLJUC_SAKRIVANJA_PRVIH_KORAKA)
    setSakriveno(true)
  }

  return (
    <section className="kartica razmak-dole prvi-koraci" aria-label="Prvi koraci">
      <div className="red red--razmak">
        <h2>Prvi koraci</h2>
        <button type="button" className="dugme dugme--senka dugme--malo" onClick={sakrij}>Sakrij</button>
      </div>
      <ol className="prvi-koraci-lista">
        {stavke.map((stavka) => (
          <li key={stavka.id} className={stavka.gotovo ? 'gotovo' : undefined}>
            <span className="prvi-koraci-oznaka" aria-hidden="true">{stavka.gotovo ? <Ikona ime="gotovo" velicina={18} /> : null}</span>
            <Link to={stavka.putanja}>
              {stavka.naslov}
            </Link>
            {stavka.id === 'link' && !stavka.gotovo && (
              <button type="button" className="dugme dugme--senka dugme--malo" onClick={oznaciLinkPoslat}>
                Link je poslat
              </button>
            )}
            <span className="sr-only">{stavka.gotovo ? '(gotovo)' : '(nije gotovo)'}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
