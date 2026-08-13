// Konfiguracija automatskog generisanja pitanja + pokretanje pregleda.
// Podržava izbor VIŠE oblasti odjednom (automatski kviz iz više tema) —
// ukupan broj pitanja se ravnomerno raspoređuje po izabranim oblastima.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { podrzaneOblasti } from '../../generator'
import { generisi } from '../../generator'
import type { GeneratorConfig, GenerisanoPitanje } from '../../generator/types'
import { listajOblasti } from '../../lib/api'
import {
  NAZIVI_PREDMETA, NAZIVI_RAZREDA, NAZIVI_TEZINA,
  type Oblast, type Predmet, type Razred, type Tezina, type TipPitanja,
} from '../../types/db'
import { GeneratorPregled } from './GeneratorPregled'
import './generator.css'

const NAZIVI_OBLASTI: Record<string, string> = {
  'sabiranje': 'Sabiranje', 'oduzimanje': 'Oduzimanje', 'mnozenje': 'Množenje', 'deljenje': 'Deljenje',
  'kombinovane-operacije': 'Kombinovane računske operacije', 'poredjenje-brojeva': 'Poređenje brojeva',
  'nizovi-i-obrasci': 'Nizovi i obrasci', 'obim-i-merenje': 'Obim i merenje dužine',
  'merne-jedinice': 'Merne jedinice', 'novac': 'Novac',
  'rimski-brojevi': 'Rimski brojevi', 'jednacine': 'Jednačine', 'nejednacine': 'Nejednačine',
  // 4. razred
  'veliki-brojevi-4': 'Veliki brojevi', 'sabiranje-4': 'Sabiranje', 'oduzimanje-4': 'Oduzimanje',
  'mnozenje-4': 'Množenje', 'deljenje-4': 'Deljenje',
  'kombinovane-operacije-4': 'Kombinovane računske operacije', 'jednacine-4': 'Jednačine',
  'nejednacine-4': 'Nejednačine', 'povrsina-4': 'Površina', 'zapremina-4': 'Zapremina',
  'geometrijska-tela-4': 'Geometrijska tela', 'razlomci-4': 'Razlomci', 'decimalni-brojevi-4': 'Decimalni brojevi',
  // Srpski jezik
  'srpski-vrste-reci': 'Vrste reči', 'srpski-gramatika': 'Gramatika', 'srpski-pravopis': 'Pravopis',
  'srpski-citanje': 'Čitanje i razumevanje', 'srpski-recnik': 'Rečnik',
}

const IKONE_OBLASTI: Record<string, string> = {
  'sabiranje': '➕', 'oduzimanje': '➖', 'mnozenje': '✖️', 'deljenje': '➗',
  'kombinovane-operacije': '🧮', 'poredjenje-brojeva': '⚖️',
  'nizovi-i-obrasci': '🔁', 'obim-i-merenje': '📐',
  'merne-jedinice': '📏', 'novac': '💰',
  'rimski-brojevi': '🏛️', 'jednacine': '🟰', 'nejednacine': '≠',
  // 4. razred
  'veliki-brojevi-4': '🔢', 'sabiranje-4': '➕', 'oduzimanje-4': '➖',
  'mnozenje-4': '✖️', 'deljenje-4': '➗',
  'kombinovane-operacije-4': '🧮', 'jednacine-4': '🟰', 'nejednacine-4': '≠',
  'povrsina-4': '▦', 'zapremina-4': '📦', 'geometrijska-tela-4': '🧊',
  'razlomci-4': '🍕', 'decimalni-brojevi-4': '🔟',
  // Srpski jezik
  'srpski-vrste-reci': '🔤', 'srpski-gramatika': '📚', 'srpski-pravopis': '✍️',
  'srpski-citanje': '📖', 'srpski-recnik': '🗣️',
}

const PREDMETI: Predmet[] = ['matematika', 'srpski']
const RAZREDI: Razred[] = [3, 4]

const TIPOVI_MATEMATIKA: { vrednost: TipPitanja | 'auto'; naziv: string }[] = [
  { vrednost: 'auto', naziv: 'Automatski izbor' },
  { vrednost: 'numeric', naziv: 'Unos broja' },
  { vrednost: 'single', naziv: 'Ponuđeni odgovori' },
]

const TIPOVI_SRPSKI: { vrednost: TipPitanja | 'auto'; naziv: string }[] = [
  { vrednost: 'auto', naziv: 'Automatski izbor' },
  { vrednost: 'single', naziv: 'Ponuđeni odgovori' },
  { vrednost: 'truefalse', naziv: 'Tačno / netačno' },
]

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
    const trenutniRazredJePodrzan = podrzane.some((s) => oblasti.some(
      (o) => o.slug === s && o.subject === p && o.grade === razred,
    ))
    const ciljniRazred = trenutniRazredJePodrzan
      ? razred
      : (RAZREDI.find((r) => podrzane.some((s) => oblasti.some(
          (o) => o.slug === s && o.subject === p && o.grade === r,
        ))) ?? razred)
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
      const cfg: GeneratorConfig = { topicSlug, difficulty, count: brojZaOblast, type, wordProblems, allowRepeats }
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
        cfg={{ topicSlug: topicSlugovi[0], difficulty, count, type, wordProblems, allowRepeats }}
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
        <div className="gen-sekcija gen-sekcija--razred">
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
            {RAZREDI.map((r) => (
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
                  <span className="gen-oblast-ikona" aria-hidden="true">{IKONE_OBLASTI[s] ?? '📚'}</span>
                  <span className="gen-oblast-tekst">{NAZIVI_OBLASTI[s] ?? s}</span>
                </label>
              )
            })}
          </div>
        </div>

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

        <div className="gen-sekcija gen-sekcija--podesavanje">
          <div className="red-polja">
            <div className="polje">
              <label htmlFor="g-broj">Broj pitanja (ukupno)</label>
              <input id="g-broj" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <div className="polje" style={{ flex: 2 }}>
              <label>Tip pitanja</label>
              <div className="segment" role="radiogroup" aria-label="Tip pitanja">
                {(predmet === 'srpski' ? TIPOVI_SRPSKI : TIPOVI_MATEMATIKA).map((t) => (
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
            📋 {count} pitanja · {NAZIVI_TEZINA[difficulty]} · {topicSlugovi.length} {topicSlugovi.length === 1 ? 'oblast izabrana' : 'oblasti izabrano'}
          </p>
        )}

        <button type="button" className="dugme dugme--akcenat gen-dugme" disabled={topicSlugovi.length === 0} onClick={pokreni}>
          Generiši pitanja za pregled
        </button>
      </div>
    </div>
  )
}
