// Obavezan pregled generisanih pitanja pre bilo kakvog objavljivanja:
// prihvati / izmeni / odbaci / regeneriši pojedinačno / prihvati sva
import { useEffect, useState } from 'react'
import { regenerisiJedno } from '../../generator'
import type { GeneratorConfig, GenerisanoPitanje } from '../../generator/types'
import {
  dodajPitanjaUKviz, listajKvizove, sacuvajKviz, postaviPitanjaKviza, upisiGenerisana,
  type NovoPitanje, type SnapshotUnos,
} from '../../lib/api'
import { NAZIVI_TIPOVA, type Kviz, type Oblast } from '../../types/db'

type Status = 'na_cekanju' | 'prihvaceno' | 'odbaceno'

interface Stavka {
  kljuc: string
  pitanje: GenerisanoPitanje
  status: Status
}

interface Props {
  pocetnaPitanja: GenerisanoPitanje[]
  upozorenje: string | null
  cfg: GeneratorConfig
  oblasti: Oblast[]
  onNazad: () => void
  onZavrseno: (kvizId: string | null) => void
}

let brojac = 0

export function GeneratorPregled({ pocetnaPitanja, upozorenje, cfg, oblasti, onNazad, onZavrseno }: Props) {
  const [stavke, setStavke] = useState<Stavka[]>(
    pocetnaPitanja.map((p) => ({ kljuc: `p${++brojac}`, pitanje: p, status: 'na_cekanju' })),
  )
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState(false)
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])
  const [izabraniKviz, setIzabraniKviz] = useState('')

  useEffect(() => { listajKvizove().then(setKvizovi).catch(() => {}) }, [])

  const mapaOblasti = new Map(oblasti.map((o) => [o.slug, o]))

  function postaviStatus(kljuc: string, status: Status) {
    setStavke(stavke.map((s) => s.kljuc === kljuc ? { ...s, status } : s))
  }

  function izmeniTekst(kljuc: string, tekst: string) {
    setStavke(stavke.map((s) => s.kljuc === kljuc ? { ...s, pitanje: { ...s.pitanje, text: tekst } } : s))
  }

  function regenerisi(kljuc: string) {
    const stavka = stavke.find((s) => s.kljuc === kljuc)!
    const postojeciPotpisi = new Set(stavke.filter((s) => s.kljuc !== kljuc).map((s) => s.pitanje.signature))
    // Regenerisanje MORA da koristi oblast KONKRETNE stavke, ne stranični cfg —
    // inače bi se pri više-oblasnom generisanju stavka tiho prebacila u pogrešnu oblast.
    const novo = regenerisiJedno({ ...cfg, topicSlug: stavka.pitanje.topicSlug }, postojeciPotpisi)
    if (!novo) { setGreska('Nije uspelo ponovno generisanje — probaj sa drugačijim podešavanjima.'); return }
    setStavke(stavke.map((s) => s.kljuc === kljuc ? { kljuc: s.kljuc, pitanje: novo, status: 'na_cekanju' } : s))
  }

  function prihvatiSva() {
    setStavke(stavke.map((s) => s.status === 'odbaceno' ? s : { ...s, status: 'prihvaceno' }))
  }

  const prihvacena = stavke.filter((s) => s.status === 'prihvaceno' || s.status === 'na_cekanju')

  function upakuj(): NovoPitanje[] {
    return prihvacena.map((s) => {
      const oblast = mapaOblasti.get(s.pitanje.topicSlug)
      if (!oblast) throw new Error(`Oblast „${s.pitanje.topicSlug}" nije pronađena u bazi.`)
      return {
        topic_id: oblast.id, type: s.pitanje.type, difficulty: s.pitanje.difficulty,
        text: s.pitanje.text, options: s.pitanje.options, correct: s.pitanje.correct,
        explanation: s.pitanje.explanation, hint: s.pitanje.hint, points: s.pitanje.points,
        source: 'generated', gen_signature: s.pitanje.signature,
      }
    })
  }

  function nazivKviza(): string {
    if (oblasti.length === 1) return `Kviz — ${oblasti[0].name}`
    return `Mešoviti kviz — ${oblasti.length} oblasti`
  }

  // Snapshot-oblik pravi se DIREKTNO iz prihvacena (ne preko upakuj()), da izbegnemo
  // oslanjanje na poklapanje indeksa dva paralelna niza
  function pripremiSnapshotUnose(): Array<Omit<SnapshotUnos, 'quiz_id' | 'position'>> {
    return prihvacena.map((s) => {
      const oblast = mapaOblasti.get(s.pitanje.topicSlug)
      if (!oblast) throw new Error(`Oblast „${s.pitanje.topicSlug}" nije pronađena u bazi.`)
      return {
        source_question_id: null, topic_id: oblast.id, topic_name: oblast.name,
        type: s.pitanje.type, text: s.pitanje.text, options: s.pitanje.options,
        correct: s.pitanje.correct, explanation: s.pitanje.explanation,
        hint: s.pitanje.hint, points: s.pitanje.points,
      }
    })
  }

  async function sacuvajUBanku() {
    setGreska(null)
    setRadi(true)
    try {
      const upisano = await upisiGenerisana(upakuj())
      alert(`Sačuvano ${upisano} od ${prihvacena.length} pitanja u banku (duplikati su preskočeni).`)
      onZavrseno(null)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadi(false)
    }
  }

  async function napraviKviz() {
    setGreska(null)
    setRadi(true)
    try {
      const kvizId = await sacuvajKviz({
        title: nazivKviza(), description: '', time_limit_seconds: null,
        default_max_attempts: 1, shuffle_questions: true, shuffle_answers: true,
        show_result: true, show_correct: true, pass_threshold_pct: 90,
        require_name: true, require_label: false, label_name: 'Odeljenje',
      })
      const snapshot: SnapshotUnos[] = pripremiSnapshotUnose().map((u, i) => ({ ...u, quiz_id: kvizId, position: i }))
      await postaviPitanjaKviza(kvizId, snapshot)
      onZavrseno(kvizId)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadi(false)
    }
  }

  async function dodajUPostojeci() {
    if (!izabraniKviz) { setGreska('Izaberi kviz kome dodaješ pitanja.'); return }
    setGreska(null)
    setRadi(true)
    try {
      await dodajPitanjaUKviz(izabraniKviz, pripremiSnapshotUnose())
      onZavrseno(izabraniKviz)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadi(false)
    }
  }

  return (
    <div>
      <div className="zaglavlje-strane">
        <h1>Pregled generisanih pitanja</h1>
        <button type="button" className="dugme dugme--senka" onClick={onNazad}>← Nazad na podešavanja</button>
      </div>

      {upozorenje && <p className="poruka poruka--upozorenje">{upozorenje}</p>}
      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

      <div className="red red--razmak razmak-dole">
        <p className="blago">Prihvaćeno: {prihvacena.length} / {stavke.length}</p>
        <button type="button" className="dugme dugme--senka dugme--malo" onClick={prihvatiSva}>Prihvati sva</button>
      </div>

      <div className="mreza-kartica">
        {stavke.map((s) => (
          <div
            key={s.kljuc}
            className="kartica"
            style={{ borderLeft: `5px solid ${s.status === 'prihvaceno' ? 'var(--boja-uspeh)' : s.status === 'odbaceno' ? 'var(--boja-greska)' : 'var(--boja-ivica)'}`, opacity: s.status === 'odbaceno' ? 0.55 : 1 }}
          >
            <p className="malo blago">
              {mapaOblasti.get(s.pitanje.topicSlug)?.name ?? s.pitanje.topicSlug} · {NAZIVI_TIPOVA[s.pitanje.type]} · {s.pitanje.points} {s.pitanje.points === 1 ? 'poen' : 'poena'}
            </p>
            <textarea
              value={s.pitanje.text} onChange={(e) => izmeniTekst(s.kljuc, e.target.value)}
              style={{ minHeight: 60 }}
            />
            <p className="malo blago razmak-gore">💡 {s.pitanje.explanation}</p>
            <div className="red razmak-gore">
              <button type="button" className="dugme dugme--uspeh dugme--malo" onClick={() => postaviStatus(s.kljuc, 'prihvaceno')}>
                ✔ Prihvati
              </button>
              <button type="button" className="dugme dugme--opasno dugme--malo" onClick={() => postaviStatus(s.kljuc, 'odbaceno')}>
                ✕ Odbaci
              </button>
              <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => regenerisi(s.kljuc)}>
                ↻ Regeneriši
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="kartica razmak-gore">
        <h2>Šta dalje sa prihvaćenim pitanjima?</h2>
        <div className="red razmak-gore" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="dugme dugme--senka" disabled={radi || prihvacena.length === 0} onClick={sacuvajUBanku}>
            Sačuvaj samo u banku pitanja
          </button>
          <button type="button" className="dugme dugme--akcenat" disabled={radi || prihvacena.length === 0} onClick={napraviKviz}>
            Napravi novi kviz od ovih pitanja
          </button>
        </div>

        <div className="red razmak-gore" style={{ alignItems: 'center' }}>
          <select value={izabraniKviz} onChange={(e) => setIzabraniKviz(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">— izaberi postojeći kviz —</option>
            {kvizovi.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
          </select>
          <button type="button" className="dugme dugme--senka" disabled={radi || prihvacena.length === 0 || !izabraniKviz} onClick={dodajUPostojeci}>
            Dodaj u postojeći kviz
          </button>
        </div>
      </div>
    </div>
  )
}
