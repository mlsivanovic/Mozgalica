// Kontekst prijave administratora (Supabase Auth sesija)
import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { backendPodesen, supabase } from './supabase'
import { ucitajPodesavanja } from './api'

interface AuthStanje {
  session: Session | null
  ucitava: boolean
  jeVlasnikPlatforme: boolean
  prijaviLozinkom(email: string, lozinka: string): Promise<string | null>
  posaljiMagicLink(email: string): Promise<string | null>
  odjavi(): Promise<void>
}

const AuthContext = createContext<AuthStanje | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ucitava, setUcitava] = useState(backendPodesen)
  const [vlasnikId, setVlasnikId] = useState<string | null>(null)
  const userId = session?.user.id ?? null
  const jeVlasnikPlatforme = userId !== null && vlasnikId === userId

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

  // Vlasništvo se čita iz sopstvenog admin_settings reda. Pamti se uz korisnika
  // da stari odgovor ne važi posle promene naloga.
  useEffect(() => {
    if (!userId) return
    let aktivno = true
    ucitajPodesavanja()
      .then((podesavanja) => { if (aktivno) setVlasnikId(podesavanja?.is_platform_owner ? userId : null) })
      .catch(() => { if (aktivno) setVlasnikId(null) })
    return () => { aktivno = false }
  }, [userId])

  async function prijaviLozinkom(email: string, lozinka: string): Promise<string | null> {
    const { error } = await supabase().auth.signInWithPassword({ email, password: lozinka })
    return error ? prevodGreske(error.message) : null
  }

  async function posaljiMagicLink(email: string): Promise<string | null> {
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    return error ? prevodGreske(error.message) : null
  }

  async function odjavi() {
    await supabase().auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, ucitava, jeVlasnikPlatforme, prijaviLozinkom, posaljiMagicLink, odjavi }}>
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
  if (poruka.includes('rate limit') || poruka.includes('rate_limit'))
    return 'Poslato je previše zahteva — sačekaj nekoliko minuta pa pokušaj ponovo.'
  return `Greška pri prijavi: ${poruka}`
}
