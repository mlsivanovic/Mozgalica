// Konfiguracija automatskog generisanja pitanja + pokretanje pregleda.
// Podržava izbor VIŠE oblasti odjednom (automatski kviz iz više tema) —
// ukupan broj pitanja se ravnomerno raspoređuje po izabranim oblastima.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { podrzaneOblasti } from '../../generator'
import { generisi } from '../../generator'
import { IKONE_GENERISANIH_OBLASTI, NAZIVI_GENERISANIH_OBLASTI } from '../../generator/oblasti'
import type { GeneratorConfig, GenerisanoPitanje } from '../../generator/types'
import { listajOblasti } from '../../lib/api'
import { predmetImaTezinu, razrediPredmeta, tezinaZaPredmet } from '../../lib/predmet'
import {
  KONFIGURACIJA_PREDMETA, NAZIVI_PREDMETA, NAZIVI_RAZREDA, NAZIVI_TEZINA,
  NAZIVI_TIPOVA, PREDMETI, type Oblast, type Predmet, type Razred, type Tezina, type TipPitanja,
} from '../../types/db'
import { GeneratorPregled } from './GeneratorPregled'
import './generator.css'

export function Generator() {
  const navigate = useNavigate()
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  const [predmet, setPredmet] = useState<Predmet>('matematika')
  const [razred, setRazred] = useState<Razred>(3)
  const [topicSlugovi, setTopicSlugovi] = useState<string[]>(['sabiranje'])
  const [difficulty, setDifficulty] = useState<Tezina>(3)
  const [count, setCount] = useState(10)
  const [type, setType] = useState<TipPitanja | 'auto'>('auto')
  const [wordProblems, setWordProblems] = useState(false)
  const [allowRepeats, setAllowRepeats] = useState(false)
  const [rezultat, setRezultat] = useState<GenerisanoPitanje[] | null>(null)
  const [upozorenje, setUpozorenje] = useState<string | null>(null)

  useEffect(() => { listajOblasti().then(setOblasti).catch(() => {}) }, [])

  const podrzane = podrzaneOblasti()
  // Samo oblasti aktivnog predmeta i razreda — kviz ne sme da ih meša.
  const podrzaneRazreda = podrzane.filter((s) => oblasti.some(
    (o) => o.slug === s && o.subject === predmet && o.grade === razred,
  ))

  function promeniPredmet(p: Predmet) {
    setPredmet(p)
    setType('auto')
    setWordProblems(false)
    const dozvoljeniRazredi = razrediPredmeta(p)
    const ciljniRazred = dozvoljeniRazredi.includes(razred) ? razred : dozvoljeniRazredi[0]
    setRazred(ciljniRazred)
    const vazeci = podrzane.filter((s) => oblasti.some(
      (o) => o.slug === s && o.subject === p && o.grade === ciljniRazred,
    ))
    setTopicSlugovi(vazeci.slice(0, 1))
  }

  function promeniRazred(r: Razred) {
    setRazred(r)
    const vazeci = podrzane.filter((s) => oblasti.some(
      (o) => o.slug === s && o.subject === predmet && o.grade === r,
    ))
    setTopicSlugovi(vazeci.slice(0, 1))
  }

  function preklopiOblast(slug: string) {
    setTopicSlugovi(
      topicSlugovi.includes(slug) ? topicSlugovi.filter((s) => s !== slug) : [...topicSlugovi, slug],
    )
  }

  const sveIzabrano = podrzaneRazreda.length > 0 && podrzaneRazreda.every((s) => topicSlugovi.includes(s))
  function preklopiSveOblasti() {
    setTopicSlugovi(sveIzabrano ? [] : podrzaneRazreda)
  }

  function pokreni() {
    const n = topicSlugovi.length
    if (n === 0) return
    const svaPitanja: GenerisanoPitanje[] = []
    const upozorenja: string[] = []
    topicSlugovi.forEach((topicSlug, i) => {
      // Ravnomerna raspodela: ostatak ide prvim izabranim oblastima
      const brojZaOblast = Math.floor(count / n) + (i < count % n ? 1 : 0)
      if (brojZaOblast === 0) return
      const cfg: GeneratorConfig = {
        topicSlug, difficulty: tezinaZaPredmet(predmet, difficulty), count: brojZaOblast,
        type, wordProblems, allowRepeats,
      }
      const r = generisi(cfg)
      svaPitanja.push(...r.questions)
      if (r.warning) upozorenja.push(r.warning)
    })
    setRezultat(svaPitanja)
    setUpozorenje(upozorenja.length > 0 ? upozorenja.join(' ') : null)
  }

  if (rezultat) {
    const izabraneOblasti = oblasti.filter((o) => topicSlugovi.includes(o.slug))
    return (
      <GeneratorPregled
        pocetnaPitanja={rezultat}
        upozorenje={upozorenje}
        cfg={{ topicSlug: topicSlugovi[0], difficulty: tezinaZaPredmet(predmet, difficulty), count, type, wordProblems, allowRepeats }}
        oblasti={izabraneOblasti}
        onNazad={() => setRezultat(null)}
        onZavrseno={(kvizId) => kvizId ? navigate(`/admin/kvizovi/${kvizId}`) : navigate('/admin/pitanja')}
      />
    )
  }

  return (
    <div className="generator-strana">
      <h1>Automatski generator pitanja</h1>
      <p className="blago razmak-dole">
        Generisana pitanja NIKAD se ne objavljuju direktno — prvo prolaze tvoj pregled na sledećem koraku.
        Izaberi jednu ili više oblasti da napraviš mešoviti kviz.
      </p>

      <div className="kartica razmak-dole gen-forma">
        <div className="gen-sekcija gen-sekcija--predmet">
          <p className="gen-naslov razmak-dole">Predmet</p>
          <div className="segment" role="radiogroup" aria-label="Predmet">
            {PREDMETI.map((p) => (
              <button
                key={p} type="button" role="radio" aria-checked={predmet === p}
                className={`segment-dugme ${predmet === p ? 'segment-dugme--izabran' : ''}`}
                onClick={() => promeniPredmet(p)}
              >
                {NAZIVI_PREDMETA[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="gen-sekcija gen-sekcija--razred">
          <p className="gen-naslov razmak-dole">Razred</p>
          <div className="segment" role="radiogroup" aria-label="Razred">
            {razrediPredmeta(predmet).map((r) => (
              <button
                key={r} type="button" role="radio" aria-checked={razred === r}
                className={`segment-dugme ${razred === r ? 'segment-dugme--izabran' : ''}`}
                onClick={() => promeniRazred(r)}
              >
                {NAZIVI_RAZREDA[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="gen-sekcija gen-sekcija--oblasti">
          <div className="red red--razmak razmak-dole" style={{ alignItems: 'center' }}>
            <span className="gen-naslov">Oblasti {topicSlugovi.length > 0 && `· ${topicSlugovi.length} izabrano`}</span>
            <button
              type="button"
              className={`segment-dugme ${sveIzabrano ? 'segment-dugme--izabran' : ''}`}
              style={{ flex: '0 0 auto' }}
              onClick={preklopiSveOblasti}
            >
              {sveIzabrano ? '✓ Sve teme' : 'Izaberi sve teme'}
            </button>
          </div>
          <div className="gen-oblasti">
            {podrzaneRazreda.map((s) => {
              const izabrano = topicSlugovi.includes(s)
              return (
                <label key={s} className={`gen-oblast ${izabrano ? 'gen-oblast--izabrana' : ''}`}>
                  <input type="checkbox" checked={izabrano} onChange={() => preklopiOblast(s)} />
                  <span className="gen-oblast-ikona" aria-hidden="true">{IKONE_GENERISANIH_OBLASTI[s] ?? '📚'}</span>
                  <span className="gen-oblast-tekst">{NAZIVI_GENERISANIH_OBLASTI[s] ?? s}</span>
                </label>
              )
            })}
          </div>
        </div>

        {predmetImaTezinu(predmet) && (
          <div className="gen-sekcija gen-sekcija--tezina">
            <p className="gen-naslov razmak-dole">Nivo težine</p>
            <div className="segment" role="radiogroup" aria-label="Nivo težine">
              {(Object.entries(NAZIVI_TEZINA) as [string, string][]).map(([k, naziv]) => (
                <button
                  key={k} type="button" role="radio" aria-checked={difficulty === Number(k)}
                  className={`segment-dugme ${difficulty === Number(k) ? 'segment-dugme--izabran' : ''}`}
                  onClick={() => setDifficulty(Number(k) as Tezina)}
                >
                  {naziv}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="gen-sekcija gen-sekcija--podesavanje">
          <div className="red-polja">
            <div className="polje">
              <label htmlFor="g-broj">Broj pitanja (ukupno)</label>
              <input id="g-broj" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <div className="polje" style={{ flex: 2 }}>
              <label>Tip pitanja</label>
              <div className="segment" role="radiogroup" aria-label="Tip pitanja">
                {([
                  { vrednost: 'auto' as const, naziv: 'Automatski izbor' },
                  ...KONFIGURACIJA_PREDMETA[predmet].tipoviGeneratora.map((vrednost) => ({
                    vrednost, naziv: NAZIVI_TIPOVA[vrednost],
                  })),
                ]).map((t) => (
                  <button
                    key={t.vrednost} type="button" role="radio" aria-checked={type === t.vrednost}
                    className={`segment-dugme ${type === t.vrednost ? 'segment-dugme--izabran' : ''}`}
                    onClick={() => setType(t.vrednost)}
                  >
                    {t.naziv}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="gen-sekcija gen-sekcija--opcije">
          {predmet === 'matematika' && (
            <label className="stiklir">
              <input type="checkbox" checked={wordProblems} onChange={(e) => setWordProblems(e.target.checked)} />
              Tekstualni zadaci (priča umesto golog izraza)
            </label>
          )}
          <label className="stiklir">
            <input type="checkbox" checked={allowRepeats} onChange={(e) => setAllowRepeats(e.target.checked)} />
            Dozvoli ponavljanje sličnih zadataka
          </label>
        </div>

        {topicSlugovi.length > 0 && (
          <p className="gen-rezime gen-sekcija gen-sekcija--rezime">
            📋 {count} pitanja{predmetImaTezinu(predmet) ? ` · ${NAZIVI_TEZINA[difficulty]}` : ''} · {topicSlugovi.length} {topicSlugovi.length === 1 ? 'oblast izabrana' : 'oblasti izabrano'}
          </p>
        )}

        <button type="button" className="dugme dugme--akcenat gen-dugme" disabled={topicSlugovi.length === 0} onClick={pokreni}>
          Generiši pitanja za pregled
        </button>
      </div>
    </div>
  )
}
