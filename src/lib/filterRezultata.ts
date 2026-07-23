import type { KategorijaKviza } from './api'
import type { Pokusaj, Predmet, ProfilDeteta, Razred } from '../types/db'

type OsnovniPokusaj = Pick<Pokusaj, 'child_profile_id' | 'child_name' | 'quiz_id'>
type OsnovniProfil = Pick<ProfilDeteta, 'id' | 'name'>

export function pokusajPripadaProfilu(
  pokusaj: OsnovniPokusaj,
  profil: OsnovniProfil | undefined,
): boolean {
  if (!profil) return true
  if (pokusaj.child_profile_id) return pokusaj.child_profile_id === profil.id
  return pokusaj.child_name.localeCompare(profil.name, 'sr', { sensitivity: 'base' }) === 0
}

export function kvizPripadaKategoriji(
  pokusaj: OsnovniPokusaj,
  kategorije: KategorijaKviza[],
  predmet: Predmet | '',
  razred: Razred | '',
): boolean {
  if (!predmet && !razred) return true
  return kategorije.some((kategorija) => (
    kategorija.quiz_id === pokusaj.quiz_id
    && (!predmet || kategorija.subject === predmet)
    && (!razred || kategorija.grade === razred)
  ))
}
