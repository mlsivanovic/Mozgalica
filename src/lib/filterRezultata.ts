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

// Proverava da li kviz pokušaja pripada predmetu, na osnovu izvedenih kategorija
// (quiz_questions.topic_id → topics.subject). Kvizovi bez kategorije se ne podudaraju
// ni sa jednim predmetom — prikazuju se samo kad filter predmeta nije aktivan.
export function kvizImaPredmet(
  pokusaj: OsnovniPokusaj,
  kategorije: KategorijaKviza[],
  predmet: Predmet | '',
): boolean {
  if (!predmet) return true
  return kategorije.some((kategorija) => (
    kategorija.quiz_id === pokusaj.quiz_id
    && kategorija.subject === predmet
  ))
}

// Razred se čita direktno sa kviza (denormalizovana kolona `grade`), jer je
// posredni put preko topic_id nestabilan (topic_id je nullable i briše se pri
// brisanju oblasti). Kvizovi sa `grade = null` (stari, nebackfill-ovani) se ne
// podudaraju ni sa jednim razredom — prikazuju se samo pod "Svi razredi".
export function kvizImaRazred(
  quizId: string,
  razredKvizova: Map<string, Razred>,
  razred: Razred | '',
): boolean {
  if (!razred) return true
  return razredKvizova.get(quizId) === razred
}
