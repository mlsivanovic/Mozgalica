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
import { RoditeljTabovi } from '../../components/RoditeljskeSekcije'
import { Ikona } from '../../components/Ikona'
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
  const izabran = prilagodi ? 'custom' : period
  return <><h1 className="sr-only">Napredak</h1>
    <RoditeljTabovi naziv="Napredak" aktivan={pathname.includes('/rezultati') ? 'rezultati' : 'pregled'} tabovi={[
      { id: 'pregled', to: '/admin/napredak' + upit, naziv: 'Pregled' },
      { id: 'rezultati', to: '/admin/napredak/rezultati' + upit, naziv: 'Rezultati' },
    ]} />
    <div className="roditelj-cipovi" role="radiogroup" aria-label="Period napretka">
      {PERIODI.map(([vrednost, naziv]) => <button key={vrednost} type="button" role="radio" aria-checked={izabran === vrednost}
        className={`roditelj-cip${izabran === vrednost ? ' aktivan' : ''}`}
        onClick={() => { if (vrednost === 'custom') setPrilagodi(true); else { setPrilagodi(false); promeni(vrednost) } }}>
        {izabran === vrednost && <Ikona ime="potvrda" velicina={16} />}{naziv}
      </button>)}
    </div>
    {prilagodi && <form className="roditelj-period-forma" onSubmit={e => {e.preventDefault(); const problem=validirajPrilagodjeniPeriod(od,kraj); setGreskaUnosa(problem); if(!problem) promeni('custom',od,kraj)}}><div className="polje"><label htmlFor="period-od">Od</label><input id="period-od" type="date" value={od} onChange={e => setOd(e.target.value)} /></div><div className="polje"><label htmlFor="period-do">Do</label><input id="period-do" type="date" value={kraj} onChange={e => setKraj(e.target.value)} /></div><button className="dugme">Primeni</button></form>}
    {(greska || greskaUnosa) && <p role="alert" className="poruka poruka--greska">{greska || greskaUnosa}</p>}
    {!greska && <Outlet />}
  </>
}
const PERIODI = [['today', 'Danas'], ['7d', '7 dana'], ['30d', '30 dana'], ['all', 'Sve vreme'], ['custom', 'Prilagođeno']] as const
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
  return <><div className="roditelj-kartice">{podaci.map(p => <Link className="kartica roditelj-dete" to={`/admin/napredak?dete=${p.id}`} key={p.id}><div className="roditelj-identitet"><span className="roditelj-avatar">{p.avatar}</span><h2>{p.name}</h2><Ikona ime="desno" /></div><div className="roditelj-metrike"><div><strong>{p.statistika.summary?.completedAttempts ?? 0}</strong><span>ocenjenih kvizova</span></div><div><strong>{formatProcenat(p.statistika.summary?.avgScorePct)}</strong><span>prosečan rezultat</span></div></div><p className="malo blago">{p.statistika.practiceTopics?.length ? `Za vežbu: ${p.statistika.practiceTopics.map(o => o.topicName).join(', ')}` : 'Još nema izdvojenih oblasti za dodatnu vežbu.'}</p></Link>)}</div><p className="malo blago razmak-gore">Statistika obuhvata potpuno ocenjene kvizove. Šah je u istoriji rezultata.</p></>
}
