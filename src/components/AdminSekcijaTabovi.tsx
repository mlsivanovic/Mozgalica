import { Outlet, useLocation } from 'react-router-dom'
import { RoditeljskiLink as Link } from '../lib/roditelj'

interface TabSekcije {
  naziv: string
  putanja: string
  aktivna: (putanja: string) => boolean
}

function TaboviSekcije({ naziv, tabovi }: { naziv: string; tabovi: TabSekcije[] }) {
  const lokacija = useLocation()

  return (
    <>
      <nav className="admin-sekcioni-tabovi" aria-label={naziv}>
        {tabovi.map((tab) => {
          const izabran = tab.aktivna(lokacija.pathname)
          return (
            <Link
              key={tab.putanja}
              to={tab.putanja}
              className={`admin-sekcioni-tab ${izabran ? 'admin-sekcioni-tab--aktivan' : ''}`}
              aria-current={izabran ? 'page' : undefined}
            >
              {tab.naziv}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </>
  )
}

export function PitanjaSekcija() {
  return (
    <TaboviSekcije
      naziv="Pitanja"
      tabovi={[
        {
          naziv: 'Banka pitanja',
          putanja: '/admin/pitanja',
          aktivna: (putanja) => !putanja.startsWith('/admin/pitanja/generator'),
        },
        {
          naziv: 'Generiši pitanja',
          putanja: '/admin/pitanja/generator',
          aktivna: (putanja) => putanja.startsWith('/admin/pitanja/generator'),
        },
      ]}
    />
  )
}

export function RezultatiSekcija() {
  return (
    <TaboviSekcije
      naziv="Rezultati"
      tabovi={[
        {
          naziv: 'Rezultati',
          putanja: '/admin/rezultati',
          aktivna: (putanja) => !putanja.startsWith('/admin/rezultati/statistika'),
        },
        {
          naziv: 'Statistika',
          putanja: '/admin/rezultati/statistika',
          aktivna: (putanja) => putanja.startsWith('/admin/rezultati/statistika'),
        },
      ]}
    />
  )
}
