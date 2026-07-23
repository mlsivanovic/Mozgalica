// Administratorska podešavanja: profili dece, titule i mejl obaveštenja.
import { useEffect, useState } from 'react'
import { Loader } from '../../components/Zajednicke'
import {
  listajNivoeTitula, listajProfileDeteta, postaviEmailObavestenja, sacuvajNivoeTitula,
  sacuvajProfilDeteta, ucitajPodesavanja,
} from '../../lib/api'
import { useAuth } from '../../lib/auth'
import {
  AVATARI_DECE, type AvatarDeteta, type NivoTitule, type ProfilDeteta,
} from '../../types/db'

const BAZA_URL = `${window.location.origin}${import.meta.env.BASE_URL}`

interface ProfilForma {
  id?: string
  name: string
  birth_date: string
  avatar: AvatarDeteta
}

export function Podesavanja() {
  const { session } = useAuth()
  const [ucitava, setUcitava] = useState(true)
  const [ukljucena, setUkljucena] = useState(true)
  const [profili, setProfili] = useState<ProfilDeteta[]>([])
  const [nivoi, setNivoi] = useState<NivoTitule[]>([])
  const [forma, setForma] = useState<ProfilForma | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [poruka, setPoruka] = useState<string | null>(null)
  const [cuvaProfil, setCuvaProfil] = useState(false)
  const [cuvaTitule, setCuvaTitule] = useState(false)

  async function ucitajSve() {
    setUcitava(true)
    try {
      const [podesavanja, ucitaniProfili, ucitaniNivoi] = await Promise.all([
        ucitajPodesavanja(), listajProfileDeteta(), listajNivoeTitula(),
      ])
      setUkljucena(podesavanja?.email_notifications ?? true)
      setProfili(ucitaniProfili)
      setNivoi(ucitaniNivoi)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { void ucitajSve() }, [])

  async function promeniEmail(vrednost: boolean) {
    if (!session) return
    setUkljucena(vrednost)
    setPoruka(null)
    setGreska(null)
    try {
      await postaviEmailObavestenja(session.user.id, vrednost)
      setPoruka('Mejl podešavanje je sačuvano.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  function noviProfil() {
    setForma({ name: '', birth_date: '', avatar: '🧠' })
    setGreska(null)
    setPoruka(null)
  }

  function urediProfil(profil: ProfilDeteta) {
    setForma({
      id: profil.id,
      name: profil.name,
      birth_date: profil.birth_date ?? '',
      avatar: profil.avatar,
    })
    setGreska(null)
    setPoruka(null)
  }

  async function sacuvajProfil() {
    if (!session || !forma) return
    if (!forma.name.trim()) {
      setGreska('Unesi ime deteta.')
      return
    }
    if (forma.birth_date && forma.birth_date > new Date().toISOString().slice(0, 10)) {
      setGreska('Datum rođenja ne može biti u budućnosti.')
      return
    }
    setCuvaProfil(true)
    setGreska(null)
    try {
      await sacuvajProfilDeteta({
        owner_id: session.user.id,
        name: forma.name.trim(),
        birth_date: forma.birth_date || null,
        avatar: forma.avatar,
      }, forma.id)
      setForma(null)
      await ucitajSve()
      setPoruka('Profil je sačuvan.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuvaProfil(false)
    }
  }

  async function kopirajProfilniLink(profil: ProfilDeteta) {
    await navigator.clipboard.writeText(`${BAZA_URL}#/dete/${profil.public_token}`)
    setPoruka(`Profilni link za ${profil.name} je kopiran.`)
  }

  function izmeniNivo(indeks: number, izmene: Partial<Pick<NivoTitule, 'name' | 'min_stars'>>) {
    setNivoi((prethodni) => prethodni.map((n, i) => i === indeks ? { ...n, ...izmene } : n))
    setPoruka(null)
  }

  function dodajNivo() {
    const sledeciPrag = Math.max(-5, ...nivoi.map((n) => n.min_stars)) + 5
    setNivoi((prethodni) => [...prethodni, {
      id: `novi-${Date.now()}`,
      owner_id: session?.user.id ?? '',
      name: 'Nova titula',
      min_stars: sledeciPrag,
      created_at: new Date().toISOString(),
    }])
  }

  function obrisiNivo(indeks: number) {
    setNivoi((prethodni) => prethodni.filter((_, i) => i !== indeks))
    setPoruka(null)
  }

  async function sacuvajTitule() {
    setCuvaTitule(true)
    setGreska(null)
    setPoruka(null)
    try {
      await sacuvajNivoeTitula(nivoi.map((n) => ({
        name: n.name.trim(),
        min_stars: Number(n.min_stars),
      })))
      await ucitajSve()
      setPoruka('Titule su sačuvane.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuvaTitule(false)
    }
  }

  if (ucitava) return <Loader />

  return (
    <div className="sadrzaj sadrzaj--usko">
      <h1>Podešavanja</h1>
      {poruka && <p className="poruka poruka--uspeh razmak-gore">{poruka}</p>}
      {greska && <p className="poruka poruka--greska razmak-gore" role="alert">{greska}</p>}

      <section className="kartica razmak-gore">
        <div className="red red--razmak">
          <div>
            <h2>Profili dece</h2>
            <p className="blago malo">Svako dete ima svoj stalni link sa kvizovima i rezultatima.</p>
          </div>
          <button type="button" className="dugme dugme--akcenat dugme--malo" onClick={noviProfil}>
            + Novi profil
          </button>
        </div>

        <div className="mreza-kartica razmak-gore">
          {profili.map((profil) => (
            <article key={profil.id} className="kartica" style={{ border: '1px solid var(--boja-ivica)', boxShadow: 'none' }}>
              <div className="red">
                <span aria-hidden="true" style={{ fontSize: '2.2rem' }}>{profil.avatar}</span>
                <div>
                  <h3>{profil.name}</h3>
                  <p className="malo blago">
                    {profil.birth_date
                      ? `Rođen/a ${new Date(`${profil.birth_date}T12:00:00`).toLocaleDateString('sr-Latn-RS')}`
                      : 'Datum rođenja nije unet'}
                  </p>
                </div>
              </div>
              <div className="red razmak-gore">
                <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => urediProfil(profil)}>
                  Uredi
                </button>
                <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => kopirajProfilniLink(profil)}>
                  Kopiraj link
                </button>
              </div>
            </article>
          ))}
        </div>

        {forma && (
          <div className="modal-pozadina" role="presentation" onClick={() => setForma(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profil-forma-naslov" onClick={(e) => e.stopPropagation()}>
              <h2 id="profil-forma-naslov">{forma.id ? 'Uredi profil' : 'Novi profil'}</h2>
              <div className="polje razmak-gore">
                <label htmlFor="pd-ime">Ime</label>
                <input
                  id="pd-ime" type="text" maxLength={60} autoFocus
                  value={forma.name} onChange={(e) => setForma({ ...forma, name: e.target.value })}
                />
              </div>
              <div className="polje">
                <label htmlFor="pd-datum">Datum rođenja (opciono)</label>
                <input
                  id="pd-datum" type="date" max={new Date().toISOString().slice(0, 10)}
                  value={forma.birth_date} onChange={(e) => setForma({ ...forma, birth_date: e.target.value })}
                />
              </div>
              <fieldset className="polje" style={{ border: 0 }}>
                <legend style={{ fontWeight: 700 }}>Avatar</legend>
                <div className="red" style={{ marginTop: '0.4rem' }}>
                  {AVATARI_DECE.map((avatar) => (
                    <label key={avatar} style={{ cursor: 'pointer' }}>
                      <input
                        className="sr-only" type="radio" name="avatar" value={avatar}
                        checked={forma.avatar === avatar}
                        onChange={() => setForma({ ...forma, avatar })}
                      />
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14,
                          fontSize: '1.8rem', border: forma.avatar === avatar ? '3px solid var(--boja-primarna)' : '2px solid var(--boja-ivica)',
                          background: 'var(--boja-polje)',
                        }}
                      >
                        {avatar}
                      </span>
                      <span className="sr-only">Avatar {avatar}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="red red--kraj razmak-gore">
                <button type="button" className="dugme dugme--senka" onClick={() => setForma(null)}>Otkaži</button>
                <button type="button" className="dugme dugme--akcenat" disabled={cuvaProfil} onClick={sacuvajProfil}>
                  {cuvaProfil ? 'Čuvam…' : 'Sačuvaj profil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="kartica razmak-gore">
        <h2>Titule</h2>
        <p className="blago razmak-dole">
          Ista lista važi za svu decu. Mora da postoji početna titula od 0 zvezdica.
        </p>
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          {nivoi.map((nivo, indeks) => (
            <div className="red-polja" key={nivo.id}>
              <div className="polje" style={{ marginBottom: 0 }}>
                <label htmlFor={`titula-${indeks}`}>Naziv</label>
                <input
                  id={`titula-${indeks}`} type="text" maxLength={60}
                  value={nivo.name} onChange={(e) => izmeniNivo(indeks, { name: e.target.value })}
                />
              </div>
              <div className="polje" style={{ marginBottom: 0, maxWidth: 160 }}>
                <label htmlFor={`prag-${indeks}`}>Od zvezdica</label>
                <input
                  id={`prag-${indeks}`} type="number" min={0}
                  value={nivo.min_stars}
                  onChange={(e) => izmeniNivo(indeks, { min_stars: Number(e.target.value) })}
                />
              </div>
              <button
                type="button" className="dugme dugme--opasno dugme--malo"
                style={{ alignSelf: 'flex-end' }} disabled={nivoi.length === 1}
                onClick={() => obrisiNivo(indeks)}
              >
                Obriši
              </button>
            </div>
          ))}
        </div>
        <div className="red razmak-gore">
          <button type="button" className="dugme dugme--senka" onClick={dodajNivo}>+ Dodaj titulu</button>
          <button type="button" className="dugme" disabled={cuvaTitule} onClick={sacuvajTitule}>
            {cuvaTitule ? 'Čuvam…' : 'Sačuvaj titule'}
          </button>
        </div>
      </section>

      <section className="kartica razmak-gore">
        <h2>Mejl obaveštenja</h2>
        <p className="blago razmak-dole">
          Kada dete završi kviz, na tvoju email adresu stiže obaveštenje sa rezultatom.
        </p>
        <label className="stiklir">
          <input type="checkbox" checked={ukljucena} onChange={(e) => promeniEmail(e.target.checked)} />
          Pošalji mi mejl kada dete završi kviz
        </label>
      </section>
    </div>
  )
}
