// Generator: proste jednačine sa jednom nepoznatom — rešavanje inverznom operacijom
import type { Tezina } from '../../types/db'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

type Oblik = 'x+a=b' | 'a-x=b' | 'x-a=b' | 'a*x=b' | 'x:a=b'

function opsegSlobodnih(t: Tezina): [number, number] {
  if (t === 1) return [1, 20]
  if (t === 2) return [1, 100]
  // t3: gornja granica ostaje ≤ 480 da 'x-a=b' (x = a+b) ne pređe 1000
  return [1, 480]
}

export const jednacine: TopicGenerator = {
  slug: 'jednacine',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 5) {
      // Ekspert: trostepena jednačina a·x ± b ± c = d — dva uzastopna poništavanja
      // pre deljenja sa a (jedna operacija više nego na nivou 4).
      const a = ceoBroj(rng, 3, 15)
      const x = ceoBroj(rng, 3, 95)
      const ax = a * x

      // ax = a·x je uvek ≥ 9 (a,x ≥ 3), pa je oduzimanje za prvi korak uvek bezbedno.
      // posle1 posle prvog koraka može ispasti malo (čak i 0), pa drugi korak sme
      // da oduzima SAMO ako ima od čega — u suprotnom se prisiljava na sabiranje.
      const plus1 = rng() < 0.5
      const b = plus1 ? ceoBroj(rng, 3, 250) : ceoBroj(rng, 3, Math.min(250, ax))
      const posle1 = plus1 ? ax + b : ax - b

      const plus2 = posle1 < 3 ? true : rng() < 0.5
      const c = plus2 ? ceoBroj(rng, 3, 250) : ceoBroj(rng, 3, Math.min(250, posle1))
      const d = plus2 ? posle1 + c : posle1 - c

      const signature = `jednacine:trokorak:${a},${x},${plus1 ? '+' : '-'}${b},${plus2 ? '+' : '-'}${c}`
      if (taken.has(signature)) return null

      return upakujRacun(cfg, rng, {
        text: `Reši jednačinu: ${a} · x ${plus1 ? '+' : '−'} ${b} ${plus2 ? '+' : '−'} ${c} = ${d}`,
        tacan: x,
        kandidati: [d, posle1, ax, x + 10],
        explanation: `Prvo poništi ${plus2 ? 'sabiranje' : 'oduzimanje'} sa ${c}: ${a} · x ${plus1 ? '+' : '−'} ${b} = ${d} ${plus2 ? '−' : '+'} ${c} = ${posle1}. `
          + `Zatim poništi ${plus1 ? 'sabiranje' : 'oduzimanje'} sa ${b}: ${a} · x = ${posle1} ${plus1 ? '−' : '+'} ${b} = ${ax}. `
          + `Na kraju x = ${ax} : ${a} = ${x}.`,
        hint: 'Poništavaj operacije redom od kraja: prvo poslednje sabiranje/oduzimanje, pa prethodno, pa na kraju množenje/deljenje.',
        signature,
      })
    }

    if (cfg.difficulty === 4) {
      // Vrlo teško: dvostepena jednačina a·x + b = c ili a·x − b = c
      const a = ceoBroj(rng, 3, 12)
      const x = ceoBroj(rng, 3, 90)
      const ax = a * x
      const plus = rng() < 0.5
      const b = plus ? ceoBroj(rng, 3, 300) : ceoBroj(rng, 3, Math.max(3, Math.min(300, ax)))
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
    // Ova grana važi samo za t1–t3 (t4/t5 se vraćaju ranije, gore).
    // Za a*x=b je x (odgovor) direktno ograničen ovom granicom — sme biti veliko,
    // jer se b (= a·x) nigde ne proverava. Za x:a=b je x = a·b ODGOVOR, pa b mora
    // ostati dovoljno mali da a·b ne pređe 1000 (a je najviše 11 → b najviše ~78).
    const xGornjaMnozenje = cfg.difficulty === 3 ? 95 : 10
    const bGornjaDeljenje = cfg.difficulty === 3 ? 78 : 10
    const aGornja = cfg.difficulty === 3 ? 11 : 9

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
      const a = ceoBroj(rng, 2, aGornja)
      const x = ceoBroj(rng, 2, xGornjaMnozenje)
      const b = a * x
      prikaz = `${a} · x = ${b}`
      tacan = x
      p = a; q = b
    } else {
      const a = ceoBroj(rng, 2, aGornja)
      const b = ceoBroj(rng, 2, bGornjaDeljenje)
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
