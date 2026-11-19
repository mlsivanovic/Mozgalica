// Izbor nove lozinke: obavezan ekran posle pozivnice ili oporavka i odeljak u Podešavanjima.
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { MIN_DUZINA_LOZINKE, proveriNovuLozinku } from '../lib/authPovratak'
import { Ikona } from './Ikona'

interface LozinkaFormaProps {
  dugme: string
  posleUspeha?: () => void
  onUnos?: () => void
  raspored?: 'red' | 'kolone'
}

function LozinkaForma({ dugme, posleUspeha, onUnos, raspored = 'red' }: LozinkaFormaProps) {
  const { session, postaviLozinku } = useAuth()
  const [lozinka, setLozinka] = useState('')
  const [ponovo, setPonovo] = useState('')
  const [prikaziNovu, setPrikaziNovu] = useState(false)
  const [prikaziPonovo, setPrikaziPonovo] = useState(false)
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)

  const imaDuzinu = lozinka.length >= MIN_DUZINA_LOZINKE
  const imaSlovo = /\p{L}/u.test(lozinka)
  const imaBroj = /\d/.test(lozinka)
  const poklapaSe = ponovo.length > 0 && lozinka === ponovo
  const nePoklapaSe = ponovo.length > 0 && lozinka !== ponovo
  const sveSpremno = imaDuzinu && imaSlovo && imaBroj && poklapaSe

  async function sacuvaj(e: FormEvent) {
    e.preventDefault()
    const problem = proveriNovuLozinku(lozinka, ponovo)
    if (problem) { setGreska(problem); return }
    setRadi(true)
    setGreska(null)
    const gr = await postaviLozinku(lozinka)
    setRadi(false)
    if (gr) { setGreska(gr); return }
    setLozinka('')
    setPonovo('')
    setPrikaziNovu(false)
    setPrikaziPonovo(false)
    posleUspeha?.()
  }

  return (
    <form onSubmit={sacuvaj} className="lozinka-forma">
      {/* Skriveno korisničko ime pomaže menadžeru lozinki da sačuva par email + lozinka. */}
      <input type="email" autoComplete="username" value={session?.user.email ?? ''} readOnly hidden />

      <div className={raspored === 'kolone' ? 'lozinka-polja' : undefined}>
        <div className="polje">
          <label htmlFor="nova-lozinka">Nova lozinka</label>
          <div className="lozinka-unos-omot">
            <input
              id="nova-lozinka"
              type={prikaziNovu ? 'text' : 'password'}
              required
              autoComplete="new-password"
              minLength={MIN_DUZINA_LOZINKE}
              placeholder="Unesi novu lozinku"
              value={lozinka}
              onChange={(e) => {
                setLozinka(e.target.value)
                setGreska(null)
                onUnos?.()
              }}
              aria-describedby="nova-lozinka-pomoc"
            />
            <button
              type="button"
              className="lozinka-oko-dugme"
              aria-label={prikaziNovu ? 'Sakrij novu lozinku' : 'Prikaži novu lozinku'}
              aria-pressed={prikaziNovu}
              onClick={() => setPrikaziNovu((v) => !v)}
            >
              <Ikona ime={prikaziNovu ? 'sakrij' : 'prikazi'} velicina={18} />
            </button>
          </div>
        </div>

        <div className="polje">
          <label htmlFor="nova-lozinka-ponovo">Ponovi lozinku</label>
          <div className="lozinka-unos-omot">
            <input
              id="nova-lozinka-ponovo"
              type={prikaziPonovo ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Ponovi lozinku"
              value={ponovo}
              aria-invalid={nePoklapaSe ? 'true' : undefined}
              onChange={(e) => {
                setPonovo(e.target.value)
                setGreska(null)
                onUnos?.()
              }}
            />
            <button
              type="button"
              className="lozinka-oko-dugme"
              aria-label={prikaziPonovo ? 'Sakrij ponovljenu lozinku' : 'Prikaži ponovljenu lozinku'}
              aria-pressed={prikaziPonovo}
              onClick={() => setPrikaziPonovo((v) => !v)}
            >
              <Ikona ime={prikaziPonovo ? 'sakrij' : 'prikazi'} velicina={18} />
            </button>
          </div>
          {nePoklapaSe && (
            <p className="lozinka-poklapanje lozinka-poklapanje--greska">Lozinke se ne poklapaju.</p>
          )}
          {poklapaSe && (
            <p className="lozinka-poklapanje lozinka-poklapanje--uspeh">Lozinke se poklapaju.</p>
          )}
        </div>
      </div>

      <ul id="nova-lozinka-pomoc" className="lozinka-uslovi" aria-label="Zahtevi za lozinku">
        <li className={imaDuzinu ? 'je-ispunjeno' : undefined}>
          <Ikona ime={imaDuzinu ? 'gotovo' : 'potvrda'} velicina={15} />
          <span>Bar {MIN_DUZINA_LOZINKE} znakova</span>
        </li>
        <li className={imaSlovo ? 'je-ispunjeno' : undefined}>
          <Ikona ime={imaSlovo ? 'gotovo' : 'potvrda'} velicina={15} />
          <span>Bar jedno slovo</span>
        </li>
        <li className={imaBroj ? 'je-ispunjeno' : undefined}>
          <Ikona ime={imaBroj ? 'gotovo' : 'potvrda'} velicina={15} />
          <span>Bar jedan broj</span>
        </li>
        <li className={poklapaSe ? 'je-ispunjeno' : undefined}>
          <Ikona ime={poklapaSe ? 'gotovo' : 'potvrda'} velicina={15} />
          <span>Potvrda se poklapa</span>
        </li>
      </ul>

      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

      <div className="lozinka-akcije">
        <button
          type="submit"
          className={`dugme${sveSpremno ? '' : ' dugme--senka'}`}
          disabled={radi}
        >
          <Ikona ime="lozinka" velicina={18} />
          <span>{radi ? 'Čuvam…' : dugme}</span>
        </button>
      </div>
    </form>
  )
}

export function PostavljanjeLozinke() {
  const { zahtevLozinke, odjavi, session } = useAuth()
  const pozivnica = zahtevLozinke === 'pozivnica'
  return (
    <div className="sadrzaj sadrzaj--usko">
      <div className="kartica prijava-kartica">
        <h1>{pozivnica ? 'Dobro došli u Mozgalicu' : 'Nova lozinka'}</h1>
        <p className="blago razmak-dole">
          {pozivnica
            ? 'Izaberi lozinku za svoj nalog. Sledeći put se prijavljuješ emailom i ovom lozinkom.'
            : `Izaberi novu lozinku za nalog ${session?.user.email ?? ''}.`}
        </p>
        <LozinkaForma dugme={pozivnica ? 'Sačuvaj lozinku i nastavi' : 'Sačuvaj novu lozinku'} />
        <p className="razmak-gore">
          <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => void odjavi()}>Odjavi se</button>
        </p>
      </div>
    </div>
  )
}

export function PromenaLozinke() {
  const [sacuvano, setSacuvano] = useState(false)
  return (
    <section className="kartica podesavanja-kartica podesavanja-lozinka" aria-labelledby="podesavanja-lozinka-naslov">
      <div className="podesavanja-kartica-zaglavlje">
        <span className="podesavanja-ikona-krug" aria-hidden="true">
          <Ikona ime="lozinka" velicina={20} />
        </span>
        <div>
          <h2 id="podesavanja-lozinka-naslov">Lozinka za prijavu</h2>
          <p className="blago malo">Postavi novu ili promeni postojeću lozinku za svoj nalog.</p>
        </div>
      </div>

      {sacuvano && (
        <div className="poruka poruka--uspeh podesavanja-status-poruka" role="status">
          <Ikona ime="gotovo" velicina={18} />
          <span>Nova lozinka je sačuvana.</span>
        </div>
      )}

      <LozinkaForma
        dugme="Sačuvaj lozinku"
        raspored="kolone"
        onUnos={() => { if (sacuvano) setSacuvano(false) }}
        posleUspeha={() => setSacuvano(true)}
      />
    </section>
  )
}
