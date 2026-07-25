// Banka pitanja: filteri + tabela + CRUD + bulk selekcija (dodaj u kviz / novi kviz)
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  dodajPitanjaUKviz, listajKvizove, listajOblasti, listajPitanja, obrisiPitanja, obrisiPitanje,
  postaviPitanjaKviza, sacuvajKviz, ucitajPocetnaPitanja,
} from '../../lib/api'
import { Loader, Modal } from '../../components/Zajednicke'
import {
  NAZIVI_PREDMETA, NAZIVI_RAZREDA, NAZIVI_TEZINA, NAZIVI_TIPOVA,
  type Kviz, type Oblast, type Pitanje, type Predmet, type Razred,
  type Tezina,
} from '../../types/db'
import { napraviCsv, preuzmiCsv } from '../../lib/csv'
import { PitanjeForma } from './PitanjeForma'
import { UvozCsv } from './UvozCsv'
import { NoviKvizModal, type NoviKvizPodaci } from './NoviKvizModal'

interface NoviKvizStanje {
  vrsta: 'nasumicni' | 'izabrani'
  pocetniNaziv: string
}

export function PitanjaLista() {
  const navigate = useNavigate()
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  const [pitanja, setPitanja] = useState<Pitanje[]>([])
  const [kvizovi, setKvizovi] = useState<Kviz[]>([])
  // Predmet je uvek aktivan tab — matematika i srpski se nikad ne prikazuju zajedno,
  // ni u filterima ni u listi ni u formi, da se pitanja iz dva predmeta ne bi mešala.
  const [predmet, setPredmet] = useState<Predmet>('matematika')
  // Razred je isti princip, jedan nivo dublje — samo unutar matematike (srpski ga nema).
  const [razred, setRazred] = useState<Razred>(3)
  const [filterOblast, setFilterOblast] = useState('')
  const [filterTip, setFilterTip] = useState('')
  const [filterTezina, setFilterTezina] = useState('')
  const [filterIzvor, setFilterIzvor] = useState('')
  const [pretraga, setPretraga] = useState('')
  const [uredjivanje, setUredjivanje] = useState<Pitanje | 'novo' | null>(null)
  const [uvozOtvoren, setUvozOtvoren] = useState(false)
  const [izabrana, setIzabrana] = useState<string[]>([])
  const [izabraniKviz, setIzabraniKviz] = useState('')
  const [radiBulk, setRadiBulk] = useState(false)
  const [brojNasumicnih, setBrojNasumicnih] = useState(10)
  const [noviKviz, setNoviKviz] = useState<NoviKvizStanje | null>(null)

  async function ucitaj() {
    setUcitava(true)
    try {
      const o = await listajOblasti()
      const oblastiPredmeta = o.filter((t) => t.subject === predmet && t.grade === razred)
      const [p, k] = await Promise.all([
        listajPitanja({
          topicId: filterOblast || undefined,
          topicIds: filterOblast ? undefined : oblastiPredmeta.map((t) => t.id),
          type: filterTip || undefined,
          difficulty: filterTezina ? Number(filterTezina) : undefined,
          source: filterIzvor || undefined,
          pretraga: pretraga || undefined,
        }),
        listajKvizove(),
      ])
      setOblasti(o)
      setPitanja(p)
      setKvizovi(k)
      setIzabrana([])
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { ucitaj() }, [predmet, razred, filterOblast, filterTip, filterTezina, filterIzvor])

  function promeniPredmet(p: Predmet) {
    setPredmet(p)
    setFilterOblast('') // tema iz drugog predmeta više ne bi bila validna
  }

  function promeniRazred(r: Razred) {
    setRazred(r)
    setFilterOblast('') // tema iz drugog razreda više ne bi bila validna
  }

  const mapaOblasti = useMemo(() => new Map(oblasti.map((o) => [o.id, o.name])), [oblasti])
  const oblastiPredmeta = useMemo(
    () => oblasti.filter((o) => o.subject === predmet && o.grade === razred),
    [oblasti, predmet, razred],
  )

  async function obrisi(id: string) {
    if (!confirm('Obrisati ovo pitanje? Ova radnja se ne može poništiti.')) return
    try {
      await obrisiPitanje(id)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  async function ucitajPocetna() {
    if (!confirm('Učitati 30 primera pitanja (po dva za svaku oblast)? Ako ovo već nisi uradio/la, ovo je bezbedno.')) return
    try {
      const broj = await ucitajPocetnaPitanja(oblasti)
      alert(`Dodato je ${broj} početnih pitanja.`)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  function preklopi(id: string) {
    setIzabrana(izabrana.includes(id) ? izabrana.filter((x) => x !== id) : [...izabrana, id])
  }

  function preklopiSve() {
    const sviVidljivi = pitanja.map((p) => p.id)
    const svePrisutne = sviVidljivi.every((id) => izabrana.includes(id))
    setIzabrana(svePrisutne ? [] : sviVidljivi)
  }

  function pretvoriUSnapshot(lista: Pitanje[]) {
    return lista.map((p) => ({
      source_question_id: p.id, topic_id: p.topic_id, topic_name: mapaOblasti.get(p.topic_id) ?? '—',
      type: p.type, text: p.text, options: p.options, correct: p.correct,
      explanation: p.explanation, hint: p.hint, points: p.points, manual_review: p.manual_review,
    }))
  }

  function snapshotIzabranih() {
    return pretvoriUSnapshot(pitanja.filter((p) => izabrana.includes(p.id)))
  }

  function nasumicniUzorak<T>(niz: T[], n: number): T[] {
    const kopija = [...niz]
    for (let i = kopija.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[kopija[i], kopija[j]] = [kopija[j], kopija[i]]
    }
    return kopija.slice(0, n)
  }

  async function dodajUKviz() {
    if (!izabraniKviz) { setGreska('Izaberi kviz kome dodaješ pitanja.'); return }
    setGreska(null)
    setRadiBulk(true)
    try {
      await dodajPitanjaUKviz(izabraniKviz, snapshotIzabranih())
      alert(`Dodato je ${izabrana.length} pitanja u kviz.`)
      setIzabrana([])
      setIzabraniKviz('')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadiBulk(false)
    }
  }

  async function obrisiIzabrana() {
    if (!confirm(`Obrisati ${izabrana.length} izabranih pitanja? Ova radnja se ne može poništiti.`)) return
    setGreska(null)
    setRadiBulk(true)
    try {
      await obrisiPitanja(izabrana)
      await ucitaj()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadiBulk(false)
    }
  }

  async function potvrdiNoviKviz({ naziv }: NoviKvizPodaci) {
    if (!noviKviz) return
    setGreska(null)
    setRadiBulk(true)
    try {
      const kvizId = await sacuvajKviz({
        title: naziv, description: null, time_limit_seconds: null,
        default_max_attempts: 1, shuffle_questions: true, shuffle_answers: true,
        show_result: true, show_correct: true, pass_threshold_pct: 90,
        require_name: true, fixed_child_name: null,
        require_label: false, label_name: 'Odeljenje',
      })
      const pitanjaZaKviz = noviKviz.vrsta === 'nasumicni'
        ? pretvoriUSnapshot(nasumicniUzorak(pitanja, Math.min(Math.max(1, brojNasumicnih), pitanja.length)))
        : snapshotIzabranih()
      const unosi = pitanjaZaKviz.map((u, i) => ({ ...u, quiz_id: kvizId, position: i }))
      await postaviPitanjaKviza(kvizId, unosi)
      navigate(`/admin/kvizovi/${kvizId}`)
    } finally {
      setRadiBulk(false)
    }
  }

  function izveziUCsv() {
    if (pitanja.length === 0) return

    const zaglavlja = [
      'Predmet',
      'Razred',
      'Oblast',
      'Tip',
      'Težina',
      'Poeni',
      'Tekst pitanja',
      'Ponuđeni odgovori',
      'Tačan odgovor',
      'Objašnjenje',
      'Hint',
      'Izvor',
    ]

    const redovi = pitanja.map((p) => {
      const predmetNaziv = NAZIVI_PREDMETA[predmet] ?? predmet
      const razredNaziv = predmet === 'matematika' ? NAZIVI_RAZREDA[razred] ?? `${razred}. razred` : '—'
      const oblastNaziv = mapaOblasti.get(p.topic_id) ?? '—'
      const tipNaziv = NAZIVI_TIPOVA[p.type] ?? p.type
      const tezinaNaziv = `${NAZIVI_TEZINA[p.difficulty as Tezina]} (${p.difficulty})`

      let opcijeTekst = ''
      if (p.options) {
        if (Array.isArray(p.options)) {
          opcijeTekst = p.options.map((o) => `${o.id}: ${o.text}`).join(' | ')
        } else if (p.options.left && p.options.right) {
          const leftStr = p.options.left.map((o) => `${o.id}: ${o.text}`).join(', ')
          const rightStr = p.options.right.map((o) => `${o.id}: ${o.text}`).join(', ')
          opcijeTekst = `Levo: [${leftStr}] | Desno: [${rightStr}]`
        }
      }

      let tacanTekst = ''
      const c = p.correct
      if (c) {
        if ('optionId' in c && typeof c.optionId === 'string') {
          tacanTekst = c.optionId
        } else if ('optionIds' in c && Array.isArray(c.optionIds)) {
          tacanTekst = c.optionIds.join(', ')
        } else if ('value' in c && typeof c.value === 'boolean') {
          tacanTekst = c.value ? 'Tačno' : 'Netačno'
        } else if ('value' in c && typeof c.value === 'number') {
          tacanTekst = String(c.value)
        } else if ('accept' in c && Array.isArray(c.accept)) {
          tacanTekst = c.accept.join(' | ')
        } else if ('pairs' in c && c.pairs) {
          tacanTekst = Object.entries(c.pairs)
            .map(([k, v]) => `${k} → ${v}`)
            .join(' | ')
        }
      }

      return [
        predmetNaziv,
        razredNaziv,
        oblastNaziv,
        tipNaziv,
        tezinaNaziv,
        p.points,
        p.text,
        opcijeTekst,
        tacanTekst,
        p.explanation ?? '',
        p.hint ?? '',
        p.source === 'manual' ? 'Ručno' : 'Automatski',
      ]
    })

    const datum = new Date().toISOString().slice(0, 10)
    const imeFajla = `mozgalica-pitanja-${predmet}-${datum}.csv`
    const sadrzaj = napraviCsv(zaglavlja, redovi)
    preuzmiCsv(imeFajla, sadrzaj)
  }

  return (
    <div>
      <div className="red predmet-tabovi razmak-dole">
        {(['matematika', 'srpski'] as const).map((p) => (
          <button
            key={p} type="button"
            className={`dugme ${predmet === p ? '' : 'dugme--senka'}`}
            aria-current={predmet === p}
            onClick={() => promeniPredmet(p)}
          >
            {NAZIVI_PREDMETA[p]}
          </button>
        ))}
      </div>

      <div className="red razred-tabovi razmak-dole">
        {([3, 4] as const).map((r) => (
          <button
            key={r} type="button"
            className={`dugme dugme--malo ${razred === r ? '' : 'dugme--senka'}`}
            aria-current={razred === r}
            onClick={() => promeniRazred(r)}
          >
            {NAZIVI_RAZREDA[r]}
          </button>
        ))}
      </div>

      <div className="zaglavlje-strane">
        <h1>Banka pitanja — {NAZIVI_PREDMETA[predmet]}</h1>
        <div className="red">
          {pitanja.length > 0 && (
            <button type="button" className="dugme dugme--senka" onClick={izveziUCsv}>
              📥 Izvezi u CSV ({pitanja.length})
            </button>
          )}
          {predmet === 'matematika' && pitanja.length === 0 && (
            <button type="button" className="dugme dugme--senka" onClick={ucitajPocetna}>
              Učitaj početna pitanja
            </button>
          )}
          {predmet === 'srpski' && (
            <button type="button" className="dugme dugme--senka" onClick={() => setUvozOtvoren(true)}>
              Uvoz iz CSV-a
            </button>
          )}
          <button type="button" className="dugme dugme--akcenat" onClick={() => setUredjivanje('novo')}>
            + Novo pitanje
          </button>
        </div>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <div className="kartica razmak-dole">
        <div className="red-polja">
          <div className="polje">
            <label htmlFor="f-oblast">Oblast</label>
            <select id="f-oblast" value={filterOblast} onChange={(e) => setFilterOblast(e.target.value)}>
              <option value="">Sve oblasti</option>
              {oblastiPredmeta.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-tip">Tip pitanja</label>
            <select id="f-tip" value={filterTip} onChange={(e) => setFilterTip(e.target.value)}>
              <option value="">Svi tipovi</option>
              {Object.entries(NAZIVI_TIPOVA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-tezina">Težina</label>
            <select id="f-tezina" value={filterTezina} onChange={(e) => setFilterTezina(e.target.value)}>
              <option value="">Sve težine</option>
              {Object.entries(NAZIVI_TEZINA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-izvor">Izvor</label>
            <select id="f-izvor" value={filterIzvor} onChange={(e) => setFilterIzvor(e.target.value)}>
              <option value="">Svi</option>
              <option value="manual">Ručno dodato</option>
              <option value="generated">Automatski generisano</option>
            </select>
          </div>
          <div className="polje">
            <label htmlFor="f-pretraga">Pretraga teksta</label>
            <input
              id="f-pretraga" type="text" value={pretraga}
              onChange={(e) => setPretraga(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ucitaj()}
              placeholder="Deo teksta pitanja…"
            />
          </div>
        </div>
      </div>

      {pitanja.length > 0 && (
        <div className="kartica razmak-dole">
          <div className="red red--razmak" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="polje" style={{ maxWidth: 160, marginBottom: 0 }}>
              <label htmlFor="nasumicno-broj">Broj pitanja</label>
              <input
                id="nasumicno-broj" type="number" min={1} max={pitanja.length}
                value={brojNasumicnih} onChange={(e) => setBrojNasumicnih(Number(e.target.value))}
              />
            </div>
            <button
              type="button" className="dugme dugme--senka" disabled={radiBulk}
              onClick={() => setNoviKviz({
                vrsta: 'nasumicni', pocetniNaziv: `Nasumičan kviz — ${NAZIVI_PREDMETA[predmet]}`,
              })}
            >
              Napravi nasumičan kviz
            </button>
          </div>
          <p className="malo blago razmak-gore">
            Nasumično bira pitanja iz trenutno filtrirane liste ({pitanja.length} dostupno) i odmah pravi novi kviz od njih.
          </p>
        </div>
      )}

      {izabrana.length > 0 && (
        <div className="kartica razmak-dole bulk-traka" style={{ background: 'var(--boja-primarna-svetla)' }}>
          <div className="red red--razmak" style={{ flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 700 }}>{izabrana.length} pitanja izabrano</p>
            <div className="red">
              <select value={izabraniKviz} onChange={(e) => setIzabraniKviz(e.target.value)}>
                <option value="">— izaberi kviz —</option>
                {kvizovi.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
              </select>
              <button type="button" className="dugme dugme--senka dugme--malo" disabled={radiBulk || !izabraniKviz} onClick={dodajUKviz}>
                Dodaj u postojeći kviz
              </button>
              <button
                type="button" className="dugme dugme--akcenat dugme--malo" disabled={radiBulk}
                onClick={() => setNoviKviz({ vrsta: 'izabrani', pocetniNaziv: '' })}
              >
                Napravi novi kviz od izabranih
              </button>
              <button type="button" className="dugme dugme--opasno dugme--malo" disabled={radiBulk} onClick={obrisiIzabrana}>
                Obriši izabrana
              </button>
            </div>
          </div>
        </div>
      )}

      {ucitava ? <Loader /> : (
        <div className="tabela-omot">
          <table className="tabela tabela--kartice">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={pitanja.length > 0 && pitanja.every((p) => izabrana.includes(p.id))}
                    onChange={preklopiSve}
                    aria-label="Izaberi sva vidljiva pitanja"
                  />
                </th>
                <th>Pitanje</th><th>Oblast</th><th>Tip</th><th>Težina</th><th>Poeni</th><th>Izvor</th><th></th>
              </tr>
            </thead>
            <tbody>
              {pitanja.map((p) => (
                <tr key={p.id}>
                  <td data-naslov="Izaberi"><input type="checkbox" checked={izabrana.includes(p.id)} onChange={() => preklopi(p.id)} /></td>
                  <td data-naslov="Pitanje" style={{ maxWidth: 340 }}>{p.text}</td>
                  <td data-naslov="Oblast">{mapaOblasti.get(p.topic_id) ?? '—'}</td>
                  <td data-naslov="Tip">{NAZIVI_TIPOVA[p.type]}</td>
                  <td data-naslov="Težina">{NAZIVI_TEZINA[p.difficulty]}</td>
                  <td data-naslov="Poeni">{p.points}</td>
                  <td data-naslov="Izvor">
                    <span className={`bedz ${p.source === 'generated' ? 'bedz--upozorenje' : 'bedz--neutral'}`}>
                      {p.source === 'generated' ? 'Generisano' : 'Ručno'}
                    </span>
                  </td>
                  <td className="red">
                    <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setUredjivanje(p)}>
                      Izmeni
                    </button>
                    <button type="button" className="dugme dugme--opasno dugme--malo" onClick={() => obrisi(p.id)}>
                      Obriši
                    </button>
                  </td>
                </tr>
              ))}
              {pitanja.length === 0 && (
                <tr><td colSpan={8} className="centar blago" style={{ padding: '2rem' }}>Nema pitanja za izabrane filtere.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {uredjivanje && (
        <Modal naslov={uredjivanje === 'novo' ? 'Novo pitanje' : 'Izmena pitanja'} onZatvori={() => setUredjivanje(null)}>
          <PitanjeForma
            oblasti={oblasti}
            predmet={predmet}
            pitanje={uredjivanje === 'novo' ? null : uredjivanje}
            onSacuvano={() => { setUredjivanje(null); ucitaj() }}
            onOtkazano={() => setUredjivanje(null)}
          />
        </Modal>
      )}

      {uvozOtvoren && (
        <Modal naslov="Uvoz pitanja iz CSV-a" onZatvori={() => setUvozOtvoren(false)}>
          <UvozCsv
            oblastiSrpski={oblastiPredmeta}
            onZatvori={() => setUvozOtvoren(false)}
            onUvezeno={() => { setUvozOtvoren(false); ucitaj() }}
          />
        </Modal>
      )}

      {noviKviz && (
        <NoviKvizModal
          naslov={noviKviz.vrsta === 'nasumicni' ? 'Novi nasumičan kviz' : 'Novi kviz od izabranih pitanja'}
          pocetniNaziv={noviKviz.pocetniNaziv}
          onPotvrdi={potvrdiNoviKviz}
          onZatvori={() => setNoviKviz(null)}
        />
      )}
    </div>
  )
}
