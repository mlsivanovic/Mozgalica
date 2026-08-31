// Upravljanje svetlom/tamnom temom. Ključ i pravila su usklađeni sa inline
// skriptom u index.html (koja postavlja temu pre prvog crtanja, bez bljeska).
export type Tema = 'svetla' | 'tamna'
export type IzborTeme = 'sistem' | Tema

const KLJUC = 'mozgalica:tema'
const TAMNA_BOJA = '#10121a'
const SVETLA_BOJA = '#4f46e5'

function sistemskaTema(): Tema {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'tamna' : 'svetla'
}

function postaviMetaBoju(t: Tema) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t === 'tamna' ? TAMNA_BOJA : SVETLA_BOJA)
}

// Trenutno primenjena tema (čita atribut koji je inline skript već postavio)
export function trenutnaTema(): Tema {
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'tamna' ? 'tamna' : 'svetla'
}

// Da li je korisnik EKSPLICITNO izabrao temu (nasuprot praćenju sistemske)
export function izborTeme(): IzborTeme {
  try {
    const v = localStorage.getItem(KLJUC)
    return v === 'svetla' || v === 'tamna' ? v : 'sistem'
  } catch {
    return 'sistem'
  }
}

export function imaEksplicitniIzbor(): boolean { return izborTeme() !== 'sistem' }

export function postaviTemu(t: Tema, zapamti = true): void {
  document.documentElement.setAttribute('data-theme', t)
  postaviMetaBoju(t)
  if (zapamti) {
    try { localStorage.setItem(KLJUC, t) } catch { /* privatni režim / puna memorija — nije kritično */ }
  }
}

export function postaviIzborTeme(izbor: IzborTeme): Tema {
  if (izbor === 'sistem') {
    try { localStorage.removeItem(KLJUC) } catch { /* privatni režim */ }
    const tema = sistemskaTema()
    postaviTemu(tema, false)
    return tema
  }
  postaviTemu(izbor)
  return izbor
}

export function preklopiTemu(): Tema {
  const nova: Tema = trenutnaTema() === 'tamna' ? 'svetla' : 'tamna'
  postaviTemu(nova)
  return nova
}

// Prati promenu sistemske teme DOK korisnik nije eksplicitno izabrao svoju.
// onPromena se poziva sa novom temom (npr. da komponenta osveži svoje stanje).
// Vraća funkciju za odjavu listenera (za useEffect cleanup).
export function pratiSistemskuTemu(onPromena?: (t: Tema) => void): () => void {
  if (!window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const naPromenu = () => {
    if (imaEksplicitniIzbor()) return
    const t = sistemskaTema()
    postaviTemu(t, false)
    onPromena?.(t)
  }
  mq.addEventListener('change', naPromenu)
  return () => mq.removeEventListener('change', naPromenu)
}
