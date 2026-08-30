import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import { ucitajRoditeljskiPregled } from '../../lib/roditeljskiPregled'
import { useRoditeljskiPodaci } from '../../lib/useRoditeljskiPodaci'
import { formatDatum, formatProcenat } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
import { NAZIVI_PREDMETA, type Predmet } from '../../types/db'

export function Kontrolna() {
  const { dete } = useRoditelj()
  const { podaci, greska, radi, osvezi } = useRoditeljskiPodaci(ucitajRoditeljskiPregled)
  if (!podaci && radi) return <Loader tekst="Pripremam dnevni pregled…" />
  const problemi = podaci?.schedules.filter(s => s.error) ?? []
  const paznja = problemi.length + (podaci?.reviewCount ?? 0) + (podaci?.rewardCount ?? 0)
  return <div>
    <div className="roditelj-naslov"><div><h1>{dete ? `Danas · ${dete.name}` : 'Danas'}</h1><p className="blago malo">Mali koraci, svakog dana.</p></div><Link to="/admin/zadaj" className="dugme dugme--akcenat">+ Zadaj</Link></div>
    {greska && <div className="poruka poruka--greska" role="alert">{greska} <button className="dugme dugme--senka dugme--malo" onClick={() => void osvezi()}>Pokušaj ponovo</button></div>}
    {podaci && <>
      {paznja ? <section aria-label="Potrebna pažnja"><h2 className="razmak-dole">Potrebna pažnja</h2><div className="roditelj-lista roditelj-paznja">
        {!!problemi.length && <Link to="/admin/vezbanje/rasporedi?problemi=1" className="roditelj-red"><div><strong>Problemi sa rasporedima</strong><small>Proveri zašto aktivnost nije napravljena.</small></div><span className="bedz bedz--upozorenje">{problemi.length} →</span></Link>}
        {!!podaci.reviewCount && <Link to="/admin/napredak/rezultati?status=review_pending&period=all" className="roditelj-red"><div><strong>Kvizovi čekaju tvoju ocenu</strong><small>Završi pregled da rezultat bude konačan.</small></div><span className="bedz">{podaci.reviewCount} →</span></Link>}
        {!!podaci.rewardCount && <Link to="/admin/nagrade" className="roditelj-red"><div><strong>Nagrade za isporuku</strong><small>Označi ostvarenom kada je dete dobije.</small></div><span className="bedz">{podaci.rewardCount} →</span></Link>}
      </div></section> : <p className="roditelj-mirno">✓ Nema obaveza za tebe.</p>}
      <section className="roditelj-sekcija"><h2>{dete ? 'Dnevni pregled' : 'Moja deca'}</h2>
        {podaci.children.length === 0 ? <div className="kartica"><p>Dodaj dete da ovde pratiš njegove zadatke i napredak.</p><Link to="/admin/deca" className="dugme razmak-gore">Dodaj dete</Link></div>
          : <div className="roditelj-kartice">{podaci.children.map(d => <article className="kartica roditelj-dete" key={d.id}>
            <Link to={`/admin?dete=${d.id}`} className="roditelj-identitet"><span className="roditelj-avatar">{d.avatar}</span><h3>{d.name}</h3><span aria-hidden="true">→</span></Link>
            <div className="roditelj-metrike"><div><strong>{d.completedToday}</strong><span>završeno danas</span></div><div><strong>{d.quizCount}</strong><span>preostalo kvizova</span></div><div><strong>{d.chessCount}</strong><span>preostalo partija</span></div></div>
            <p className="malo blago">Poslednji kviz: {d.lastResult ? d.lastResult.pending ? 'čeka pregled' : formatProcenat(d.lastResult.score) : 'još nema rezultata'}</p>
            <div className="red razmak-gore"><Link to={`/admin/vezbanje?dete=${d.id}`}>Zadaci →</Link><Link to={`/admin/napredak?dete=${d.id}`}>Napredak →</Link></div>
          </article>)}</div>}
      </section>
      <section className="roditelj-sekcija"><div className="roditelj-alati"><h2>Sledeće zakazano</h2><Link to="/admin/vezbanje/rasporedi">Svi rasporedi →</Link></div>
        {!podaci.schedules.some(s => s.active) ? <p className="blago">Nema uključenih rasporeda.</p> : <div className="roditelj-lista">{podaci.schedules.filter(s => s.active).slice(0, 5).map(s => <Link key={s.id} to={`/admin/vezbanje/rasporedi?dete=${s.childProfileId}&raspored=${s.id}&vrsta=${s.kind}`} className="roditelj-red"><div><strong>{s.childName} · {NAZIVI_PREDMETA[s.title as Predmet] ?? s.title}</strong><small>{s.error ? 'Poslednje izvršavanje nije uspelo' : 'Automatska aktivnost'}</small></div><small>{formatDatum(s.nextAt)}</small></Link>)}</div>}
      </section>
      <section className="roditelj-sekcija"><div className="roditelj-alati"><h2>Poslednje aktivnosti</h2><Link to="/admin/napredak/rezultati">Svi rezultati →</Link></div>
        {podaci.events.length === 0 ? <p className="blago">Još nema završenih aktivnosti.</p> : <div className="roditelj-lista">{podaci.events.map(e => <Link key={e.id} to={e.kind === 'quiz' ? `/admin/rezultati/${e.id}` : `/admin/napredak/rezultati?vrsta=chess&partija=${e.id}`} className="roditelj-red"><div><strong>{e.childName} · {e.title}</strong><small>{formatDatum(e.at)}{!e.childProfileId ? ' · bez profila' : ''}</small></div><span className="bedz">{e.pending ? 'Čeka pregled' : e.kind === 'quiz' ? formatProcenat(e.score) : e.result === 'child_win' ? 'Pobeda' : e.result === 'draw' ? 'Remi' : 'Poraz'}</span></Link>)}</div>}
      </section>
      <p className="malo blago razmak-gore" aria-live="polite">{radi ? 'Osvežavam…' : `Ažurirano ${formatDatum(podaci.updatedAt)} · vreme u Beogradu`}</p>
    </>}
  </div>
}
