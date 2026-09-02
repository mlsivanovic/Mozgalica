import { useMemo, useState } from 'react'
import { Ikona } from '../../components/Ikona'
import {
  preuzmiRasporedCsv, preuzmiRasporedSliku, rasporedImaCasova,
} from '../../lib/izvozRasporeda'
import {
  bojaIzMape, DANI, DANI_KRATKO, mapaBojaPredmeta, nazivCasa, nazivSmene, periodiNedelje,
  predmetiZaKnjige,
} from '../../lib/rasporedCasova'
import type { CasUDanu } from '../../lib/rasporedCasova'
import type { DanRasporedaCasova, PregledRasporedaCasova } from '../../types/kviz'
import '../admin/rasporedCasova.css'

type Prikaz = 'danas' | 'sutra' | 'nedelja'

function CasKartica({ cas, boje }: { cas: CasUDanu; boje: Map<string, string> }) {
  const boja = bojaIzMape(boje, cas.subject, cas.color)
  return (
    <article
      className={`raspored-cas${cas.isCurrent ? ' raspored-cas--sada' : cas.isNext ? ' raspored-cas--sledeci' : ''}`}
      style={{ borderLeftColor: boja }}
    >
      <div>
        <time>{cas.startsAt}</time>
        <small>{cas.endsAt}</small>
      </div>
      <div>
        <small>{nazivCasa(cas.periodNo)}</small>
        <h3>{cas.subject}</h3>
        {(cas.room || cas.teacher) && (
          <p className="malo blago">{[cas.teacher, cas.room ? `uč. ${cas.room}` : null].filter(Boolean).join(' · ')}</p>
        )}
        {cas.isCurrent && <span className="raspored-bedz">Sada</span>}
        {cas.isNext && !cas.isCurrent && <span className="raspored-bedz">Sledeći</span>}
      </div>
    </article>
  )
}

function DanPregled({ dan, naslov, prazan, boje }: {
  dan: DanRasporedaCasova; naslov: string; prazan: string; boje: Map<string, string>
}) {
  const knjige = useMemo(() => predmetiZaKnjige(dan.lessons), [dan.lessons])
  if (dan.isBreak) {
    return (
      <div className="kartica raspored-prazno">
        <span aria-hidden="true">🎒</span>
        <h3>{prazan}</h3>
        <p className="blago">Možeš da vidiš raspored za nastavni dan u pregledu nedelje.</p>
      </div>
    )
  }
  return (
    <>
      <div className="raspored-smena">{naslov} · {nazivSmene(dan.shift)}</div>
      {knjige.length > 0 && (
        <p className="raspored-knjige" aria-label="Predmeti za knjige">
          {knjige.map((ime) => (
            <span key={ime} style={{ background: bojaIzMape(boje, ime) }}>{ime}</span>
          ))}
        </p>
      )}
      {dan.lessons.length === 0
        ? <div className="kartica raspored-prazno"><h3>Nema unetih časova za ovaj dan.</h3></div>
        : <div className="raspored-casovi">{dan.lessons.map((cas) => <CasKartica key={cas.periodNo} cas={cas} boje={boje} />)}</div>}
    </>
  )
}

export function RasporedIzvoz({ raspored }: { raspored: PregledRasporedaCasova }) {
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState<'png' | 'jpeg' | 'csv' | null>(null)
  const ima = rasporedImaCasova(raspored)

  async function slika(format: 'png' | 'jpeg') {
    if (!ima) return
    setGreska(null)
    setRadi(format)
    try {
      await preuzmiRasporedSliku(raspored, format)
    } catch (e) {
      setGreska((e as Error).message || 'Slika nije sačuvana.')
    } finally {
      setRadi(null)
    }
  }

  function csv() {
    if (!ima) return
    setGreska(null)
    setRadi('csv')
    try {
      preuzmiRasporedCsv(raspored)
    } catch (e) {
      setGreska((e as Error).message || 'CSV nije sačuvan.')
    } finally {
      setRadi(null)
    }
  }

  return (
    <div className="raspored-izvoz">
      <p className="raspored-izvoz-naslov"><Ikona ime="preuzmi" velicina={18} /> Izvezi raspored</p>
      <div className="raspored-izvoz-dugmad">
        <button type="button" className="dugme dugme--senka dugme--malo" disabled={!ima || radi != null} onClick={() => void slika('png')}>
          {radi === 'png' ? 'Pripremam…' : 'PNG'}
        </button>
        <button type="button" className="dugme dugme--senka dugme--malo" disabled={!ima || radi != null} onClick={() => void slika('jpeg')}>
          {radi === 'jpeg' ? 'Pripremam…' : 'JPG'}
        </button>
        <button type="button" className="dugme dugme--senka dugme--malo" disabled={!ima || radi != null} onClick={csv}>
          {radi === 'csv' ? 'Pripremam…' : 'CSV'}
        </button>
      </div>
      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
    </div>
  )
}

export function RasporedCasovaPregled({
  raspored, pocetni = 'danas',
}: {
  raspored: PregledRasporedaCasova
  pocetni?: Prikaz
}) {
  const [prikaz, setPrikaz] = useState<Prikaz>(pocetni)
  const boje = useMemo(() => mapaBojaPredmeta(imenaIzRasporeda(raspored)), [raspored])
  if (!raspored.exists || !raspored.today || !raspored.tomorrow) return null
  const danasIme = raspored.today.isBreak ? 'Danas nema škole' : `Danas · ${DANI[(raspored.today.weekday - 1) as 0|1|2|3|4|5] ?? ''}`
  const sutraIme = raspored.tomorrow.isBreak ? 'Sutra nema škole' : `Sutra · ${DANI[(raspored.tomorrow.weekday - 1) as 0|1|2|3|4|5] ?? ''}`

  return (
    <section className="raspored-pregled" aria-label="Raspored časova">
      <div className="raspored-tabovi" role="tablist" aria-label="Prikaz rasporeda">
        {([['danas', 'Danas'], ['sutra', 'Sutra'], ['nedelja', 'Nedelja']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={prikaz === id} aria-current={prikaz === id ? 'page' : undefined} onClick={() => setPrikaz(id)}>
            {label}
          </button>
        ))}
      </div>
      {prikaz === 'danas' && <DanPregled dan={raspored.today} naslov={danasIme} prazan="Danas nema škole" boje={boje} />}
      {prikaz === 'sutra' && <DanPregled dan={raspored.tomorrow} naslov={sutraIme} prazan="Sutra nema škole" boje={boje} />}
      {prikaz === 'nedelja' && (periodiNedelje(raspored.week ?? []).length === 0
        ? <div className="kartica raspored-prazno"><h3>Još nema unetih časova ove nedelje.</h3></div>
        : (
        <div className="raspored-mreza-omot">
          <p className="raspored-smena">Ova nedelja · {nazivSmene(raspored.thisWeekShift)}</p>
          <table className="raspored-mreza">
            <thead>
              <tr>
                <th>Čas</th>
                {(raspored.week ?? []).map((dan) => (
                  <th key={dan.date} className={dan.date === raspored.today?.date ? 'raspored-mreza--danas' : undefined}>
                    {DANI_KRATKO[dan.weekday - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodiNedelje(raspored.week ?? []).map((periodNo) => (
                <tr key={periodNo}>
                  <th className="raspored-sat">{nazivCasa(periodNo)}</th>
                  {(raspored.week ?? []).map((dan) => {
                    const cas = dan.lessons.find((c) => c.periodNo === periodNo)
                    return (
                      <td key={dan.date}>
                        {cas
                          ? <div className="raspored-celija raspored-celija--popunjena" style={{ background: bojaIzMape(boje, cas.subject, cas.color) }}>{cas.subject}</div>
                          : <div className="raspored-celija" />}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <RasporedIzvoz raspored={raspored} />
    </section>
  )
}

function imenaIzRasporeda(raspored: PregledRasporedaCasova): string[] {
  const imena: string[] = []
  for (const dan of [raspored.today, raspored.tomorrow, ...(raspored.week ?? [])]) {
    for (const cas of dan?.lessons ?? []) imena.push(cas.subject)
  }
  return imena
}
