// Pozivanje roditelja i spisak pozvanih. Vidi samo vlasnik platforme.
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { listajPozvaneRoditelje, pozoviRoditelja, type PozvanRoditelj } from '../../lib/api'
import { normalizujEmail } from '../../lib/email'
import { porukaZaStatusPoziva, pozivniEmailJeIspravan, type StatusPoziva } from '../../lib/nalog'
import { Loader } from '../../components/Zajednicke'

function opisStanja(roditelj: PozvanRoditelj): string {
  if (roditelj.aktivan) return 'Aktivan nalog'
  if (roditelj.nalogPostoji) return 'Pozivnica poslata, nalog još nije aktiviran'
  return 'Na listi, pozivnica nije poslata'
}

export function Roditelji() {
  const { jeVlasnikPlatforme } = useAuth()
  const [spisak, setSpisak] = useState<PozvanRoditelj[] | null>(null)
  const [email, setEmail] = useState('')
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [poruka, setPoruka] = useState<string | null>(null)

  async function ucitaj() {
    try {
      setSpisak(await listajPozvaneRoditelje())
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
    }
  }

  useEffect(() => {
    if (jeVlasnikPlatforme) void ucitaj()
  }, [jeVlasnikPlatforme])

  if (!jeVlasnikPlatforme) return <Navigate to="/admin" replace />

  async function pozovi(e: FormEvent) {
    e.preventDefault()
    setGreska(null)
    setPoruka(null)
    const adresa = normalizujEmail(email)
    if (!pozivniEmailJeIspravan(adresa)) {
      setGreska('Unesi ispravnu email adresu.')
      return
    }
    setRadi(true)
    try {
      const status: StatusPoziva = await pozoviRoditelja(adresa)
      setPoruka(porukaZaStatusPoziva(status))
      setEmail('')
      await ucitaj()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
    } finally {
      setRadi(false)
    }
  }

  return (
    <div className="roditelji">
      <h1 className="sr-only">Roditelji</h1>
      <section className="kartica razmak-dole">
        <h2>Pozovi roditelja</h2>
        <p className="blago razmak-dole">
          Nalog nastaje tek kad pozoveš roditelja. Na uneseni email stiže pozivnica, a roditelj se prijavljuje
          linkom iz mejla. Javna registracija ne postoji.
        </p>
        <form onSubmit={pozovi}>
          <div className="polje">
            <label htmlFor="pozivnica-email">Email roditelja</label>
            <input
              id="pozivnica-email" type="email" inputMode="email" autoCapitalize="none"
              autoCorrect="off" maxLength={254} placeholder="ime@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
          {poruka && <p className="poruka poruka--uspeh" role="status">{poruka}</p>}
          <button type="submit" className="dugme dugme--akcenat razmak-gore" disabled={radi}>
            {radi ? 'Šaljem…' : 'Pošalji pozivnicu'}
          </button>
        </form>
      </section>

      <section className="kartica">
        <h2>Pozvani roditelji</h2>
        {!spisak && !greska && <Loader tekst="Učitavam spisak…" />}
        {spisak && spisak.length === 0 && <p className="blago">Još nema pozvanih roditelja.</p>}
        {spisak && spisak.length > 0 && (
          <ul className="lista-roditelja">
            {spisak.map((roditelj) => (
              <li key={roditelj.email} className="red">
                <strong>{roditelj.email}</strong>
                <span className="malo blago">{opisStanja(roditelj)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="malo blago razmak-gore">
          Uklanjanje pristupa nije uvedeno. Trenutno se pristup ne može ukinuti iz aplikacije.
        </p>
      </section>
    </div>
  )
}
