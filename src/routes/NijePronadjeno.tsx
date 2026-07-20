import { Link } from 'react-router-dom'

export function NijePronadjeno() {
  return (
    <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}>
      <h1>404</h1>
      <p className="blago razmak-dole">Ova stranica ne postoji.</p>
      <Link to="/" className="dugme">Nazad na početnu</Link>
    </div>
  )
}
