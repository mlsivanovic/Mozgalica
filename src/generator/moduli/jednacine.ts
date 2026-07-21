// Generator: proste jednačine sa jednom nepoznatom — rešavanje inverznom operacijom
import type { Tezina } from '../../types/db'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

type Oblik = 'x+a=b' | 'a-x=b' | 'x-a=b' | 'a*x=b' | 'x:a=b'

function opsegSlobodnih(t: Tezina): [number, number] {
  if (t === 1) return [1, 20]
  if (t === 2) return [1, 100]
  if (t === 3) return [1, 450]
  // t4 (t5 ne koristi ovaj opseg — ima sopstvenu granu): x kod oblika 'x-a=b' je zbir
  // a+b, pa gornja granica mora ostati ≤ 500 da x ne pređe 1000.
  return [1, 480]
}

export const jednacine: TopicGenerator = {
  slug: 'jednacine',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 5) {
      // Ekspert: dvostepena jednačina a·x + b = c ili a·x − b = c
      const a = ceoBroj(rng, 2, 9)
      const x = ceoBroj(rng, 2, 60)
      const ax = a * x
      const plus = rng() < 0.5
      const b = plus ? ceoBroj(rng, 2, 200) : ceoBroj(rng, 2, Math.max(2, Math.min(200, ax)))
      const c = plus ? ax + b : ax - b
      const signature = `jednacine:dvokorak:${plus ? '+' : '-'}:${a},${x},${b}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Reši jednačinu: ${a} · x ${plus ? '+' : '−'} ${b} = ${c}`,
        tacan: x,
        kandidati: [c, plus ? c - b : c + b, x + 10, x - 10],
        explanation: `Prvo poništi ${plus ? 'sabiranje' : 'oduzimanje'}: ${a} · x = ${c} ${plus ? '−' : '+'} ${b} = ${ax}. Zatim x = ${ax} : ${a} = ${x}.`,
        hint: 'Prvo poništi sabiranje/oduzimanje na desnoj strani, pa tek onda množenje/deljenje.',
        signature,
      })
    }

    const oblici: Oblik[] = cfg.difficulty === 1
      ? ['x+a=b', 'a-x=b', 'x-a=b']
      : ['x+a=b', 'a-x=b', 'x-a=b', 'a*x=b', 'x:a=b']
    const oblik = izaberi(rng, oblici)
    const [minS, maxS] = opsegSlobodnih(cfg.difficulty)
    const gornjaGranicaMnozenja = cfg.difficulty === 2 ? 10 : cfg.difficulty === 4 ? 110 : 80

    let prikaz: string
    let tacan: number
    let p: number
    let q: number

    if (oblik === 'x+a=b') {
      const x = ceoBroj(rng, minS, maxS)
      const a = ceoBroj(rng, minS, maxS)
      const b = x + a
      prikaz = `x + ${a} = ${b}`
      tacan = x
      p = a; q = b
    } else if (oblik === 'a-x=b') {
      const x = ceoBroj(rng, minS, maxS)
      const b = ceoBroj(rng, minS, maxS)
      const a = x + b
      prikaz = `${a} − x = ${b}`
      tacan = x
      p = a; q = b
    } else if (oblik === 'x-a=b') {
      const a = ceoBroj(rng, minS, maxS)
      const b = ceoBroj(rng, minS, maxS)
      const x = a + b
      prikaz = `x − ${a} = ${b}`
      tacan = x
      p = a; q = b
    } else if (oblik === 'a*x=b') {
      const a = ceoBroj(rng, 2, 9)
      const x = ceoBroj(rng, 2, gornjaGranicaMnozenja)
      const b = a * x
      prikaz = `${a} · x = ${b}`
      tacan = x
      p = a; q = b
    } else {
      const a = ceoBroj(rng, 2, 9)
      const b = ceoBroj(rng, 2, gornjaGranicaMnozenja)
      const x = a * b
      prikaz = `x : ${a} = ${b}`
      tacan = x
      p = a; q = b
    }

    const signature = `jednacine:${oblik}:${p},${q}`
    if (taken.has(signature)) return null

    return upakujRacun(cfg, rng, {
      text: `Reši jednačinu: ${prikaz}`,
      tacan,
      kandidati: [p + q, Math.abs(p - q), tacan + 10, tacan - 10],
      explanation: `x = ${tacan}`,
      hint: 'Koristi suprotnu (inverznu) računsku operaciju da izračunaš x.',
      signature,
    })
  },
}
