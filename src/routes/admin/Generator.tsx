// Konfiguracija automatskog generisanja pitanja + pokretanje pregleda.
// Podržava izbor VIŠE oblasti odjednom (automatski kviz iz više tema) —
// ukupan broj pitanja se ravnomerno raspoređuje po izabranim oblastima.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { podrzaneOblasti } from '../../generator'
import { generisi } from '../../generator'
import type { GeneratorConfig, GenerisanoPitanje } from '../../generator/types'
import { listajOblasti } from '../../lib/api'
import { NAZIVI_TEZINA, type Oblast, type Tezina, type TipPitanja } from '../../types/db'
import { GeneratorPregled } from './GeneratorPregled'
import './generator.css'

const NAZIVI_OBLASTI: Record<string, string> = {
  'sabiranje': 'Sabiranje', 'oduzimanje': 'Oduzimanje', 'mnozenje': 'Množenje', 'deljenje': 'Deljenje',
  'kombinovane-operacije': 'Kombinovane računske operacije', 'poredjenje-brojeva': 'Poređenje brojeva',
  'nizovi-i-obrasci': 'Nizovi i obrasci', 'obim-i-merenje': 'Obim i merenje dužine',
  'merne-jedinice': 'Merne jedinice', 'novac': 'Novac',
  'rimski-brojevi': 'Rimski brojevi', 'jednacine': 'Jednačine', 'nejednacine': 'Nejednačine',
}

const IKONE_OBLASTI: Record<string, string> = {
  'sabiranje': '➕', 'oduzimanje': '➖', 'mnozenje': '✖️', 'deljenje': '➗',
  'kombinovane-operacije': '🧮', 'poredjenje-brojeva': '⚖️',
  'nizovi-i-obrasci': '🔁', 'obim-i-merenje': '📐',
  'merne-jedinice': '📏', 'novac': '💰',
  'rimski-brojevi': '🏛️', 'jednacine': '🟰', 'nejednacine': '≠',
}

const TIPOVI: { vrednost: TipPitanja | 'auto'; naziv: string }[] = [
  { vrednost: 'auto', naziv: 'Automatski izbor' },
  { vrednost: 'numeric', naziv: 'Unos broja' },
  { vrednost: 'single', naziv: 'Ponuđeni odgovori' },
]

export function Generator() {
  const navigate = useNavigate()
  const [oblasti, setOblasti] = useState<Oblast[]>([])
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

  function preklopiOblast(slug: string) {
    setTopicSlugovi(
      topicSlugovi.includes(slug) ? topicSlugovi.filter((s) => s !== slug) : [...topicSlugovi, slug],
    )
  }

  const sveIzabrano = podrzane.length > 0 && podrzane.every((s) => topicSlugovi.includes(s))
  function preklopiSveOblasti() {
    setTopicSlugovi(sveIzabrano ? [] : podrzane)
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
    <div className="sadrzaj--usko">
      <h1>Automatski generator pitanja</h1>
      <p className="blago razmak-dole">
        Generisana pitanja NIKAD se ne objavljuju direktno — prvo prolaze tvoj pregled na sledećem koraku.
        Izaberi jednu ili više oblasti da napraviš mešoviti kviz.
      </p>

      <div className="kartica razmak-dole">
        <div className="gen-sekcija">
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
            {podrzane.map((s) => {
              const izabrano = topicSlugovi.includes(s)
              return (
                <label key={s} className={`gen-oblast ${izabrano ? 'gen-oblast--izabrana' : ''}`}>
                  <input type="checkbox" checked={izabrano} onChange={() => preklopiOblast(s)} />
                  <span className="gen-oblast-ikona" aria-hidden="true">{IKONE_OBLASTI[s] ?? '📚'}</span>
                  <span>{NAZIVI_OBLASTI[s] ?? s}</span>
                  <span className="gen-oblast-kvaka" aria-hidden="true">{izabrano ? '✓' : ''}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="gen-sekcija">
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

        <div className="gen-sekcija">
          <div className="red-polja">
            <div className="polje">
              <label htmlFor="g-broj">Broj pitanja (ukupno)</label>
              <input id="g-broj" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <div className="polje" style={{ flex: 2 }}>
              <label>Tip pitanja</label>
              <div className="segment" role="radiogroup" aria-label="Tip pitanja">
                {TIPOVI.map((t) => (
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

        <div className="gen-sekcija">
          <label className="stiklir">
            <input type="checkbox" checked={wordProblems} onChange={(e) => setWordProblems(e.target.checked)} />
            Tekstualni zadaci (priča umesto golog izraza)
          </label>
          <label className="stiklir">
            <input type="checkbox" checked={allowRepeats} onChange={(e) => setAllowRepeats(e.target.checked)} />
            Dozvoli ponavljanje sličnih zadataka
          </label>
        </div>

        {topicSlugovi.length > 0 && (
          <p className="gen-rezime gen-sekcija">
            📋 {count} pitanja · {NAZIVI_TEZINA[difficulty]} · {topicSlugovi.length} {topicSlugovi.length === 1 ? 'oblast izabrana' : 'oblasti izabrano'}
          </p>
        )}

        <button type="button" className="dugme dugme--akcenat" disabled={topicSlugovi.length === 0} onClick={pokreni}>
          Generiši pitanja za pregled
        </button>
      </div>
    </div>
  )
}
