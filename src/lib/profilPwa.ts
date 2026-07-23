const KLJUC_POVEZANOG_PROFILA = 'mozgalica:dete-profil'
const KLJUC_PROFILA_ZA_INSTALACIJU = 'mozgalica:dete-profil-za-instalaciju'
const PROFILNI_TOKEN = /^[A-Za-z0-9_-]{20,200}$/

function procitajToken(kljuc: string): string | null {
  try {
    const token = window.localStorage.getItem(kljuc)
    if (token && PROFILNI_TOKEN.test(token)) return token
    if (token) window.localStorage.removeItem(kljuc)
  } catch {
    // Privatni režim može da zabrani localStorage; profil se tada unosi pri svakom startu.
  }
  return null
}

function sacuvajToken(kljuc: string, token: string): void {
  if (!PROFILNI_TOKEN.test(token)) return
  try {
    window.localStorage.setItem(kljuc, token)
  } catch {
    // Aplikacija i dalje radi preko profilnog linka kada čuvanje nije dozvoljeno.
  }
}

function obrisiToken(kljuc: string): void {
  try {
    window.localStorage.removeItem(kljuc)
  } catch {
    // Nema dodatne radnje ako skladište nije dostupno.
  }
}

export function izdvojiProfilniToken(vrednost: string): string | null {
  const cistaVrednost = vrednost.trim()
  if (PROFILNI_TOKEN.test(cistaVrednost)) return cistaVrednost

  const izLinka = cistaVrednost.match(
    /(?:#\/|\/)dete\/([A-Za-z0-9_-]{20,200})(?:[/?#]|$)/,
  )?.[1]
  return izLinka && PROFILNI_TOKEN.test(izLinka) ? izLinka : null
}

export function ucitajPovezaniProfil(): string | null {
  return procitajToken(KLJUC_POVEZANOG_PROFILA)
}

export function ucitajProfilZaInstalaciju(): string | null {
  return procitajToken(KLJUC_PROFILA_ZA_INSTALACIJU)
}

export function zapamtiProfilZaInstalaciju(token: string): void {
  sacuvajToken(KLJUC_PROFILA_ZA_INSTALACIJU, token)
}

export function poveziProfilSaPwa(token: string): void {
  sacuvajToken(KLJUC_POVEZANOG_PROFILA, token)
  obrisiToken(KLJUC_PROFILA_ZA_INSTALACIJU)
}

export function zaboraviPovezaniProfil(): void {
  obrisiToken(KLJUC_POVEZANOG_PROFILA)
}

export function zaboraviProfilZaInstalaciju(): void {
  obrisiToken(KLJUC_PROFILA_ZA_INSTALACIJU)
}

export function jeSamostalnaPwa(): boolean {
  const navigatorSaStandalone = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || navigatorSaStandalone.standalone === true
}
