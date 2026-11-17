// Izbor nove lozinke: obavezan ekran posle pozivnice ili oporavka i odeljak u Podešavanjima.
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { MIN_DUZINA_LOZINKE, proveriNovuLozinku } from '../lib/authPovratak'

function LozinkaForma({ dugme, posleUspeha }: { dugme: string; posleUspeha?: () => void }) {
  const { session, postaviLozinku } = useAuth()
  const [lozinka, setLozinka] = useState('')
  const [ponovo, setPonovo] = useState('')
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)

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
    posleUspeha?.()
  }

  return (
    <form onSubmit={sacuvaj}>
      {/* Skriveno korisničko ime pomaže menadžeru lozinki da sačuva par email + lozinka. */}
      <input type="email" autoComplete="username" value={session?.user.email ?? ''} readOnly hidden />
      <div className="polje">
        <label htmlFor="nova-lozinka">Nova lozinka</label>
        <input
          id="nova-lozinka" type="password" required autoComplete="new-password" minLength={MIN_DUZINA_LOZINKE}
          value={lozinka} onChange={(e) => setLozinka(e.target.value)} aria-describedby="nova-lozinka-pomoc"
        />
        <p id="nova-lozinka-pomoc" className="malo blago">Bar {MIN_DUZINA_LOZINKE} znakova, slova i brojevi.</p>
      </div>
      <div className="polje">
        <label htmlFor="nova-lozinka-ponovo">Ponovi lozinku</label>
        <input
          id="nova-lozinka-ponovo" type="password" required autoComplete="new-password"
          value={ponovo} onChange={(e) => setPonovo(e.target.value)}
        />
      </div>
      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
      <button type="submit" className="dugme razmak-gore" disabled={radi}>{radi ? 'Čuvam…' : dugme}</button>
    </form>
  )
}

export function PostavljanjeLozinke() {
  const { zahtevLozinke, odjavi, session } = useAuth()
  const pozivnica = zahtevLozinke === 'pozivnica'
  return (
    <div className="sadrzaj sadrzaj--usko">
      <div className="kartica">
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
    <div className="roditelj-sekcija">
      <h2>Lozinka</h2>
      <p className="blago razmak-dole">Postavi ili promeni lozinku za prijavu.</p>
      {sacuvano && <p className="poruka poruka--uspeh" role="status">Lozinka je sačuvana.</p>}
      <LozinkaForma dugme="Sačuvaj lozinku" posleUspeha={() => setSacuvano(true)} />
    </div>
  )
}
