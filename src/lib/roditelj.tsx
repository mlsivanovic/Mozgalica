import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useSearchParams, type LinkProps, type NavigateOptions } from 'react-router-dom'
import { listajProfileDeteta } from './api'
import type { ProfilDeteta } from '../types/db'
import { sacuvajKontekstPutanje } from './roditeljskePutanje'

interface RoditeljskiKontekst {
  deteId: string
  dete: ProfilDeteta | undefined
  profili: ProfilDeteta[]
  ucitava: boolean
  greska: string | null
  nepoznatoDete: boolean
  osveziProfile: () => Promise<void>
  izaberiDete: (id: string) => void
  putanja: (to: string) => string
}
const Kontekst = createContext<RoditeljskiKontekst | null>(null)
export function RoditeljProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const lokacija = useLocation()
  const [profili, setProfili] = useState<ProfilDeteta[]>([])
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const deteId = params.get('dete') ?? ''
  const osveziProfile = useCallback(async () => {
    setGreska(null)
    try { setProfili(await listajProfileDeteta()) }
    catch { setGreska('Profili trenutno nisu dostupni. Pokušaj ponovo.') }
    finally { setUcitava(false) }
  }, [])
  useEffect(() => { void osveziProfile() }, [osveziProfile])
  const izaberiDete = useCallback((id: string) => {
    setParams(stari => {
      const novi = new URLSearchParams(stari)
      if (id) novi.set('dete', id); else novi.delete('dete')
      novi.delete('partija')
      return novi
    })
  }, [setParams])
  const dete = profili.find(p => p.id === deteId)
  const putanja = useCallback((to: string) => sacuvajKontekstPutanje(to, deteId, lokacija.pathname, lokacija.search), [deteId, lokacija.pathname, lokacija.search])
  const vrednost = useMemo(() => ({ deteId, dete, profili, ucitava, greska,
    nepoznatoDete: !ucitava && !greska && !!deteId && !dete,
    osveziProfile, izaberiDete, putanja,
  }), [deteId, dete, profili, ucitava, greska, osveziProfile, izaberiDete, putanja])
  return <Kontekst.Provider value={vrednost}>{children}</Kontekst.Provider>
}
export function useRoditelj() {
  const kontekst = useContext(Kontekst)
  if (!kontekst) throw new Error('Roditeljski prikaz zahteva RoditeljProvider.')
  return kontekst
}
export function RoditeljskiLink({ to, ...props }: LinkProps) {
  const kontekst = useContext(Kontekst)
  return <RouterLink {...props} to={typeof to === 'string' && kontekst ? kontekst.putanja(to) : to} />
}
export function useRoditeljskiNavigate() {
  const navigate = useNavigate()
  const { putanja } = useRoditelj()
  return useCallback((to: string, options?: NavigateOptions) => navigate(putanja(to), options), [navigate, putanja])
}
export function RoditeljskoPreusmerenje({ to }: { to: string }) {
  const navigate = useRoditeljskiNavigate()
  const { search } = useLocation()
  useEffect(() => { const [osnova,upit] = to.split('?'); const p = new URLSearchParams(search); new URLSearchParams(upit).forEach((v,k) => p.set(k,v)); navigate(osnova + (p.size ? `?${p}` : ''), { replace: true }) }, [to, search, navigate])
  return null
}
