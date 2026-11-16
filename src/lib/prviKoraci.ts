// Stavke kartice „Prvi koraci“ na kontrolnoj tabli. Stanje dolazi iz postojećih
// podataka (deca, rasporedi, dodeljeni kvizovi, push status). Jedino korak sa linkom
// nema svoj podatak u bazi: gotovo je kad dete ima rezultat ili kad roditelj označi
// da je link poslat (lokalno, na ovom uređaju).

export interface StanjePrvihKoraka {
  brojDece: number
  imaDnevniRaspored: boolean
  imaDodeljenKviz: boolean
  pushUkljucen: boolean
  imaRezultatDeteta: boolean
  linkOznacenPoslat: boolean
}

export interface StavkaPrvihKoraka {
  id: 'dete' | 'link' | 'vezba' | 'push'
  naslov: string
  gotovo: boolean
  putanja: string
}

export function stavkePrvihKoraka(stanje: StanjePrvihKoraka): StavkaPrvihKoraka[] {
  return [
    {
      id: 'dete',
      naslov: 'Dodaj prvo dete',
      gotovo: stanje.brojDece > 0,
      putanja: '/admin/deca',
    },
    {
      id: 'link',
      naslov: 'Pošalji detetu link ili QR profila',
      gotovo: stanje.imaRezultatDeteta || stanje.linkOznacenPoslat,
      putanja: '/admin/deca',
    },
    {
      id: 'vezba',
      naslov: 'Podesi dnevni raspored vežbe ili zadaj prvi kviz',
      gotovo: stanje.imaDnevniRaspored || stanje.imaDodeljenKviz,
      putanja: '/admin/zadaj',
    },
    {
      id: 'push',
      naslov: 'Uključi push obaveštenja na svom uređaju',
      gotovo: stanje.pushUkljucen,
      putanja: '/admin/podesavanja',
    },
  ]
}

export function prviKorakiZavrseni(stavke: StavkaPrvihKoraka[]): boolean {
  return stavke.every((stavka) => stavka.gotovo)
}

// Kartica se sakriva ručno (localStorage) ili kad su svi koraci gotovi.
export const KLJUC_SAKRIVANJA_PRVIH_KORAKA = 'mozgalica.prviKoraci.sakriveno'
export const KLJUC_LINK_POSLAT = 'mozgalica.prviKoraci.linkPoslat'
