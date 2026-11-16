// Okvir administratorskog dela: navigacija + zaštita prijavom (RequireAuth)
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { RoditeljProvider, RoditeljskiLink as Link, useRoditelj } from '../lib/roditelj'
import {
  glavnaSekcija, korenskaStrana, naslovStrane, roditeljNazad, uredjivanjeAktivnosti, zajednickaStranica,
} from '../lib/roditeljskePutanje'
import { RoditeljskaIkona } from './RoditeljskaIkona'
import {
  listajAdminObavestenja, oznaciAdminObavestenjaProcitanim,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { PrihvatanjeUslova } from './PrihvatanjeUslova'
import { oznaciInboxProcitanim } from '../lib/obavestenja'
import { postaviBedzAplikacije, slusajPushPoruke } from '../lib/push'
import type { InboxObavestenja } from '../types/db'
import { Loader } from './Zajednicke'
import { ObavestenjaZvonce } from './ObavestenjaZvonce'
import { Ikona } from './Ikona'
import './adminLayout.css'

export function AdminLayout() {
  const { session, ucitava, prihvacenUslovi } = useAuth()
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
  if (prihvacenUslovi === null) return <Loader tekst="Provera naloga…" />
  if (prihvacenUslovi === false) return <PrihvatanjeUslova />

  return <RoditeljProvider><RoditeljskiOkvir inbox={inbox} onProcitano={oznaciProcitanim} /></RoditeljProvider>
}

const NAVIGACIJA = [
  ['danas', '/admin', 'Danas'], ['vezbanje', '/admin/vezbanje', 'Zadaci'],
  ['napredak', '/admin/napredak', 'Napredak'], ['nagrade', '/admin/nagrade', 'Nagrade'],
] as const

function RoditeljskiOkvir({ inbox, onProcitano }: { inbox: InboxObavestenja; onProcitano: (ids?: string[]) => Promise<void> }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { deteId, ucitava, greska, nepoznatoDete, izaberiDete, osveziProfile } = useRoditelj()
  const aktivna = glavnaSekcija(pathname)
  const zajednicko = zajednickaStranica(pathname)
  const koren = korenskaStrana(pathname, search)
  const uredjivanje = uredjivanjeAktivnosti(pathname) || new URLSearchParams(search).has('raspored')
  const naslov = naslovStrane(pathname, search)
  const prikaziFab = koren && (aktivna === 'danas' || aktivna === 'vezbanje') && !zajednicko
  const skupljen = useSkupljanjePriSkrolu()

  useEffect(() => {
    // Nova strana počinje od vrha; tabovi i filteri u istoj sekciji zadržavaju poziciju.
    window.scrollTo({ top: 0 })
  }, [pathname])

  function nazad() {
    const indeks = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (indeks > 0) navigate(-1)
    else navigate(roditeljNazad(pathname, search) + (deteId ? `?dete=${deteId}` : ''))
  }

  const podnaslov = zajednicko ? 'Zajedničko za svu decu' : uredjivanje ? 'Primalac se bira u aktivnosti' : null

  return (
    <div className={`roditeljski-okvir${prikaziFab ? ' roditeljski-okvir--fab' : ''}`}>
      <a className="roditelj-preskoci" href="#roditeljski-sadrzaj" onClick={e => { e.preventDefault(); document.getElementById('roditeljski-sadrzaj')?.focus() }}>Preskoči na sadržaj</a>
      <header className="roditelj-traka">
        {koren
          ? <Link to="/admin" className="roditelj-traka-logo" aria-label="Mozgalica · Danas"><Ikona ime="mozak" velicina={22} /></Link>
          : <button type="button" className="roditelj-ikona-dugme" onClick={nazad} aria-label="Nazad"><Ikona ime="nazad" /></button>}
        <div className="roditelj-traka-naslov">
          {koren && !zajednicko && !ucitava && !greska
            ? <IzborDeteta naslov={naslov} />
            : <><h1 className="roditelj-traka-h1">{naslov}</h1>{podnaslov && <small>{podnaslov}</small>}</>}
        </div>
        <ObavestenjaZvonce inbox={inbox} onOznaciProcitanim={onProcitano} nazivPrimaoca="roditelja" />
        <MeniVise />
      </header>
      <nav className="roditelj-nav" aria-label="Glavna navigacija">
        <Link to="/admin" className="roditelj-nav-logo" aria-label="Mozgalica · Danas">
          <span className="admin-logo-znak"><Ikona ime="mozak" velicina={21} /></span><span>Mozgalica</span>
        </Link>
        {NAVIGACIJA.map(([id, to, naziv]) => <Link key={id} to={to} className={aktivna === id ? 'aktivna' : ''} aria-current={aktivna === id ? 'page' : undefined}>
          <span className="roditelj-nav-ikona"><RoditeljskaIkona ime={id} /></span><span>{naziv}</span>
        </Link>)}
      </nav>
      {prikaziFab && <Link to="/admin/zadaj" className={`roditelj-fab${skupljen ? ' roditelj-fab--skupljen' : ''}`} aria-label="Zadaj novu aktivnost">
        <Ikona ime="dodaj" velicina={24} /><span>Zadaj</span>
      </Link>}
      <main tabIndex={-1} id="roditeljski-sadrzaj" className="sadrzaj roditelj-sadrzaj">
        {ucitava ? <Loader tekst="Učitavanje profila…" /> : greska ? <div className="kartica"><p role="alert">{greska}</p><button className="dugme razmak-gore" onClick={() => void osveziProfile()}>Pokušaj ponovo</button></div>
          : nepoznatoDete && !zajednicko ? <div className="kartica"><h2>Profil nije dostupan</h2><p>Izaberi drugi profil ili pregled sve dece.</p><button className="dugme razmak-gore" onClick={() => izaberiDete('')}>Prikaži svu decu</button></div>
          : <Outlet />}
      </main>
    </div>
  )
}

// Prošireni FAB se skuplja na ikonicu dok roditelj skroluje nadole (Material obrazac).
function useSkupljanjePriSkrolu() {
  const [skupljen, setSkupljen] = useState(false)
  useEffect(() => {
    let prethodni = window.scrollY
    const naSkrol = () => {
      const y = window.scrollY
      if (Math.abs(y - prethodni) < 8) return
      setSkupljen(y > prethodni && y > 80)
      prethodni = y
    }
    window.addEventListener('scroll', naSkrol, { passive: true })
    return () => window.removeEventListener('scroll', naSkrol)
  }, [])
  return skupljen
}

function IzborDeteta({ naslov }: { naslov: string }) {
  const { deteId, dete, profili, izaberiDete } = useRoditelj()
  const [otvoren, setOtvoren] = useState(false)
  return <>
    <button type="button" className="roditelj-izbor-dugme" onClick={() => setOtvoren(true)} aria-haspopup="dialog" aria-label={`${naslov} · prikaz za: ${dete?.name ?? 'sva deca'}. Promeni dete`}>
      <span className="roditelj-izbor-avatar" aria-hidden="true">{dete ? dete.avatar : <Ikona ime="deca" velicina={20} />}</span>
      <span className="roditelj-izbor-tekst">
        <small>{naslov}</small>
        <strong>{dete?.name ?? 'Sva deca'}</strong>
      </span>
      <Ikona ime="dole" velicina={18} />
    </button>
    {otvoren && <DonjiList naslov="Prikaz za" onZatvori={() => setOtvoren(false)}>
      <div role="radiogroup" aria-label="Prikaz za dete" className="roditelj-list-stavke">
        {[{ id: '', name: 'Sva deca', avatar: null as string | null }, ...profili].map(p => (
          <button key={p.id || 'sva'} type="button" role="radio" aria-checked={deteId === p.id}
            className={`roditelj-list-stavka${deteId === p.id ? ' aktivna' : ''}`}
            onClick={() => { izaberiDete(p.id); setOtvoren(false) }}>
            <span className="roditelj-izbor-avatar" aria-hidden="true">{p.avatar ?? <Ikona ime="deca" velicina={20} />}</span>
            <span>{p.name}</span>
            {deteId === p.id && <Ikona ime="potvrda" />}
          </button>
        ))}
      </div>
      <Link to="/admin/deca" className="roditelj-list-stavka roditelj-list-veza" onClick={() => setOtvoren(false)}>
        <span className="roditelj-izbor-avatar" aria-hidden="true"><Ikona ime="uredi" velicina={20} /></span>
        <span>Upravljaj decom</span>
      </Link>
    </DonjiList>}
  </>
}

export function DonjiList({ naslov, onZatvori, children }: { naslov: string; onZatvori: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prethodni = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const naTaster = (e: KeyboardEvent) => { if (e.key === 'Escape') onZatvori() }
    window.addEventListener('keydown', naTaster)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', naTaster)
      document.body.style.overflow = ''
      prethodni?.focus()
    }
  }, [onZatvori])
  // Portal: backdrop-filter na traci bi inače postao okvir za position: fixed.
  return createPortal(<div className="roditelj-list-pozadina" onClick={onZatvori} role="presentation">
    <div ref={ref} tabIndex={-1} className="roditelj-list" role="dialog" aria-modal="true" aria-label={naslov} onClick={e => e.stopPropagation()}>
      <span className="roditelj-list-rucka" aria-hidden="true" />
      <h2 className="roditelj-list-naslov">{naslov}</h2>
      {children}
    </div>
  </div>, document.body)
}

function MeniVise() {
  const { odjavi, jeVlasnikPlatforme } = useAuth()
  const [otvoren, setOtvoren] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!otvoren) return
    const van = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOtvoren(false) }
    const naTaster = (e: KeyboardEvent) => { if (e.key === 'Escape') setOtvoren(false) }
    document.addEventListener('pointerdown', van)
    window.addEventListener('keydown', naTaster)
    return () => { document.removeEventListener('pointerdown', van); window.removeEventListener('keydown', naTaster) }
  }, [otvoren])
  const zatvori = () => setOtvoren(false)
  return <div className="roditelj-meni" ref={ref}>
    <button type="button" className="roditelj-ikona-dugme" aria-label="Još opcija" aria-haspopup="menu" aria-expanded={otvoren} onClick={() => setOtvoren(o => !o)}>
      <Ikona ime="opcije" />
    </button>
    {otvoren && <div className="roditelj-meni-lista" role="menu">
      <Link role="menuitem" to="/admin/podesavanja" onClick={zatvori}><Ikona ime="podesavanja" />Podešavanja</Link>
      {jeVlasnikPlatforme && <Link role="menuitem" to="/admin/roditelji" onClick={zatvori}><Ikona ime="deca" />Roditelji</Link>}
      <hr />
      <button role="menuitem" type="button" onClick={() => { zatvori(); void odjavi() }}><Ikona ime="odjava" />Odjavi se</button>
    </div>}
  </div>
}
