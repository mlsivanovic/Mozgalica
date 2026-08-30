import { useSearchParams } from 'react-router-dom'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import { ucitajRoditeljskeZadatke } from '../../lib/roditeljskiPregled'
import { useRoditeljskiPodaci } from '../../lib/useRoditeljskiPodaci'
import { formatDatum } from '../../lib/format'
import { Loader } from '../../components/Zajednicke'
export function Vezbanje() {
  const { deteId } = useRoditelj()
  const { podaci, greska, radi, osvezi } = useRoditeljskiPodaci(ucitajRoditeljskeZadatke)
  const [params,setParams] = useSearchParams()
  const vrsta = params.get('vrsta') ?? ''
  if (!podaci && radi) return <Loader />
  const zadaci = (podaci ?? []).filter(z => !vrsta || z.kind === vrsta)
  return <><div className="roditelj-alati"><label>Prikaži <select aria-label="Vrsta zadatka" value={vrsta} onChange={e => setParams(p => { p.set('vrsta',e.target.value); return p })}><option value="">Kvizovi i šah</option><option value="quiz">Kvizovi</option><option value="chess">Šah</option></select></label><Link to="/admin/kvizovi?prikaz=arhiva">Arhiva kvizova →</Link></div>
    {greska && <p className="poruka poruka--greska" role="alert">{greska} <button className="dugme dugme--malo" onClick={() => void osvezi()}>Pokušaj ponovo</button></p>}
    {podaci && [false,true].map(nedodeljeni => {
      if(nedodeljeni && deteId) return null
      const grupa = zadaci.filter(z => z.unassigned === nedodeljeni)
      return <section className="roditelj-sekcija" key={String(nedodeljeni)}><h2>{nedodeljeni ? 'Nedodeljeni kvizovi' : 'Aktivni zadaci'}</h2>{grupa.length === 0 ? <p className="blago">{nedodeljeni ? 'Nema nedodeljenih kvizova.' : 'Nema preostalih zadataka u ovom prikazu.'}</p> : <div className="roditelj-lista">{grupa.map(z => <Link className="roditelj-red" key={`${z.id}-${z.childProfileId}`} to={z.kind === 'quiz' ? `/admin/kvizovi/${z.id}` : `/admin/sah?partija=${z.id}`}><div><strong>{z.kind === 'chess' ? '♟' : '▤'} {z.title}</strong><small>{z.childName ?? (z.unassigned ? 'Još nije dodeljen' : 'Deljeni link bez profila')} · {formatDatum(z.createdAt)}</small></div><span className="bedz">{z.state === 'in_progress' ? 'U toku' : z.unassigned ? 'Pripremljen' : 'Čeka'} →</span></Link>)}</div>}</section>
    })}
  </>
}
