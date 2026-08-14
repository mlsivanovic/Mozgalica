// Zajedničko pakovanje pitanja iz srpskog jezika: odgovor se ukucava (text)
// ili se tvrdi tačno/netačno. Srpski moduli nemaju težinu — sva pitanja idu
// na najvišem nivou, pa je cfg.difficulty za njih nevažan.
import type { Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje } from '../types.ts'

const NIVO = 5
const POENI = 5

// Približno ono što radi SQL fn_normalize_text — koristi se samo za dedup
// liste prihvaćenih odgovora (velika/mala slova, dijakritici, višak razmaka).
function normalizuj(tekst: string): string {
  return tekst
    .toLowerCase()
    .replaceAll('đ', 'd').replaceAll('č', 'c').replaceAll('ć', 'c')
    .replaceAll('š', 's').replaceAll('ž', 'z')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SrpskiTekstUlaz {
  pitanje: string
  tacan: string
  // Alternativni ispravni oblici (padeži, kraći odgovori…); SQL ocenjivanje
  // i tako zanemaruje velika/mala slova, dijakritike i jednu grešku u kucanju
  prihvaceni?: string[]
  explanation: string
  hint: string | null
  signature: string
}

export function upakujSrpskiTekst(cfg: GeneratorConfig, ulaz: SrpskiTekstUlaz): GenerisanoPitanje {
  const vidjeno = new Set([normalizuj(ulaz.tacan)])
  const accept = [ulaz.tacan]
  for (const varijanta of ulaz.prihvaceni ?? []) {
    const kljuc = normalizuj(varijanta)
    if (kljuc !== '' && !vidjeno.has(kljuc)) {
      vidjeno.add(kljuc)
      accept.push(varijanta)
    }
  }
  return {
    type: 'text',
    text: ulaz.pitanje,
    options: null,
    correct: { accept },
    explanation: ulaz.explanation,
    hint: ulaz.hint,
    points: POENI,
    topicSlug: cfg.topicSlug,
    difficulty: NIVO,
    signature: ulaz.signature,
  }
}

export interface SrpskiTvrdnjaUlaz {
  // Tvrdnja MORA biti samostalna — sav kontekst (reč, rečenicu, osnovu)
  // navodi u svom tekstu, jer se pitanje detetu prikazuje bez uvoda.
  tvrdnjaTacna: string
  tvrdnjaNetacna: string
  explanation: string
  hint: string | null
  signature: string
}

export function upakujSrpskiTvrdnju(cfg: GeneratorConfig, rng: Rng, ulaz: SrpskiTvrdnjaUlaz): GenerisanoPitanje {
  const tacna = rng() < 0.5
  return {
    type: 'truefalse',
    text: tacna ? ulaz.tvrdnjaTacna : ulaz.tvrdnjaNetacna,
    options: null,
    correct: { value: tacna },
    explanation: ulaz.explanation,
    hint: ulaz.hint,
    points: POENI,
    topicSlug: cfg.topicSlug,
    difficulty: NIVO,
    signature: ulaz.signature,
  }
}

// Da li umesto ukucavanja ponuditi tačno/netačno tvrdnju.
// Uz 'auto' se to dešava povremeno; eksplicitan 'text' ili 'truefalse'
// se uvek poštuje.
export function hoceTvrdnju(cfg: GeneratorConfig, rng: Rng): boolean {
  if (cfg.type === 'truefalse') return true
  if (cfg.type === 'text') return false
  return rng() < 0.25
}
