import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SahTabla } from '../../components/SahTabla'
import { Loader, Modal } from '../../components/Zajednicke'
import { listajPotezeSahPartije, listajSahPartije, otkaziSahPartiju } from '../../lib/api'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import { useRoditeljskiPodaci } from '../../lib/useRoditeljskiPodaci'
import { usePeriodNapretka } from '../../lib/periodNapretka'
import { danasUBeogradu } from '../../lib/statistikaDeteta'
import { formatDatum } from '../../lib/format'
import type { SahPartija, SahPotez } from '../../types/db'
import '../sah/sah.css'
const nazivStatusa = (p: SahPartija) => p.status === 'assigned' ? 'Čeka' : p.status === 'in_progress' ? 'U toku' : p.status === 'cancelled' ? 'Otkazana' : p.result === 'child_win' ? 'Pobeda' : p.result === 'draw' ? 'Remi' : 'Poraz'
async function ucitaj(id:string) { return (await listajSahPartije()).filter(p => !id || p.child_profile_id === id) }
export function Sah({ istorija = false }: { istorija?: boolean }) {
  const { profili } = useRoditelj()
  const { podaci, greska, radi, osvezi } = useRoditeljskiPodaci(ucitaj)
  const [params,setParams] = useSearchParams()
  const { from,to } = usePeriodNapretka()
  const [potezi,setPotezi] = useState<SahPotez[]>([])
  const [indeks,setIndeks] = useState(-1)
  const [greskaPoteza,setGreskaPoteza] = useState<string|null>(null)
  const [ucitavaPoteze,setUcitavaPoteze] = useState(false)
  const [ponovo, setPonovo] = useState(0)
  const id = params.get('partija')
  const partija = podaci?.find(p => p.id === id)
  useEffect(() => { if(!id || !partija) return; let aktivno=true; setUcitavaPoteze(true); setGreskaPoteza(null)
    listajPotezeSahPartije(id).then(p => {if(aktivno) {setPotezi(p);setIndeks(p.length-1)}}).catch(() => {if(aktivno) setGreskaPoteza('Potezi trenutno nisu dostupni.')}).finally(() => {if(aktivno) setUcitavaPoteze(false)})
    return () => {aktivno=false}
  },[id,partija?.id,ponovo])
  async function otkazi(p: SahPartija) {if(!confirm('Otkazati partiju? Dete je više neće videti i neće dobiti zvezdice.')) return
    try {await otkaziSahPartiju(p.id); await osvezi()} catch(e) {setGreskaPoteza((e as Error).message)} }
  if(!podaci && radi) return <Loader />
  if(!podaci && greska) return <p role="alert" className="poruka poruka--greska">{greska}<button className="dugme" onClick={() => {setPonovo(p => p+1); void osvezi()}}>Pokušaj ponovo</button></p>
  const filtrirane=(podaci ?? []).filter(p => !istorija || (['completed','cancelled'].includes(p.status) && (!from || danasUBeogradu(new Date(p.completed_at ?? p.created_at)) >= from) && (!to || danasUBeogradu(new Date(p.completed_at ?? p.created_at)) <= to)))
  return <>
    {!istorija && <div className="roditelj-naslov"><h1>Šah</h1><Link className="dugme dugme--akcenat" to="/admin/zadaj?vrsta=chess">+ Zadaj</Link></div>}
    {(greska || greskaPoteza) && <p className="poruka poruka--greska" role="alert">{greska || greskaPoteza}<button className="dugme dugme--malo" onClick={() => {setPonovo(p => p+1); void osvezi()}}>Pokušaj ponovo</button></p>}
    {id && podaci && !partija && <p role="alert">Partija nije dostupna za izabrani profil.</p>}
    {filtrirane.length === 0 ? <p className="kartica">Nema šahovskih partija u ovom prikazu.</p> : <div className="roditelj-lista">{filtrirane.map(p => <div className="roditelj-red" key={p.id}><div><strong>{profili.find(d => d.id === p.child_profile_id)?.name ?? 'Dete'} · ELO {p.approximate_elo}</strong><small>{formatDatum(p.completed_at ?? p.created_at)} · {nazivStatusa(p)}{p.stars_awarded != null ? ` · ${p.stars_awarded} ⭐` : ''}</small></div><div className="red"><button className="dugme dugme--senka dugme--malo" onClick={() => setParams(s => {s.set('partija',p.id);return s})}>Pregled</button>{['assigned','in_progress'].includes(p.status) && <details><summary>Radnje</summary><button className="dugme dugme--senka" onClick={() => void otkazi(p)}>Otkaži partiju</button></details>}</div></div>)}</div>}
    {partija && <Modal naslov={`Šah · ${profili.find(d => d.id === partija.child_profile_id)?.name ?? 'Dete'}`} onZatvori={() => setParams(p => {p.delete('partija');return p})}>{ucitavaPoteze ? <Loader /> : greskaPoteza ? <p role="alert">{greskaPoteza}<button className="dugme" onClick={() => setPonovo(p => p+1)}>Pokušaj ponovo</button></p> : <SahPregled partija={partija} potezi={potezi} indeks={indeks} onIndeks={setIndeks} />}</Modal>}
  </>
}
function SahPregled({
  partija, potezi, indeks, onIndeks,
}: { partija: SahPartija; potezi: SahPotez[]; indeks: number; onIndeks: (i: number) => void }) {
  const fen = indeks < 0
    ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    : potezi[indeks]?.fen_after ?? partija.fen
  const poslednji = indeks >= 0 ? potezi[indeks] : null
  return (
    <div className="sah-pregled">
      <div className="sah-tabla-admin">
        <SahTabla
          fen={fen} orientation={partija.child_color} disabled
          lastMove={poslednji ? { from: poslednji.uci.slice(0, 2), to: poslednji.uci.slice(2, 4) } : null}
        />
      </div>
      <p className="centar razmak-gore">
        {indeks < 0 ? 'Početna pozicija' : `${indeks + 1}. polupotez: ${potezi[indeks]?.san}`}
      </p>
      <div className="red red--razmak razmak-gore">
        <button type="button" className="dugme dugme--senka dugme--malo" aria-label="Prethodni potez" disabled={indeks < 0} onClick={() => onIndeks(indeks - 1)}>←</button>
        <span>{Math.max(0, indeks + 1)} / {potezi.length}</span>
        <button type="button" className="dugme dugme--senka dugme--malo" aria-label="Sledeći potez" disabled={indeks >= potezi.length - 1} onClick={() => onIndeks(indeks + 1)}>→</button>
      </div>
    </div>
  )
}
