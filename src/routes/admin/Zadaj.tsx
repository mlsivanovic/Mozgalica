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
  const primaoci = [...profili.map(p => ({ id: p.id, naziv: p.name, avatar: p.avatar as string | null })), ...(vrsta === 'quiz' ? [{ id: 'bez-dodele', naziv: 'Bez dodele', avatar: null }] : [])]
  return <>
    <div hidden={korak !== 1}><ol className="roditelj-koraci"><li aria-current="step">Dete i aktivnost</li><li>Sadržaj</li><li>Potvrda</li></ol>
      <fieldset className="zadaj-vrste"><legend>Šta zadaješ?</legend><div><label className={vrsta === 'quiz' ? 'aktivna' : ''}><input type="radio" name="vrsta" checked={vrsta === 'quiz'} onChange={() => setVrsta('quiz')} /><Ikona ime="zadaci" /><span><strong>Kviz</strong><small>Matematika, srpski, priroda</small></span></label><label className={vrsta === 'chess' ? 'aktivna' : ''}><input type="radio" name="vrsta" checked={vrsta === 'chess'} onChange={() => {setVrsta('chess'); if(dete === 'bez-dodele') setDete('')}} /><Ikona ime="sah" /><span><strong>Šah</strong><small>Partija protiv računara</small></span></label></div></fieldset>
      <fieldset className="zadaj-primalac"><legend>Kome?</legend>
        <div className="roditelj-cipovi roditelj-cipovi--prelom" role="radiogroup" aria-label="Kome je namenjeno">
          {primaoci.map(p => <button key={p.id} type="button" role="radio" aria-checked={dete === p.id}
            className={`roditelj-cip roditelj-cip--veliki${dete === p.id ? ' aktivan' : ''}`} onClick={() => { setDete(p.id); setGreska(null) }}>
            <span aria-hidden="true">{p.avatar ?? <Ikona ime="knjiga" velicina={18} />}</span>{p.naziv}
          </button>)}
        </div>
        {dete === 'bez-dodele' && <p className="malo blago">Kviz se priprema i deli linkom ili dodeljuje kasnije.</p>}
      </fieldset>
      {greska && <p role="alert" className="poruka poruka--greska">{greska}</p>}
      <div className="roditelj-donja-akcija"><button className="dugme dugme--akcenat" onClick={() => {if(!dete) {setGreska('Izaberi dete ili pripremu kviza bez dodele.');return} setGreska(null);setPokrenuto(true);setKorak(2)}}>Nastavi<Ikona ime="napred" velicina={20} /></button></div>
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
  return <><ol className="roditelj-koraci"><li>Dete i aktivnost</li><li aria-current={!potvrda ? 'step' : undefined}>Sadržaj</li><li aria-current={potvrda ? 'step' : undefined}>Potvrda</li></ol>
    <div className="kartica"><h2>{potvrda ? 'Pregled pre potvrde' : 'Postavke šaha'}</h2><p className="razmak-gore razmak-dole">Za: <strong>{dete?.name}</strong></p>
      {potvrda ? <p>ELO {elo} · {boja === 'white' ? 'bele figure' : 'crne figure'} · {sat ? `${Number(sat)/60} minuta` : 'bez sata'}</p> : <><div className="polje"><label htmlFor="dodela-elo">Težina protivnika (približni ELO)</label><select id="dodela-elo" value={elo} onChange={e => setElo(Number(e.target.value) as typeof elo)}>{SAH_ELO_NIVOI.map(x=><option key={x} value={x}>{x}</option>)}</select></div><div className="polje"><label htmlFor="dodela-boja">Figure deteta</label><select id="dodela-boja" value={boja} onChange={e=>setBoja(e.target.value as SahBoja)}><option value="white">Bele</option><option value="black">Crne</option></select></div><div className="polje"><label htmlFor="dodela-sat">Vreme za igru</label><select id="dodela-sat" value={sat} onChange={e=>setSat(e.target.value)}>{SAH_SATOVI.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div></>}
      <p className="malo blago razmak-gore">Partija se pojavljuje na profilu deteta. Push stiže na povezane uređaje.</p><label className="stiklir"><input type="checkbox" checked={email} disabled={!dete?.email || zapoceto} onChange={e=>setEmail(e.target.checked)} />Pošalji i mejl{!dete?.email ? ' (email nije unet)' : ''}</label>
    </div>{greska && <p role="alert" className="poruka poruka--greska">{greska}</p>}
    <div className="roditelj-radnje roditelj-donja-akcija"><button className="dugme dugme--senka" disabled={zapoceto} onClick={() => potvrda ? setPotvrda(false) : onNazad()}>← Nazad</button>{potvrda ? <button className="dugme dugme--akcenat" disabled={radi} onClick={() => void sacuvaj()}>{radi ? 'Dodeljujem…' : zapoceto ? 'Pokušaj ponovo' : 'Dodeli partiju'}</button> : <button className="dugme dugme--akcenat" onClick={()=>setPotvrda(true)}>Pregled i potvrda →</button>}</div>
  </>
}
