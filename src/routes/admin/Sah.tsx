import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SahTabla } from '../../components/SahTabla'
import { Loader, Modal } from '../../components/Zajednicke'
import {
  dodeliSahPartiju, listajPotezeSahPartije, listajProfileDeteta, listajSahPartije,
  otkaziSahPartiju,
} from '../../lib/api'
import { podrazumevanoSlanjeMejla } from '../../lib/email'
import { formatDatum } from '../../lib/format'
import type { ProfilDeteta, SahBoja, SahPartija, SahPotez } from '../../types/db'
import '../sah/sah.css'

const ELO_NIVOI = [700, 900, 1100, 1300, 1500] as const
const SATOVI = [
  { value: '', label: 'Bez sata' },
  { value: '300', label: '5+0' },
  { value: '600', label: '10+0' },
  { value: '900', label: '15+0' },
  { value: '1800', label: '30+0' },
] as const

function statusTekst(partija: SahPartija): string {
  if (partija.status === 'assigned') return 'Nije započeta'
  if (partija.status === 'in_progress') return 'U toku'
  if (partija.status === 'cancelled') return 'Otkazana'
  if (partija.result === 'child_win') return 'Pobeda deteta'
  if (partija.result === 'draw') return 'Remi'
  return 'Poraz deteta'
}

function statusKlasa(partija: SahPartija): string {
  if (partija.status === 'completed' && partija.result !== 'child_loss') return 'bedz--uspeh'
  if (partija.status === 'in_progress') return 'bedz--upozorenje'
  if (partija.status === 'cancelled' || partija.result === 'child_loss') return 'bedz--greska'
  return ''
}

export function Sah() {
  const [profili, setProfili] = useState<ProfilDeteta[]>([])
  const [partije, setPartije] = useState<SahPartija[]>([])
  const [ucitava, setUcitava] = useState(true)
  const [radi, setRadi] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [profilId, setProfilId] = useState('')
  const [elo, setElo] = useState<(typeof ELO_NIVOI)[number]>(900)
  const [boja, setBoja] = useState<SahBoja>('white')
  const [sat, setSat] = useState('600')
  const [posaljiEmail, setPosaljiEmail] = useState(false)
  const [pregled, setPregled] = useState<{ partija: SahPartija; potezi: SahPotez[] } | null>(null)
  const [potezIndeks, setPotezIndeks] = useState(-1)
  const zahtevId = useRef(crypto.randomUUID())

  async function ucitaj() {
    setGreska(null)
    try {
      const [noviProfili, novePartije] = await Promise.all([listajProfileDeteta(), listajSahPartije()])
      setProfili(noviProfili)
      setPartije(novePartije)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { void ucitaj() }, [])

  async function dodeli(e: FormEvent) {
    e.preventDefault()
    if (!profilId) {
      setGreska('Izaberi profil deteta.')
      return
    }
    setRadi(true)
    setGreska(null)
    try {
      await dodeliSahPartiju({
        childProfileId: profilId,
        approximateElo: elo,
        childColor: boja,
        clockSeconds: sat ? Number(sat) as 300 | 600 | 900 | 1800 : null,
        sendEmail: posaljiEmail,
        idempotencyKey: zahtevId.current,
      })
      zahtevId.current = crypto.randomUUID()
      setProfilId('')
      setPosaljiEmail(false)
      await ucitaj()
    } catch (err) {
      setGreska(String((err as Error).message ?? err))
    } finally {
      setRadi(false)
    }
  }

  async function otkazi(partija: SahPartija) {
    if (!confirm('Otkazati ovu partiju? Dete je više neće videti i neće dobiti zvezdice.')) return
    try {
      await otkaziSahPartiju(partija.id)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  async function otvori(partija: SahPartija) {
    try {
      const potezi = await listajPotezeSahPartije(partija.id)
      setPregled({ partija, potezi })
      setPotezIndeks(potezi.length - 1)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  if (ucitava) return <Loader tekst="Učitavanje šahovskih partija…" />
  const profil = profili.find((p) => p.id === profilId)
  const mapaProfila = new Map(profili.map((p) => [p.id, p]))

  return (
    <div>
      <div className="zaglavlje-strane">
        <div>
          <h1>Šah</h1>
          <p className="blago">Dodeli detetu jednu partiju protiv računara približne jačine.</p>
        </div>
      </div>

      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

      <form className="kartica razmak-dole" onSubmit={dodeli}>
        <h2>Nova partija</h2>
        <div className="red-polja razmak-gore">
          <div className="polje">
            <label htmlFor="sah-profil">Dete</label>
            <select
              id="sah-profil" value={profilId}
              onChange={(e) => {
                const id = e.target.value
                const izabrani = profili.find((p) => p.id === id)
                setProfilId(id)
                setPosaljiEmail(podrazumevanoSlanjeMejla(
                  izabrani?.email, izabrani?.notify_new_quiz_email ?? false,
                ))
              }}
            >
              <option value="">Izaberi profil…</option>
              {profili.map((p) => <option value={p.id} key={p.id}>{p.avatar} {p.name}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="sah-elo">Približni ELO</label>
            <select id="sah-elo" value={elo} onChange={(e) => setElo(Number(e.target.value) as typeof elo)}>
              {ELO_NIVOI.map((nivo) => <option value={nivo} key={nivo}>{nivo}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="sah-boja">Boja deteta</label>
            <select id="sah-boja" value={boja} onChange={(e) => setBoja(e.target.value as SahBoja)}>
              <option value="white">Beli</option>
              <option value="black">Crni</option>
            </select>
          </div>
          <div className="polje">
            <label htmlFor="sah-sat">Sat</label>
            <select id="sah-sat" value={sat} onChange={(e) => setSat(e.target.value)}>
              {SATOVI.map((opcija) => <option value={opcija.value} key={opcija.label}>{opcija.label}</option>)}
            </select>
          </div>
        </div>
        {profilId && (
          <label className="stiklir razmak-dole">
            <input
              type="checkbox" checked={posaljiEmail} disabled={!profil?.email}
              onChange={(e) => setPosaljiEmail(e.target.checked)}
            />
            Pošalji i mejl detetu
          </label>
        )}
        <button className="dugme dugme--akcenat" type="submit" disabled={radi || profili.length === 0}>
          {radi ? 'Dodeljujem…' : '♟️ Dodeli partiju'}
        </button>
      </form>

      {partije.length === 0 ? <p className="blago">Još nema dodeljenih partija.</p> : (
        <div className="tabela-omot">
          <table className="tabela tabela--kartice">
            <thead><tr><th>Dete</th><th>Postavke</th><th>Status</th><th>Zvezdice</th><th>Datum</th><th /></tr></thead>
            <tbody>
              {partije.map((partija) => {
                const dete = mapaProfila.get(partija.child_profile_id)
                return (
                  <tr key={partija.id}>
                    <td data-naslov="Dete">{dete?.avatar} {dete?.name ?? 'Nepoznat profil'}</td>
                    <td data-naslov="Postavke">
                      ELO {partija.approximate_elo} · {partija.child_color === 'white' ? 'beli' : 'crni'} ·{' '}
                      {partija.clock_seconds ? `${partija.clock_seconds / 60}+0` : 'bez sata'}
                    </td>
                    <td data-naslov="Status"><span className={`bedz ${statusKlasa(partija)}`}>{statusTekst(partija)}</span></td>
                    <td data-naslov="Zvezdice">{partija.stars_awarded == null ? '—' : `${partija.stars_awarded} ⭐`}</td>
                    <td data-naslov="Datum">{formatDatum(partija.completed_at ?? partija.created_at)}</td>
                    <td>
                      <div className="red red--kraj">
                        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => void otvori(partija)}>
                          Pregled
                        </button>
                        {partija.status === 'assigned' || partija.status === 'in_progress' ? (
                          <button type="button" className="dugme dugme--opasno dugme--malo" onClick={() => void otkazi(partija)}>
                            Otkaži
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pregled && (
        <Modal naslov={`Partija — ${mapaProfila.get(pregled.partija.child_profile_id)?.name ?? 'dete'}`} onZatvori={() => setPregled(null)}>
          <SahPregled
            partija={pregled.partija} potezi={pregled.potezi} indeks={potezIndeks}
            onIndeks={setPotezIndeks}
          />
        </Modal>
      )}
    </div>
  )
}

function SahPregled({
  partija, potezi, indeks, onIndeks,
}: { partija: SahPartija; potezi: SahPotez[]; indeks: number; onIndeks: (i: number) => void }) {
  const fen = indeks < 0
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    : potezi[indeks]?.fen_after ?? partija.fen
  const poslednji = indeks >= 0 ? potezi[indeks] : null
  return (
    <div className="sah-pregled">
      <div className="sah-tabla-admin">
        <SahTabla
          fen={fen} orientation={partija.child_color} disabled
          lastMove={poslednji ? { from: poslednji.uci.slice(0, 2), to: poslednji.uci.slice(2, 4) } : null}
        />
      </div>
      <p className="centar razmak-gore">
        {indeks < 0 ? 'Početna pozicija' : `${indeks + 1}. polupotez: ${potezi[indeks]?.san}`}
      </p>
      <div className="red red--razmak razmak-gore">
        <button type="button" className="dugme dugme--senka dugme--malo" disabled={indeks < 0} onClick={() => onIndeks(indeks - 1)}>←</button>
        <span>{Math.max(0, indeks + 1)} / {potezi.length}</span>
        <button type="button" className="dugme dugme--senka dugme--malo" disabled={indeks >= potezi.length - 1} onClick={() => onIndeks(indeks + 1)}>→</button>
      </div>
    </div>
  )
}
