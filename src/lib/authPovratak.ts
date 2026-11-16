// Povratak iz Supabase Auth mejla (pozivnica, oporavak lozinke, magic link).
// Supabase vraća parametre u hash-u (#access_token=…&type=invite ili #error=…),
// a HashRouter isti hash čita kao putanju. Zato se povratak prepoznaje pre rendera.

export type VrstaPovratka = 'pozivnica' | 'oporavak' | 'prijava'

export type AuthPovratak =
  | { uspeh: true; vrsta: VrstaPovratka }
  | { uspeh: false; poruka: string }

export const KLJUC_ZAHTEVA_LOZINKE = 'mozgalica.zahtevLozinke'
export const KLJUC_GRESKE_PRIJAVE = 'mozgalica.greskaPrijave'

function parametri(hash: string, search: string): URLSearchParams {
  const rezultat = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  new URLSearchParams(search).forEach((vrednost, kljuc) => rezultat.set(kljuc, vrednost))
  return rezultat
}

export function jeAuthHash(hash: string): boolean {
  if (hash.startsWith('#/')) return false
  const p = parametri(hash, '')
  return p.has('access_token') || p.has('error') || p.has('error_code') || p.has('error_description')
}

export function procitajAuthPovratak(hash: string, search: string): AuthPovratak | null {
  const hashJeRuta = hash.startsWith('#/')
  const p = parametri(hashJeRuta ? '' : hash, search)
  if (p.has('error') || p.has('error_code') || p.has('error_description')) {
    return { uspeh: false, poruka: porukaGreskePovratka(p.get('error_code'), p.get('error_description')) }
  }
  if (hashJeRuta || !p.has('access_token')) return null
  const tip = p.get('type')
  const vrsta: VrstaPovratka = tip === 'invite' ? 'pozivnica' : tip === 'recovery' ? 'oporavak' : 'prijava'
  return { uspeh: true, vrsta }
}

export function porukaGreskePovratka(kod: string | null, opis: string | null): string {
  if (kod === 'otp_expired' || /expired|invalid/i.test(opis ?? '')) {
    return 'Link iz mejla je istekao ili je već iskorišćen. Zatraži novi link ispod.'
  }
  if (kod === 'access_denied') return 'Pristup nije odobren. Zatraži novi link ispod.'
  return 'Prijava preko linka nije uspela. Zatraži novi link ispod.'
}

export function porukaGreskeLozinke(poruka: string): string {
  if (/should be different|same_password/i.test(poruka)) return 'Nova lozinka mora da se razlikuje od stare.'
  if (/at least|weak|short|characters/i.test(poruka)) return 'Lozinka je preslaba. Koristi bar 8 znakova, slova i brojeve.'
  if (/reauthenticat/i.test(poruka)) {
    return 'Iz bezbednosnih razloga se odjavi, pa iskoristi „Zaboravljena lozinka“ na ekranu za prijavu.'
  }
  if (/rate limit|rate_limit/i.test(poruka)) return 'Previše pokušaja — sačekaj nekoliko minuta.'
  if (/session|jwt|not authenticated/i.test(poruka)) return 'Prijava je istekla. Prijavi se ponovo.'
  return `Lozinka nije sačuvana: ${poruka}`
}

export const MIN_DUZINA_LOZINKE = 8

export function proveriNovuLozinku(lozinka: string, ponovo: string): string | null {
  if (lozinka.length < MIN_DUZINA_LOZINKE) return `Lozinka mora da ima bar ${MIN_DUZINA_LOZINKE} znakova.`
  if (!/\p{L}/u.test(lozinka) || !/\d/.test(lozinka)) return 'Lozinka mora da sadrži bar jedno slovo i jedan broj.'
  if (lozinka !== ponovo) return 'Lozinke se ne poklapaju.'
  return null
}

// Pre prvog rendera: greška ide na ekran za prijavu, a pozivnica/oporavak se pamte da
// bi admin deo tražio novu lozinku i posle nego što supabase-js obriše hash.
export function obradiAuthPovratak(lokacija: Location, istorija: History, skladiste: Storage): void {
  const povratak = procitajAuthPovratak(lokacija.hash, lokacija.search)
  if (!povratak) return
  if (!povratak.uspeh) {
    skladiste.setItem(KLJUC_GRESKE_PRIJAVE, povratak.poruka)
    istorija.replaceState(null, '', `${lokacija.pathname}#/prijava`)
    return
  }
  if (povratak.vrsta !== 'prijava') skladiste.setItem(KLJUC_ZAHTEVA_LOZINKE, povratak.vrsta)
}

export function uzmiGreskuPrijave(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  const poruka = sessionStorage.getItem(KLJUC_GRESKE_PRIJAVE)
  sessionStorage.removeItem(KLJUC_GRESKE_PRIJAVE)
  return poruka
}

export function procitajZahtevLozinke(): Exclude<VrstaPovratka, 'prijava'> | null {
  if (typeof sessionStorage === 'undefined') return null
  const vrednost = sessionStorage.getItem(KLJUC_ZAHTEVA_LOZINKE)
  return vrednost === 'pozivnica' || vrednost === 'oporavak' ? vrednost : null
}
