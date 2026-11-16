// Kontekst prijave administratora (Supabase Auth sesija)
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { backendPodesen, supabase } from './supabase'
import { ucitajPodesavanja } from './api'

interface AuthStanje {
  session: Session | null
  ucitava: boolean
  jeVlasnikPlatforme: boolean
  // null dok se podešavanja učitavaju; false znači da uslovi nisu prihvaćeni (ili se ne može proveriti)
  prihvacenUslovi: boolean | null
  prijaviLozinkom(email: string, lozinka: string): Promise<string | null>
  posaljiMagicLink(email: string): Promise<string | null>
  osveziPodesavanja(): void
  odjavi(): Promise<void>
}

interface PodesavanjaPrijavljenog {
  userId: string
  vlasnik: boolean
  uslovi: boolean
}

const AuthContext = createContext<AuthStanje | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ucitava, setUcitava] = useState(backendPodesen)
  const [podesavanja, setPodesavanja] = useState<PodesavanjaPrijavljenog | null>(null)
  const [verzijaPodesavanja, setVerzijaPodesavanja] = useState(0)
  const userId = session?.user.id ?? null
  const trenutna = userId !== null && podesavanja?.userId === userId ? podesavanja : null
  const jeVlasnikPlatforme = trenutna?.vlasnik ?? false
  const prihvacenUslovi = trenutna ? trenutna.uslovi : null

  useEffect(() => {
    if (!backendPodesen) return
    supabase()
      .auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setUcitava(false))
    const { data: pretplata } = supabase().auth.onAuthStateChange((_dogadjaj, novaSesija) => {
      setSession(novaSesija)
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
        setPodesavanja({
          userId,
          vlasnik: Boolean(red?.is_platform_owner),
          uslovi: red ? red.terms_accepted_at !== null : false,
        })
      })
      .catch(() => { if (aktivno) setPodesavanja({ userId, vlasnik: false, uslovi: false }) })
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

  function osveziPodesavanja() {
    setVerzijaPodesavanja((broj) => broj + 1)
  }

  async function odjavi() {
    await supabase().auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session, ucitava, jeVlasnikPlatforme, prihvacenUslovi,
      prijaviLozinkom, posaljiMagicLink, osveziPodesavanja, odjavi,
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
