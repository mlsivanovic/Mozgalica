import { useState } from 'react'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import { ucitajRoditeljskiPregled, type DnevniPregledDeteta, type RoditeljskiPregled } from '../../lib/roditeljskiPregled'
import { listajRasporedeCasova } from '../../lib/api'
import { useRoditeljskiPodaci } from '../../lib/useRoditeljskiPodaci'
import { formatDatum, formatProcenat } from '../../lib/format'
import { nazivCasa, nazivSmene } from '../../lib/rasporedCasova'
import { Loader } from '../../components/Zajednicke'
import { Ikona, type ImeIkone } from '../../components/Ikona'
import { PrviKorakiKartica } from '../../components/PrviKorakiKartica'
import { NAZIVI_PREDMETA, type Predmet } from '../../types/db'
import type { RasporedCasovaKartica } from '../../types/kviz'

async function ucitajDanas(id: string) {
  const [pregled, casovi] = await Promise.all([ucitajRoditeljskiPregled(id), listajRasporedeCasova(id)])
  return { ...pregled, casovi }
}

export function Kontrolna() {
  const { dete } = useRoditelj()
  const { podaci, greska, radi, osvezi } = useRoditeljskiPodaci(ucitajDanas)
  if (!podaci && radi) return <Loader tekst="Pripremam dnevni pregled…" />
  return <div className="danas">
    <h1 className="sr-only">{dete ? `Danas · ${dete.name}` : 'Danas'}</h1>
    {greska && <div className="poruka poruka--greska" role="alert">{greska} <button className="dugme dugme--senka dugme--malo" onClick={() => void osvezi()}>Pokušaj ponovo</button></div>}
    {podaci && <>
      <ZaTebe podaci={podaci} />
      <PrviKorakiKartica podaci={podaci} />
      <section aria-label={dete ? 'Dnevni pregled' : 'Moja deca'}>
        {podaci.children.length === 0
          ? <div className="kartica"><p>Dodaj dete da ovde pratiš njegove zadatke i napredak.</p><Link to="/admin/deca" className="dugme razmak-gore">Dodaj dete</Link></div>
          : <div className="danas-deca">{podaci.children.map(d => <KarticaDeteta key={d.id} d={d} cas={podaci.casovi.find(c => c.childProfileId === d.id)} izabrano={!!dete} />)}</div>}
      </section>
      <Aktivnosti podaci={podaci} />
      <p className="malo blago danas-azurirano" aria-live="polite">{radi ? 'Osvežavam…' : `Ažurirano ${formatDatum(podaci.updatedAt)} · vreme u Beogradu`}</p>
    </>}
  </div>
}

function ZaTebe({ podaci }: { podaci: RoditeljskiPregled }) {
  const problemi = podaci.schedules.filter(s => s.error).length
  type Stavka = { broj: number; naziv: string; to: string; ikona: ImeIkone; upozorenje?: boolean }
  const sve: Stavka[] = [
    { broj: podaci.reviewCount, naziv: 'čeka ocenu', to: '/admin/napredak/rezultati?status=review_pending&period=all', ikona: 'uredi' },
    { broj: podaci.rewardCount, naziv: podaci.rewardCount === 1 ? 'nagrada za isporuku' : 'nagrade za isporuku', to: '/admin/nagrade', ikona: 'nagrade' },
    { broj: problemi, naziv: problemi === 1 ? 'problem s rasporedom' : 'problema s rasporedima', to: '/admin/vezbanje/rasporedi?problemi=1', ikona: 'upozorenje', upozorenje: true },
  ]
  const stavke = sve.filter(s => s.broj > 0)
  if (!stavke.length) return <p className="danas-mirno"><Ikona ime="gotovo" velicina={20} />Nema obaveza za tebe.</p>
  return <section aria-label="Potrebna pažnja" className="danas-paznja">
    {stavke.map(s => <Link key={s.to} to={s.to} className={`danas-plocica${s.upozorenje ? ' danas-plocica--upozorenje' : ''}`}>
      <span className="danas-plocica-ikona"><Ikona ime={s.ikona} velicina={18} /></span>
      <strong>{s.broj}</strong>
      <span>{s.naziv}</span>
    </Link>)}
  </section>
}

function KarticaDeteta({ d, cas, izabrano }: { d: DnevniPregledDeteta; cas?: RasporedCasovaKartica; izabrano: boolean }) {
  const poslednji = d.lastResult ? d.lastResult.pending ? 'čeka' : formatProcenat(d.lastResult.score) : '—'
  return <article className="kartica danas-dete">
    <Link to={izabrano ? `/admin/napredak?dete=${d.id}` : `/admin?dete=${d.id}`} className="danas-dete-zaglavlje">
      <span className="roditelj-avatar" aria-hidden="true">{d.avatar}</span>
      <span className="danas-dete-ime"><h2>{d.name}</h2><small>{opisCasa(cas)}</small></span>
      <Ikona ime="desno" />
    </Link>
    <dl className="danas-metrike">
      <div><dt>završeno</dt><dd>{d.completedToday}</dd></div>
      <div><dt>kvizova</dt><dd>{d.quizCount}</dd></div>
      <div><dt>partija</dt><dd>{d.chessCount}</dd></div>
      <div><dt>poslednji</dt><dd>{poslednji}</dd></div>
    </dl>
    <div className="danas-dete-akcije">
      <Link to={`/admin/vezbanje?dete=${d.id}`}><Ikona ime="zadaci" velicina={18} />Zadaci</Link>
      <Link to={`/admin/raspored-casova?dete=${d.id}`}><Ikona ime="raspored" velicina={18} />Raspored</Link>
      <Link to={`/admin/napredak?dete=${d.id}`}><Ikona ime="napredak" velicina={18} />Napredak</Link>
    </div>
  </article>
}

function opisCasa(c?: RasporedCasovaKartica): string {
  if (!c || !c.exists) return 'Raspored časova nije unet'
  if (c.today?.isBreak) return 'Danas nema škole'
  const sledeci = c.today?.lessons.find(l => l.isCurrent || l.isNext)
  return sledeci
    ? `${nazivCasa(sledeci.periodNo)} ${sledeci.subject} u ${sledeci.startsAt}`
    : `${nazivSmene(c.today?.shift)} · nema više časova danas`
}

function Aktivnosti({ podaci }: { podaci: RoditeljskiPregled }) {
  const [prikaz, setPrikaz] = useState<'nedavno' | 'zakazano'>('nedavno')
  const zakazano = podaci.schedules.filter(s => s.active).slice(0, 4)
  const nedavno = podaci.events.slice(0, 4)
  return <section className="kartica danas-aktivnosti" aria-label="Aktivnosti">
    <div className="danas-aktivnosti-zaglavlje">
      <div className="roditelj-segment-dugmad" role="tablist" aria-label="Aktivnosti">
        <button type="button" role="tab" aria-selected={prikaz === 'nedavno'} onClick={() => setPrikaz('nedavno')}>Nedavno</button>
        <button type="button" role="tab" aria-selected={prikaz === 'zakazano'} onClick={() => setPrikaz('zakazano')}>Zakazano</button>
      </div>
      <Link className="roditelj-tekst-dugme" to={prikaz === 'nedavno' ? '/admin/napredak/rezultati' : '/admin/vezbanje/rasporedi'}>Sve</Link>
    </div>
    {prikaz === 'nedavno'
      ? nedavno.length === 0 ? <p className="blago danas-prazno">Još nema završenih aktivnosti.</p>
        : <ul className="roditelj-gusta-lista">{nedavno.map(e => <li key={e.id}><Link to={e.kind === 'quiz' ? `/admin/rezultati/${e.id}` : `/admin/napredak/rezultati?vrsta=chess&partija=${e.id}`}>
          <span className="roditelj-red-ikona"><Ikona ime={e.kind === 'chess' ? 'sah' : 'zadaci'} velicina={20} /></span>
          <span className="roditelj-gusta-tekst"><strong>{e.title}</strong><small>{e.childName} · {formatDatum(e.at)}{!e.childProfileId ? ' · bez profila' : ''}</small></span>
          <span className={`bedz${e.pending ? ' bedz--upozorenje' : ''}`}>{e.pending ? 'Oceni' : e.kind === 'quiz' ? formatProcenat(e.score) : e.result === 'child_win' ? 'Pobeda' : e.result === 'draw' ? 'Remi' : 'Poraz'}</span>
        </Link></li>)}</ul>
      : zakazano.length === 0 ? <p className="blago danas-prazno">Nema uključenih rasporeda.</p>
        : <ul className="roditelj-gusta-lista">{zakazano.map(s => <li key={s.id}><Link to={`/admin/vezbanje/rasporedi?dete=${s.childProfileId}&raspored=${s.id}&vrsta=${s.kind}`}>
          <span className="roditelj-red-ikona"><Ikona ime={s.kind === 'chess' ? 'sah' : 'raspored'} velicina={20} /></span>
          <span className="roditelj-gusta-tekst"><strong>{NAZIVI_PREDMETA[s.title as Predmet] ?? s.title}</strong><small>{s.childName} · {formatDatum(s.nextAt)}</small></span>
          {s.error && <span className="bedz bedz--upozorenje">Greška</span>}
        </Link></li>)}</ul>}
  </section>
}
