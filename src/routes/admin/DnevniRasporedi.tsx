// Administratorski pregled i forma za svakodnevno, serverski zakazano slanje kvizova.
import { useEffect, useMemo, useRef, useState } from 'react'
import { podrzaneOblasti } from '../../generator'
import {
  listajOblasti, listajProfileDeteta, obrisiDnevniRasporedKviza,
  postaviAktivnostDnevnogRasporeda, sacuvajDnevniRasporedKviza,
  type NoviDnevniRasporedKviza,
} from '../../lib/api'
import { formatDatum } from '../../lib/format'
import { predmetImaTezinu, razrediPredmeta, tezinaZaPredmet } from '../../lib/predmet'
import {
  KONFIGURACIJA_PREDMETA, NAZIVI_PREDMETA, NAZIVI_RAZREDA, NAZIVI_TEZINA, NAZIVI_TIPOVA, PREDMETI,
  type DnevniRasporedKviza, type IzvorDnevnogKviza, type Oblast, type ProfilDeteta, type Tezina, type TipPitanja,
} from '../../types/db'
import './generator.css'

interface FormaRasporeda extends NoviDnevniRasporedKviza {
  id?: string
  timeLimitMinutes: string
}

function novaForma(profili: ProfilDeteta[] = []): FormaRasporeda {
  return {
    childProfileId: profili[0]?.id ?? '',
    subject: 'matematika',
    grade: 3,
    source: 'generator',
    topicIds: [],
    difficulty: null,
    questionType: null,
    questionCount: 10,
    timeLimitSeconds: null,
    timeLimitMinutes: '',
    shuffleQuestions: true,
    shuffleAnswers: true,
    passThresholdPct: 90,
    dailyTime: '18:00',
    smartMode: true,
    weeklyReportEnabled: true,
  }
}

function formaIzRasporeda(raspored: DnevniRasporedKviza): FormaRasporeda {
  return {
    id: raspored.id,
    childProfileId: raspored.child_profile_id,
    subject: raspored.subject,
    grade: raspored.grade,
    source: raspored.source,
    topicIds: raspored.topic_ids,
    difficulty: predmetImaTezinu(raspored.subject)
      ? raspored.difficulty
      : tezinaZaPredmet(raspored.subject),
    questionType: (raspored.source !== 'bank' || raspored.subject === 'priroda_drustvo')
      && !KONFIGURACIJA_PREDMETA[raspored.subject].tipoviGeneratora.includes(
        raspored.question_type as TipPitanja,
      )
      ? null
      : raspored.question_type,
    questionCount: raspored.question_count,
    timeLimitSeconds: raspored.time_limit_seconds,
    timeLimitMinutes: raspored.time_limit_seconds == null ? '' : String(Math.round(raspored.time_limit_seconds / 60)),
    shuffleQuestions: raspored.shuffle_questions,
    shuffleAnswers: raspored.shuffle_answers,
    passThresholdPct: raspored.pass_threshold_pct,
    dailyTime: raspored.daily_time.slice(0, 5),
    smartMode: raspored.smart_mode,
    weeklyReportEnabled: raspored.weekly_report_enabled,
  }
}

function opisSledeceg(raspored: DnevniRasporedKviza): string {
  if (!raspored.is_active) return 'Pauziran'
  const [godina, mesec, dan] = raspored.next_run_on.split('-').map(Number)
  const datum = new Date(godina, mesec - 1, dan)
  return `${datum.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long' })} u ${raspored.daily_time.slice(0, 5)}`
}

function nazivIzvora(izvor: IzvorDnevnogKviza): string {
  if (izvor === 'generator') return 'Generator'
  if (izvor === 'combined') return 'Kombinovano'
  return 'Banka pitanja'
}

export function DnevniRasporedi({
  rasporedi, onPromena, otvoriId, pocetnoDete = '', samoForma = false, onZatvori,
}: {
  rasporedi: DnevniRasporedKviza[]
  otvoriId?: string
  pocetnoDete?: string
  samoForma?: boolean
  onZatvori?: () => void
  onPromena: () => Promise<void>
}) {
  const [profili, setProfili] = useState<ProfilDeteta[]>([])
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  const [forma, setForma] = useState<FormaRasporeda | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState<string | null>(null)
  const podrzane = useMemo(() => new Set(podrzaneOblasti()), [])

  useEffect(() => {
    Promise.all([listajProfileDeteta(), listajOblasti()])
      .then(([deca, teme]) => {
        setProfili(deca)
        setOblasti(teme)
      })
      .catch((e) => setGreska(String((e as Error).message ?? e)))
  }, [])

  const oblastiZaFormu = useMemo(() => {
    if (!forma) return []
    return oblasti.filter((oblast) =>
      oblast.subject === forma.subject
      && oblast.grade === forma.grade
      && (forma.source !== 'generator' || podrzane.has(oblast.slug)),
    )
  }, [forma, oblasti, podrzane])
  const kombinovaniDostupan = forma != null
    && oblasti.some((oblast) => oblast.subject === forma.subject && oblast.grade === forma.grade && podrzane.has(oblast.slug))
    && oblasti.some((oblast) => oblast.subject === forma.subject && oblast.grade === forma.grade && !podrzane.has(oblast.slug))

  useEffect(() => {
    if (!forma || oblastiZaFormu.length === 0) return
    const vazeci = forma.topicIds.filter((id) => oblastiZaFormu.some((oblast) => oblast.id === id))
    if (vazeci.length !== forma.topicIds.length || vazeci.length === 0) {
      setForma({ ...forma, topicIds: vazeci.length ? vazeci : oblastiZaFormu.map((oblast) => oblast.id) })
    }
  }, [forma, oblastiZaFormu])

  function otvoriNovi() {
    setGreska(null)
    setForma(novaForma(profili))
  }

  function promeniKontekst(izmene: Partial<Pick<FormaRasporeda, 'subject' | 'grade' | 'source'>>) {
    if (!forma) return
    const subject = izmene.subject ?? forma.subject
    const trazeniRazred = izmene.grade ?? forma.grade
    const dozvoljeniRazredi = razrediPredmeta(subject)
    const grade = dozvoljeniRazredi.includes(trazeniRazred) ? trazeniRazred : dozvoljeniRazredi[0]
    let source = izmene.source ?? forma.source
    const sveTeme = oblasti.filter((oblast) => oblast.subject === subject && oblast.grade === grade)
    const generatorskeTeme = sveTeme.filter((oblast) => podrzane.has(oblast.slug))
    const imaKombinaciju = generatorskeTeme.length > 0 && generatorskeTeme.length < sveTeme.length
    if (source === 'combined' && !imaKombinaciju) {
      source = generatorskeTeme.length > 0 ? 'generator' : 'bank'
    }
    if (source === 'generator' && generatorskeTeme.length === 0) source = 'bank'
    const teme = source === 'generator' ? generatorskeTeme : sveTeme
    const ograniceniTipovi = source !== 'bank' || subject === 'priroda_drustvo'
    const questionType = ograniceniTipovi && forma.questionType != null
      && !KONFIGURACIJA_PREDMETA[subject].tipoviGeneratora.includes(forma.questionType)
      ? null
      : forma.questionType
    const difficulty = predmetImaTezinu(subject) ? forma.difficulty : tezinaZaPredmet(subject)
    setForma({ ...forma, ...izmene, subject, grade, source, questionType, difficulty, topicIds: teme.map((oblast) => oblast.id) })
  }

  function preklopiOblast(id: string) {
    if (!forma) return
    setForma({
      ...forma,
      topicIds: forma.topicIds.includes(id)
        ? forma.topicIds.filter((topicId) => topicId !== id)
        : [...forma.topicIds, id],
    })
  }

  const otvorenaForma = useRef<string | null>(null)
  useEffect(() => {
    if (!otvoriId || profili.length === 0 || otvorenaForma.current === otvoriId) return
    otvorenaForma.current = otvoriId
    const raspored = rasporedi.find(r => r.id === otvoriId)
    setForma(raspored ? formaIzRasporeda(raspored) : otvoriId === 'novi' ? { ...novaForma(profili), childProfileId: pocetnoDete } : null)
  }, [otvoriId, profili, rasporedi, pocetnoDete])

  async function sacuvaj() {
    if (!forma) return
    if (!forma.childProfileId) { setGreska('Izaberi dete kome se kviz šalje.'); return }
    if (forma.topicIds.length === 0) { setGreska('Izaberi najmanje jednu oblast.'); return }
    if (forma.questionCount < 1 || forma.questionCount > 50) { setGreska('Broj pitanja mora biti između 1 i 50.'); return }

    setRadi('cuvanje'); setGreska(null)
    try {
      await sacuvajDnevniRasporedKviza({
        ...forma,
        timeLimitSeconds: forma.timeLimitMinutes ? Number(forma.timeLimitMinutes) * 60 : null,
      }, forma.id)
      setForma(null)
      await onPromena()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadi(null)
    }
  }

  async function promeniAktivnost(raspored: DnevniRasporedKviza) {
    setRadi(raspored.id); setGreska(null)
    try {
      await postaviAktivnostDnevnogRasporeda(raspored.id, !raspored.is_active)
      await onPromena()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadi(null)
    }
  }

  async function obrisi(raspored: DnevniRasporedKviza) {
    if (!confirm(`Obrisati dnevni raspored za ${raspored.child_name}? Poslati kvizovi ostaju sačuvani.`)) return
    setRadi(raspored.id); setGreska(null)
    try {
      await obrisiDnevniRasporedKviza(raspored.id)
      if (forma?.id === raspored.id) setForma(null)
      await onPromena()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadi(null)
    }
  }

  return (
    <section>
      <div className="red red--razmak razmak-dole" hidden={samoForma}>
        <div>
          <h2>Dnevni rasporedi</h2>
          <p className="blago malo">Svaki dan nastaje novi kviz. Push stiže na povezane uređaje, a pametna vežba može da pošalje nedeljni mejl roditelju.</p>
        </div>
        <button type="button" className="dugme dugme--akcenat" onClick={otvoriNovi} disabled={profili.length === 0}>
          + Novi raspored
        </button>
      </div>

      {profili.length === 0 && <p className="poruka poruka--info">Prvo dodaj dete preko opcije Upravljaj decom.</p>}
      {greska && <p className="poruka poruka--greska">{greska}</p>}

      {forma && (
        <div className="kartica razmak-dole generator-strana">
          <div className="red red--razmak">
            <h3>{forma.id ? 'Uredi dnevni raspored' : 'Novi dnevni raspored'}</h3>
            <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => { setForma(null); onZatvori?.() }}>Otkaži</button>
          </div>
          <p className="blago malo razmak-dole">Prvi kviz stiže u prvom narednom izabranom terminu po vremenu Srbije.</p>

          <div className="kartica gen-sekcija razmak-dole">
            <label className="stiklir">
              <input
                type="checkbox"
                checked={forma.smartMode}
                onChange={(e) => setForma({
                  ...forma,
                  smartMode: e.target.checked,
                  weeklyReportEnabled: e.target.checked && forma.weeklyReportEnabled,
                })}
              />
              <span><strong>Pametna dnevna vežba</strong><br />
                <small className="blago">Prednost imaju slabe oblasti, zatim ponavljanje i jedan teži izazov.</small>
              </span>
            </label>
            <label className="stiklir razmak-gore">
              <input
                type="checkbox"
                checked={forma.weeklyReportEnabled}
                disabled={!forma.smartMode}
                onChange={(e) => setForma({ ...forma, weeklyReportEnabled: e.target.checked })}
              />
              <span><strong>Nedeljni izveštaj mejlom</strong><br />
                <small className="blago">Ponedeljkom posle izabranog termina stižu napredak, jake i slabe oblasti.</small>
              </span>
            </label>
          </div>

          <div className="red-polja">
            <div className="polje">
              <label htmlFor="dr-dete">Dete</label>
              <select id="dr-dete" value={forma.childProfileId} onChange={(e) => setForma({ ...forma, childProfileId: e.target.value })}>
                <option value="">Izaberi dete…</option>
                {profili.map((profil) => <option key={profil.id} value={profil.id}>{profil.avatar} {profil.name}</option>)}
              </select>
            </div>
            <div className="polje">
              <label htmlFor="dr-vreme">Vreme slanja</label>
              <input id="dr-vreme" type="time" value={forma.dailyTime} onChange={(e) => setForma({ ...forma, dailyTime: e.target.value })} required />
            </div>
          </div>

          {forma.subject === 'srpski' && forma.grade === 5 && (
            <p className="poruka poruka--info razmak-dole">
              Sadržaj prati novi program nastave koji se primenjuje od školske 2027/28.
            </p>
          )}

          <div className="red-polja">
            <div className="polje">
              <label>Predmet</label>
              <div className="segment">
                {PREDMETI.map((predmet) => (
                  <button key={predmet} type="button" className={`segment-dugme ${forma.subject === predmet ? 'segment-dugme--izabran' : ''}`} onClick={() => promeniKontekst({ subject: predmet })}>
                    {NAZIVI_PREDMETA[predmet]}
                  </button>
                ))}
              </div>
            </div>
            <div className="polje">
              <label>Razred</label>
              <div className="segment">
                {razrediPredmeta(forma.subject).map((razred) => (
                  <button key={razred} type="button" className={`segment-dugme ${forma.grade === razred ? 'segment-dugme--izabran' : ''}`} onClick={() => promeniKontekst({ grade: razred })}>
                    {NAZIVI_RAZREDA[razred]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="red-polja">
            <div className="polje">
              <label htmlFor="dr-izvor">Izvor pitanja</label>
              <select id="dr-izvor" value={forma.source} onChange={(e) => promeniKontekst({ source: e.target.value as IzvorDnevnogKviza })}>
                <option value="generator">Generator</option>
                <option value="bank">Banka pitanja</option>
                {kombinovaniDostupan && <option value="combined">Kombinovano (generator + banka)</option>}
              </select>
            </div>
            <div className="polje">
              <label htmlFor="dr-broj">Broj pitanja</label>
              <input id="dr-broj" type="number" min={1} max={50} value={forma.questionCount} onChange={(e) => setForma({ ...forma, questionCount: Number(e.target.value) })} />
            </div>
            {predmetImaTezinu(forma.subject) && (
              <div className="polje">
                <label htmlFor="dr-tezina">Težina</label>
                <select id="dr-tezina" value={forma.difficulty ?? ''} onChange={(e) => setForma({ ...forma, difficulty: e.target.value ? Number(e.target.value) as Tezina : null })}>
                  <option value="">{forma.source !== 'bank' ? 'Podrazumevano (3)' : 'Sve težine'}</option>
                  {Object.entries(NAZIVI_TEZINA).map(([vrednost, naziv]) => <option key={vrednost} value={vrednost}>{naziv}</option>)}
                </select>
              </div>
            )}
            <div className="polje">
              <label htmlFor="dr-tip">Tip pitanja</label>
              <select id="dr-tip" value={forma.questionType ?? ''} onChange={(e) => setForma({ ...forma, questionType: e.target.value ? e.target.value as TipPitanja : null })}>
                <option value="">Automatski / svi tipovi</option>
                {Object.entries(NAZIVI_TIPOVA)
                  .filter(([vrednost]) => forma.source === 'bank' && forma.subject !== 'priroda_drustvo'
                    || KONFIGURACIJA_PREDMETA[forma.subject].tipoviGeneratora.includes(vrednost as TipPitanja))
                  .map(([vrednost, naziv]) => <option key={vrednost} value={vrednost}>{naziv}</option>)}
              </select>
            </div>
          </div>

          <div className="gen-sekcija razmak-gore">
            <div className="red red--razmak razmak-dole">
              <p className="gen-naslov">Oblasti</p>
              <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setForma({ ...forma, topicIds: oblastiZaFormu.map((oblast) => oblast.id) })}>Izaberi sve</button>
            </div>
            {forma.source === 'combined' && (
              <p className="blago malo razmak-dole">
                Oblasti sa generatorom prave nova pitanja; ostale koriste pitanja iz banke.
              </p>
            )}
            <div className="gen-oblasti">
              {oblastiZaFormu.map((oblast) => {
                const izabrana = forma.topicIds.includes(oblast.id)
                return (
                  <label key={oblast.id} className={`gen-oblast ${izabrana ? 'gen-oblast--izabrana' : ''}`}>
                    <input type="checkbox" checked={izabrana} onChange={() => preklopiOblast(oblast.id)} />
                    <span className="gen-oblast-tekst">
                      {oblast.name}
                      {forma.source === 'combined' && (
                        <small className="blago"> · {podrzane.has(oblast.slug) ? 'generator' : 'banka'}</small>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="red-polja">
            <div className="polje">
              <label htmlFor="dr-ogranicenje">Vremensko ograničenje (min)</label>
              <input id="dr-ogranicenje" type="number" min={1} max={240} value={forma.timeLimitMinutes} placeholder="Bez ograničenja" onChange={(e) => setForma({ ...forma, timeLimitMinutes: e.target.value })} />
            </div>
            <div className="polje">
              <label htmlFor="dr-prag">Prag prolaza (%)</label>
              <input id="dr-prag" type="number" min={0} max={100} value={forma.passThresholdPct} onChange={(e) => setForma({ ...forma, passThresholdPct: Number(e.target.value) })} />
            </div>
          </div>
          <label className="stiklir"><input type="checkbox" checked={forma.shuffleQuestions} onChange={(e) => setForma({ ...forma, shuffleQuestions: e.target.checked })} /> Mešaj redosled pitanja</label>
          <label className="stiklir razmak-dole"><input type="checkbox" checked={forma.shuffleAnswers} onChange={(e) => setForma({ ...forma, shuffleAnswers: e.target.checked })} /> Mešaj ponuđene odgovore</label>
          <button type="button" className="dugme dugme--akcenat" onClick={sacuvaj} disabled={radi === 'cuvanje'}>{radi === 'cuvanje' ? 'Čuvam…' : 'Sačuvaj raspored'}</button>
        </div>
      )}

      {samoForma ? null : rasporedi.length === 0 ? (
        <p className="blago">Nema dnevnih rasporeda. Napravi prvi raspored za redovno vežbanje.</p>
      ) : (
        <div className="mreza-kartica">
          {!samoForma && rasporedi.map((raspored) => (
            <article className="kartica" key={raspored.id}>
              <div className="red red--razmak">
                <h3>{raspored.child_avatar} {raspored.child_name}</h3>
                <span className={`bedz ${raspored.is_active ? 'bedz--uspeh' : 'bedz--neutral'}`}>{raspored.is_active ? 'Uključen' : 'Pauziran'}</span>
              </div>
              {raspored.smart_mode && <span className="bedz bedz--uspeh">🧠 Pametna vežba</span>}
              <p>{NAZIVI_PREDMETA[raspored.subject]} · {NAZIVI_RAZREDA[raspored.grade]} · {raspored.question_count} pitanja</p>
              <p className="malo blago">{nazivIzvora(raspored.source)} · {raspored.topic_slugs.length} {raspored.topic_slugs.length === 1 ? 'oblast' : 'oblasti'}</p>
              <p className="malo razmak-gore"><strong>Sledeći:</strong> {opisSledeceg(raspored)}</p>
              <p className="malo blago">Poslednji: {raspored.last_sent_at ? formatDatum(raspored.last_sent_at) : 'još nije poslat'}</p>
              {raspored.weekly_report_enabled && (
                <p className="malo blago">Nedeljni izveštaj: {raspored.last_weekly_report_at ? formatDatum(raspored.last_weekly_report_at) : 'prvi stiže narednog ponedeljka'}</p>
              )}
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
