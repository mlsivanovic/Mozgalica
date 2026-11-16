// Čista logika za nalog roditelja: poziv novog roditelja, brisanje naloga i
// prihvatanje uslova. Poruke su na srpskom; kodovi dolaze iz Edge funkcija i SQL-a.
import { emailJeIspravan, normalizujEmail } from './email'

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
    case 'forbidden': return 'Samo vlasnik platforme može da poziva roditelje.'
    case 'unauthorized': return 'Prijava je istekla. Prijavi se ponovo.'
    case 'invite_failed': return 'Pozivnica nije poslata. Pokušaj ponovo za nekoliko minuta.'
    default: return 'Poziv nije uspeo. Pokušaj ponovo.'
  }
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
