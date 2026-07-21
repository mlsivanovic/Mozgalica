// Lokalno čuvanje odgovora tokom rešavanja + red za sinhronizaciju sa serverom.
// Svaka promena se ODMAH upisuje lokalno; sinhronizacija ide u pozadini (debounce),
// a predaja kviza je moguća tek kada server potvrdi sve odgovore.
import type { OdgovorDeteta } from '../types/db'

export interface LokalniOdgovor {
  answer: OdgovorDeteta
  changedAt: number
  synced: boolean
}

export interface StanjePokusaja {
  attemptToken: string
  childName: string
  answers: Record<string, LokalniOdgovor>
  // Saveti: opciona polja radi kompatibilnosti sa starijim sačuvanim stanjem
  // (ucitajStanje ih ne zahteva) — tekst otključanih saveta ostaje vidljiv i offline.
  hintsUsed?: number
  hintovi?: Record<string, string>
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
): StanjePokusaja {
  const stanje: StanjePokusaja = { attemptToken, childName, answers: {} }
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

export function obrisiStanje(skladiste: Skladiste, kvizToken: string): void {
  bezbedno(() => skladiste.removeItem(kljuc(kvizToken)), undefined)
}
