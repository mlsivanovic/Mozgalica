import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import { usePeriodNapretka } from '../../lib/periodNapretka'
import { ucitajStatistikuDeteta } from '../../lib/api'
import { formatProcenat } from '../../lib/format'
import { StatistikaDetetaDetalj } from './StatistikaDetetaDetalj'
import { Loader } from '../../components/Zajednicke'
import type { StatistikaDetetaPayload } from '../../types/kviz'
import { danasUBeogradu, validirajPrilagodjeniPeriod } from '../../lib/statistikaDeteta'
export function NapredakSekcija() {
  const { pathname, search } = useLocation()
  const { period, from, to, promeni, greska } = usePeriodNapretka()
  const [od,setOd] = useState(from ?? danasUBeogradu())
  const [kraj,setKraj] = useState(to ?? danasUBeogradu())
  const [prilagodi,setPrilagodi] = useState(period === 'custom')
  const [greskaUnosa,setGreskaUnosa] = useState<string | null>(null)
  useEffect(() => { setOd(from ?? danasUBeogradu()); setKraj(to ?? danasUBeogradu()); setPrilagodi(period === 'custom') }, [from,to,period])
  const aktivniPeriod = new URLSearchParams(search)
  const parametri = new URLSearchParams()
  for(const key of ['period','od','do']) if(aktivniPeriod.has(key)) parametri.set(key,aktivniPeriod.get(key)!)
  const upit = parametri.toString() ? `?${parametri}` : ''
  return <><div className="roditelj-naslov"><h1>Napredak</h1></div><nav className="roditelj-tabovi" aria-label="Napredak"><Link to={'/admin/napredak'+upit} aria-current={!pathname.includes('/rezultati') ? 'page' : undefined}>Pregled</Link><Link to={'/admin/napredak/rezultati'+upit} aria-current={pathname.includes('/rezultati') ? 'page' : undefined}>Rezultati</Link></nav>
    <div className="roditelj-alati"><label>Period <select aria-label="Period napretka" value={prilagodi ? 'custom' : period} onChange={e => { if(e.target.value === 'custom') setPrilagodi(true); else {setPrilagodi(false); promeni(e.target.value)} }}><option value="today">Danas</option><option value="7d">7 dana</option><option value="30d">30 dana</option><option value="all">Sve vreme</option><option value="custom">Prilagođeno</option></select></label><small className="blago">{from && to ? `${from} — ${to}` : 'Sve vreme'} · Beograd</small></div>
    {prilagodi && <form className="red-polja" onSubmit={e => {e.preventDefault(); const problem=validirajPrilagodjeniPeriod(od,kraj); setGreskaUnosa(problem); if(!problem) promeni('custom',od,kraj)}}><div className="polje"><label htmlFor="period-od">Od</label><input id="period-od" type="date" value={od} onChange={e => setOd(e.target.value)} /></div><div className="polje"><label htmlFor="period-do">Do</label><input id="period-do" type="date" value={kraj} onChange={e => setKraj(e.target.value)} /></div><button className="dugme">Primeni</button></form>}
    {(greska || greskaUnosa) && <p role="alert" className="poruka poruka--greska">{greska || greskaUnosa}</p>}
    {!greska && <Outlet />}
  </>
}
export function Napredak() {
  const { deteId } = useRoditelj()
  return deteId ? <StatistikaDetetaDetalj key={deteId} profilId={deteId} /> : <PregledSveDece />
}
function PregledSveDece() {
  const { profili } = useRoditelj()
  const { from,to } = usePeriodNapretka()
  const [podaci,setPodaci] = useState<Array<{ id:string; name:string; avatar:string; statistika:StatistikaDetetaPayload }>>([])
  const [greska,setGreska] = useState<string|null>(null)
  const [ucitava,setUcitava] = useState(true)
  const [ponovo,setPonovo] = useState(0)
  useEffect(() => { let aktivno=true; setUcitava(true); setGreska(null)
    Promise.all(profili.map(async p => ({id:p.id,name:p.name,avatar:p.avatar,statistika:await ucitajStatistikuDeteta(p.id,from,to)})))
      .then(p => {if(aktivno) setPodaci(p)}).catch(() => {if(aktivno) setGreska('Napredak trenutno nije dostupan.')}).finally(() => {if(aktivno) setUcitava(false)})
    return () => {aktivno=false}
  },[profili,from,to,ponovo])
  if(ucitava) return <Loader />
  if(greska) return <p role="alert">{greska} <button className="dugme" onClick={() => setPonovo(x=>x+1)}>Pokušaj ponovo</button></p>
  if(!profili.length) return <p className="kartica">Dodaj profil da pratiš napredak. <Link to="/admin/deca">Upravljaj decom</Link></p>
  return <><p className="blago razmak-dole">Statistika kvizova obuhvata potpuno ocenjene rezultate. Šah je u zasebnoj istoriji rezultata.</p><div className="roditelj-kartice">{podaci.map(p => <Link className="kartica roditelj-dete" to={`/admin/napredak?dete=${p.id}`} key={p.id}><div className="roditelj-identitet"><span className="roditelj-avatar">{p.avatar}</span><h2>{p.name}</h2></div><div className="roditelj-metrike"><div><strong>{p.statistika.summary?.completedAttempts ?? 0}</strong><span>ocenjenih kvizova</span></div><div><strong>{formatProcenat(p.statistika.summary?.avgScorePct)}</strong><span>prosečan rezultat</span></div></div><p className="malo blago">{p.statistika.practiceTopics?.length ? `Za vežbu: ${p.statistika.practiceTopics.map(o => o.topicName).join(', ')}` : 'Još nema izdvojenih oblasti za dodatnu vežbu.'}</p><p className="razmak-gore">Otvori napredak →</p></Link>)}</div></>
}
