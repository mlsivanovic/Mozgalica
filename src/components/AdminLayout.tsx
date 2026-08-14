// Okvir administratorskog dela: navigacija + zaštita prijavom (RequireAuth)
import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
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
  const { session, ucitava, odjavi } = useAuth()
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

  return (
    <>
      <header className="admin-zaglavlje">
        <div className="admin-zaglavlje-unutra">
          <NavLink to="/admin" end className="admin-logo">🧠 Mozgalica</NavLink>
          <nav className="admin-nav" aria-label="Glavna navigacija">
            <NavLink to="/admin/pitanja">Pitanja</NavLink>
            <NavLink to="/admin/kvizovi">Kvizovi</NavLink>
            <NavLink to="/admin/sah">Šah</NavLink>
            <NavLink to="/admin/rezultati">Rezultati</NavLink>
            <NavLink to="/admin/podesavanja">Podešavanja</NavLink>
          </nav>
          <div className="red">
            <ObavestenjaZvonce
              inbox={inbox}
              onOznaciProcitanim={oznaciProcitanim}
              nazivPrimaoca="administratora"
            />
            <TemaDugme />
            <button type="button" className="dugme dugme--senka dugme--malo" onClick={odjavi}>
              Odjava
            </button>
          </div>
        </div>
      </header>
      <main className="sadrzaj">
        <Outlet />
      </main>
    </>
  )
}
