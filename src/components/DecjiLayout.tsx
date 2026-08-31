import { Outlet, useLocation, useParams } from 'react-router-dom'
import { Ikona } from './Ikona'
import { TemaDugme } from './Zajednicke'
import { Link } from 'react-router-dom'
import './decjiLayout.css'

const STAVKE = [
  { kraj: '', naziv: 'Početna', ikona: 'danas' as const },
  { kraj: '/raspored', naziv: 'Raspored', ikona: 'raspored' as const },
  { kraj: '/nagrade', naziv: 'Nagrade', ikona: 'nagrade' as const },
  { kraj: '/rezultati', naziv: 'Rezultati', ikona: 'pehar' as const },
]

export function DecjiLayout() {
  const { profilToken = '' } = useParams<{ profilToken: string }>()
  const { pathname } = useLocation()
  const baza = `/dete/${profilToken}`
  return <div className="decji-okvir">
    <a className="roditelj-preskoci" href="#decji-sadrzaj" onClick={e => { e.preventDefault(); document.getElementById('decji-sadrzaj')?.focus() }}>Preskoči na sadržaj</a>
    <header className="decji-traka">
      <Link to={baza} className="decji-brend"><span><Ikona ime="mozak" velicina={20} /></span>Moja Mozgalica</Link>
      <div className="red">
        <TemaDugme className="ui-ikona-dugme" />
        <Link to={`${baza}/podesavanja`} className="ui-ikona-dugme" aria-label="Podešavanja"><Ikona ime="podesavanja" /></Link>
      </div>
    </header>
    <main id="decji-sadrzaj" className="decji-sadrzaj" tabIndex={-1}><Outlet /></main>
    <nav className="decji-nav" aria-label="Glavna navigacija deteta">
      {STAVKE.map(stavka => {
        const putanja = `${baza}${stavka.kraj}`
        const aktivna = stavka.kraj ? pathname.startsWith(putanja) : pathname === baza || pathname === `${baza}/`
        return <Link key={stavka.naziv} to={putanja} className={aktivna ? 'aktivna' : ''} aria-current={aktivna ? 'page' : undefined}>
          <Ikona ime={stavka.ikona} /><span>{stavka.naziv}</span>
        </Link>
      })}
    </nav>
  </div>
}
