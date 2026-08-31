// Okvir administratorskog dela: navigacija + zaštita prijavom (RequireAuth)
import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { RoditeljProvider, RoditeljskiLink as Link, useRoditelj } from '../lib/roditelj'
import { glavnaSekcija, zajednickaStranica, uredjivanjeAktivnosti } from '../lib/roditeljskePutanje'
import { RoditeljskaIkona } from './RoditeljskaIkona'
import {
  listajAdminObavestenja, oznaciAdminObavestenjaProcitanim,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { oznaciInboxProcitanim } from '../lib/obavestenja'
import { postaviBedzAplikacije, slusajPushPoruke } from '../lib/push'
import type { InboxObavestenja } from '../types/db'
import { Loader, TemaDugme } from './Zajednicke'
import { ObavestenjaZvonce } from './ObavestenjaZvonce'
import './adminLayout.css'

export function AdminLayout() {
  const { session, ucitava } = useAuth()
  const [inbox, setInbox] = useState<InboxObavestenja>({ obavestenja: [], neprocitano: 0 })

  const osveziObavestenja = useCallback(async () => {
    if (!session) return
    try {
      const noviInbox = await listajAdminObavestenja()
      setInbox(noviInbox)
    } catch {
      // Inbox ne sme da prekine rad ostatka administratorskog panela.
    }
  }, [session])

  useEffect(() => {
    void postaviBedzAplikacije(inbox.neprocitano)
  }, [inbox.neprocitano])

  useEffect(() => {
    if (!session) return
    void osveziObavestenja()
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void osveziObavestenja()
    }, 30_000)
    const priFokusu = () => void osveziObavestenja()
    window.addEventListener('focus', priFokusu)
    document.addEventListener('visibilitychange', priFokusu)
    const odjaviPush = slusajPushPoruke(priFokusu)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', priFokusu)
      document.removeEventListener('visibilitychange', priFokusu)
      odjaviPush()
    }
  }, [session, osveziObavestenja])

  async function oznaciProcitanim(ids?: string[]) {
    await oznaciAdminObavestenjaProcitanim(ids)
    setInbox((prethodni) => oznaciInboxProcitanim(prethodni, ids))
  }

  if (ucitava) return <Loader tekst="Provera prijave…" />
  if (!session) return <Navigate to="/prijava" replace />

  return <RoditeljProvider><RoditeljskiOkvir inbox={inbox} onProcitano={oznaciProcitanim} /></RoditeljProvider>
}

function RoditeljskiOkvir({ inbox, onProcitano }: { inbox: InboxObavestenja; onProcitano: (ids?: string[]) => Promise<void> }) {
  const { pathname, search } = useLocation()
  const { deteId, profili, ucitava, greska, nepoznatoDete, izaberiDete, osveziProfile } = useRoditelj()
  const aktivna = glavnaSekcija(pathname)
  const zajednicko = zajednickaStranica(pathname)
  const detaljRezultata = /^\/admin\/rezultati\/[^/]+$/.test(pathname) && !pathname.endsWith('/statistika')
  const uredjivanje = uredjivanjeAktivnosti(pathname) || new URLSearchParams(search).has('raspored')
  const navigacija = [
    ['danas', '/admin', 'Danas'], ['vezbanje', '/admin/vezbanje', 'Vežbanje'],
    ['napredak', '/admin/napredak', 'Napredak'], ['nagrade', '/admin/nagrade', 'Nagrade'],
  ] as const
  return (
    <div className="roditeljski-okvir">
      <a className="roditelj-preskoci" href="#roditeljski-sadrzaj" onClick={e => { e.preventDefault(); document.getElementById('roditeljski-sadrzaj')?.focus() }}>Preskoči na sadržaj</a>
      <header className="roditelj-zaglavlje">
        <Link to="/admin" className="admin-logo">🧠 Mozgalica</Link>
        <div className="red">
          <ObavestenjaZvonce inbox={inbox} onOznaciProcitanim={onProcitano} nazivPrimaoca="roditelja" />
          <TemaDugme className="roditelj-ikona-dugme" />
          <Link to="/admin/podesavanja" className="roditelj-ikona-dugme" aria-label="Podešavanja aplikacije"><RoditeljskaIkona ime="podesavanja" /></Link>
        </div>
      </header>
      <div className="roditelj-kontekst">
        {zajednicko ? <p className="roditelj-zajednicko">Zajedničko za svu decu</p>
          : detaljRezultata ? <p className="roditelj-zajednicko">Detalj pokušaja · izbor deteta za liste je sačuvan</p>
          : uredjivanje ? <p className="roditelj-zajednicko">Primalac se bira u aktivnosti</p>
          : <div className="roditelj-izbor">
            <label className="sr-only" htmlFor="roditelj-dete">Prikaz za dete</label>
            <select id="roditelj-dete" value={deteId} disabled={ucitava || !!greska} onChange={e => izaberiDete(e.target.value)}>
              <option value="">Sva deca</option>
              {nepoznatoDete && <option value={deteId}>Profil nije dostupan</option>}
              {profili.map(p => <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}
            </select>
            <Link to="/admin/deca" className="roditelj-upravljaj">Upravljaj decom</Link>
          </div>}
      </div>
      <nav className="roditelj-nav" aria-label="Glavna navigacija">
        {navigacija.map(([id, to, naziv]) => <Link key={id} to={to} className={aktivna === id ? 'aktivna' : ''} aria-current={aktivna === id ? 'page' : undefined}>
          <RoditeljskaIkona ime={id} /><span>{naziv}</span>
        </Link>)}
      </nav>
      <main tabIndex={-1} id="roditeljski-sadrzaj" className="sadrzaj roditelj-sadrzaj">
        {ucitava ? <Loader tekst="Učitavanje profila…" /> : greska ? <div className="kartica"><p role="alert">{greska}</p><button className="dugme razmak-gore" onClick={() => void osveziProfile()}>Pokušaj ponovo</button></div>
          : nepoznatoDete && !zajednicko ? <div className="kartica"><h1>Profil nije dostupan</h1><p>Izaberi drugi profil ili pregled sve dece.</p><button className="dugme razmak-gore" onClick={() => izaberiDete('')}>Prikaži svu decu</button></div>
          : <Outlet />}
      </main>
    </div>
  )
}
