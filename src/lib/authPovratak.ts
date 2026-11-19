// Povratak iz Supabase Auth mejla (pozivnica, oporavak lozinke, magic link).
// Novi šabloni šalju ?token_hash=…&type=… na našu stranu #/potvrda, gde korisnik
// klikom potvrđuje ulazak (zaštita od email skenera koji unapred otvaraju linkove).
// Podržan je i stari povratak u hash-u (#access_token=… / #error=…).

export type VrstaPovratka = 'pozivnica' | 'oporavak' | 'prijava'
export type TipPotvrdeLinka = 'invite' | 'recovery' | 'email'

export interface PotvrdaLinkaPodaci {
  tokenHash: string
  tip: TipPotvrdeLinka
}

export type AuthPovratak =
  | { uspeh: true; vrsta: VrstaPovratka }
  | { uspeh: false; poruka: string }

export const KLJUC_ZAHTEVA_LOZINKE = 'mozgalica.zahtevLozinke'
export const KLJUC_GRESKE_PRIJAVE = 'mozgalica.greskaPrijave'
export const KLJUC_POTVRDE_LINKA = 'mozgalica.potvrdaLinka'

function parametri(hash: string, search: string): URLSearchParams {
  const rezultat = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  new URLSearchParams(search).forEach((vrednost, kljuc) => rezultat.set(kljuc, vrednost))
  return rezultat
}

function queryIzHashRute(hash: string): string {
  if (!hash.startsWith('#/')) return ''
  const upitnik = hash.indexOf('?')
  return upitnik === -1 ? '' : hash.slice(upitnik + 1)
}

export function normalizujTipPotvrde(tip: string | null): TipPotvrdeLinka | null {
  if (tip === 'invite') return 'invite'
  if (tip === 'recovery') return 'recovery'
  if (tip === 'email' || tip === 'magiclink' || tip === 'signup') return 'email'
  return null
}

export function vrstaZaTipPotvrde(tip: TipPotvrdeLinka): VrstaPovratka {
  if (tip === 'invite') return 'pozivnica'
  if (tip === 'recovery') return 'oporavak'
  return 'prijava'
}

export function procitajPotvrduLinka(hash: string, search: string): PotvrdaLinkaPodaci | null {
  const izHasha = new URLSearchParams(queryIzHashRute(hash))
  const izSearch = new URLSearchParams(search)
  const tokenHash = (izSearch.get('token_hash') ?? izHasha.get('token_hash') ?? '').trim()
  const tip = normalizujTipPotvrde(izSearch.get('type') ?? izHasha.get('type'))
  if (!tokenHash || !tip) return null
  return { tokenHash, tip }
}

export function sacuvajPotvrduLinka(podaci: PotvrdaLinkaPodaci, skladiste?: Storage): void {
  const ciljno = skladiste ?? (typeof sessionStorage === 'undefined' ? null : sessionStorage)
  ciljno?.setItem(KLJUC_POTVRDE_LINKA, JSON.stringify(podaci))
}

export function procitajSacuvanuPotvrduLinka(skladiste?: Storage): PotvrdaLinkaPodaci | null {
  const ciljno = skladiste ?? (typeof sessionStorage === 'undefined' ? null : sessionStorage)
  const sirovo = ciljno?.getItem(KLJUC_POTVRDE_LINKA)
  if (!sirovo) return null
  try {
    const parsirano = JSON.parse(sirovo) as { tokenHash?: unknown; tip?: unknown }
    const tokenHash = typeof parsirano.tokenHash === 'string' ? parsirano.tokenHash.trim() : ''
    const tip = typeof parsirano.tip === 'string' ? normalizujTipPotvrde(parsirano.tip) : null
    return tokenHash && tip ? { tokenHash, tip } : null
  } catch {
    return null
  }
}

export function obrisiSacuvanuPotvrduLinka(skladiste?: Storage): void {
  const ciljno = skladiste ?? (typeof sessionStorage === 'undefined' ? null : sessionStorage)
  ciljno?.removeItem(KLJUC_POTVRDE_LINKA)
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

export function jeIstekaoIliNeispravanOtp(
  kod: string | null | undefined,
  opis: string | null | undefined,
): boolean {
  return (
    kod === 'otp_expired'
    || kod === 'otp_disabled'
    || kod === 'access_denied'
    || /expired|invalid|not found|already/i.test(opis ?? '')
  )
}

export function porukaGreskePotvrde(
  kod: string | null | undefined,
  opis: string | null | undefined,
): string {
  if (kod === 'access_denied') {
    return 'Pristup nije odobren. Zatraži novi link na ekranu za prijavu.'
  }
  if (jeIstekaoIliNeispravanOtp(kod, opis)) {
    return 'Link iz mejla je istekao ili je već iskorišćen. Zatraži novi link na ekranu za prijavu.'
  }
  if (/rate limit|rate_limit/i.test(opis ?? '')) {
    return 'Previše pokušaja — sačekaj nekoliko minuta pa pokušaj ponovo.'
  }
  return 'Potvrda linka nije uspela. Proveri internet vezu i pokušaj ponovo.'
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

// Pre prvog rendera: link sa token_hash se sklanja iz URL-a i čeka klik na #/potvrda,
// greška ide na ekran za prijavu, a pozivnica/oporavak se pamte da bi admin deo tražio
// novu lozinku i posle nego što supabase-js obriše hash.
export function obradiAuthPovratak(lokacija: Location, istorija: History, skladiste: Storage): void {
  const potvrda = procitajPotvrduLinka(lokacija.hash, lokacija.search)
  if (potvrda) {
    sacuvajPotvrduLinka(potvrda, skladiste)
    istorija.replaceState(null, '', `${lokacija.pathname}#/potvrda`)
    return
  }
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
