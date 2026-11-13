/** Android omotač dečje Mozgalice. Sadržaj i dalje dolazi sa sajta. */
export const ANDROID_PAKET = 'io.github.mlsivanovic.mozgalica'

export const ANDROID_APK_URL =
  'https://github.com/mlsivanovic/Mozgalica/releases/latest/download/Mozgalica.apk'

const DECIJI_START_HASH = '#/dete/pocetak'

// Prazan hash i podrazumevana admin ruta. Android intent ponekad odbaci # deo start adrese,
// a ruta / inače vodi na administratorski panel.
const PODRAZUMEVANI_HES = new Set(['', '#', '#/', '#/admin', '/', '/admin'])

export function hashDecjeAplikacije(search: string, hashIliPutanja: string): string | null {
  const parametri = new URLSearchParams(search)
  if (parametri.get('aplikacija') !== 'dete') return null
  if (!PODRAZUMEVANI_HES.has(hashIliPutanja)) return null
  return DECIJI_START_HASH
}

export function adresaDecjeAplikacije(adresa: {
  pathname: string
  search: string
  hash: string
}): string | null {
  const hash = hashDecjeAplikacije(adresa.search, adresa.hash)
  if (!hash) return null
  return `${adresa.pathname}${adresa.search}${hash}`
}

/** Da li prikazati dugme za sideload APK. Sakriveno u samom omotaču i na iOS-u. */
export function prikaziAndroidPreuzimanje(ulaz: {
  userAgent: string
  referrer: string
  search: string
}): boolean {
  if (ulaz.referrer.startsWith(`android-app://${ANDROID_PAKET}`)) return false
  if (new URLSearchParams(ulaz.search).get('aplikacija') === 'dete') return false
  if (/iPhone|iPad|iPod/i.test(ulaz.userAgent)) return false
  // iPadOS se javlja kao Macintosh, uz oznaku Mobile.
  if (/Macintosh/i.test(ulaz.userAgent) && /Mobile/i.test(ulaz.userAgent)) return false
  return true
}
