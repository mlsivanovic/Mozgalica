// Kreiranje novog kviza — podržava Standardni (automatski generisani) i Slobodan (ručni unos) režim rada.
// Podešavanja standardnog kviza čuvaju se zasebno za svaku kombinaciju predmeta i razreda u LocalStorage-u.
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { generisi, podrzaneOblasti } from '../../generator'
import { IKONE_GENERISANIH_OBLASTI, NAZIVI_GENERISANIH_OBLASTI } from '../../generator/oblasti'
import {
  listajOblasti, listajPitanja, sacuvajKviz, postaviPitanjaKviza,
  listajProfileDeteta, dodeliKvizProfilu,
  type FilterPitanja, type SnapshotUnos,
} from '../../lib/api'
import {
  izaberiOblastiZaKviz, napraviPlanOblastiKviza, type IzvorStandardnogKviza,
} from '../../lib/raspodelaKviza'
import { predmetImaTezinu, razrediPredmeta, tezinaZaPredmet } from '../../lib/predmet'
import {
  KONFIGURACIJA_PREDMETA, NAZIVI_PREDMETA, NAZIVI_RAZREDA, NAZIVI_TEZINA, NAZIVI_TIPOVA, PREDMETI, RAZREDI,
  type Oblast, type Predmet, type Razred, type Tezina, type TipPitanja,
  type ProfilDeteta,
} from '../../types/db'
import './generator.css'

interface StandardQuizConfig {
  title: string
  count: number
  difficulty: string // '' | '1' | '2' | '3' | '4' | '5'
  type: string // '' | TipPitanja
  source: IzvorStandardnogKviza
  selectedTopics: string[]
  timeLimit: string
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  passThreshold: number
}

export function KvizForma() {
  const navigate = useNavigate()
  const [mod, setMod] = useState<'standard' | 'manual'>('standard')
  
  // Opšta podešavanja za standardni kviz
  const [predmet, setPredmet] = useState<Predmet>('matematika')
  const [razred, setRazred] = useState<Razred>(3)
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  
  // Profili dece za dodelu kviza
  const [profiliDece, setProfiliDece] = useState<ProfilDeteta[]>([])
  const [izabranoDete, setIzabranoDete] = useState<string>('') // prazno za "bez deteta"

  // Spisak oblasti koje imaju automatski generator na backendu
  const podrzaneSlugs = useMemo(() => podrzaneOblasti(), [])

  // Konfiguracija standardnog kviza za trenutni predmet i razred
  const [cfg, setCfg] = useState<StandardQuizConfig>({
    title: '',
    count: 10,
    difficulty: '',
    type: 'auto',
    source: 'bank',
    selectedTopics: [],
    timeLimit: '',
    shuffleQuestions: true,
    shuffleAnswers: true,
    passThreshold: 90,
  })

  // Stanje ručne forme
  const [manualTitle, setManualTitle] = useState('')
  const [manualDescription, setManualTitleDescription] = useState('')

  const [greska, setGreska] = useState<string | null>(null)
  const [cuva, setCuva] = useState(false)

  // Učitavanje oblasti pri montiranju
  useEffect(() => {
    listajOblasti().then(setOblasti).catch((e) => {
      console.error('Greška pri učitavanju oblasti:', e)
    })

    // Učitavanje profila dece
    listajProfileDeteta().then(setProfiliDece).catch((e) => {
      console.error('Greška pri učitavanju profila dece:', e)
    })
  }, [])

  // Filtriranje oblasti za trenutni predmet i razred
  const oblastiZaPrikaz = useMemo(() => {
    return oblasti.filter((o) => o.subject === predmet && o.grade === razred)
  }, [oblasti, predmet, razred])
  const kombinovaniDostupan = oblastiZaPrikaz.some((o) => podrzaneSlugs.includes(o.slug))
    && oblastiZaPrikaz.some((o) => !podrzaneSlugs.includes(o.slug))

  // Funkcija za generisanje inicijalnih default vrednosti
  const getDefaults = useCallback((p: Predmet, r: Razred, sveOblasti: Oblast[]): StandardQuizConfig => {
    const filtrirane = sveOblasti.filter((o) => o.subject === p && o.grade === r)
    const generatorSlugs = filtrirane.filter((o) => podrzaneSlugs.includes(o.slug)).map((o) => o.slug)
    const koristiGenerator = generatorSlugs.length > 0
    const source: IzvorStandardnogKviza = koristiGenerator ? 'generator' : 'bank'
    
    return {
      title: `Standardni kviz — ${NAZIVI_PREDMETA[p]} (${NAZIVI_RAZREDA[r]})`,
      count: 10,
      difficulty: '',
      type: 'auto',
      source,
      selectedTopics: source === 'generator' ? generatorSlugs : filtrirane.map((o) => o.slug),
      timeLimit: '',
      shuffleQuestions: true,
      shuffleAnswers: true,
      passThreshold: 90,
    }
  }, [podrzaneSlugs])

  const ucitajKonfiguraciju = useCallback((p: Predmet, r: Razred): StandardQuizConfig => {
    const oblastiKonteksta = oblasti.filter((o) => o.subject === p && o.grade === r)
    const defaults = getDefaults(p, r, oblasti)
    const kombinovaniKontekst = oblastiKonteksta.some((o) => podrzaneSlugs.includes(o.slug))
      && oblastiKonteksta.some((o) => !podrzaneSlugs.includes(o.slug))
    const saved = localStorage.getItem(`standard_quiz_settings_${p}_${r}`)
    if (!saved) return defaults

    try {
      const parsed = JSON.parse(saved) as Partial<StandardQuizConfig>
      const ispravniSlugovi = parsed.selectedTopics?.filter((slug) =>
        oblastiKonteksta.some((o) => o.slug === slug)
      ) ?? defaults.selectedTopics

      let noviIzvor = parsed.source ?? defaults.source
      if (noviIzvor === 'generator' && !oblastiKonteksta.some((o) => podrzaneSlugs.includes(o.slug))) {
        noviIzvor = 'bank'
      }
      if (noviIzvor === 'combined' && !kombinovaniKontekst) {
        noviIzvor = defaults.source
      }

      let konacneTeme = ispravniSlugovi.length > 0 ? ispravniSlugovi : defaults.selectedTopics
      if (noviIzvor === 'generator') {
        konacneTeme = konacneTeme.filter((slug) => podrzaneSlugs.includes(slug))
      }
      const konacniTip = (noviIzvor !== 'bank' || p === 'priroda_drustvo')
        && !['auto', ...KONFIGURACIJA_PREDMETA[p].tipoviGeneratora].includes(
          (parsed.type ?? defaults.type) as TipPitanja | 'auto',
        )
        ? 'auto'
        : (parsed.type ?? defaults.type)

      return {
        ...defaults,
        ...parsed,
        source: noviIzvor,
        type: konacniTip,
        selectedTopics: konacneTeme,
      }
    } catch (e) {
      console.error('Greška pri parsiranju sačuvanih podešavanja:', e)
      return defaults
    }
  }, [oblasti, getDefaults, podrzaneSlugs])

  // Učitavanje podešavanja iz LocalStorage-a za predmet i razred
  useEffect(() => {
    if (oblasti.length === 0) return
    setCfg(ucitajKonfiguraciju(predmet, razred))
    setGreska(null)
  }, [predmet, razred, oblasti.length, ucitajKonfiguraciju])

  function promeniPredmet(noviPredmet: Predmet) {
    if (noviPredmet === predmet) return
    const podrzaniRazredi = razrediPredmeta(noviPredmet)
    const noviRazred = podrzaniRazredi.includes(razred) ? razred : podrzaniRazredi[0]
    if (oblasti.length > 0) setCfg(ucitajKonfiguraciju(noviPredmet, noviRazred))
    setPredmet(noviPredmet)
    setRazred(noviRazred)
    setGreska(null)
  }

  function promeniRazred(noviRazred: Razred) {
    if (noviRazred === razred) return
    if (oblasti.length > 0) setCfg(ucitajKonfiguraciju(predmet, noviRazred))
    setRazred(noviRazred)
    setGreska(null)
  }

  // Čuvanje izmena u state-u i LocalStorage-u
  const azurirajCfg = (updates: Partial<StandardQuizConfig>) => {
    setCfg((prev) => {
      const sledeci = { ...prev, ...updates }
      
      const key = `standard_quiz_settings_${predmet}_${razred}`
      localStorage.setItem(key, JSON.stringify(sledeci))
      return sledeci
    })
  }

  // Funkcija za promenu izvora pitanja sa čišćenjem nekompatibilnih tema
  const promeniIzvor = (noviIzvor: IzvorStandardnogKviza) => {
    let sledeceTeme = cfg.selectedTopics
    if (noviIzvor === 'generator') {
      sledeceTeme = cfg.selectedTopics.filter((slug) => podrzaneSlugs.includes(slug))
    }
    const tip = (noviIzvor !== 'bank' || predmet === 'priroda_drustvo')
      && !['auto', ...KONFIGURACIJA_PREDMETA[predmet].tipoviGeneratora].includes(
        cfg.type as TipPitanja | 'auto',
      )
      ? 'auto'
      : cfg.type
    azurirajCfg({ source: noviIzvor, selectedTopics: sledeceTeme, type: tip })
  }

  // Selekcija pojedinačne oblasti
  const preklopiOblast = (slug: string) => {
    const sledece = cfg.selectedTopics.includes(slug)
      ? cfg.selectedTopics.filter((s) => s !== slug)
      : [...cfg.selectedTopics, slug]
    azurirajCfg({ selectedTopics: sledece })
  }

  // Selekcija svih oblasti
  const preklopiSveOblasti = () => {
    // Ako je generator uključen, selektuju se samo one oblasti koje imaju generator
    const dostupneOblasti = cfg.source === 'generator'
      ? oblastiZaPrikaz.filter((o) => podrzaneSlugs.includes(o.slug))
      : oblastiZaPrikaz

    const sveUkljucene = dostupneOblasti.every((o) => cfg.selectedTopics.includes(o.slug))
    const sledece = sveUkljucene ? [] : dostupneOblasti.map((o) => o.slug)
    azurirajCfg({ selectedTopics: sledece })
  }

  // Kreiranje slobodnog (ručnog) kviza
  async function napraviRucno() {
    if (manualTitle.trim().length < 2) {
      setGreska('Unesi naziv kviza.')
      return
    }
    setGreska(null)
    setCuva(true)
    try {
      const quizId = await sacuvajKviz({
        title: manualTitle.trim(),
        description: manualDescription.trim() || null,
        time_limit_seconds: null,
        default_max_attempts: 1,
        shuffle_questions: true,
        shuffle_answers: true,
        show_result: true,
        show_correct: true,
        pass_threshold_pct: 90,
        require_name: true,
        fixed_child_name: null,
        require_label: false,
        label_name: 'Odeljenje',
        grade: razred,
      })

      // Dodeli kviz izabranom detetu ako je odabrano
      if (izabranoDete) {
        await dodeliKvizProfilu(quizId, izabranoDete, true)
      }

      navigate(`/admin/kvizovi/${quizId}`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuva(false)
    }
  }

  // Kreiranje i generisanje standardnog kviza
  async function generisiKviz() {
    if (cfg.title.trim().length < 2) {
      setGreska('Unesi naziv kviza.')
      return
    }
    const izabraneOblasti = izaberiOblastiZaKviz(
      oblasti, predmet, razred, cfg.selectedTopics,
    )
    if (izabraneOblasti.length === 0) {
      setGreska('Moraš izabrati barem jednu oblast za kviz.')
      return
    }
    if (cfg.count < 1) {
      setGreska('Broj pitanja mora biti veći od nule.')
      return
    }

    setGreska(null)
    setCuva(true)

    try {
      const timeLimitSeconds = cfg.timeLimit ? Number(cfg.timeLimit) * 60 : null
      
      // 1. Snimi novi kviz red u bazi
      const quizId = await sacuvajKviz({
        title: cfg.title.trim(),
        description: `Standardni automatski kviz (${NAZIVI_PREDMETA[predmet]} - ${NAZIVI_RAZREDA[razred]})`,
        time_limit_seconds: timeLimitSeconds,
        default_max_attempts: 1,
        shuffle_questions: cfg.shuffleQuestions,
        shuffle_answers: cfg.shuffleAnswers,
        show_result: true,
        show_correct: true,
        pass_threshold_pct: cfg.passThreshold,
        require_name: true,
        fixed_child_name: null,
        require_label: false,
        label_name: 'Odeljenje',
        grade: razred,
      })

      let unosi: SnapshotUnos[] = []

      // 2a. Generator ili kombinovani izvor: ravnomerno po oblastima, a kod
      // kombinovanog izvora svaka oblast bira generator ili banku.
      if (cfg.source === 'generator' || cfg.source === 'combined') {
        const plan = napraviPlanOblastiKviza(
          izabraneOblasti.map((oblast) => oblast.slug),
          cfg.count,
          new Set(podrzaneSlugs),
          cfg.source,
        )

        if (plan.length === 0) {
          throw new Error('Nijedna od izabranih oblasti nema automatski generator. Izaberi druge oblasti ili promeni izvor na banku.')
        }

        const planBanke = plan.filter((stavka) => stavka.source === 'bank')
        const oblastiBanke = planBanke.map((stavka) => izabraneOblasti.find((o) => o.slug === stavka.topicSlug))
        if (oblastiBanke.some((oblast) => !oblast)) {
          throw new Error('Jedna od izabranih oblasti nije pronađena.')
        }

        const filterBanke: FilterPitanja = {
          topicIds: oblastiBanke.map((oblast) => oblast!.id),
        }
        filterBanke.difficulty = predmetImaTezinu(predmet)
          ? cfg.difficulty ? Number(cfg.difficulty) : undefined
          : tezinaZaPredmet(predmet)
        if (cfg.type && cfg.type !== 'auto') filterBanke.type = cfg.type
        const svaPitanjaIzBanke = planBanke.length > 0 ? await listajPitanja(filterBanke) : []

        for (const stavka of plan) {
          const oblast = izabraneOblasti.find((o) => o.slug === stavka.topicSlug)
          if (!oblast) throw new Error(`Oblast „${stavka.topicSlug}“ nije pronađena.`)

          if (stavka.source === 'generator') {
            const rez = generisi({
              topicSlug: stavka.topicSlug,
              difficulty: tezinaZaPredmet(
                predmet,
                cfg.difficulty ? Number(cfg.difficulty) as Tezina : undefined,
              ),
              count: stavka.questionCount,
              type: (cfg.type === 'auto' || !cfg.type ? 'auto' : cfg.type) as TipPitanja | 'auto',
              wordProblems: false,
              allowRepeats: false,
            })
            if (rez.questions.length < stavka.questionCount) {
              throw new Error(`Generator za oblast „${oblast.name}“ napravio je ${rez.questions.length} od potrebnih ${stavka.questionCount} pitanja.`)
            }
            for (const pitanje of rez.questions) {
              unosi.push({
                quiz_id: quizId,
                position: unosi.length,
                source_question_id: null,
                topic_id: oblast.id,
                topic_name: oblast.name,
                type: pitanje.type,
                text: pitanje.text,
                options: pitanje.options,
                correct: pitanje.correct,
                explanation: pitanje.explanation || null,
                hint: pitanje.hint || null,
                points: pitanje.points,
                manual_review: false,
              })
            }
            continue
          }

          const kandidati = svaPitanjaIzBanke.filter((pitanje) => pitanje.topic_id === oblast.id)
          const odabrana = [...kandidati].sort(() => Math.random() - 0.5).slice(0, stavka.questionCount)
          if (odabrana.length < stavka.questionCount) {
            throw new Error(`U banci za oblast „${oblast.name}“ pronađeno je ${odabrana.length} od potrebnih ${stavka.questionCount} pitanja sa izabranim filterima.`)
          }
          for (const pitanje of odabrana) {
            unosi.push({
              quiz_id: quizId,
              position: unosi.length,
              source_question_id: pitanje.id,
              topic_id: pitanje.topic_id,
              topic_name: oblast.name,
              type: pitanje.type,
              text: pitanje.text,
              options: pitanje.options,
              correct: pitanje.correct,
              explanation: pitanje.explanation || null,
              hint: pitanje.hint || null,
              points: pitanje.points,
              manual_review: pitanje.manual_review,
            })
          }
        }
      } 
      // 2b. Ako je izvor banka pitanja (bilo koji predmet)
      else {
        const filter: FilterPitanja = {
          topicIds: izabraneOblasti.map((oblast) => oblast.id),
        }

        if (!predmetImaTezinu(predmet)) {
          filter.difficulty = tezinaZaPredmet(predmet)
        } else if (cfg.difficulty) {
          filter.difficulty = Number(cfg.difficulty)
        }
        if (cfg.type && cfg.type !== 'auto') {
          filter.type = cfg.type
        }

        const bankPitanja = await listajPitanja(filter)

        if (bankPitanja.length === 0) {
          throw new Error('Nije pronađeno nijedno pitanje u banci za izabrana podešavanja. Promeni oblast ili težinu.')
        }

        // Nasumičan izbor pitanja
        const promesana = [...bankPitanja].sort(() => Math.random() - 0.5)
        const odabrana = promesana.slice(0, cfg.count)

        unosi = odabrana.map((p, i) => ({
          quiz_id: quizId,
          position: i,
          source_question_id: p.id,
          topic_id: p.topic_id,
          topic_name: oblasti.find((o) => o.id === p.topic_id)?.name ?? '—',
          type: p.type,
          text: p.text,
          options: p.options,
          correct: p.correct,
          explanation: p.explanation || null,
          hint: p.hint || null,
          points: p.points,
          manual_review: p.manual_review,
        }))
      }

      // 3. Postavi pitanja u kviz
      await postaviPitanjaKviza(quizId, unosi)

      // 4. Dodeli kviz izabranom detetu ako je odabrano
      if (izabranoDete) {
        await dodeliKvizProfilu(quizId, izabranoDete, true)
      }

      navigate(`/admin/kvizovi/${quizId}`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuva(false)
    }
  }

  // Filtrirane oblasti koje se zaista prikazuju (ako je izvor generator, potpuno skrivamo one koje ga nemaju)
  const vidljiveOblasti = useMemo(() => {
    const obradjene = oblastiZaPrikaz.map((o) => {
      const imaGen = podrzaneSlugs.includes(o.slug)
      return {
        ...o,
        imaGenerator: imaGen,
      }
    })

    if (cfg.source === 'generator') {
      return obradjene.filter((o) => o.imaGenerator)
    }
    return obradjene
  }, [oblastiZaPrikaz, podrzaneSlugs, cfg.source])

  const sveOblastiIzabrane = vidljiveOblasti.length > 0 && 
    vidljiveOblasti.every((o) => cfg.selectedTopics.includes(o.slug))

  return (
    <div className="generator-strana">
      <div className="zaglavlje-strane">
        <h1>Novi kviz</h1>
      </div>

      {/* Segmentirani kontroler za izbor MODA (Standardni vs Slobodan) */}
      <div className="segment razmak-dole" role="tablist">
        <button
          type="button" role="tab" aria-selected={mod === 'standard'}
          className={`segment-dugme ${mod === 'standard' ? 'segment-dugme--izabran' : ''}`}
          onClick={() => setMod('standard')}
        >
          ✨ Standardni kviz (automatski)
        </button>
        <button
          type="button" role="tab" aria-selected={mod === 'manual'}
          className={`segment-dugme ${mod === 'manual' ? 'segment-dugme--izabran' : ''}`}
          onClick={() => setMod('manual')}
        >
          📝 Slobodan kviz (ručni unos)
        </button>
      </div>

      {mod === 'manual' ? (
        <div className="sadrzaj--usko">
          <div className="kartica">
            <h2>Kreiraj ručni kviz</h2>
            <p className="blago malo razmak-dole">
              Napravi prazan kviz, pa sam/a biraj i dodaj pitanja iz banke ili kreiraj nova na sledećem koraku.
            </p>

            <div className="polje">
              <label htmlFor="kv-naziv">Naziv kviza</label>
              <input
                id="kv-naziv" type="text" value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="npr. Množenje — leto 2026"
              />
            </div>

            <div className="polje">
              <label htmlFor="kv-opis">Poruka detetu (opciono)</label>
              <textarea
                id="kv-opis" value={manualDescription}
                onChange={(e) => setManualTitleDescription(e.target.value)}
                placeholder="Srećno rešavanje! 🌟"
              />
            </div>

            <div className="polje">
              <label htmlFor="kv-razred-manual">Razred</label>
              <div className="segment">
                {RAZREDI.map((r) => (
                  <button
                    key={r} type="button"
                    className={`segment-dugme ${razred === r ? 'segment-dugme--izabran' : ''}`}
                    onClick={() => promeniRazred(r)}
                  >
                    {NAZIVI_RAZREDA[r]}
                  </button>
                ))}
              </div>
            </div>

            {profiliDece.length > 0 && (
              <div className="polje">
                <label htmlFor="kv-dodeljeno-manual">Dodeli kviz detetu (opciono)</label>
                <select
                  id="kv-dodeljeno-manual"
                  value={izabranoDete}
                  onChange={(e) => setIzabranoDete(e.target.value)}
                >
                  <option value="">Bez deteta (samo kreiraj kviz)</option>
                  {profiliDece.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.avatar} {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

            <button type="button" className="dugme dugme--akcenat" disabled={cuva} onClick={napraviRucno}>
              {cuva ? 'Pravim…' : 'Napravi kviz i nastavi'}
            </button>
          </div>
        </div>
      ) : (
        <div className="gen-forma">
          {/* LEVA STRANA: Izbor oblasti (samo za standardni kviz) */}
          <div className="gen-sekcija gen-sekcija--oblasti">
            <div className="red red--razmak razmak-dole">
              <p className="gen-naslov">Uključene oblasti</p>
              <button
                type="button" className="dugme dugme--malo dugme--senka"
                onClick={preklopiSveOblasti}
              >
                {sveOblastiIzabrane ? 'Deselektuj sve' : 'Izaberi sve'}
              </button>
            </div>
            {cfg.source === 'combined' && (
              <p className="blago malo razmak-dole">
                Oblasti označene kao „generator“ prave nova pitanja, a oblasti označene kao „banka“ koriste postojeća pitanja iz baze.
              </p>
            )}
            
            {vidljiveOblasti.length === 0 ? (
              <p className="blago">Nema dostupnih oblasti sa izabranim parametrima.</p>
            ) : (
              <div className="gen-oblasti">
                {vidljiveOblasti.map((o) => {
                  const izabrana = cfg.selectedTopics.includes(o.slug)
                  return (
                    <label
                      key={o.id}
                      className={`gen-oblast ${izabrana ? 'gen-oblast--izabrana' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={izabrana}
                        onChange={() => preklopiOblast(o.slug)}
                      />
                      <span className="gen-oblast-ikona">
                        {IKONE_GENERISANIH_OBLASTI[o.slug] ?? '❓'}
                      </span>
                      <span className="gen-oblast-tekst">
                        {NAZIVI_GENERISANIH_OBLASTI[o.slug] ?? o.name}
                        {cfg.source === 'combined' && (
                          <small className="blago"> · {o.imaGenerator ? 'generator' : 'banka'}</small>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* DESNA STRANA: Podešavanja predmeta, razreda, količine, težine i izvora */}
          <div className="gen-desno">
            {/* Predmet i Razred */}
            <div className="gen-sekcija">
              <p className="gen-naslov razmak-dole">Predmet i razred</p>
              <div className="red-polja">
                <div className="polje">
                  <label htmlFor="f-predmet">Predmet</label>
                  <div className="segment">
                    {PREDMETI.map((p) => (
                      <button
                        key={p} type="button"
                        className={`segment-dugme ${predmet === p ? 'segment-dugme--izabran' : ''}`}
                        onClick={() => promeniPredmet(p)}
                      >
                        {NAZIVI_PREDMETA[p]}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="polje">
                  <label htmlFor="f-razred">Razred</label>
                  <div className="segment">
                    {razrediPredmeta(predmet).map((r) => (
                      <button
                        key={r} type="button"
                        className={`segment-dugme ${razred === r ? 'segment-dugme--izabran' : ''}`}
                        onClick={() => promeniRazred(r)}
                      >
                        {NAZIVI_RAZREDA[r]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Podešavanja standardnog kviza */}
            <div className="gen-sekcija gen-sekcija--podesavanje kartica">
              <h2>Opcije standardnog kviza</h2>
              <p className="blago malo razmak-dole">
                Ove opcije se automatski pamte za kombinaciju {NAZIVI_PREDMETA[predmet]}{predmet === 'matematika' ? ` (${NAZIVI_RAZREDA[razred]})` : ''}.
              </p>

              <div className="polje">
                <label htmlFor="std-title">Naziv kviza</label>
                <input
                  id="std-title" type="text" value={cfg.title}
                  onChange={(e) => azurirajCfg({ title: e.target.value })}
                  placeholder="npr. Matematika 3. razred — Standard"
                />
              </div>

              {profiliDece.length > 0 && (
                <div className="polje">
                  <label htmlFor="std-dodeljeno">Dodeli kviz detetu (opciono)</label>
                  <select
                    id="std-dodeljeno"
                    value={izabranoDete}
                    onChange={(e) => setIzabranoDete(e.target.value)}
                  >
                    <option value="">Bez deteta (samo kreiraj kviz)</option>
                    {profiliDece.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="red-polja">
                <div className="polje">
                  <label htmlFor="std-count">Broj pitanja</label>
                  <input
                    id="std-count" type="number" min={1} max={50} value={cfg.count}
                    onChange={(e) => azurirajCfg({ count: Number(e.target.value) })}
                  />
                </div>

                <div className="polje">
                  <label htmlFor="std-source">Izvor pitanja</label>
                  <select
                    id="std-source" value={cfg.source}
                    onChange={(e) => promeniIzvor(e.target.value as IzvorStandardnogKviza)}
                  >
                    <option value="bank">Banka pitanja (iz baze)</option>
                    <option value="generator">Generator (dinamički)</option>
                    {kombinovaniDostupan && <option value="combined">Kombinovano (generator + banka)</option>}
                  </select>
                </div>
              </div>

              <div className="red-polja">
                {predmetImaTezinu(predmet) && (
                  <div className="polje">
                    <label htmlFor="std-difficulty">Težina pitanja</label>
                    <select
                      id="std-difficulty" value={cfg.difficulty}
                      onChange={(e) => azurirajCfg({ difficulty: e.target.value })}
                    >
                      <option value="">Sve težine (mešovito)</option>
                      {Object.entries(NAZIVI_TEZINA).map(([k, v]) => (
                        <option key={k} value={k}>{v} ({k})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="polje">
                  <label htmlFor="std-type">Tip pitanja</label>
                  <select
                    id="std-type" value={cfg.type}
                    onChange={(e) => azurirajCfg({ type: e.target.value })}
                  >
                    <option value="auto">Svi tipovi (automatski)</option>
                    {Object.entries(NAZIVI_TIPOVA)
                      .filter(([k]) => cfg.source === 'bank'
                        ? predmet !== 'priroda_drustvo'
                          || KONFIGURACIJA_PREDMETA[predmet].tipoviGeneratora.includes(k as TipPitanja)
                        : KONFIGURACIJA_PREDMETA[predmet].tipoviGeneratora.includes(k as TipPitanja))
                      .map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dodatne postavke kviza */}
            <div className="gen-sekcija gen-sekcija--opcije kartica razmak-gore">
              <h2>Dodatne opcije kviza</h2>
              
              <div className="red-polja">
                <div className="polje">
                  <label htmlFor="std-time-limit">Vreme (minuti, opciono)</label>
                  <input
                    id="std-time-limit" type="number" min={1} value={cfg.timeLimit}
                    onChange={(e) => azurirajCfg({ timeLimit: e.target.value })}
                    placeholder="Bez ograničenja"
                  />
                </div>

                <div className="polje">
                  <label htmlFor="std-pass">Prag prolaza %</label>
                  <input
                    id="std-pass" type="number" min={1} max={100} value={cfg.passThreshold}
                    onChange={(e) => azurirajCfg({ passThreshold: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="polje razmak-gore">
                <label className="stiklir">
                  <input
                    type="checkbox" checked={cfg.shuffleQuestions}
                    onChange={(e) => azurirajCfg({ shuffleQuestions: e.target.checked })}
                  />
                  Mešaj redosled pitanja
                </label>
              </div>

              <div className="polje">
                <label className="stiklir">
                  <input
                    type="checkbox" checked={cfg.shuffleAnswers}
                    onChange={(e) => azurirajCfg({ shuffleAnswers: e.target.checked })}
                  />
                  Mešaj ponuđene odgovore
                </label>
              </div>
            </div>

            {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

            <button
              type="button" className="dugme dugme--akcenat gen-dugme razmak-gore"
              disabled={cuva} onClick={generisiKviz}
            >
              {cuva ? 'Pravim kviz…' : '⚡ Generiši kviz i nastavi'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
