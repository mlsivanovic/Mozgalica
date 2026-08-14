import { useState, type FormEvent } from 'react'
import {
  obrisiDnevniRasporedSaha, postaviAktivnostDnevnogRasporedaSaha,
  sacuvajDnevniRasporedSaha, type NoviDnevniRasporedSaha,
} from '../../lib/api'
import { formatDatum } from '../../lib/format'
import { SAH_ELO_NIVOI, SAH_SATOVI } from '../../sah/podesavanja'
import type { DnevniRasporedSaha, ProfilDeteta, SahBoja } from '../../types/db'

interface FormaRasporeda extends NoviDnevniRasporedSaha {
  id?: string
}

function novaForma(profili: ProfilDeteta[]): FormaRasporeda {
  return {
    childProfileId: profili[0]?.id ?? '',
    approximateElo: 900,
    childColor: 'white',
    clockSeconds: 600,
    dailyTime: '18:00',
  }
}

function formaIzRasporeda(raspored: DnevniRasporedSaha): FormaRasporeda {
  return {
    id: raspored.id,
    childProfileId: raspored.child_profile_id,
    approximateElo: raspored.approximate_elo,
    childColor: raspored.child_color,
    clockSeconds: raspored.clock_seconds,
    dailyTime: raspored.daily_time.slice(0, 5),
  }
}

function opisSledeceg(raspored: DnevniRasporedSaha): string {
  if (!raspored.is_active) return 'Pauziran'
  const [godina, mesec, dan] = raspored.next_run_on.split('-').map(Number)
  const datum = new Date(godina, mesec - 1, dan)
  return `${datum.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long' })} u ${raspored.daily_time.slice(0, 5)}`
}

function opisSata(sekunde: DnevniRasporedSaha['clock_seconds']): string {
  return sekunde ? `${sekunde / 60}+0` : 'bez sata'
}

export function DnevniRasporediSaha({
  profili, rasporedi, onPromena,
}: {
  profili: ProfilDeteta[]
  rasporedi: DnevniRasporedSaha[]
  onPromena: () => Promise<void>
}) {
  const [forma, setForma] = useState<FormaRasporeda | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState<string | null>(null)

  async function sacuvaj(e: FormEvent) {
    e.preventDefault()
    if (!forma?.childProfileId) {
      setGreska('Izaberi profil deteta.')
      return
    }

    setRadi('cuvanje')
    setGreska(null)
    try {
      await sacuvajDnevniRasporedSaha(forma, forma.id)
      setForma(null)
      await onPromena()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
    } finally {
      setRadi(null)
    }
  }

  async function promeniAktivnost(raspored: DnevniRasporedSaha) {
    setRadi(raspored.id)
    setGreska(null)
    try {
      await postaviAktivnostDnevnogRasporedaSaha(raspored.id, !raspored.is_active)
      await onPromena()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
    } finally {
      setRadi(null)
    }
  }

  async function obrisi(raspored: DnevniRasporedSaha) {
    if (!confirm(`Obrisati dnevni raspored za ${raspored.child_name}? Već poslate partije ostaju sačuvane.`)) return
    setRadi(raspored.id)
    setGreska(null)
    try {
      await obrisiDnevniRasporedSaha(raspored.id)
      if (forma?.id === raspored.id) setForma(null)
      await onPromena()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
    } finally {
      setRadi(null)
    }
  }

  return (
    <section>
      <div className="zaglavlje-strane">
        <div>
          <h2>Dnevni rasporedi</h2>
          <p className="blago malo">Svaki dan nastaje nova partija. Push obaveštenje stiže na povezane uređaje, bez mejla.</p>
        </div>
        <button
          type="button" className="dugme dugme--akcenat"
          onClick={() => { setGreska(null); setForma(novaForma(profili)) }}
          disabled={profili.length === 0}
        >
          + Novi raspored
        </button>
      </div>

      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

      {forma && (
        <form className="kartica razmak-dole" onSubmit={sacuvaj}>
          <div className="red red--razmak">
            <h3>{forma.id ? 'Uredi dnevni raspored' : 'Novi dnevni raspored'}</h3>
            <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setForma(null)}>Zatvori</button>
          </div>
          <p className="blago malo razmak-dole">Prva partija stiže u prvom narednom izabranom terminu po vremenu Srbije.</p>

          <div className="red-polja">
            <div className="polje">
              <label htmlFor="ds-dete">Dete</label>
              <select id="ds-dete" value={forma.childProfileId} onChange={(e) => setForma({ ...forma, childProfileId: e.target.value })}>
                {profili.map((profil) => <option key={profil.id} value={profil.id}>{profil.avatar} {profil.name}</option>)}
              </select>
            </div>
            <div className="polje">
              <label htmlFor="ds-vreme">Vreme slanja</label>
              <input id="ds-vreme" type="time" value={forma.dailyTime} onChange={(e) => setForma({ ...forma, dailyTime: e.target.value })} required />
            </div>
          </div>

          <div className="red-polja">
            <div className="polje">
              <label htmlFor="ds-elo">Približni ELO</label>
              <select id="ds-elo" value={forma.approximateElo} onChange={(e) => setForma({ ...forma, approximateElo: Number(e.target.value) as FormaRasporeda['approximateElo'] })}>
                {SAH_ELO_NIVOI.map((nivo) => <option value={nivo} key={nivo}>{nivo}</option>)}
              </select>
            </div>
            <div className="polje">
              <label htmlFor="ds-boja">Boja deteta</label>
              <select id="ds-boja" value={forma.childColor} onChange={(e) => setForma({ ...forma, childColor: e.target.value as SahBoja })}>
                <option value="white">Beli</option>
                <option value="black">Crni</option>
              </select>
            </div>
            <div className="polje">
              <label htmlFor="ds-sat">Sat</label>
              <select id="ds-sat" value={forma.clockSeconds ?? ''} onChange={(e) => setForma({ ...forma, clockSeconds: e.target.value ? Number(e.target.value) as NonNullable<FormaRasporeda['clockSeconds']> : null })}>
                {SAH_SATOVI.map((opcija) => <option value={opcija.value} key={opcija.label}>{opcija.label}</option>)}
              </select>
            </div>
          </div>

          <button className="dugme dugme--akcenat" type="submit" disabled={radi === 'cuvanje'}>
            {radi === 'cuvanje' ? 'Čuvam…' : 'Sačuvaj raspored'}
          </button>
        </form>
      )}

      {rasporedi.length === 0 ? (
        <p className="blago">Nema dnevnih rasporeda. Napravi prvi raspored za redovno igranje.</p>
      ) : (
        <div className="mreza-kartica">
          {rasporedi.map((raspored) => (
            <article className="kartica" key={raspored.id}>
              <div className="red red--razmak">
                <h3>{raspored.child_avatar} {raspored.child_name}</h3>
                <span className={`bedz ${raspored.is_active ? 'bedz--uspeh' : 'bedz--neutral'}`}>{raspored.is_active ? 'Aktivan' : 'Pauziran'}</span>
              </div>
              <p>ELO {raspored.approximate_elo} · {raspored.child_color === 'white' ? 'beli' : 'crni'} · {opisSata(raspored.clock_seconds)}</p>
              <p className="malo razmak-gore"><strong>Sledeća:</strong> {opisSledeceg(raspored)}</p>
              <p className="malo blago">Poslednja: {raspored.last_sent_at ? formatDatum(raspored.last_sent_at) : 'još nije poslata'}</p>
              {raspored.last_error && <p className="poruka poruka--greska malo">Poslednja greška: {raspored.last_error}</p>}
              <div className="red razmak-gore">
                <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => { setGreska(null); setForma(formaIzRasporeda(raspored)) }}>Uredi</button>
                <button type="button" className="dugme dugme--senka dugme--malo" disabled={radi === raspored.id} onClick={() => { void promeniAktivnost(raspored) }}>
                  {raspored.is_active ? 'Pauziraj' : 'Nastavi'}
                </button>
                <button type="button" className="dugme dugme--opasno dugme--malo" disabled={radi === raspored.id} onClick={() => { void obrisi(raspored) }}>Obriši</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
