export function saDetetom(putanja: string, dete: string): string {
  if (!putanja.startsWith('/admin')) return putanja
  const [osnova, upit = ''] = putanja.split('?')
  const parametri = new URLSearchParams(upit)
  if (!parametri.has('dete') && dete) parametri.set('dete', dete)
  const pretraga = parametri.toString()
  return osnova + (pretraga ? `?${pretraga}` : '')
}
export function zajednickaStranica(putanja: string): boolean {
  return putanja.includes('/pitanja') || putanja.includes('/generator')
    || putanja.includes('/katalog') || putanja.includes('/pravila')
    || putanja === '/admin/deca' || putanja === '/admin/podesavanja' || putanja === '/admin/roditelji'
}
export function uredjivanjeAktivnosti(putanja: string): boolean {
  return putanja.startsWith('/admin/zadaj') || putanja.startsWith('/admin/kvizovi/')
}
export function glavnaSekcija(putanja: string): string {
  if (putanja === '/admin/podesavanja' || putanja === '/admin/deca' || putanja === '/admin/roditelji') return 'podesavanja'
  if (/\/(napredak|rezultati|statistika-dece)/.test(putanja)) return 'napredak'
  if (putanja.includes('/nagrade')) return 'nagrade'
  if (/\/(vezbanje|kvizovi|pitanja|generator|sah|zadaj)/.test(putanja)) return 'vezbanje'
  return 'danas'
}

export function sacuvajKontekstPutanje(to: string, dete: string, trenutna: string, search: string): string {
  const rezultat = saDetetom(to, dete)
  const napredak = /\/(napredak|rezultati)/
  const kljucevi = napredak.test(to) && napredak.test(trenutna)
    ? ['period', 'od', 'do', 'predmet', 'razred', 'status', 'vrsta']
    : to.startsWith('/admin/kvizovi') && trenutna.startsWith('/admin/kvizovi') ? ['prikaz'] : []
  const [osnova, upit] = rezultat.split('?')
  const novi = new URLSearchParams(upit)
  const stari = new URLSearchParams(search)
  for (const key of kljucevi) if (!novi.has(key) && stari.has(key)) novi.set(key, stari.get(key)!)
  return osnova + (novi.size ? `?${novi}` : '')
}

const KORENSKE = new Set([
  '/admin', '/admin/vezbanje', '/admin/vezbanje/rasporedi', '/admin/sah', '/admin/pitanja', '/admin/pitanja/generator',
  '/admin/napredak', '/admin/napredak/rezultati',
  '/admin/nagrade', '/admin/nagrade/istorija', '/admin/nagrade/katalog', '/admin/nagrade/pravila',
])

// Korenske strane su odredišta donje navigacije i njihovi tabovi; sve ostalo dobija dugme „nazad”.
export function korenskaStrana(putanja: string, search = ''): boolean {
  if (new URLSearchParams(search).has('raspored')) return false
  return KORENSKE.has(putanja.replace(/\/$/, '') || '/admin')
}

const NASLOVI_SEKCIJA: Record<string, string> = {
  danas: 'Danas', vezbanje: 'Zadaci', napredak: 'Napredak', nagrade: 'Nagrade',
}

export function naslovStrane(putanja: string, search = ''): string {
  if (putanja === '/admin/zadaj') return 'Zadaj aktivnost'
  if (putanja === '/admin/kvizovi') return 'Arhiva kvizova'
  if (/^\/admin\/kvizovi\/[^/]+$/.test(putanja)) return 'Kviz'
  if (/^\/admin\/rezultati\/[^/]+$/.test(putanja)) return 'Rezultat'
  if (putanja === '/admin/raspored-casova') return 'Raspored časova'
  if (putanja === '/admin/deca') return 'Deca'
  if (putanja === '/admin/podesavanja') return 'Podešavanja'
  if (putanja === '/admin/roditelji') return 'Roditelji'
  const raspored = new URLSearchParams(search).get('raspored')
  if (putanja === '/admin/vezbanje/rasporedi' && raspored) return raspored === 'novi' ? 'Novi raspored' : 'Uredi raspored'
  return NASLOVI_SEKCIJA[glavnaSekcija(putanja)] ?? 'Mozgalica'
}

// Kuda vodi „nazad” kada istorija pregledača nema prethodnu stranu (npr. otvoren link iz obaveštenja).
export function roditeljNazad(putanja: string, search = ''): string {
  if (putanja === '/admin/vezbanje/rasporedi' && new URLSearchParams(search).has('raspored')) return '/admin/vezbanje/rasporedi'
  if (/^\/admin\/rezultati\//.test(putanja)) return '/admin/napredak/rezultati'
  if (/^\/admin\/(zadaj|kvizovi|sah)/.test(putanja)) return '/admin/vezbanje'
  if (putanja === '/admin/roditelji') return '/admin/podesavanja'
  return '/admin'
}
