// Kontekst prijave administratora (Supabase Auth sesija)
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { PREDMETI, RAZREDI, type Predmet, type Razred } from '../types/db'
import { backendPodesen, supabase } from './supabase'
import { ucitajPodesavanja } from './api'
import { dozvoljeniPredmetiZaKorisnika, normalizujPredmete, normalizujRazrede } from './predmet'
import {
  KLJUC_GRESKE_PRIJAVE, KLJUC_ZAHTEVA_LOZINKE, jeAuthHash, jeIstekaoIliNeispravanOtp,
  porukaGreskeLozinke, porukaGreskePotvrde, procitajZahtevLozinke, vrstaZaTipPotvrde,
  type TipPotvrdeLinka,
} from './authPovratak'

type ZahtevLozinke = 'pozivnica' | 'oporavak'

export interface RezultatPotvrdeLinka {
  greska: string | null
  neispravan?: boolean
}

interface AuthStanje {
  session: Session | null
  ucitava: boolean
  jeVlasnikPlatforme: boolean
  dozvoljeniRazredi: Razred[]
  dozvoljeniPredmeti: Predmet[]
  // null dok se podešavanja učitavaju; false znači da uslovi nisu prihvaćeni (ili se ne može proveriti)
  prihvacenUslovi: boolean | null
  prijaviLozinkom(email: string, lozinka: string): Promise<string | null>
  posaljiMagicLink(email: string): Promise<string | null>
  posaljiLinkZaLozinku(email: string): Promise<string | null>
  potvrdiLinkIzMejla(tokenHash: string, tip: TipPotvrdeLinka): Promise<RezultatPotvrdeLinka>
  // Posle pozivnice ili oporavka roditelj prvo bira lozinku, pa tek onda ulazi u panel.
  zahtevLozinke: ZahtevLozinke | null
  postaviLozinku(lozinka: string): Promise<string | null>
  osveziPodesavanja(): void
  odjavi(): Promise<void>
}

interface PodesavanjaPrijavljenog {
  userId: string
  vlasnik: boolean
  uslovi: boolean
  razredi: Razred[]
  predmeti: Predmet[]
}

const AuthContext = createContext<AuthStanje | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ucitava, setUcitava] = useState(backendPodesen)
  const [podesavanja, setPodesavanja] = useState<PodesavanjaPrijavljenog | null>(null)
  const [verzijaPodesavanja, setVerzijaPodesavanja] = useState(0)
  const [zahtevLozinke, setZahtevLozinke] = useState<ZahtevLozinke | null>(procitajZahtevLozinke)
  const userId = session?.user.id ?? null
  const trenutna = userId !== null && podesavanja?.userId === userId ? podesavanja : null
  const jeVlasnikPlatforme = trenutna?.vlasnik ?? false
  const prihvacenUslovi = trenutna ? trenutna.uslovi : null
  const dozvoljeniRazredi = trenutna ? trenutna.razredi : [...RAZREDI]
  const dozvoljeniPredmeti = trenutna ? trenutna.predmeti : [...PREDMETI]

  useEffect(() => {
    if (!backendPodesen) return
    supabase()
      .auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => {
        // supabase-js briše hash samo kad uspe; neuspeo povratak inače ostaje na 404 strani.
        if (jeAuthHash(window.location.hash)) {
          sessionStorage.setItem(KLJUC_GRESKE_PRIJAVE, 'Prijava preko linka nije uspela. Zatraži novi link ispod.')
          sessionStorage.removeItem(KLJUC_ZAHTEVA_LOZINKE)
          setZahtevLozinke(null)
          window.location.hash = '#/prijava'
        }
        setUcitava(false)
      })
    const { data: pretplata } = supabase().auth.onAuthStateChange((dogadjaj, novaSesija) => {
      setSession(novaSesija)
      if (dogadjaj === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(KLJUC_ZAHTEVA_LOZINKE, 'oporavak')
        setZahtevLozinke('oporavak')
      }
      if (dogadjaj === 'SIGNED_OUT') {
        sessionStorage.removeItem(KLJUC_ZAHTEVA_LOZINKE)
        setZahtevLozinke(null)
      }
    })
    return () => pretplata.subscription.unsubscribe()
  }, [])

  // Vlasništvo i saglasnost čitaju se iz sopstvenog admin_settings reda. Pamte se uz
  // korisnika da stari odgovor ne važi posle promene naloga.
  useEffect(() => {
    if (!userId) return
    let aktivno = true
    ucitajPodesavanja()
      .then((red) => {
        if (!aktivno) return
        const vlasnik = Boolean(red?.is_platform_owner)
        const razredi = vlasnik ? [...RAZREDI] : normalizujRazrede(red?.allowed_grades)
        const predmeti = vlasnik
          ? [...PREDMETI]
          : dozvoljeniPredmetiZaKorisnika(normalizujPredmete(red?.allowed_subjects), razredi)
        setPodesavanja({
          userId,
          vlasnik,
          uslovi: red ? red.terms_accepted_at !== null : false,
          razredi,
          predmeti,
        })
      })
      .catch(() => {
        if (aktivno) {
          setPodesavanja({
            userId,
            vlasnik: false,
            uslovi: false,
            razredi: [...RAZREDI],
            predmeti: [...PREDMETI],
          })
        }
      })
    return () => { aktivno = false }
  }, [userId, verzijaPodesavanja])

  async function prijaviLozinkom(email: string, lozinka: string): Promise<string | null> {
    const { error } = await supabase().auth.signInWithPassword({ email, password: lozinka })
    return error ? prevodGreske(error.message) : null
  }

  // Nalozi nastaju samo pozivom vlasnika platforme (Edge funkcija pozovi-roditelja).
  async function posaljiMagicLink(email: string): Promise<string | null> {
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
        shouldCreateUser: false,
      },
    })
    return error ? prevodGreske(error.message) : null
  }

  async function posaljiLinkZaLozinku(email: string): Promise<string | null> {
    const { error } = await supabase().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
    })
    return error ? prevodGreske(error.message) : null
  }

  async function potvrdiLinkIzMejla(
    tokenHash: string,
    tip: TipPotvrdeLinka,
  ): Promise<RezultatPotvrdeLinka> {
    try {
      const { data, error } = await supabase().auth.verifyOtp({
        token_hash: tokenHash,
        type: tip,
      })
      if (error) {
        const kod = (error as { code?: string }).code ?? null
        return {
          greska: porukaGreskePotvrde(kod, error.message),
          neispravan: jeIstekaoIliNeispravanOtp(kod, error.message),
        }
      }
      if (data.session) setSession(data.session)
      const vrsta = vrstaZaTipPotvrde(tip)
      if (vrsta !== 'prijava') {
        sessionStorage.setItem(KLJUC_ZAHTEVA_LOZINKE, vrsta)
        setZahtevLozinke(vrsta)
      } else {
        sessionStorage.removeItem(KLJUC_ZAHTEVA_LOZINKE)
        setZahtevLozinke(null)
      }
      return { greska: null }
    } catch (err) {
      const poruka = err instanceof Error ? err.message : null
      return {
        greska: porukaGreskePotvrde(null, poruka),
        neispravan: false,
      }
    }
  }

  async function postaviLozinku(lozinka: string): Promise<string | null> {
    const { error } = await supabase().auth.updateUser({ password: lozinka })
    if (error) return porukaGreskeLozinke(error.message)
    sessionStorage.removeItem(KLJUC_ZAHTEVA_LOZINKE)
    setZahtevLozinke(null)
    return null
  }

  function osveziPodesavanja() {
    setVerzijaPodesavanja((broj) => broj + 1)
  }

  async function odjavi() {
    await supabase().auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session, ucitava, jeVlasnikPlatforme, dozvoljeniRazredi, dozvoljeniPredmeti, prihvacenUslovi,
      prijaviLozinkom, posaljiMagicLink, posaljiLinkZaLozinku, potvrdiLinkIzMejla, zahtevLozinke, postaviLozinku,
      osveziPodesavanja, odjavi,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthStanje {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth mora biti unutar AuthProvider-a')
  return ctx
}

function prevodGreske(poruka: string): string {
  if (poruka.includes('Invalid login credentials')) return 'Pogrešan email ili lozinka.'
  if (poruka.includes('Email not confirmed')) return 'Email adresa još nije potvrđena.'
  if (poruka.includes('Signups not allowed'))
    return 'Ovaj email nema nalog. Nalog ti dodeljuje administrator.'
  if (poruka.includes('rate limit') || poruka.includes('rate_limit'))
    return 'Poslato je previše zahteva — sačekaj nekoliko minuta pa pokušaj ponovo.'
  return `Greška pri prijavi: ${poruka}`
}
