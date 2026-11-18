// Pozivanje roditelja, podešavanje nivoa pristupa i spisak pozvanih. Vidi samo vlasnik platforme.
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
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
import {
  dostupniPredmetiZaRazrede, filtrirajPredmeteZaRazrede, kombinacijaPristupaJeIspravna,
} from '../../lib/predmet'
import {
  NAZIVI_PREDMETA, NAZIVI_RAZREDA, PREDMETI, RAZREDI, type Predmet, type Razred,
} from '../../types/db'
import { Ikona } from '../../components/Ikona'
import { Loader } from '../../components/Zajednicke'
import './roditelji.css'

const BOJE_PREDMETA: Record<Predmet, string> = {
  matematika: 'var(--boja-matematika)',
  srpski: 'var(--boja-srpski)',
  priroda_drustvo: 'var(--boja-priroda)',
}

const KRATKI_OPISI_PREDMETA: Record<Predmet, string> = {
  matematika: 'Brojevi, račun i logika',
  srpski: 'Pravopis, gramatika i čitanje',
  priroda_drustvo: 'Svet oko nas · 3. i 4. razred',
}

function podatakStanja(roditelj: PozvanRoditelj): { tekst: string; klasa: string } {
  if (roditelj.aktivan) return { tekst: 'Aktivan nalog', klasa: 'bedz bedz--uspeh' }
  if (roditelj.nalogPostoji) return { tekst: 'Pozivnica poslata', klasa: 'bedz bedz--upozorenje' }
  return { tekst: 'Na listi', klasa: 'bedz bedz--neutral' }
}

interface IzborPristupaProps {
  razredi: Razred[]
  predmeti: Predmet[]
  onPromeni(razredi: Razred[], predmeti: Predmet[]): void
  naslov?: string
}

function IzborPristupa({
  razredi,
  predmeti,
  onPromeni,
  naslov = 'Nivo pristupa',
}: IzborPristupaProps) {
  const dostupniPredmeti = dostupniPredmetiZaRazrede(razredi)
  const imaIzabraneRazrede = razredi.length > 0
  const sviDostupniPredmetiIzabrani = dostupniPredmeti.length > 0
    && dostupniPredmeti.every((p) => predmeti.includes(p))
  const sveIzabrano = razredi.length === RAZREDI.length && predmeti.length === PREDMETI.length
  const nekompatibilno = imaIzabraneRazrede
    && predmeti.length > 0
    && !kombinacijaPristupaJeIspravna(razredi, predmeti)
  const mesanoSaDrugimIliPetim = razredi.some((r) => r === 2 || r === 5)

  function preklopiRazred(r: Razred) {
    const postoji = razredi.includes(r)
    const sledeciRazredi = postoji
      ? razredi.filter((x) => x !== r)
      : RAZREDI.filter((x) => x === r || razredi.includes(x))
    const sledeciPredmeti = filtrirajPredmeteZaRazrede(predmeti, sledeciRazredi)
    onPromeni(sledeciRazredi, sledeciPredmeti)
  }

  function preklopiPredmet(p: Predmet) {
    const postoji = predmeti.includes(p)
    const sledeciPredmeti = postoji
      ? predmeti.filter((x) => x !== p)
      : dostupniPredmeti.filter((x) => x === p || predmeti.includes(x))
    onPromeni(razredi, sledeciPredmeti)
  }

  return (
    <div className="pristup-okvir">
      <div className="pristup-zaglavlje">
        <div className="pristup-naslov-grupa">
          <span className="pristup-ikona-bedz" aria-hidden="true">
            <Ikona ime="skola" velicina={18} />
          </span>
          <div>
            <strong>{naslov}</strong>
            <span className="pristup-podnaslov">
              Prvo izaberi razrede, pa aktivne predmete
            </span>
          </div>
        </div>
        <button
          type="button"
          className="dugme dugme--senka dugme--malo"
          onClick={() => {
            if (sveIzabrano) {
              onPromeni([], [])
            } else {
              onPromeni([...RAZREDI], [...PREDMETI])
            }
          }}
        >
          {sveIzabrano ? 'Poništi sve' : 'Izaberi sve'}
        </button>
      </div>

      <fieldset className="pristup-korak">
        <div className="pristup-korak-zaglavlje">
          <legend className="pristup-korak-naslov">
            <span className="pristup-korak-broj">1</span>
            <span>Razredi</span>
          </legend>
          {imaIzabraneRazrede && (
            <span className="pristup-brojac">{razredi.length} / {RAZREDI.length}</span>
          )}
        </div>

        <div className="pristup-mreza pristup-mreza--razredi">
          {RAZREDI.map((r) => {
            const izabran = razredi.includes(r)
            return (
              <label key={r} className={`pristup-kartica pristup-kartica--razred ${izabran ? 'je-izabrana' : ''}`}>
                <input
                  type="checkbox"
                  className="pristup-ulaz"
                  checked={izabran}
                  onChange={() => preklopiRazred(r)}
                />
                <span className="pristup-razred-tekst">
                  <span className="pristup-razred-broj">{r}.</span>
                  <span className="pristup-razred-oznaka">razred</span>
                </span>
                <span className="pristup-indikator" aria-hidden="true">
                  {izabran && <Ikona ime="potvrda" velicina={14} debljina={3} />}
                </span>
                <span className="sr-only">{NAZIVI_RAZREDA[r]}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {!imaIzabraneRazrede ? (
        <div className="pristup-prazno">
          <Ikona ime="knjiga" velicina={18} />
          <span>Izaberi bar jedan razred iznad da bi se pojavili aktivni predmeti.</span>
        </div>
      ) : (
        <fieldset className="pristup-korak pristup-korak--iskace">
          <div className="pristup-korak-zaglavlje">
            <legend className="pristup-korak-naslov">
              <span className="pristup-korak-broj">2</span>
              <span>Aktivni predmeti</span>
            </legend>
            <button
              type="button"
              className="pristup-brza-akcija"
              onClick={() => onPromeni(razredi, sviDostupniPredmetiIzabrani ? [] : [...dostupniPredmeti])}
            >
              {sviDostupniPredmetiIzabrani ? 'Poništi predmete' : 'Izaberi sve ponuđene'}
            </button>
          </div>

          <div className="pristup-mreza pristup-mreza--predmeti">
            {dostupniPredmeti.map((p) => {
              const izabran = predmeti.includes(p)
              const stilPredmeta = { '--predmet-boja': BOJE_PREDMETA[p] } as CSSProperties
              return (
                <label
                  key={p}
                  style={stilPredmeta}
                  className={`pristup-kartica pristup-kartica--predmet ${izabran ? 'je-izabrana' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="pristup-ulaz"
                    checked={izabran}
                    onChange={() => preklopiPredmet(p)}
                  />
                  <span className="pristup-predmet-tacka" aria-hidden="true" />
                  <span className="pristup-predmet-tekst">
                    <span className="pristup-predmet-naziv">{NAZIVI_PREDMETA[p]}</span>
                    <span className="pristup-predmet-opis">
                      {p === 'priroda_drustvo' && mesanoSaDrugimIliPetim
                        ? 'Samo za 3. i 4. razred'
                        : KRATKI_OPISI_PREDMETA[p]}
                    </span>
                  </span>
                  <span className="pristup-indikator" aria-hidden="true">
                    {izabran && <Ikona ime="potvrda" velicina={14} debljina={3} />}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {nekompatibilno ? (
        <p className="poruka poruka--upozorenje malo" style={{ margin: 0 }}>
          Priroda i društvo postoji samo za 3. i 4. razred. Izaberi 3. ili 4. razred ili dodaj drugi predmet.
        </p>
      ) : imaIzabraneRazrede && predmeti.length > 0 ? (
        <div className="pristup-rezime">
          <Ikona ime="gotovo" velicina={17} />
          <span>Izabrani pristup: <strong>{opisNivoaPristupa(razredi, predmeti)}</strong></span>
        </div>
      ) : imaIzabraneRazrede ? (
        <p className="pristup-podsetnik malo">
          Štikliraj bar jedan od ponuđenih predmeta.
        </p>
      ) : null}
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
    const pocetniRazredi = [...roditelj.allowedGrades]
    const pocetniPredmeti = filtrirajPredmeteZaRazrede(roditelj.allowedSubjects, pocetniRazredi)
    setUredjivanjeEmail(roditelj.email)
    setIzmenaRazredi(pocetniRazredi)
    setIzmenaPredmeti(pocetniPredmeti)
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
            onPromeni={(noviRazredi, noviPredmeti) => {
              setRazredi(noviRazredi)
              setPredmeti(noviPredmeti)
            }}
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
              const stanje = podatakStanja(roditelj)
              const filtriraniPredmeti = filtrirajPredmeteZaRazrede(
                roditelj.allowedSubjects,
                roditelj.allowedGrades,
              )
              return (
                <li key={roditelj.email} className="roditelj-stavka">
                  <div className="roditelj-red">
                    <div className="roditelj-podaci">
                      <div className="roditelj-naslov">
                        <strong>{roditelj.email}</strong>
                        <span className={stanje.klasa}>{stanje.tekst}</span>
                        {roditelj.jeVlasnik && <span className="bedz">Vlasnik platforme</span>}
                      </div>
                      <span className="roditelj-pristup-pilula malo">
                        {roditelj.jeVlasnik
                          ? 'Pun pristup (svi razredi i predmeti)'
                          : opisNivoaPristupa(
                              roditelj.allowedGrades,
                              filtriraniPredmeti.length > 0 ? filtriraniPredmeti : roditelj.allowedSubjects,
                            )}
                      </span>
                    </div>
                    {!roditelj.jeVlasnik && (
                      <button
                        type="button"
                        className="dugme dugme--senka dugme--malo"
                        onClick={() => uredjujeSe ? setUredjivanjeEmail(null) : otvoriIzmenu(roditelj)}
                      >
                        <Ikona ime={uredjujeSe ? 'zatvori' : 'uredi'} velicina={16} />
                        <span>{uredjujeSe ? 'Zatvori' : 'Izmeni pristup'}</span>
                      </button>
                    )}
                  </div>

                  {uredjujeSe && (
                    <div className="roditelj-pristup-uredu">
                      <IzborPristupa
                        naslov={`Izmena pristupa za ${roditelj.email}`}
                        razredi={izmenaRazredi}
                        predmeti={izmenaPredmeti}
                        onPromeni={(noviRazredi, noviPredmeti) => {
                          setIzmenaRazredi(noviRazredi)
                          setIzmenaPredmeti(noviPredmeti)
                        }}
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
