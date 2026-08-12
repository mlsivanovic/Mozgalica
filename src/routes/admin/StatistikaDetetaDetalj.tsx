// Detaljan administratorski pregled napretka jednog profila deteta.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TitleAvatar } from '../../components/TitleAvatar'
import { Loader } from '../../components/Zajednicke'
import { ucitajStatistikuDeteta } from '../../lib/api'
import { formatDatum, formatProcenat, formatTrajanje } from '../../lib/format'
import {
  danasUBeogradu, imaPodatkeZaGrafik, odrediBrziPeriod,
  validirajPrilagodjeniPeriod, type BrziPeriodStatistike, type OpsegDatumaStatistike,
} from '../../lib/statistikaDeteta'
import type {
  NagradeStatistikeDeteta, StatistikaDetetaPayload, StatistikaOblastiDeteta,
  TackaTrendaDeteta,
} from '../../types/kviz'
import './statistika-dece.css'

const BRZI_PERIODI: Array<{ id: Exclude<BrziPeriodStatistike, 'custom'>; naziv: string }> = [
  { id: '7d', naziv: '7 dana' },
  { id: '30d', naziv: '30 dana' },
  { id: 'school-year', naziv: 'Školska godina' },
  { id: 'all', naziv: 'Sve vreme' },
]

function formatirajDan(datum: string): string {
  const [godina, mesec, dan] = datum.split('-')
  if (!godina || !mesec || !dan) return datum
  return `${Number(dan)}.${Number(mesec)}.${godina}.`
}

function opisOpsega(opseg: OpsegDatumaStatistike): string {
  if (!opseg.from || !opseg.to) return 'Sve vreme'
  return `${formatirajDan(opseg.from)} – ${formatirajDan(opseg.to)}`
}

function prikaziTrend(trend: number | null): { tekst: string; klasa: string } {
  if (trend == null) return { tekst: 'Potrebno je najmanje 6 kvizova za poređenje.', klasa: 'blago' }
  if (trend > 0) return { tekst: `Bolje za ${formatProcenat(Math.abs(trend))} u poslednja 3 kviza.`, klasa: 'statistika-trend--rast' }
  if (trend < 0) return { tekst: `Slabije za ${formatProcenat(Math.abs(trend))} u poslednja 3 kviza.`, klasa: 'statistika-trend--pad' }
  return { tekst: 'Rezultat je stabilan u poslednja 3 kviza.', klasa: 'blago' }
}

function Metrika({ naziv, vrednost, napomena }: { naziv: string; vrednost: string | number; napomena?: string }) {
  return (
    <div className="kartica statistika-metrika">
      <p className="malo blago">{naziv}</p>
      <strong>{vrednost}</strong>
      {napomena && <small className="blago">{napomena}</small>}
    </div>
  )
}

function GrafikTrenda({ tacke }: { tacke: TackaTrendaDeteta[] }) {
  const nacrt = useMemo(() => {
    const sirina = 720
    const visina = 260
    const leva = 44
    const desna = 22
    const gore = 18
    const dole = 38
    const prostorX = sirina - leva - desna
    const prostorY = visina - gore - dole
    const x = (indeks: number) => tacke.length === 1
      ? leva + prostorX / 2
      : leva + (indeks / (tacke.length - 1)) * prostorX
    const y = (vrednost: number) => gore + (1 - Math.max(0, Math.min(100, vrednost)) / 100) * prostorY
    const putanja = tacke.map((tacka, indeks) => `${indeks === 0 ? 'M' : 'L'} ${x(indeks).toFixed(2)} ${y(tacka.avgScorePct).toFixed(2)}`).join(' ')
    return { sirina, visina, leva, desna, gore, dole, x, y, putanja }
  }, [tacke])

  if (!imaPodatkeZaGrafik(tacke.length)) {
    return (
      <section className="kartica statistika-grafik-kartica">
        <h2>Rezultat kroz vreme</h2>
        <p className="blago razmak-gore">Još nema konačno ocenjenih kvizova za izabrani period.</p>
      </section>
    )
  }

  const prva = tacke[0]!
  const poslednja = tacke[tacke.length - 1]!
  const vodilje = [0, 25, 50, 75, 100]
  const opis = `${formatirajDan(prva.date)} do ${formatirajDan(poslednja.date)}; poslednji dnevni prosek je ${formatProcenat(poslednja.avgScorePct)}.`

  return (
    <section className="kartica statistika-grafik-kartica">
      <div className="statistika-sekcija-zaglavlje">
        <div>
          <h2>Rezultat kroz vreme</h2>
          <p className="malo blago">Dnevni prosek završnih, potpuno ocenjenih kvizova.</p>
        </div>
        <span className="bedz">{tacke.length} {tacke.length === 1 ? 'dan' : 'dana'}</span>
      </div>
      <svg
        className="statistika-grafik"
        viewBox={`0 0 ${nacrt.sirina} ${nacrt.visina}`}
        role="img"
        aria-labelledby="grafik-trenda-naslov grafik-trenda-opis"
      >
        <title id="grafik-trenda-naslov">Prosek rezultata po danima</title>
        <desc id="grafik-trenda-opis">{opis}</desc>
        <g aria-hidden="true">
          {vodilje.map((vrednost) => (
            <g key={vrednost}>
              <line
                x1={nacrt.leva}
                x2={nacrt.sirina - nacrt.desna}
                y1={nacrt.y(vrednost)}
                y2={nacrt.y(vrednost)}
                className="statistika-grafik-mreza"
              />
              <text x={nacrt.leva - 8} y={nacrt.y(vrednost) + 4} textAnchor="end" className="statistika-grafik-osa">
                {vrednost}%
              </text>
            </g>
          ))}
          <path d={nacrt.putanja} className="statistika-grafik-linija" />
          {tacke.map((tacka, indeks) => (
            <circle
              key={tacka.date}
              cx={nacrt.x(indeks)}
              cy={nacrt.y(tacka.avgScorePct)}
              r={tacke.length > 80 ? 1.8 : 3.4}
              className="statistika-grafik-tacka"
            >
              <title>{`${formatirajDan(tacka.date)}: ${formatProcenat(tacka.avgScorePct)} (${tacka.attemptsCount} kviz)`}</title>
            </circle>
          ))}
          <text x={nacrt.leva} y={nacrt.visina - 12} textAnchor="start" className="statistika-grafik-osa">
            {formatirajDan(prva.date)}
          </text>
          {tacke.length > 1 && (
            <text x={nacrt.sirina - nacrt.desna} y={nacrt.visina - 12} textAnchor="end" className="statistika-grafik-osa">
              {formatirajDan(poslednja.date)}
            </text>
          )}
        </g>
      </svg>
      <p className="malo blago statistika-grafik-opis">{opis}</p>
    </section>
  )
}

function TrakaOblasti({ oblast }: { oblast: StatistikaOblastiDeteta }) {
  const procenat = Math.max(0, Math.min(100, oblast.successPct))
  return (
    <li className="statistika-oblast">
      <div className="statistika-oblast-zaglavlje">
        <strong>{oblast.topicName}</strong>
        <span>{formatProcenat(procenat)} · {oblast.correctCount}/{oblast.questionCount}</span>
      </div>
      <div
        className="statistika-oblast-traka"
        role="progressbar"
        aria-label={`${oblast.topicName}: ${formatProcenat(procenat)} tačnih odgovora`}
        aria-valuenow={procenat}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${procenat}%` }} />
      </div>
      <small className="blago">{oblast.incorrectCount} netačnih ili neodgovorenih pitanja</small>
    </li>
  )
}

function IzdvojeneOblasti({
  naslov, opis, oblasti, klasa,
}: {
  naslov: string
  opis: string
  oblasti: StatistikaOblastiDeteta[]
  klasa: string
}) {
  return (
    <section className={`kartica statistika-izdvojene-oblasti ${klasa}`}>
      <h3>{naslov}</h3>
      {oblasti.length === 0 ? (
        <p className="malo blago razmak-gore">{opis}</p>
      ) : (
        <ul className="statistika-kratka-lista razmak-gore">
          {oblasti.map((oblast) => (
            <li key={oblast.topicName}>
              <strong>{oblast.topicName}</strong>
              <span>{formatProcenat(oblast.successPct)} · {oblast.questionCount} pitanja</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Nagrade({ rewards }: { rewards: NagradeStatistikeDeteta }) {
  const titula = rewards.currentTitle
  const kupovine = rewards.purchaseStatus
  return (
    <section className="kartica statistika-nagrade-kartica">
      <div className="statistika-sekcija-zaglavlje">
        <div>
          <h2>Nagrade i titula</h2>
          <p className="malo blago">Ovo je zvanično stanje vezano za profil, bez starih rezultata po imenu.</p>
        </div>
        <TitleAvatar name={titula?.name ?? 'Bez titule'} avatar={titula?.avatar} size={52} />
      </div>
      <p className="statistika-nagrada-titula"><strong>{titula?.name ?? 'Bez titule'}</strong></p>
      <dl className="statistika-metrike statistika-metrike--nagrade">
        <div><dt>Ukupno zvezdica</dt><dd>⭐ {rewards.totalStars}</dd></div>
        <div><dt>Raspoloživo</dt><dd>🛒 {rewards.spendableStars}</dd></div>
        <div><dt>Potrošeno</dt><dd>{rewards.spentStars}</dd></div>
      </dl>
      <div className="statistika-status-kupovina" aria-label="Stanje kupovina">
        <span><strong>{kupovine.requestedCount}</strong> čeka isporuku</span>
        <span><strong>{kupovine.consumedCount}</strong> isporučeno</span>
        <span><strong>{kupovine.cancelledCount}</strong> otkazano</span>
      </div>
    </section>
  )
}

export function StatistikaDetetaDetalj() {
  const { profilId = '' } = useParams<{ profilId: string }>()
  const [ucitava, setUcitava] = useState(true)
  const [osvezava, setOsvezava] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [statistika, setStatistika] = useState<StatistikaDetetaPayload | null>(null)
  const [period, setPeriod] = useState<BrziPeriodStatistike>('all')
  const [aktivniOpseg, setAktivniOpseg] = useState<OpsegDatumaStatistike>(() => odrediBrziPeriod('all'))
  const [customFrom, setCustomFrom] = useState(() => odrediBrziPeriod('30d').from ?? '')
  const [customTo, setCustomTo] = useState(danasUBeogradu)
  const [greskaPerioda, setGreskaPerioda] = useState<string | null>(null)
  const poslednjiUcitaniProfil = useRef<string | null>(null)

  useEffect(() => {
    if (!profilId) {
      setGreska('Profil deteta nije pronađen.')
      setUcitava(false)
      return
    }
    let aktivno = true
    if (poslednjiUcitaniProfil.current === profilId) setOsvezava(true)
    else {
      setUcitava(true)
      setStatistika(null)
    }
    setGreska(null)

    ucitajStatistikuDeteta(profilId, aktivniOpseg.from, aktivniOpseg.to)
      .then((odgovor) => {
        if (!aktivno) return
        poslednjiUcitaniProfil.current = profilId
        setStatistika(odgovor)
      })
      .catch((e) => {
        if (aktivno) setGreska(String((e as Error).message ?? e))
      })
      .finally(() => {
        if (!aktivno) return
        setUcitava(false)
        setOsvezava(false)
      })

    return () => { aktivno = false }
  }, [profilId, aktivniOpseg.from, aktivniOpseg.to])

  function izaberiBrziPeriod(noviPeriod: Exclude<BrziPeriodStatistike, 'custom'>) {
    setPeriod(noviPeriod)
    setGreskaPerioda(null)
    setAktivniOpseg(odrediBrziPeriod(noviPeriod))
  }

  function primeniPrilagodjeniPeriod(dogadjaj: FormEvent<HTMLFormElement>) {
    dogadjaj.preventDefault()
    const greskaValidacije = validirajPrilagodjeniPeriod(customFrom, customTo)
    setGreskaPerioda(greskaValidacije)
    if (greskaValidacije) return
    setPeriod('custom')
    setAktivniOpseg({ from: customFrom, to: customTo })
  }

  if (ucitava) return <Loader tekst="Učitavanje statistike deteta…" />
  if (!statistika?.ok || !statistika.summary || !statistika.rewards) {
    return (
      <div>
        <Link to="/admin/statistika-dece" className="dugme dugme--senka dugme--malo">← Sva deca</Link>
        <p className="poruka poruka--greska razmak-gore">{greska ?? 'Statistika deteta nije dostupna.'}</p>
      </div>
    )
  }

  const summary = statistika.summary
  const trend = prikaziTrend(summary.recentTrendPct)
  const topics = statistika.topics ?? []
  const difficultQuestions = statistika.difficultQuestions ?? []
  const recentAttempts = statistika.recentAttempts ?? []

  return (
    <div className="statistika-detalj">
      <div className="zaglavlje-strane">
        <div className="statistika-detalj-naslov">
          <Link to="/admin/statistika-dece" className="statistika-nazad">← Sva deca</Link>
          <div className="statistika-dete-identitet">
            <span className="statistika-dete-avatar statistika-dete-avatar--veliki" aria-hidden="true">{statistika.avatar}</span>
            <div>
              <p className="malo blago">Detaljna statistika</p>
              <h1>{statistika.name}</h1>
            </div>
          </div>
        </div>
        {osvezava && <span className="bedz bedz--neutral">Osvežavam…</span>}
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <section className="kartica statistika-periodi" aria-label="Izbor vremenskog perioda">
        <div className="statistika-sekcija-zaglavlje">
          <div>
            <h2>Period</h2>
            <p className="malo blago">Prikazano: {opisOpsega(aktivniOpseg)}</p>
          </div>
        </div>
        <div className="statistika-period-dugmad" role="group" aria-label="Brzi periodi">
          {BRZI_PERIODI.map((opcija) => (
            <button
              key={opcija.id}
              type="button"
              className={`dugme dugme--senka dugme--malo ${period === opcija.id ? 'statistika-period-dugme--aktivno' : ''}`}
              onClick={() => izaberiBrziPeriod(opcija.id)}
              aria-pressed={period === opcija.id}
            >
              {opcija.naziv}
            </button>
          ))}
          <button
            type="button"
            className={`dugme dugme--senka dugme--malo ${period === 'custom' ? 'statistika-period-dugme--aktivno' : ''}`}
            onClick={() => setPeriod('custom')}
            aria-pressed={period === 'custom'}
          >
            Prilagodi period
          </button>
        </div>
        {period === 'custom' && (
          <form className="statistika-prilagodjeni-period" onSubmit={primeniPrilagodjeniPeriod}>
            <div className="polje">
              <label htmlFor="statistika-od">Od datuma</label>
              <input id="statistika-od" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="polje">
              <label htmlFor="statistika-do">Do datuma</label>
              <input id="statistika-do" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
            <button type="submit" className="dugme dugme--akcenat dugme--malo">Primeni</button>
            {greskaPerioda && <p className="poruka poruka--greska">{greskaPerioda}</p>}
          </form>
        )}
      </section>

      {summary.completedAttempts === 0 ? (
        <section className="kartica statistika-prazno">
          <span aria-hidden="true">🌱</span>
          <h2>Još nema statistike za ovaj period</h2>
          <p className="blago">Kada dete završi i administrator oceni kviz, ovde će se pojaviti napredak.</p>
        </section>
      ) : (
        <>
          <section className="statistika-metrike-mreza" aria-label="Ključni pokazatelji">
            <Metrika naziv="Završeni kvizovi" vrednost={summary.completedAttempts} />
            <Metrika naziv="Prosečan rezultat" vrednost={formatProcenat(summary.avgScorePct)} />
            <Metrika naziv="Prolaznost" vrednost={formatProcenat(summary.passRatePct)} />
            <Metrika naziv="Tačni odgovori" vrednost={`${summary.correctAnswers} / ${summary.questionCount}`} />
            <Metrika
              naziv="Vreme po pitanju"
              vrednost={summary.avgTimePerQuestionSec == null ? '—' : formatTrajanje(Math.round(summary.avgTimePerQuestionSec))}
              napomena="računa se iz kvizova sa sačuvanim trajanjem"
            />
            <Metrika naziv="Aktivni dani" vrednost={summary.activeDays} />
          </section>

          <section className={`kartica statistika-trend ${trend.klasa}`}>
            <h2>Trend rezultata</h2>
            <p>{trend.tekst}</p>
          </section>

          <GrafikTrenda tacke={statistika.timeline ?? []} />

          <section className="kartica statistika-oblasti-kartica">
            <div className="statistika-sekcija-zaglavlje">
              <div>
                <h2>Uspešnost po oblastima</h2>
                <p className="malo blago">Neodgovorena pitanja se računaju kao netačna.</p>
              </div>
            </div>
            {topics.length === 0 ? (
              <p className="blago razmak-gore">U izabranom periodu nema pitanja za analizu.</p>
            ) : (
              <ul className="statistika-oblasti-lista">
                {topics.map((oblast) => <TrakaOblasti key={oblast.topicName} oblast={oblast} />)}
              </ul>
            )}
          </section>

          <section className="statistika-izdvojene-mreza">
            <IzdvojeneOblasti
              naslov="🌟 Jake oblasti"
              opis="Potrebna su najmanje 3 pitanja i 80% tačnih odgovora da se oblast izdvoji ovde."
              oblasti={statistika.strongTopics ?? []}
              klasa="statistika-izdvojene-oblasti--jake"
            />
            <IzdvojeneOblasti
              naslov="🎯 Za dodatnu vežbu"
              opis="Oblasti sa najmanje 3 pitanja i manje od 60% tačnih odgovora pojaviće se ovde."
              oblasti={statistika.practiceTopics ?? []}
              klasa="statistika-izdvojene-oblasti--vezba"
            />
          </section>

          <section className="kartica statistika-teska-pitanja">
            <div className="statistika-sekcija-zaglavlje">
              <div>
                <h2>Najteža pitanja</h2>
                <p className="malo blago">Najviše pet pitanja sa najviše grešaka u izabranom periodu.</p>
              </div>
            </div>
            {difficultQuestions.length === 0 ? (
              <p className="blago razmak-gore">Nema pitanja za analizu.</p>
            ) : (
              <ol className="statistika-teska-lista">
                {difficultQuestions.map((pitanje) => (
                  <li key={pitanje.questionKey}>
                    <div>
                      <strong>{pitanje.text}</strong>
                      <p className="malo blago">{pitanje.topicName}</p>
                    </div>
                    <div className="statistika-tesko-meta">
                      <span>{formatProcenat(pitanje.successPct)} · {pitanje.correctCount}/{pitanje.answersCount} tačno</span>
                      <Link to={`/admin/rezultati/${pitanje.lastAttemptId}`}>Poslednji rezultat →</Link>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="statistika-donja-mreza">
            <section className="kartica statistika-poslednji-kvizovi">
              <div className="statistika-sekcija-zaglavlje">
                <div>
                  <h2>Poslednjih 10 kvizova</h2>
                  <p className="malo blago">U izabranom periodu.</p>
                </div>
              </div>
              <div className="tabela-omot razmak-gore">
                <table className="tabela tabela--kartice">
                  <thead>
                    <tr><th>Kviz</th><th>Datum</th><th>Rezultat</th><th>Trajanje</th><th>Zvezdice</th><th></th></tr>
                  </thead>
                  <tbody>
                    {recentAttempts.map((pokusaj) => (
                      <tr key={pokusaj.attemptId}>
                        <td data-naslov="Kviz">
                          {pokusaj.title}
                          {pokusaj.source === 'history' && <span className="bedz bedz--neutral statistika-istorijski-bedz">Istorijski</span>}
                        </td>
                        <td data-naslov="Datum">{formatDatum(pokusaj.submittedAt)}</td>
                        <td data-naslov="Rezultat">{formatProcenat(pokusaj.scorePct)}</td>
                        <td data-naslov="Trajanje">{formatTrajanje(pokusaj.durationSec)}</td>
                        <td data-naslov="Zvezdice">{pokusaj.starsAwarded == null ? '—' : `⭐ ${pokusaj.starsAwarded}`}</td>
                        <td><Link to={`/admin/rezultati/${pokusaj.attemptId}`}>Detalji</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <Nagrade rewards={statistika.rewards} />
          </section>
        </>
      )}
    </div>
  )
}
