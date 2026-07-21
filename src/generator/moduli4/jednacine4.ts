// Generator: jednačine (4. razred) — SLOŽENE jednačine sa dve računske operacije,
// nepoznata unutar zagrade ILI kao činilac/deljenik/deljenik-umanjenik:
// (x±p)±q=c, a·(b±x)=c, a·(x−b)=c, a:(b±x)=c, a·x±b=c, b−a·x=c, x:a±b=c,
// b−x:a=c, (x±p):q=c, (x±p)·q±r=c.
// Konstruisano "od x unazad" (kao i jednačine 3. razreda) da rezultat bude čist
// i da nijedan međurezultat ne postane negativan ili neceo.
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from '../moduli/zajednicko'

const MAX_DISTRAKTOR = 2_000_000

interface Zadatak {
  text: string
  tacan: number
  kandidati: number[]
  explanation: string
  signature: string
}

// (x + p) − q = c
function oblikA(rng: Rng, maxX: number, maxP: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const p = ceoBroj(rng, 2, maxP)
  const unutra = x + p
  const q = ceoBroj(rng, 2, unutra)
  const c = unutra - q
  return {
    text: `(x + ${p}) − ${q} = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `x + ${p} = ${c} + ${q} = ${unutra}, pa je x = ${unutra} − ${p} = ${x}.`,
    signature: `jednacine4:A:${p},${q},${c}`,
  }
}

// (x − p) + q = c
function oblikB(rng: Rng, maxX: number, maxP: number, maxQ: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const p = ceoBroj(rng, 2, Math.min(maxP, x))
  const unutra = x - p
  const q = ceoBroj(rng, 2, maxQ)
  const c = unutra + q
  return {
    text: `(x − ${p}) + ${q} = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `x − ${p} = ${c} − ${q} = ${unutra}, pa je x = ${unutra} + ${p} = ${x}.`,
    signature: `jednacine4:B:${p},${q},${c}`,
  }
}

// a · (b + x) = c
function oblikAp(rng: Rng, a: number, maxX: number, maxB: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const b = ceoBroj(rng, 2, maxB)
  const unutra = b + x
  const c = a * unutra
  return {
    text: `${a} · (${b} + x) = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `${b} + x = ${c} : ${a} = ${unutra}, pa je x = ${unutra} − ${b} = ${x}.`,
    signature: `jednacine4:ap:${a},${b},${c}`,
  }
}

// a · (b − x) = c
function oblikAm(rng: Rng, a: number, maxX: number, maxB: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const b = x + ceoBroj(rng, 1, maxB)
  const unutra = b - x
  const c = a * unutra
  return {
    text: `${a} · (${b} − x) = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `${b} − x = ${c} : ${a} = ${unutra}, pa je x = ${b} − ${unutra} = ${x}.`,
    signature: `jednacine4:am:${a},${b},${c}`,
  }
}

// a · (x − b) = c
function oblikAs(rng: Rng, a: number, maxX: number, maxB: number): Zadatak {
  const b = ceoBroj(rng, 2, maxB)
  const x = b + ceoBroj(rng, 2, maxX)
  const unutra = x - b
  const c = a * unutra
  return {
    text: `${a} · (x − ${b}) = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `x − ${b} = ${c} : ${a} = ${unutra}, pa je x = ${unutra} + ${b} = ${x}.`,
    signature: `jednacine4:as:${a},${b},${c}`,
  }
}

// a · x ± b = c  (x je činilac, BEZ zagrade)
function oblikAxB(rng: Rng, a: number, maxX: number, maxB: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const ax = a * x
  const plus = rng() < 0.5
  const b = plus ? ceoBroj(rng, 2, maxB) : ceoBroj(rng, 2, Math.max(2, Math.min(maxB, ax)))
  const c = plus ? ax + b : ax - b
  return {
    text: `${a} · x ${plus ? '+' : '−'} ${b} = ${c}`,
    tacan: x,
    kandidati: [c, ax, x + 10, x - 10],
    explanation: `${a} · x = ${c} ${plus ? '−' : '+'} ${b} = ${ax}, pa je x = ${ax} : ${a} = ${x}.`,
    signature: `jednacine4:axb:${a},${plus ? '+' : '-'}${b},${c}`,
  }
}

// b − a · x = c  (x je deo umanjioca, BEZ zagrade)
function oblikBAx(rng: Rng, a: number, maxX: number, maxC: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const ax = a * x
  const c = ceoBroj(rng, 2, maxC)
  const b = ax + c
  return {
    text: `${b} − ${a} · x = ${c}`,
    tacan: x,
    kandidati: [b, ax, x + 10, x - 10],
    explanation: `${a} · x = ${b} − ${c} = ${ax}, pa je x = ${ax} : ${a} = ${x}.`,
    signature: `jednacine4:bax:${a},${b},${c}`,
  }
}

// x : a ± b = c  (x je deljenik, BEZ zagrade)
function oblikXaB(rng: Rng, a: number, maxKolicnik: number, maxB: number): Zadatak {
  const kolicnikBaza = ceoBroj(rng, 2, maxKolicnik)
  const x = kolicnikBaza * a
  const plus = rng() < 0.5
  const b = plus ? ceoBroj(rng, 2, maxB) : ceoBroj(rng, 2, Math.max(2, Math.min(maxB, kolicnikBaza)))
  const c = plus ? kolicnikBaza + b : kolicnikBaza - b
  return {
    text: `x : ${a} ${plus ? '+' : '−'} ${b} = ${c}`,
    tacan: x,
    kandidati: [c, kolicnikBaza, x + 10, x - 10],
    explanation: `x : ${a} = ${c} ${plus ? '−' : '+'} ${b} = ${kolicnikBaza}, pa je x = ${kolicnikBaza} · ${a} = ${x}.`,
    signature: `jednacine4:xab:${a},${plus ? '+' : '-'}${b},${c}`,
  }
}

// b − x : a = c  (x je deljenik, BEZ zagrade)
function oblikBXa(rng: Rng, a: number, maxKolicnik: number, maxC: number): Zadatak {
  const kolicnik = ceoBroj(rng, 2, maxKolicnik)
  const x = kolicnik * a
  const c = ceoBroj(rng, 2, maxC)
  const b = kolicnik + c
  return {
    text: `${b} − x : ${a} = ${c}`,
    tacan: x,
    kandidati: [b, kolicnik, x + 10, x - 10],
    explanation: `x : ${a} = ${b} − ${c} = ${kolicnik}, pa je x = ${kolicnik} · ${a} = ${x}.`,
    signature: `jednacine4:bxa:${a},${b},${c}`,
  }
}

// (x ± p) : q = c  (deljenje NAKON zagrade, egzaktno po konstrukciji)
function oblikXpQ(rng: Rng, q: number, maxC: number, maxP: number): Zadatak {
  const c = ceoBroj(rng, 2, maxC)
  const unutra = c * q
  const plusInner = rng() < 0.5
  const p = plusInner ? ceoBroj(rng, 2, Math.max(2, Math.min(maxP, unutra - 2))) : ceoBroj(rng, 2, maxP)
  const x = plusInner ? unutra - p : unutra + p
  return {
    text: `(x ${plusInner ? '+' : '−'} ${p}) : ${q} = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `x ${plusInner ? '+' : '−'} ${p} = ${c} · ${q} = ${unutra}, pa je x = ${unutra} ${plusInner ? '−' : '+'} ${p} = ${x}.`,
    signature: `jednacine4:xpq:${plusInner ? '+' : '-'}${p},${q},${c}`,
  }
}

// (x ± p) · q ± r = c
function oblikXpQR(rng: Rng, maxX: number, maxP: number, q: number, maxR: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const plusInner = rng() < 0.5
  const p = plusInner ? ceoBroj(rng, 2, maxP) : ceoBroj(rng, 2, Math.min(maxP, x))
  const unutra = plusInner ? x + p : x - p
  const proizvod = unutra * q
  const plusOuter = rng() < 0.5
  const r = plusOuter ? ceoBroj(rng, 2, maxR) : ceoBroj(rng, 2, Math.max(2, Math.min(maxR, proizvod)))
  const c = plusOuter ? proizvod + r : proizvod - r
  return {
    text: `(x ${plusInner ? '+' : '−'} ${p}) · ${q} ${plusOuter ? '+' : '−'} ${r} = ${c}`,
    tacan: x,
    kandidati: [c, unutra, proizvod, x + 10],
    explanation: `(x ${plusInner ? '+' : '−'} ${p}) · ${q} = ${c} ${plusOuter ? '−' : '+'} ${r} = ${proizvod}, pa x ${plusInner ? '+' : '−'} ${p} = ${proizvod} : ${q} = ${unutra}, pa je x = ${unutra} ${plusInner ? '−' : '+'} ${p} = ${x}.`,
    signature: `jednacine4:xpqr:${plusInner ? '+' : '-'}${p},${q},${plusOuter ? '+' : '-'}${r},${c}`,
  }
}

// a : (b + x) = c  (a se konstruiše unazad da deljenje bude tačno)
function oblikDp(rng: Rng, maxX: number, maxB: number, maxC: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const b = ceoBroj(rng, 2, maxB)
  const unutra = b + x
  const c = ceoBroj(rng, 2, maxC)
  const a = unutra * c
  return {
    text: `${a} : (${b} + x) = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `${b} + x = ${a} : ${c} = ${unutra}, pa je x = ${unutra} − ${b} = ${x}.`,
    signature: `jednacine4:dp:${a},${b},${c}`,
  }
}

// a : (b − x) = c
function oblikDm(rng: Rng, maxX: number, maxB: number, maxC: number): Zadatak {
  const x = ceoBroj(rng, 2, maxX)
  const b = x + ceoBroj(rng, 1, maxB)
  const unutra = b - x
  const c = ceoBroj(rng, 2, maxC)
  const a = unutra * c
  return {
    text: `${a} : (${b} − x) = ${c}`,
    tacan: x,
    kandidati: [c, unutra, x + 10, x - 10],
    explanation: `${b} − x = ${a} : ${c} = ${unutra}, pa je x = ${b} − ${unutra} = ${x}.`,
    signature: `jednacine4:dm:${a},${b},${c}`,
  }
}

function napraviZadatak(rng: Rng, tezina: 1 | 2 | 3 | 4 | 5): Zadatak {
  if (tezina === 1) return rng() < 0.5 ? oblikA(rng, 2_000, 2_000) : oblikB(rng, 2_000, 2_000, 2_000)
  if (tezina === 2) return rng() < 0.5 ? oblikA(rng, 10_000, 5_000) : oblikB(rng, 10_000, 5_000, 5_000)
  if (tezina === 3) {
    const a = ceoBroj(rng, 2, 20)
    const oblik = izaberi(rng, ['ap', 'am', 'as', 'axb', 'bax'] as const)
    if (oblik === 'ap') return oblikAp(rng, a, 500, 500)
    if (oblik === 'am') return oblikAm(rng, a, 500, 500)
    if (oblik === 'as') return oblikAs(rng, a, 500, 500)
    if (oblik === 'axb') return oblikAxB(rng, a, 500, 5_000)
    return oblikBAx(rng, a, 500, 5_000)
  }
  if (tezina === 4) {
    const a = ceoBroj(rng, 2, 50)
    const oblik = izaberi(rng, ['ap', 'am', 'as', 'axb', 'bax', 'xpqr'] as const)
    if (oblik === 'ap') return oblikAp(rng, a, 2_000, 2_000)
    if (oblik === 'am') return oblikAm(rng, a, 2_000, 2_000)
    if (oblik === 'as') return oblikAs(rng, a, 2_000, 2_000)
    if (oblik === 'axb') return oblikAxB(rng, a, 2_000, 20_000)
    if (oblik === 'bax') return oblikBAx(rng, a, 2_000, 20_000)
    return oblikXpQR(rng, 2_000, 500, ceoBroj(rng, 2, 20), 5_000)
  }
  // Ekspert: deljenje unutar zagrade ili x kao deljenik — mora garantovati deljivost bez ostatka
  const oblik = izaberi(rng, ['dp', 'dm', 'xab', 'bxa', 'xpq'] as const)
  if (oblik === 'dp') return oblikDp(rng, 500, 500, 30)
  if (oblik === 'dm') return oblikDm(rng, 500, 500, 30)
  const a = ceoBroj(rng, 2, 30)
  if (oblik === 'xab') return oblikXaB(rng, a, 500, 500)
  if (oblik === 'bxa') return oblikBXa(rng, a, 500, 500)
  return oblikXpQ(rng, a, 500, 500)
}

export const jednacine4: TopicGenerator = {
  slug: 'jednacine-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const zadatak = napraviZadatak(rng, cfg.difficulty)
    if (taken.has(zadatak.signature)) return null

    return upakujRacun(cfg, rng, {
      text: `Reši jednačinu: ${zadatak.text}`,
      tacan: zadatak.tacan,
      kandidati: zadatak.kandidati,
      explanation: zadatak.explanation,
      hint: 'Rešavaj od kraja izraza ka x: prvo poništi spoljašnju operaciju, pa unutrašnju (u zagradi).',
      signature: zadatak.signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
