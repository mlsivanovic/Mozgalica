import { Outlet, useLocation } from 'react-router-dom'
import { RoditeljskiLink as Link } from '../lib/roditelj'

export interface RoditeljskiTab { id: string; to: string; naziv: string }

// Material „primary tabs”: lepljivi ispod gornje trake, aktivni tab ima podvlaku.
export function RoditeljTabovi({ naziv, tabovi, aktivan }: { naziv: string; tabovi: RoditeljskiTab[]; aktivan: string }) {
  return <nav className="roditelj-tabovi" aria-label={naziv}>
    {tabovi.map(t => <Link key={t.id} to={t.to} aria-current={aktivan === t.id ? 'page' : undefined}><span>{t.naziv}</span></Link>)}
  </nav>
}

export function VezbanjeSekcija() {
  const { pathname } = useLocation()
  const izbor = pathname.includes('/rasporedi') ? 'rasporedi' : pathname.endsWith('/sah') ? 'sah'
    : /pitanja|generator/.test(pathname) ? 'pitanja' : 'zadaci'
  return <>
    <h1 className="sr-only">Zadaci</h1>
    <RoditeljTabovi naziv="Zadaci" aktivan={izbor} tabovi={[
      { id: 'zadaci', to: '/admin/vezbanje', naziv: 'Aktivni' },
      { id: 'rasporedi', to: '/admin/vezbanje/rasporedi', naziv: 'Rasporedi' },
      { id: 'sah', to: '/admin/sah', naziv: 'Šah' },
      { id: 'pitanja', to: '/admin/pitanja', naziv: 'Pitanja' },
    ]} />
    <Outlet />
  </>
}

export function NagradeSekcija() {
  const { pathname } = useLocation()
  const izbor = pathname.split('/')[3] ?? 'isporuka'
  return <>
    <h1 className="sr-only">Nagrade</h1>
    <RoditeljTabovi naziv="Nagrade" aktivan={izbor} tabovi={[
      { id: 'isporuka', to: '/admin/nagrade', naziv: 'Za isporuku' },
      { id: 'istorija', to: '/admin/nagrade/istorija', naziv: 'Istorija' },
      { id: 'katalog', to: '/admin/nagrade/katalog', naziv: 'Katalog' },
      { id: 'pravila', to: '/admin/nagrade/pravila', naziv: 'Pravila' },
    ]} />
    <Outlet />
  </>
}
