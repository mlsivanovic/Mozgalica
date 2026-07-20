// Rešavanje kviza: autosave, offline red, tajmer, upozorenje pre predaje.
// Predaja se otključava tek kada server potvrdi da su svi odgovori sačuvani.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Tajmer } from '../../components/Tajmer'
import { Loader, ProgresTraka } from '../../components/Zajednicke'
import { PitanjeRenderer, odgovorJePrazan } from '../../components/pitanja/PitanjeRenderer'
import { nastaviPokusaj, posaljiOdgovore, predajKviz } from '../../lib/api'
import {
  nesinhronizovani, oznaciSinhronizovane, sveSinhronizovano, ucitajStanje,
  upisiOdgovor, type StanjePokusaja,
} from '../../lib/offlineQueue'
import type { OdgovorDeteta } from '../../types/db'
import type { PitanjeZaDete } from '../../types/kviz'

const DEBOUNCE_MS = 2000

export function KvizResavanje() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [pitanja, setPitanja] = useState<PitanjeZaDete[]>([])
  const [stanje, setStanje] = useState<StanjePokusaja | null>(null)
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [indeks, setIndeks] = useState(0)
  const [naMrezi, setNaMrezi] = useState(navigator.onLine)
  const [sinhronizuje, setSinhronizuje] = useState(false)
  const [upozorenjeVidljivo, setUpozorenjeVidljivo] = useState(false)
  const [predaje, setPredaje] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Učitavanje / nastavak pokušaja ----
  useEffect(() => {
    const lokalno = ucitajStanje(localStorage, token)
    if (!lokalno) { navigate(`/kviz/${token}`, { replace: true }); return }

    nastaviPokusaj(lokalno.attemptToken).then((r) => {
      if (!r.ok || !r.questions) {
        setGreska('Ovaj pokušaj više nije aktivan. Zatraži nov link od odrasle osobe.')
        setUcitava(false)
        return
      }
      setPitanja(r.questions)
      setDeadlineAt(r.deadlineAt ?? null)
      setServerOffsetMs(r.serverNow ? new Date(r.serverNow).getTime() - Date.now() : 0)

      // Server je izvor istine za već sinhronizovane odgovore; lokalne nesinhronizovane čuvamo
      const spojeno: StanjePokusaja = { ...lokalno, answers: { ...lokalno.answers } }
      for (const [qid, odgovor] of Object.entries(r.savedAnswers ?? {})) {
        if (!spojeno.answers[qid]) {
          spojeno.answers[qid] = { answer: odgovor, changedAt: 0, synced: true }
        }
      }
      setStanje(spojeno)
      setUcitava(false)
    }).catch((e) => {
      setGreska(`Nije uspelo učitavanje kviza: ${String((e as Error).message ?? e)}`)
      setUcitava(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ---- Online/offline praćenje ----
  useEffect(() => {
    const naOnline = () => setNaMrezi(true)
    const naOffline = () => setNaMrezi(false)
    window.addEventListener('online', naOnline)
    window.addEventListener('offline', naOffline)
    return () => {
      window.removeEventListener('online', naOnline)
      window.removeEventListener('offline', naOffline)
    }
  }, [])

  const sinhronizuj = useCallback(async (trenutno: StanjePokusaja) => {
    const neposlati = nesinhronizovani(trenutno)
    if (Object.keys(neposlati).length === 0) return
    setSinhronizuje(true)
    const vremeSlanja = Date.now()
    try {
      const r = await posaljiOdgovore(trenutno.attemptToken, neposlati)
      if (r.ok) {
        setStanje((prethodno) => prethodno && oznaciSinhronizovane(localStorage, token, prethodno, neposlati, vremeSlanja))
      }
    } catch {
      // Bez veze — ostaje nesinhronizovano, pokušaće se ponovo
    } finally {
      setSinhronizuje(false)
    }
  }, [token])

  // Sinhronizuj čim se veza vrati
  useEffect(() => {
    if (naMrezi && stanje) sinhronizuj(stanje)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naMrezi])

  function promeniOdgovor(questionId: string, odgovor: OdgovorDeteta) {
    setStanje((prethodno) => {
      if (!prethodno) return prethodno
      const novo = upisiOdgovor(localStorage, token, prethodno, questionId, odgovor)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => sinhronizuj(novo), DEBOUNCE_MS)
      return novo
    })
  }

  const neodgovorenaPitanja = useMemo(() => {
    if (!stanje) return pitanja.length
    return pitanja.filter((p) => odgovorJePrazan(stanje.answers[p.id]?.answer ?? null)).length
  }, [pitanja, stanje])

  async function predajOdmah() {
    if (!stanje) return
    setPredaje(true)
    setUpozorenjeVidljivo(false)
    try {
      // Poslednji flush pre predaje — server mora potvrditi sve pre zatvaranja kviza
      if (debounceRef.current) clearTimeout(debounceRef.current)
      await sinhronizuj(stanje)
      const svezeStanje = ucitajStanje(localStorage, token)
      if (svezeStanje && !sveSinhronizovano(svezeStanje)) {
        await sinhronizuj(svezeStanje)
      }
      const r = await predajKviz(stanje.attemptToken, null)
      if (!r.ok) {
        setGreska('Predaja nije uspela. Proveri internet konekciju i pokušaj ponovo.')
        setPredaje(false)
        return
      }
      navigate(`/kviz/${token}/rezultat`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
      setPredaje(false)
    }
  }

  function pokusajPredaju() {
    if (neodgovorenaPitanja > 0) setUpozorenjeVidljivo(true)
    else predajOdmah()
  }

  if (ucitava) return <Loader tekst="Učitavanje kviza…" />
  if (greska && pitanja.length === 0) {
    return <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}><p className="poruka poruka--greska">{greska}</p></div>
  }
  if (!stanje || pitanja.length === 0) return null

  const trenutno = pitanja[indeks]
  const nesinhronizovanoBroj = Object.keys(nesinhronizovani(stanje)).length
  const svePotvrdjeno = sveSinhronizovano(stanje)

  return (
    <div className="sadrzaj sadrzaj--usko" style={{ paddingBottom: '5rem' }}>
      <div className="red red--razmak razmak-dole">
        <h1 style={{ fontSize: '1.2rem' }}>{stanje.childName || 'Rešavanje kviza'}</h1>
        {deadlineAt && (
          <Tajmer deadlineAt={deadlineAt} serverOffsetMs={serverOffsetMs} onIstek={predajOdmah} />
        )}
      </div>

      {!naMrezi && (
        <p className="poruka poruka--upozorenje" role="status">
          📡 Radiš bez interneta — odgovori se čuvaju na uređaju i poslaće se čim se veza vrati.
        </p>
      )}

      <p className="malo blago razmak-dole">Pitanje {indeks + 1} od {pitanja.length}</p>
      <ProgresTraka vrednost={pitanja.length - neodgovorenaPitanja} ukupno={pitanja.length} />

      <div className="red razmak-dole" style={{ flexWrap: 'wrap', marginTop: '0.6rem' }}>
        {pitanja.map((p, i) => {
          const odgovoreno = !odgovorJePrazan(stanje.answers[p.id]?.answer ?? null)
          return (
            <button
              key={p.id} type="button" onClick={() => setIndeks(i)}
              aria-label={`Pitanje ${i + 1}${odgovoreno ? ', odgovoreno' : ', bez odgovora'}`}
              aria-current={i === indeks}
              className="dugme dugme--malo"
              style={{
                width: 38, height: 38, padding: 0, borderRadius: '50%',
                background: i === indeks ? 'var(--boja-primarna)' : odgovoreno ? 'var(--boja-uspeh)' : 'var(--boja-kartica)',
                color: i === indeks || odgovoreno ? '#fff' : 'var(--boja-tekst)',
                border: i === indeks ? 'none' : '2px solid var(--boja-ivica)',
              }}
            >
              {i + 1}
            </button>
          )
        })}
      </div>

      <div className="kartica">
        <h2 style={{ fontSize: '1.15rem' }}>{trenutno.text}</h2>
        <div className="razmak-gore">
          <PitanjeRenderer
            pitanje={trenutno}
            value={stanje.answers[trenutno.id]?.answer ?? null}
            onChange={(v) => promeniOdgovor(trenutno.id, v)}
          />
        </div>
        {trenutno.hint && (
          <details className="razmak-gore">
            <summary className="malo" style={{ cursor: 'pointer', color: 'var(--boja-primarna)' }}>💡 Savet</summary>
            <p className="malo blago">{trenutno.hint}</p>
          </details>
        )}
      </div>

      <div className="red red--razmak razmak-gore">
        <button type="button" className="dugme dugme--senka" disabled={indeks === 0} onClick={() => setIndeks(indeks - 1)}>
          ← Prethodno
        </button>
        {indeks < pitanja.length - 1 ? (
          <button type="button" className="dugme" onClick={() => setIndeks(indeks + 1)}>Sledeće →</button>
        ) : (
          <button type="button" className="dugme dugme--akcenat" disabled={predaje} onClick={pokusajPredaju}>
            {predaje ? 'Predajem…' : 'Završi kviz ✔'}
          </button>
        )}
      </div>

      <p className="malo blago centar razmak-gore">
        {sinhronizuje ? 'Čuvam odgovore…' : svePotvrdjeno ? 'Svi odgovori su sačuvani ✔' : `${nesinhronizovanoBroj} odgovora čeka slanje…`}
      </p>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      {upozorenjeVidljivo && (
        <div className="modal-pozadina" onClick={() => setUpozorenjeVidljivo(false)} role="presentation">
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Imaš neodgovorenih pitanja</h2>
            <p className="razmak-gore">
              Ostalo je {neodgovorenaPitanja} {neodgovorenaPitanja === 1 ? 'pitanje' : 'pitanja'} bez odgovora. Da li želiš da ipak predaš kviz?
            </p>
            <div className="red red--kraj razmak-gore">
              <button type="button" className="dugme dugme--senka" onClick={() => setUpozorenjeVidljivo(false)}>Vrati se na pitanja</button>
              <button type="button" className="dugme dugme--akcenat" disabled={predaje} onClick={predajOdmah}>
                {predaje ? 'Predajem…' : 'Ipak predaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
