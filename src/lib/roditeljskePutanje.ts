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
    || putanja === '/admin/deca' || putanja === '/admin/podesavanja'
}
export function uredjivanjeAktivnosti(putanja: string): boolean {
  return putanja.startsWith('/admin/zadaj') || putanja.startsWith('/admin/kvizovi/')
}
export function glavnaSekcija(putanja: string): string {
  if (putanja === '/admin/podesavanja' || putanja === '/admin/deca') return ''
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
