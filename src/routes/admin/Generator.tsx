// Konfiguracija automatskog generisanja pitanja + pokretanje pregleda
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { podrzaneOblasti } from '../../generator'
import { generisi } from '../../generator'
import type { GeneratorConfig, GenerisanoPitanje } from '../../generator/types'
import { listajOblasti } from '../../lib/api'
import { NAZIVI_TEZINA, type Oblast, type TipPitanja } from '../../types/db'
import { GeneratorPregled } from './GeneratorPregled'

const NAZIVI_OBLASTI: Record<string, string> = {
  'sabiranje': 'Sabiranje', 'oduzimanje': 'Oduzimanje', 'mnozenje': 'Množenje', 'deljenje': 'Deljenje',
  'kombinovane-operacije': 'Kombinovane računske operacije', 'poredjenje-brojeva': 'Poređenje brojeva',
  'nizovi-i-obrasci': 'Nizovi i obrasci', 'obim-i-merenje': 'Obim i merenje dužine',
  'merne-jedinice': 'Merne jedinice', 'novac': 'Novac',
}

export function Generator() {
  const navigate = useNavigate()
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  const [topicSlug, setTopicSlug] = useState('sabiranje')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1)
  const [count, setCount] = useState(10)
  const [type, setType] = useState<TipPitanja | 'auto'>('auto')
  const [wordProblems, setWordProblems] = useState(false)
  const [allowRepeats, setAllowRepeats] = useState(false)
  const [rezultat, setRezultat] = useState<GenerisanoPitanje[] | null>(null)
  const [upozorenje, setUpozorenje] = useState<string | null>(null)

  useEffect(() => { listajOblasti().then(setOblasti).catch(() => {}) }, [])

  const podrzane = podrzaneOblasti()

  function pokreni() {
    const cfg: GeneratorConfig = { topicSlug, difficulty, count, type, wordProblems, allowRepeats }
    const r = generisi(cfg)
    setRezultat(r.questions)
    setUpozorenje(r.warning)
  }

  if (rezultat) {
    const oblast = oblasti.find((o) => o.slug === topicSlug)
    return (
      <GeneratorPregled
        pocetnaPitanja={rezultat}
        upozorenje={upozorenje}
        cfg={{ topicSlug, difficulty, count, type, wordProblems, allowRepeats }}
        oblastId={oblast?.id ?? null}
        oblastNaziv={oblast?.name ?? topicSlug}
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
      </p>

      <div className="kartica">
        <div className="polje">
          <label htmlFor="g-oblast">Oblast</label>
          <select id="g-oblast" value={topicSlug} onChange={(e) => setTopicSlug(e.target.value)}>
            {podrzane.map((s) => <option key={s} value={s}>{NAZIVI_OBLASTI[s] ?? s}</option>)}
          </select>
        </div>

        <div className="red-polja">
          <div className="polje">
            <label htmlFor="g-tezina">Nivo težine</label>
            <select id="g-tezina" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as 1 | 2 | 3)}>
              {Object.entries(NAZIVI_TEZINA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="polje">
            <label htmlFor="g-broj">Broj pitanja</label>
            <input id="g-broj" type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
          <div className="polje">
            <label htmlFor="g-tip">Tip pitanja</label>
            <select id="g-tip" value={type} onChange={(e) => setType(e.target.value as TipPitanja | 'auto')}>
              <option value="auto">Automatski izbor</option>
              <option value="numeric">Unos broja</option>
              <option value="single">Ponuđeni odgovori</option>
            </select>
          </div>
        </div>

        <label className="stiklir">
          <input type="checkbox" checked={wordProblems} onChange={(e) => setWordProblems(e.target.checked)} />
          Tekstualni zadaci (priča umesto golog izraza)
        </label>
        <label className="stiklir razmak-dole">
          <input type="checkbox" checked={allowRepeats} onChange={(e) => setAllowRepeats(e.target.checked)} />
          Dozvoli ponavljanje sličnih zadataka
        </label>

        <button type="button" className="dugme dugme--akcenat" onClick={pokreni}>
          Generiši pitanja za pregled
        </button>
      </div>
    </div>
  )
}
