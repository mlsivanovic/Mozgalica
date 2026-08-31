import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRoditelj, useRoditeljskiNavigate } from '../../lib/roditelj'
import { dodeliSahPartiju } from '../../lib/api'
import { KvizForma } from './KvizForma'
import { SAH_ELO_NIVOI, SAH_SATOVI } from '../../sah/podesavanja'
import type { SahBoja } from '../../types/db'
import { Ikona } from '../../components/Ikona'
export function Zadaj() {
  const { deteId,profili } = useRoditelj()
  const [params] = useSearchParams()
  const [dete,setDete] = useState(deteId)
  const [vrsta,setVrsta] = useState(params.get('vrsta') === 'chess' ? 'chess' : 'quiz')
  const [korak,setKorak] = useState(1)
  const [pokrenuto,setPokrenuto] = useState(false)
  const [greska,setGreska] = useState<string|null>(null)
  return <><div className="roditelj-naslov"><h1>Zadaj aktivnost</h1></div>
    <div hidden={korak !== 1}><ol className="roditelj-koraci"><li aria-current="step">1. Dete i aktivnost</li><li>2. Sadržaj</li><li>3. Potvrda</li></ol>
      <div className="kartica"><div className="polje"><label htmlFor="zadaj-dete">Kome je namenjeno?</label><select id="zadaj-dete" value={dete} onChange={e => setDete(e.target.value)}><option value="">Izaberi dete…</option>{profili.map(p => <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}{vrsta === 'quiz' && <option value="bez-dodele">Pripremi kviz bez dodele</option>}</select></div>
      <fieldset className="zadaj-vrste"><legend className="razmak-dole">Šta želiš da zadaš?</legend><div><label className={vrsta === 'quiz' ? 'aktivna' : ''}><input type="radio" name="vrsta" checked={vrsta === 'quiz'} onChange={() => setVrsta('quiz')} /><Ikona ime="zadaci" /><span><strong>Kviz</strong><small>Matematika, srpski ili priroda</small></span></label><label className={vrsta === 'chess' ? 'aktivna' : ''}><input type="radio" name="vrsta" checked={vrsta === 'chess'} onChange={() => {setVrsta('chess'); if(dete === 'bez-dodele') setDete('')}} /><Ikona ime="sah" /><span><strong>Šah</strong><small>Partija protiv računara</small></span></label></div></fieldset>
      {greska && <p role="alert" className="poruka poruka--greska">{greska}</p>}<button className="dugme dugme--akcenat razmak-gore" onClick={() => {if(!dete) {setGreska('Izaberi dete ili pripremu kviza bez dodele.');return} setGreska(null);setPokrenuto(true);setKorak(2)}}>Nastavi →</button></div>
    </div>
    {pokrenuto && <div hidden={korak === 1}>{vrsta === 'quiz' ? <KvizForma pocetnoDete={dete === 'bez-dodele' ? '' : dete} onNazad={() => setKorak(1)} /> : <DodelaSaha deteId={dete} onNazad={() => setKorak(1)} />}</div>}
  </>
}
function DodelaSaha({ deteId,onNazad }: { deteId:string; onNazad:()=>void }) {
  const { profili } = useRoditelj()
  const dete = profili.find(p => p.id === deteId)
  const navigate = useRoditeljskiNavigate()
  const [elo,setElo] = useState<(typeof SAH_ELO_NIVOI)[number]>(900)
  const [boja,setBoja] = useState<SahBoja>('white')
  const [sat,setSat] = useState('600')
  const [email,setEmail] = useState(false)
  const [potvrda,setPotvrda] = useState(false)
  const [radi,setRadi] = useState(false)
  const [zapoceto,setZapoceto] = useState(false)
  const [greska,setGreska] = useState<string|null>(null)
  const zahtev = useRef(crypto.randomUUID())
  const zauzeto = useRef(false)
  async function sacuvaj() {if(zauzeto.current || !dete) return; zauzeto.current = true; setRadi(true);setZapoceto(true);setGreska(null)
    try {await dodeliSahPartiju({childProfileId:deteId, approximateElo:elo, childColor:boja, clockSeconds:sat ? Number(sat) as 300|600|900|1800 : null, sendEmail:email && !!dete.email, idempotencyKey:zahtev.current}); navigate(`/admin/vezbanje?dete=${deteId}`)}
    catch(e) {setGreska((e as Error).message)} finally {zauzeto.current = false; setRadi(false)} }
  return <><ol className="roditelj-koraci"><li>1. Dete i aktivnost</li><li aria-current={!potvrda ? 'step' : undefined}>2. Sadržaj</li><li aria-current={potvrda ? 'step' : undefined}>3. Potvrda</li></ol>
    <div className="kartica"><h2>{potvrda ? 'Pregled pre potvrde' : 'Postavke šaha'}</h2><p className="razmak-gore razmak-dole">Za: <strong>{dete?.name}</strong></p>
      {potvrda ? <p>ELO {elo} · {boja === 'white' ? 'bele figure' : 'crne figure'} · {sat ? `${Number(sat)/60} minuta` : 'bez sata'}</p> : <><div className="polje"><label htmlFor="dodela-elo">Težina protivnika (približni ELO)</label><select id="dodela-elo" value={elo} onChange={e => setElo(Number(e.target.value) as typeof elo)}>{SAH_ELO_NIVOI.map(x=><option key={x} value={x}>{x}</option>)}</select></div><div className="polje"><label htmlFor="dodela-boja">Figure deteta</label><select id="dodela-boja" value={boja} onChange={e=>setBoja(e.target.value as SahBoja)}><option value="white">Bele</option><option value="black">Crne</option></select></div><div className="polje"><label htmlFor="dodela-sat">Vreme za igru</label><select id="dodela-sat" value={sat} onChange={e=>setSat(e.target.value)}>{SAH_SATOVI.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div></>}
      <p className="malo blago razmak-gore">Partija se pojavljuje na profilu deteta. Push stiže na povezane uređaje.</p><label className="stiklir"><input type="checkbox" checked={email} disabled={!dete?.email || zapoceto} onChange={e=>setEmail(e.target.checked)} />Pošalji i mejl{!dete?.email ? ' (email nije unet)' : ''}</label>
    </div>{greska && <p role="alert" className="poruka poruka--greska">{greska}</p>}
    <div className="roditelj-radnje"><button className="dugme dugme--senka" disabled={zapoceto} onClick={() => potvrda ? setPotvrda(false) : onNazad()}>← Nazad</button>{potvrda ? <button className="dugme dugme--akcenat" disabled={radi} onClick={() => void sacuvaj()}>{radi ? 'Dodeljujem…' : zapoceto ? 'Pokušaj ponovo' : 'Dodeli partiju'}</button> : <button className="dugme dugme--akcenat" onClick={()=>setPotvrda(true)}>Pregled i potvrda →</button>}</div>
  </>
}
