// Čista logika za nalog roditelja: poziv novog roditelja, brisanje naloga i
// prihvatanje uslova. Poruke su na srpskom; kodovi dolaze iz Edge funkcija i SQL-a.
import { NAZIVI_PREDMETA, PREDMETI, RAZREDI, type Predmet, type Razred } from '../types/db'
import { emailJeIspravan, normalizujEmail } from './email'
import { kombinacijaPristupaJeIspravna, normalizujPredmete, normalizujRazrede } from './predmet'

export type StatusPoziva = 'pozivnica_poslata' | 'vec_postoji'

export function porukaZaStatusPoziva(status: StatusPoziva): string {
  if (status === 'pozivnica_poslata') {
    return 'Pozivnica je poslata. Roditelj dobija mejl za prvi ulazak u aplikaciju.'
  }
  return 'Nalog za ovu adresu već postoji. Dodeljena su administratorska prava, bez novog mejla.'
}

export function porukaZaGreskuPoziva(kod: string | null | undefined): string {
  switch (kod) {
    case 'invalid_email': return 'Unesi ispravnu email adresu.'
    case 'invalid_access': return 'Izaberi bar jedan razred i najmanje jedan važeći predmet za taj razred.'
    case 'owner_self': return 'Pristup vlasnika platforme se ne može ograničiti.'
    case 'forbidden': return 'Samo vlasnik platforme može da poziva roditelje.'
    case 'unauthorized': return 'Prijava je istekla. Prijavi se ponovo.'
    case 'invite_failed': return 'Pozivnica nije poslata. Pokušaj ponovo za nekoliko minuta.'
    default: return 'Poziv nije uspeo. Pokušaj ponovo.'
  }
}

export function validirajNivoPristupa(
  razredi: readonly Razred[],
  predmeti: readonly Predmet[],
): string | null {
  if (razredi.length === 0) return 'Izaberi bar jedan razred.'
  if (predmeti.length === 0) return 'Izaberi bar jedan predmet.'
  if (!kombinacijaPristupaJeIspravna(razredi, predmeti)) {
    return 'Izabrana kombinacija nema nijedan važeći predmet (Priroda i društvo postoji samo za 3. i 4. razred).'
  }
  return null
}

export function opisNivoaPristupa(
  razredi: readonly Razred[],
  predmeti: readonly Predmet[],
): string {
  const uredjeniRazredi = normalizujRazrede(razredi)
  const uredjeniPredmeti = normalizujPredmete(predmeti)
  const sviRazredi = uredjeniRazredi.length === RAZREDI.length
  const sviPredmeti = uredjeniPredmeti.length === PREDMETI.length
  const tekstRazreda = sviRazredi
    ? 'Svi razredi'
    : `${uredjeniRazredi.map((r) => `${r}.`).join(', ')} razred`
  const tekstPredmeta = sviPredmeti
    ? 'Svi predmeti'
    : uredjeniPredmeti.map((p) => NAZIVI_PREDMETA[p]).join(', ')
  return `${tekstRazreda} · ${tekstPredmeta}`
}

export function porukaZaGreskuBrisanja(kod: string | null | undefined): string {
  switch (kod) {
    case 'platform_owner': return 'Vlasnik platforme ne može da obriše nalog jer su njegova pitanja zajednička banka.'
    case 'shared_dependency': return 'Nalog se ne može obrisati jer neka od njegovih stavki koristi tuđi kviz. Javi se podršci.'
    case 'potvrda_nije_ispravna': return 'Ukucana email adresa se ne poklapa sa adresom naloga.'
    case 'unauthorized': return 'Prijava je istekla. Prijavi se ponovo.'
    case 'auth_delete_failed': return 'Podaci su obrisani, ali nalog nije. Javi se podršci da ga uklonimo.'
    default: return 'Nalog nije obrisan. Pokušaj ponovo.'
  }
}

// Potvrda brisanja: ukucana adresa mora da se poklapa sa adresom naloga (bez obzira na velika slova).
export function potvrdaBrisanjaJeIspravna(unos: string, emailNaloga: string | null | undefined): boolean {
  if (!emailNaloga || !unos.trim()) return false
  return normalizujEmail(unos) === normalizujEmail(emailNaloga)
}

export function pozivniEmailJeIspravan(vrednost: string): boolean {
  return emailJeIspravan(normalizujEmail(vrednost))
}

// Poruka koja se prikazuje na ekranu za prijavu posle brisanja naloga.
export const KLJUC_PORUKE_POSLE_BRISANJA = 'mozgalica.porukaPosleBrisanja'

export function uzmiPorukuPosleBrisanja(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  const poruka = sessionStorage.getItem(KLJUC_PORUKE_POSLE_BRISANJA)
  sessionStorage.removeItem(KLJUC_PORUKE_POSLE_BRISANJA)
  return poruka
}
