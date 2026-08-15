// Ponovni pokušaj netačnih zadataka: generisanje novih verzija zadataka sa
// različitim brojevima (ista oblast i težina kao original) + lokalno čuvanje
// odgovora ponovnog pokušaja između osvežavanja stranice.
//
// Tačni odgovori novih pitanja generišu se u browseru (isto kao u admin toku),
// ali o ispravnosti i dalje odlučuje isključivo server — submit_retry ocenjuje
// preko fn_grade_answer nad upisanim snapshot redovima.
import { REGISTAR, regenerisiJedno } from '../generator/index.ts'
import type { GenerisanoPitanje } from '../generator/types.ts'
import type { OdgovorDeteta, TacanOdgovor, Tezina, TipPitanja } from '../types/db.ts'
import type { PonovnoPitanjeUnos, RezultatPitanja } from '../types/kviz.ts'
import type { Skladiste } from './offlineQueue.ts'

// Koliko puta tražimo regeneraciju da bismo dobili zadatak sa različitim
// brojevima od originala (potpis originala nije sačuvan u snapshot-u pa se
// različitost procenjuje poređenjem teksta)
const MAX_POKUSAJA_ISTOVETAN = 5

// Snapshot ne čuva podešavanje wordProblems iz vremena generisanja — dužina
// teksta je dovoljno pouzdana heuristika za razlikovanje priče od golog izraza
function izgledaKaoTekstualniZadatak(tekst: string): boolean {
  return tekst.trim().split(/\s+/).length >= 6
}

function tezinaOdPoena(points: number): Tezina {
  return Math.min(5, Math.max(1, Math.round(points))) as Tezina
}

function slucajniSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

function regenerisiNovuVerziju(
  original: RezultatPitanja,
  noviSeed: () => number,
): GenerisanoPitanje | null {
  const slug = original.topicSlug
  const modul = slug ? REGISTAR.get(slug) : undefined
  if (!slug || !modul) return null

  const cfg = {
    topicSlug: slug,
    difficulty: tezinaOdPoena(original.points),
    count: 1,
    type: (modul.supportedTypes as TipPitanja[]).includes(original.type)
      ? original.type
      : ('auto' as const),
    wordProblems: modul.supportsWordProblems && izgledaKaoTekstualniZadatak(original.text),
    allowRepeats: false,
  }

  let poslednji: GenerisanoPitanje | null = null
  for (let i = 0; i < MAX_POKUSAJA_ISTOVETAN; i++) {
    const pitanje = regenerisiJedno({ ...cfg, seed: noviSeed() }, new Set())
    if (!pitanje) break
    if (pitanje.text !== original.text) return pitanje
    poslednji = pitanje
  }
  return poslednji
}

// Za svaki netačan zadatak pravi novu verziju sa različitim brojevima; ako
// oblast nema generatorski modul (obrisana oblast, ručno pisano pitanje) ili
// regeneracija ne uspe, dete rešava originalni zadatak kakav je bio.
export function generisiPonovne(
  netacni: RezultatPitanja[],
  noviSeed: () => number = slucajniSeed,
): PonovnoPitanjeUnos[] {
  return netacni.map((original) => {
    const novo = regenerisiNovuVerziju(original, noviSeed)
    if (novo) {
      return {
        sourceId: original.id,
        type: novo.type,
        text: novo.text,
        options: novo.options,
        correct: novo.correct,
        explanation: novo.explanation,
        points: novo.points,
      }
    }

    const tacan = original.correct as TacanOdgovor | undefined
    if (!tacan) {
      // Nedostižno u normalnom toku (retry se nudi samo uz show_correct), ali
      // radi odbrane tipova: bez tačnog odgovora fallback ne može na server.
      throw new Error('Tačan odgovor nije dostupan za ponovni pokušaj.')
    }
    return {
      sourceId: original.id,
      type: original.type,
      text: original.text,
      options: original.options,
      correct: tacan,
      explanation: original.explanation ?? null,
      points: original.points,
    }
  })
}

// ---------- Lokalno čuvanje odgovora ponovnog pokušaja ----------
// Odgovori se ne autosave-uju na server (predaja je jedan poziv), ali moraju
// preživeti osvežavanje stranice — obrazac iz offlineQueue.ts.

function kljuc(kvizToken: string): string {
  return `mozgalica:ponovni:${kvizToken}`
}

function bezbedno<T>(fn: () => T, podrazumevano: T): T {
  try {
    return fn()
  } catch {
    return podrazumevano
  }
}

export function ucitajPonovneOdgovore(
  skladiste: Skladiste,
  kvizToken: string,
): Record<string, OdgovorDeteta> {
  return bezbedno(() => {
    const sirovo = skladiste.getItem(kljuc(kvizToken))
    if (!sirovo) return {}
    const odgovori = JSON.parse(sirovo) as Record<string, OdgovorDeteta>
    return odgovori && typeof odgovori === 'object' ? odgovori : {}
  }, {})
}

export function sacuvajPonovneOdgovore(
  skladiste: Skladiste,
  kvizToken: string,
  odgovori: Record<string, OdgovorDeteta>,
): void {
  bezbedno(() => skladiste.setItem(kljuc(kvizToken), JSON.stringify(odgovori)), undefined)
}

export function obrisiPonovneOdgovore(skladiste: Skladiste, kvizToken: string): void {
  bezbedno(() => skladiste.removeItem(kljuc(kvizToken)), undefined)
}
