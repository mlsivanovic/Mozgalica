// Pomoćnici za matematiku 5. razreda: tačna aritmetika razlomaka i
// pakovanje pojmovnih pitanja sa ponuđenim odgovorima.
import type { Opcija } from '../../types/db.ts'
import { promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje } from '../types.ts'
import { poeniZaTezinu, upakujRacun } from '../moduli/zajednicko.ts'

export interface Razlomak {
  b: number
  i: number
}

export function nzd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

export function nzs(a: number, b: number): number {
  return Math.abs(a * b) / nzd(a, b)
}

export function normalizujRazlomak(b: number, i: number): Razlomak {
  if (i === 0) throw new Error('Imenilac ne sme biti nula.')
  const znak = i < 0 ? -1 : 1
  const d = nzd(b, i)
  return { b: (b / d) * znak, i: Math.abs(i / d) }
}

export function saberiRazlomke(a: Razlomak, b: Razlomak): Razlomak {
  return normalizujRazlomak(a.b * b.i + b.b * a.i, a.i * b.i)
}

export function oduzmiRazlomke(a: Razlomak, b: Razlomak): Razlomak {
  return normalizujRazlomak(a.b * b.i - b.b * a.i, a.i * b.i)
}

export function pomnoziRazlomke(a: Razlomak, b: Razlomak): Razlomak {
  return normalizujRazlomak(a.b * b.b, a.i * b.i)
}

export function podeliRazlomke(a: Razlomak, b: Razlomak): Razlomak {
  if (b.b === 0) throw new Error('Nije dozvoljeno deljenje nulom.')
  return normalizujRazlomak(a.b * b.i, a.i * b.b)
}

export function uporediRazlomke(a: Razlomak, b: Razlomak): number {
  return Math.sign(a.b * b.i - b.b * a.i)
}

export function formatirajRazlomak(r: Razlomak): string {
  const n = normalizujRazlomak(r.b, r.i)
  return n.i === 1 ? String(n.b) : `${n.b}/${n.i}`
}

interface IzborUlaz {
  text: string
  tacan: string
  netacni: string[]
  explanation: string
  hint: string | null
  signature: string
}

export function upakujIzbor(
  cfg: GeneratorConfig,
  rng: Rng,
  ulaz: IzborUlaz,
): GenerisanoPitanje {
  const netacni = [...new Set(ulaz.netacni)].filter((v) => v !== ulaz.tacan)
  const dopune = ['Nijedno od navedenog', 'Ne može se odrediti', 'Sve navedeno']
  for (const dopuna of dopune) {
    if (netacni.length >= 3) break
    if (dopuna !== ulaz.tacan && !netacni.includes(dopuna)) netacni.push(dopuna)
  }
  const vrednosti = promesaj(rng, [ulaz.tacan, ...netacni.slice(0, 3)])
  const options: Opcija[] = vrednosti.map((text, i) => ({ id: `o${i + 1}`, text }))
  return {
    type: 'single',
    text: ulaz.text,
    options,
    correct: { optionId: options[vrednosti.indexOf(ulaz.tacan)].id },
    explanation: ulaz.explanation,
    hint: ulaz.hint,
    points: poeniZaTezinu(cfg.difficulty),
    topicSlug: cfg.topicSlug,
    difficulty: cfg.difficulty,
    signature: ulaz.signature,
  }
}

export function upakujTvrdnju(
  cfg: GeneratorConfig,
  tekst: string,
  tacno: boolean,
  explanation: string,
  hint: string | null,
  signature: string,
): GenerisanoPitanje {
  return {
    type: 'truefalse', text: tekst, options: null, correct: { value: tacno },
    explanation, hint, points: poeniZaTezinu(cfg.difficulty), topicSlug: cfg.topicSlug,
    difficulty: cfg.difficulty, signature,
  }
}

export function upakujRazlomak(
  cfg: GeneratorConfig,
  rng: Rng,
  ulaz: Omit<IzborUlaz, 'tacan' | 'netacni'> & { tacan: Razlomak; netacni: Razlomak[] },
): GenerisanoPitanje {
  const tacan = normalizujRazlomak(ulaz.tacan.b, ulaz.tacan.i)
  if (tacan.i === 1) {
    return upakujRacun(cfg, rng, {
      text: ulaz.text,
      tacan: tacan.b,
      kandidati: ulaz.netacni.map((r) => r.b / r.i),
      explanation: ulaz.explanation,
      hint: ulaz.hint,
      signature: ulaz.signature,
      maxDistraktor: Math.max(100, Math.abs(tacan.b) + 30),
    })
  }
  return upakujIzbor(cfg, rng, {
    ...ulaz,
    tacan: formatirajRazlomak(tacan),
    netacni: ulaz.netacni.map(formatirajRazlomak),
  })
}

export function potpisZauzet(taken: Set<string>, signature: string): boolean {
  return taken.has(signature)
}
