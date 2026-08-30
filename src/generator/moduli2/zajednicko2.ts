// Pomoćnici za 2. razred: opseg do 100, tablično računanje, pakovanje izbora.
import type { Opcija } from '../../types/db.ts'
import { ceoBroj, izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje } from '../types.ts'
import { poeniZaTezinu, upakujRacun } from '../moduli/zajednicko.ts'

export function racun(
  cfg: GeneratorConfig, rng: Rng, text: string, tacan: number,
  kandidati: number[], explanation: string, hint: string, signature: string,
  sufiks?: string,
): GenerisanoPitanje {
  return upakujRacun(cfg, rng, {
    text, tacan, kandidati, explanation, hint, signature, sufiks,
    maxDistraktor: Math.max(100, Math.abs(tacan) + 30),
  })
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
  cfg: GeneratorConfig, rng: Rng, ulaz: IzborUlaz,
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

export function tvrdnja(
  cfg: GeneratorConfig, rng: Rng, text: string, tacno: boolean,
  explanation: string, hint: string, signature: string,
): GenerisanoPitanje {
  if (cfg.type === 'auto' || cfg.type === 'truefalse') {
    return {
      type: 'truefalse', text, options: null, correct: { value: tacno },
      explanation, hint, points: poeniZaTezinu(cfg.difficulty), topicSlug: cfg.topicSlug,
      difficulty: cfg.difficulty, signature,
    }
  }
  return upakujIzbor(cfg, rng, {
    text, tacan: tacno ? 'Tačno' : 'Netačno',
    netacni: tacno ? ['Netačno'] : ['Tačno'],
    explanation, hint, signature,
  })
}

function imaPrenos(a: number, b: number): boolean {
  return (a % 10) + (b % 10) >= 10
}

function imaPozajmicu(a: number, b: number): boolean {
  return (a % 10) < (b % 10)
}

export function saberiPar(rng: Rng, maxSuma: number, prenosi: boolean): [number, number] {
  for (let i = 0; i < 40; i++) {
    const a = ceoBroj(rng, 0, maxSuma)
    const b = ceoBroj(rng, 0, maxSuma - a)
    if (a + b === 0) continue
    if (imaPrenos(a, b) === prenosi) return [a, b]
  }
  return prenosi ? [8, 7] : [3, 4]
}

export function oduzmiPar(rng: Rng, max: number, pozajmica: boolean): [number, number] {
  for (let i = 0; i < 40; i++) {
    const a = ceoBroj(rng, 1, max)
    const b = ceoBroj(rng, 0, a)
    if (imaPozajmicu(a, b) === pozajmica) return [a, b]
  }
  return pozajmica ? [15, 7] : [12, 5]
}

export function tablica(rng: Rng, cinioci: readonly number[], minDrugi = 1, maxDrugi = 10): [number, number] {
  return [izaberi(rng, cinioci), ceoBroj(rng, minDrugi, maxDrugi)]
}

export function najblizaDesetica(n: number): number {
  return Math.round(n / 10) * 10
}
