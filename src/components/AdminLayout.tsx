// Okvir administratorskog dela: navigacija + zaštita prijavom (RequireAuth)
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Loader } from './Zajednicke'
import './adminLayout.css'

export function AdminLayout() {
  const { session, ucitava, odjavi } = useAuth()

  if (ucitava) return <Loader tekst="Provera prijave…" />
  if (!session) return <Navigate to="/prijava" replace />

  return (
    <>
      <header className="admin-zaglavlje">
        <div className="admin-zaglavlje-unutra">
          <NavLink to="/admin" end className="admin-logo">🧠 Mozgalica</NavLink>
          <nav className="admin-nav" aria-label="Glavna navigacija">
            <NavLink to="/admin/pitanja">Pitanja</NavLink>
            <NavLink to="/admin/generator">Generator</NavLink>
            <NavLink to="/admin/kvizovi">Kvizovi</NavLink>
            <NavLink to="/admin/rezultati">Rezultati</NavLink>
            <NavLink to="/admin/podesavanja">Podešavanja</NavLink>
          </nav>
          <button type="button" className="dugme dugme--senka dugme--malo" onClick={odjavi}>
            Odjava
          </button>
        </div>
      </header>
      <main className="sadrzaj">
        <Outlet />
      </main>
    </>
  )
}
