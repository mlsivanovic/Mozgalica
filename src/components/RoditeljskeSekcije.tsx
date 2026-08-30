import { Outlet, useLocation } from 'react-router-dom'
import { RoditeljskiLink as Link } from '../lib/roditelj'
export function VezbanjeSekcija() {
  const { pathname } = useLocation()
  const izbor = pathname.includes('/rasporedi') ? 'rasporedi' : /pitanja|generator/.test(pathname) ? 'pitanja' : 'zadaci'
  return <><div className="roditelj-naslov"><h1>Vežbanje</h1><Link to="/admin/zadaj" className="dugme dugme--akcenat">+ Zadaj</Link></div><nav className="roditelj-tabovi" aria-label="Vežbanje">
    {[['zadaci','/admin/vezbanje','Zadaci'],['rasporedi','/admin/vezbanje/rasporedi','Rasporedi'],['pitanja','/admin/pitanja','Pitanja']].map(([id,to,label]) => <Link key={id} to={to} aria-current={izbor === id ? 'page' : undefined}>{label}</Link>)}
  </nav><Outlet /></>
}
export function NagradeSekcija() {
  const { pathname } = useLocation()
  return <><div className="roditelj-naslov"><h1>Nagrade</h1></div><nav className="roditelj-tabovi" aria-label="Nagrade">
    {[['/admin/nagrade','Za isporuku'],['/admin/nagrade/istorija','Istorija'],['/admin/nagrade/katalog','Katalog']].map(([to,label]) => <Link key={to} to={to} aria-current={pathname === to ? 'page' : undefined}>{label}</Link>)}
  </nav><p className="razmak-dole"><Link to="/admin/nagrade/pravila">Titule i pravila za zvezdice →</Link></p><Outlet /></>
}
