// Pozivanje roditelja, podešavanje nivoa pristupa i spisak pozvanih. Vidi samo vlasnik platforme.
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import {
  azurirajPristupRoditelja, listajPozvaneRoditelje, pozoviRoditelja, type PozvanRoditelj,
} from '../../lib/api'
import { normalizujEmail } from '../../lib/email'
import {
  opisNivoaPristupa, porukaZaStatusPoziva, pozivniEmailJeIspravan,
  validirajNivoPristupa, type StatusPoziva,
} from '../../lib/nalog'
import { kombinacijaPristupaJeIspravna } from '../../lib/predmet'
import {
  NAZIVI_PREDMETA, NAZIVI_RAZREDA, PREDMETI, RAZREDI, type Predmet, type Razred,
} from '../../types/db'
import { Loader } from '../../components/Zajednicke'
import './roditelji.css'

function opisStanja(roditelj: PozvanRoditelj): string {
  if (roditelj.aktivan) return 'Aktivan nalog'
  if (roditelj.nalogPostoji) return 'Pozivnica poslata, nalog još nije aktiviran'
  return 'Na listi, pozivnica nije poslata'
}

interface IzborPristupaProps {
  razredi: Razred[]
  predmeti: Predmet[]
  onPromeniRazrede(novi: Razred[]): void
  onPromeniPredmete(novi: Predmet[]): void
  naslov?: string
}

function IzborPristupa({
  razredi,
  predmeti,
  onPromeniRazrede,
  onPromeniPredmete,
  naslov = 'Nivo pristupa',
}: IzborPristupaProps) {
  function preklopiRazred(r: Razred) {
    const postoji = razredi.includes(r)
    const sledeci = postoji
      ? razredi.filter((x) => x !== r)
      : RAZREDI.filter((x) => x === r || razredi.includes(x))
    onPromeniRazrede(sledeci)
  }

  function preklopiPredmet(p: Predmet) {
    const postoji = predmeti.includes(p)
    const sledeci = postoji
      ? predmeti.filter((x) => x !== p)
      : PREDMETI.filter((x) => x === p || predmeti.includes(x))
    onPromeniPredmete(sledeci)
  }

  const sveIzabrano = razredi.length === RAZREDI.length && predmeti.length === PREDMETI.length
  const nekompatibilno = razredi.length > 0 && predmeti.length > 0 && !kombinacijaPristupaJeIspravna(razredi, predmeti)

  return (
    <div className="pristup-okvir">
      <div className="pristup-zaglavlje">
        <strong>{naslov}</strong>
        <div className="red">
          <button
            type="button"
            className="dugme dugme--senka dugme--malo"
            onClick={() => {
              if (sveIzabrano) {
                onPromeniRazrede([])
                onPromeniPredmete([])
              } else {
                onPromeniRazrede([...RAZREDI])
                onPromeniPredmete([...PREDMETI])
              }
            }}
          >
            {sveIzabrano ? 'Poništi sve' : 'Izaberi sve'}
          </button>
        </div>
      </div>

      <fieldset className="pristup-grupa">
        <legend>Razredi</legend>
        <div className="pristup-mreza">
          {RAZREDI.map((r) => {
            const izabran = razredi.includes(r)
            return (
              <label key={r} className={`pristup-stavka ${izabran ? 'pristup-stavka--izabrana' : ''}`}>
                <input
                  type="checkbox"
                  checked={izabran}
                  onChange={() => preklopiRazred(r)}
                />
                <span>{NAZIVI_RAZREDA[r]}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="pristup-grupa">
        <legend>Predmeti</legend>
        <div className="pristup-mreza">
          {PREDMETI.map((p) => {
            const izabran = predmeti.includes(p)
            return (
              <label key={p} className={`pristup-stavka ${izabran ? 'pristup-stavka--izabrana' : ''}`}>
                <input
                  type="checkbox"
                  checked={izabran}
                  onChange={() => preklopiPredmet(p)}
                />
                <span>
                  {NAZIVI_PREDMETA[p]}
                  {p === 'priroda_drustvo' && <span className="pristup-napomena"> (3. i 4. razred)</span>}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {nekompatibilno ? (
        <p className="poruka poruka--upozorenje malo" style={{ margin: 0 }}>
          Priroda i društvo postoji samo za 3. i 4. razred. Izaberi 3. ili 4. razred ili dodaj drugi predmet.
        </p>
      ) : razredi.length > 0 && predmeti.length > 0 ? (
        <p className="malo blago">
          Izabrano: <strong>{opisNivoaPristupa(razredi, predmeti)}</strong>
        </p>
      ) : (
        <p className="malo blago">Štikliraj razrede i predmete kojima roditelj treba da ima pristup.</p>
      )}
    </div>
  )
}

export function Roditelji() {
  const { jeVlasnikPlatforme } = useAuth()
  const [spisak, setSpisak] = useState<PozvanRoditelj[] | null>(null)
  const [email, setEmail] = useState('')
  const [razredi, setRazredi] = useState<Razred[]>([])
  const [predmeti, setPredmeti] = useState<Predmet[]>([])
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [poruka, setPoruka] = useState<string | null>(null)

  const [uredjivanjeEmail, setUredjivanjeEmail] = useState<string | null>(null)
  const [izmenaRazredi, setIzmenaRazredi] = useState<Razred[]>([])
  const [izmenaPredmeti, setIzmenaPredmeti] = useState<Predmet[]>([])
  const [cuvaIzmenu, setCuvaIzmenu] = useState(false)
  const [greskaIzmene, setGreskaIzmene] = useState<string | null>(null)

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
    const greskaPristupa = validirajNivoPristupa(razredi, predmeti)
    if (greskaPristupa) {
      setGreska(greskaPristupa)
      return
    }
    setRadi(true)
    try {
      const status: StatusPoziva = await pozoviRoditelja(adresa, razredi, predmeti)
      setPoruka(porukaZaStatusPoziva(status))
      setEmail('')
      setRazredi([])
      setPredmeti([])
      await ucitaj()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
    } finally {
      setRadi(false)
    }
  }

  function otvoriIzmenu(roditelj: PozvanRoditelj) {
    setUredjivanjeEmail(roditelj.email)
    setIzmenaRazredi([...roditelj.allowedGrades])
    setIzmenaPredmeti([...roditelj.allowedSubjects])
    setGreskaIzmene(null)
    setPoruka(null)
  }

  async function sacuvajIzmenu(targetEmail: string) {
    setGreskaIzmene(null)
    const greskaPristupa = validirajNivoPristupa(izmenaRazredi, izmenaPredmeti)
    if (greskaPristupa) {
      setGreskaIzmene(greskaPristupa)
      return
    }
    setCuvaIzmenu(true)
    try {
      await azurirajPristupRoditelja(targetEmail, izmenaRazredi, izmenaPredmeti)
      setUredjivanjeEmail(null)
      setPoruka(`Nivo pristupa za ${targetEmail} je sačuvan.`)
      await ucitaj()
    } catch (err) {
      setGreskaIzmene(String((err as Error).message ?? err))
    } finally {
      setCuvaIzmenu(false)
    }
  }

  return (
    <div className="roditelji">
      <h1 className="sr-only">Roditelji</h1>
      <section className="kartica razmak-dole">
        <h2>Pozovi roditelja</h2>
        <p className="blago razmak-dole">
          Nalog nastaje tek kad pozoveš roditelja. Izaberi razrede i predmete kojima želiš da mu daš pristup,
          a na uneseni email stiže pozivnica za prvi ulazak u aplikaciju.
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
          <IzborPristupa
            razredi={razredi}
            predmeti={predmeti}
            onPromeniRazrede={setRazredi}
            onPromeniPredmete={setPredmeti}
          />
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
            {spisak.map((roditelj) => {
              const uredjujeSe = uredjivanjeEmail === roditelj.email
              return (
                <li key={roditelj.email} className="roditelj-stavka">
                  <div className="roditelj-red">
                    <div className="roditelj-podaci">
                      <div className="roditelj-naslov">
                        <strong>{roditelj.email}</strong>
                        {roditelj.jeVlasnik && <span className="bedz bedz--uspeh">Vlasnik platforme</span>}
                      </div>
                      <span className="malo blago">{opisStanja(roditelj)}</span>
                      <span className="malo">
                        {roditelj.jeVlasnik
                          ? 'Pun pristup (svi razredi i predmeti)'
                          : `Pristup: ${opisNivoaPristupa(roditelj.allowedGrades, roditelj.allowedSubjects)}`}
                      </span>
                    </div>
                    {!roditelj.jeVlasnik && (
                      <button
                        type="button"
                        className="dugme dugme--senka dugme--malo"
                        onClick={() => uredjujeSe ? setUredjivanjeEmail(null) : otvoriIzmenu(roditelj)}
                      >
                        {uredjujeSe ? 'Zatvori' : 'Izmeni pristup'}
                      </button>
                    )}
                  </div>

                  {uredjujeSe && (
                    <div className="roditelj-pristup-uredu">
                      <IzborPristupa
                        naslov={`Izmena pristupa za ${roditelj.email}`}
                        razredi={izmenaRazredi}
                        predmeti={izmenaPredmeti}
                        onPromeniRazrede={setIzmenaRazredi}
                        onPromeniPredmete={setIzmenaPredmeti}
                      />
                      {greskaIzmene && <p className="poruka poruka--greska" role="alert">{greskaIzmene}</p>}
                      <div className="red">
                        <button
                          type="button"
                          className="dugme dugme--akcenat dugme--malo"
                          disabled={cuvaIzmenu}
                          onClick={() => void sacuvajIzmenu(roditelj.email)}
                        >
                          {cuvaIzmenu ? 'Čuvam…' : 'Sačuvaj pristup'}
                        </button>
                        <button
                          type="button"
                          className="dugme dugme--senka dugme--malo"
                          disabled={cuvaIzmenu}
                          onClick={() => setUredjivanjeEmail(null)}
                        >
                          Otkaži
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <p className="malo blago razmak-gore">
          Potpuno uklanjanje naloga nije uvedeno iz aplikacije, ali nivo pristupa (razrede i predmete) možeš
          izmeniti u svakom trenutku.
        </p>
      </section>
    </div>
  )
}
