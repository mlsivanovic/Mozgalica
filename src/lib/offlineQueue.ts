// Lokalno čuvanje odgovora tokom rešavanja + red za sinhronizaciju sa serverom.
// Svaka promena se ODMAH upisuje lokalno; sinhronizacija ide u pozadini (debounce),
// a predaja kviza je moguća tek kada server potvrdi sve odgovore.
import type { OdgovorDeteta } from '../types/db'

export interface LokalniOdgovor {
  answer: OdgovorDeteta
  changedAt: number
  synced: boolean
}

// Radni listić: tekst koji dete piše uz jedno pitanje (računanje, međukoraci)
export interface LokalnaBelezka {
  tekst: string
  changedAt: number
  synced: boolean
}

export interface StanjePokusaja {
  attemptToken: string
  childName: string
  answers: Record<string, LokalniOdgovor>
  accessMode?: 'generic' | 'profile'
  profileToken?: string
  // Saveti: opciona polja radi kompatibilnosti sa starijim sačuvanim stanjem
  // (ucitajStanje ih ne zahteva) — tekst otključanih saveta ostaje vidljiv i offline.
  hintsUsed?: number
  hintovi?: Record<string, string>
  // Beležke po pitanju — opciono da staro sačuvano stanje ostane čitljivo
  belezke?: Record<string, LokalnaBelezka>
}

// Apstrakcija skladišta radi testiranja (u testovima Map umesto localStorage)
export interface Skladiste {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function kljuc(kvizToken: string): string {
  return `mozgalica:pokusaj:${kvizToken}`
}

// localStorage ume da baci izuzetak (privatni režim, puna memorija) — ne sme srušiti kviz
function bezbedno<T>(fn: () => T, podrazumevano: T): T {
  try {
    return fn()
  } catch {
    return podrazumevano
  }
}

export function ucitajStanje(skladiste: Skladiste, kvizToken: string): StanjePokusaja | null {
  return bezbedno(() => {
    const sirovo = skladiste.getItem(kljuc(kvizToken))
    if (!sirovo) return null
    const stanje = JSON.parse(sirovo) as StanjePokusaja
    if (!stanje.attemptToken || typeof stanje.answers !== 'object') return null
    return stanje
  }, null)
}

export function sacuvajStanje(skladiste: Skladiste, kvizToken: string, stanje: StanjePokusaja): void {
  bezbedno(() => skladiste.setItem(kljuc(kvizToken), JSON.stringify(stanje)), undefined)
}

export function zapocniStanje(
  skladiste: Skladiste,
  kvizToken: string,
  attemptToken: string,
  childName: string,
  dodatno?: Pick<StanjePokusaja, 'accessMode' | 'profileToken'>,
): StanjePokusaja {
  const stanje: StanjePokusaja = { attemptToken, childName, answers: {}, ...dodatno }
  sacuvajStanje(skladiste, kvizToken, stanje)
  return stanje
}

// Upiši odgovor lokalno i označi ga kao nesinhronizovan
export function upisiOdgovor(
  skladiste: Skladiste,
  kvizToken: string,
  stanje: StanjePokusaja,
  questionId: string,
  answer: OdgovorDeteta,
): StanjePokusaja {
  const novo: StanjePokusaja = {
    ...stanje,
    answers: {
      ...stanje.answers,
      [questionId]: { answer, changedAt: Date.now(), synced: false },
    },
  }
  sacuvajStanje(skladiste, kvizToken, novo)
  return novo
}

// Upiši otključan savet lokalno (preživljava refresh i ostaje vidljiv offline)
export function upisiHint(
  skladiste: Skladiste,
  kvizToken: string,
  stanje: StanjePokusaja,
  questionId: string,
  hint: string,
  hintsUsed: number,
): StanjePokusaja {
  const novo: StanjePokusaja = {
    ...stanje,
    hintsUsed,
    hintovi: { ...(stanje.hintovi ?? {}), [questionId]: hint },
  }
  sacuvajStanje(skladiste, kvizToken, novo)
  return novo
}

// Odgovori koji čekaju potvrdu servera
export function nesinhronizovani(stanje: StanjePokusaja): Record<string, OdgovorDeteta> {
  const rezultat: Record<string, OdgovorDeteta> = {}
  for (const [id, odgovor] of Object.entries(stanje.answers)) {
    if (!odgovor.synced) rezultat[id] = odgovor.answer
  }
  return rezultat
}

// Posle uspešnog save_answers označi poslate odgovore kao sinhronizovane,
// ali SAMO ako se u međuvremenu nisu ponovo promenili
export function oznaciSinhronizovane(
  skladiste: Skladiste,
  kvizToken: string,
  stanje: StanjePokusaja,
  poslati: Record<string, OdgovorDeteta>,
  vremePoslato: number,
): StanjePokusaja {
  const answers = { ...stanje.answers }
  for (const id of Object.keys(poslati)) {
    const trenutni = answers[id]
    if (trenutni && trenutni.changedAt <= vremePoslato) {
      answers[id] = { ...trenutni, synced: true }
    }
  }
  const novo = { ...stanje, answers }
  sacuvajStanje(skladiste, kvizToken, novo)
  return novo
}

export function sveSinhronizovano(stanje: StanjePokusaja): boolean {
  return Object.values(stanje.answers).every((o) => o.synced)
}

// ---- Radni listić (beležke uz pitanje) ----

// Upiši beležku lokalno i označi je kao nesinhronizovanu
export function upisiBelezku(
  skladiste: Skladiste,
  kvizToken: string,
  stanje: StanjePokusaja,
  questionId: string,
  tekst: string,
): StanjePokusaja {
  const novo: StanjePokusaja = {
    ...stanje,
    belezke: {
      ...(stanje.belezke ?? {}),
      [questionId]: { tekst, changedAt: Date.now(), synced: false },
    },
  }
  sacuvajStanje(skladiste, kvizToken, novo)
  return novo
}

// Cela mapa beležaka čeka slanje kada se bar jedna promenila; RPC upisuje mapu
// kao celinu pa se šalju i već sinhronizovane beležke.
export function belezkeZaSinhronizaciju(stanje: StanjePokusaja): Record<string, string> | null {
  const sve = Object.entries(stanje.belezke ?? {})
  if (!sve.some(([, b]) => !b.synced)) return null
  return Object.fromEntries(sve.map(([id, b]) => [id, b.tekst]))
}

export function oznaciBelezkeSinhronizovane(
  skladiste: Skladiste,
  kvizToken: string,
  stanje: StanjePokusaja,
  vremePoslato: number,
): StanjePokusaja {
  const belezke = { ...(stanje.belezke ?? {}) }
  for (const [id, b] of Object.entries(belezke)) {
    if (b.changedAt <= vremePoslato) belezke[id] = { ...b, synced: true }
  }
  const novo = { ...stanje, belezke }
  sacuvajStanje(skladiste, kvizToken, novo)
  return novo
}

export function brojNesinhronizovanihBelezki(stanje: StanjePokusaja): number {
  return Object.values(stanje.belezke ?? {}).filter((b) => !b.synced).length
}

export function obrisiStanje(skladiste: Skladiste, kvizToken: string): void {
  bezbedno(() => skladiste.removeItem(kljuc(kvizToken)), undefined)
}
