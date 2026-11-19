// Brisanje roditeljskog naloga sa svim podacima. Potvrda je ukucana email adresa naloga.
// Vlasnik platforme ne može da obriše nalog (zajednička banka pitanja).
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { obrisiMojNalog } from '../lib/api'
import { KLJUC_PORUKE_POSLE_BRISANJA, potvrdaBrisanjaJeIspravna } from '../lib/nalog'
import { Ikona } from './Ikona'

const STAVKE_BRISANJA = [
  'Deca i njihovi profili',
  'Kvizovi, odgovori i rezultati',
  'Sopstvena pitanja',
  'Šahovske partije i rasporedi',
  'Obaveštenja i pretplate',
] as const

export function BrisanjeNaloga() {
  const { session, odjavi, jeVlasnikPlatforme } = useAuth()
  const [otvorenaPotvrda, setOtvorenaPotvrda] = useState(false)
  const [potvrda, setPotvrda] = useState('')
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const emailNaloga = session?.user.email ?? null

  if (jeVlasnikPlatforme) {
    return (
      <section className="kartica podesavanja-kartica podesavanja-info-kartica" aria-labelledby="podesavanja-brisanje-naslov">
        <div className="podesavanja-kartica-zaglavlje">
          <span className="podesavanja-ikona-krug" aria-hidden="true">
            <Ikona ime="privatnost" velicina={20} />
          </span>
          <div>
            <h2 id="podesavanja-brisanje-naslov">Brisanje naloga nije dostupno</h2>
            <p className="blago malo">
              Vlasnik platforme ne može da obriše nalog, jer su njegova pitanja zajednička banka za sve roditelje.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const potvrdaJeTacna = potvrdaBrisanjaJeIspravna(potvrda, emailNaloga)
  const mozeDaSeBrise = !radi && potvrdaJeTacna

  async function obrisi(e: FormEvent) {
    e.preventDefault()
    if (!mozeDaSeBrise) return
    setRadi(true)
    setGreska(null)
    try {
      await obrisiMojNalog(potvrda.trim())
      sessionStorage.setItem(KLJUC_PORUKE_POSLE_BRISANJA, 'Nalog i svi podaci su obrisani.')
      await odjavi()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
      setRadi(false)
    }
  }

  function zatvoriPotvrdu() {
    setOtvorenaPotvrda(false)
    setPotvrda('')
    setGreska(null)
  }

  return (
    <section
      className="kartica podesavanja-kartica podesavanja-opasna-zona podesavanja-brisanje"
      aria-labelledby="podesavanja-brisanje-naslov"
    >
      <div className="podesavanja-kartica-zaglavlje">
        <span className="podesavanja-ikona-krug podesavanja-ikona-krug--opasno" aria-hidden="true">
          <Ikona ime="opasnost" velicina={20} />
        </span>
        <div className="podesavanja-opasna-naslov">
          <div className="podesavanja-naslov-red">
            <h2 id="podesavanja-brisanje-naslov">Obriši nalog</h2>
            <span className="bedz bedz--greska">Trajna radnja</span>
          </div>
          <p className="blago malo">
            Brišu se svi tvoji podaci iz aplikacije. Ovu radnju nije moguće poništiti.
          </p>
        </div>
      </div>

      <ul className="podesavanja-brisanje-stavke" aria-label="Podaci koji se trajno brišu">
        {STAVKE_BRISANJA.map((stavka) => (
          <li key={stavka}>{stavka}</li>
        ))}
      </ul>

      {!otvorenaPotvrda ? (
        <div className="podesavanja-brisanje-pokretac">
          <button
            type="button"
            className="dugme dugme--opasno-okvir"
            onClick={() => {
              setOtvorenaPotvrda(true)
              setGreska(null)
            }}
          >
            <Ikona ime="obrisi" velicina={18} />
            <span>Obriši nalog…</span>
          </button>
        </div>
      ) : (
        <form onSubmit={obrisi} className="podesavanja-brisanje-potvrda">
          <div className="polje">
            <label htmlFor="brisanje-potvrda">
              Ukucaj svoju email adresu da potvrdiš brisanje
              {emailNaloga && (
                <>
                  {': '}
                  <code className="podesavanja-email-uzorak">{emailNaloga}</code>
                </>
              )}
            </label>
            <input
              id="brisanje-potvrda"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              autoFocus
              placeholder={emailNaloga ?? 'ime@example.com'}
              value={potvrda}
              onChange={(e) => {
                setPotvrda(e.target.value)
                setGreska(null)
              }}
            />
            {potvrda.trim().length > 0 && (
              <p className={`lozinka-poklapanje ${potvrdaJeTacna ? 'lozinka-poklapanje--uspeh' : 'lozinka-poklapanje--blago'}`}>
                {potvrdaJeTacna ? 'Email adresa se poklapa.' : 'Unesi tačnu email adresu naloga.'}
              </p>
            )}
          </div>

          {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

          <div className="podesavanja-brisanje-akcije">
            <button
              type="button"
              className="dugme dugme--senka"
              disabled={radi}
              onClick={zatvoriPotvrdu}
            >
              Otkaži
            </button>
            <button type="submit" className="dugme dugme--opasno" disabled={!mozeDaSeBrise}>
              <Ikona ime="obrisi" velicina={18} />
              <span>{radi ? 'Brišem…' : 'Obriši nalog i sve podatke'}</span>
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
