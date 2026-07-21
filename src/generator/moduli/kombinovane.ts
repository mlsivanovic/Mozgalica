// Generator: kombinovane računske operacije (redosled operacija, zagrade)
import type { Tezina } from '../../types/db'
import { ceoBroj, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

interface Izraz {
  text: string
  tacan: number
  // Najvažniji distraktor: rezultat pogrešnog redosleda operacija
  pogresanRedosled: number
  signature: string
  objasnjenje: string
}

function napraviIzraz(rng: Rng, tezina: Tezina): Izraz {
  if (tezina === 1) {
    // a · b + c — množenje pre sabiranja
    const a = ceoBroj(rng, 2, 5)
    const b = ceoBroj(rng, 2, 9)
    const c = ceoBroj(rng, 2, 50)
    return {
      text: `${a} · ${b} + ${c}`,
      tacan: a * b + c,
      pogresanRedosled: a * (b + c) <= 1000 ? a * (b + c) : a * b + c + 10,
      signature: `kombinovane:${a}*${b}+${c}`,
      objasnjenje: `Prvo množenje: ${a} · ${b} = ${a * b}, zatim sabiranje: ${a * b} + ${c} = ${a * b + c}.`,
    }
  }
  if (tezina === 2) {
    // a · b − c · d, rezultat ≥ 0
    const a = ceoBroj(rng, 4, 9)
    const b = ceoBroj(rng, 5, 9)
    const c = ceoBroj(rng, 2, 5)
    const d = ceoBroj(rng, 2, Math.max(2, Math.floor((a * b) / c) > 9 ? 9 : Math.floor((a * b) / c)))
    return {
      text: `${a} · ${b} − ${c} · ${d}`,
      tacan: a * b - c * d,
      pogresanRedosled: (a * b - c) * d <= 1000 && (a * b - c) * d >= 0 ? (a * b - c) * d : a * b - c * d + 10,
      signature: `kombinovane:${a}*${b}-${c}*${d}`,
      objasnjenje: `Prvo oba množenja: ${a} · ${b} = ${a * b} i ${c} · ${d} = ${c * d}, zatim oduzimanje: ${a * b} − ${c * d} = ${a * b - c * d}.`,
    }
  }
  if (tezina === 3) {
    // (a ± b) · c
    const sabiranje = rng() < 0.5
    const c = ceoBroj(rng, 2, 9)
    if (sabiranje) {
      const a = ceoBroj(rng, 10, Math.floor(1000 / c) - 10)
      const b = ceoBroj(rng, 2, Math.floor(1000 / c) - a)
      return {
        text: `(${a} + ${b}) · ${c}`,
        tacan: (a + b) * c,
        pogresanRedosled: a + b * c,
        signature: `kombinovane:(${a}+${b})*${c}`,
        objasnjenje: `Prvo zagrada: ${a} + ${b} = ${a + b}, zatim množenje: ${a + b} · ${c} = ${(a + b) * c}.`,
      }
    }
    const b = ceoBroj(rng, 2, 40)
    const a = ceoBroj(rng, b + 2, Math.floor(1000 / c) + b > 999 ? 999 : Math.floor(1000 / c) + b)
    const razlika = Math.min(a - b, Math.floor(1000 / c))
    const a2 = b + razlika
    return {
      text: `(${a2} − ${b}) · ${c}`,
      tacan: (a2 - b) * c,
      pogresanRedosled: a2 - b * c >= 0 ? a2 - b * c : (a2 - b) * c + 10,
      signature: `kombinovane:(${a2}-${b})*${c}`,
      objasnjenje: `Prvo zagrada: ${a2} − ${b} = ${a2 - b}, zatim množenje: ${a2 - b} · ${c} = ${(a2 - b) * c}.`,
    }
  }
  if (tezina === 4) {
    // a · b ± c · d — dva dvocifreno-jednocifrena proizvoda, redosled operacija je zamka
    let a = ceoBroj(rng, 11, 19)
    let b = ceoBroj(rng, 2, 9)
    let c = ceoBroj(rng, 11, 19)
    let d = ceoBroj(rng, 2, 9)
    const minus = rng() < 0.5
    if (minus && a * b < c * d) {
      const at = a; a = c; c = at
      const bt = b; b = d; d = bt
    }
    const tacan = minus ? a * b - c * d : a * b + c * d
    const naivno = minus ? (a * b - c) * d : (a * b + c) * d
    return {
      text: `${a} · ${b} ${minus ? '−' : '+'} ${c} · ${d}`,
      tacan,
      pogresanRedosled: naivno >= 0 && naivno <= 1000 ? naivno : tacan + 10,
      signature: `kombinovane:${a}*${b}${minus ? '-' : '+'}${c}*${d}`,
      objasnjenje: `Prvo oba množenja: ${a} · ${b} = ${a * b} i ${c} · ${d} = ${c * d}, zatim ${minus ? 'oduzimanje' : 'sabiranje'}: ${a * b} ${minus ? '−' : '+'} ${c * d} = ${tacan}.`,
    }
  }
  // Ekspert: (a ± b) · c ± d — tri koraka sa zagradom
  const c = ceoBroj(rng, 2, 9)
  const maxUnutra = Math.max(6, Math.floor(900 / c))
  const zbir = rng() < 0.5
  const b = ceoBroj(rng, 2, Math.max(2, Math.floor(maxUnutra / 2)))
  const a = zbir ? ceoBroj(rng, 3, Math.max(3, maxUnutra - b)) : b + ceoBroj(rng, 3, Math.max(3, maxUnutra - b))
  const unutra = zbir ? a + b : a - b
  const proizvod = unutra * c
  const plusD = rng() < 0.5
  const dMax = plusD ? Math.max(2, Math.min(60, 1000 - proizvod)) : Math.max(2, Math.min(60, proizvod))
  const d = ceoBroj(rng, 2, dMax)
  const tacan = plusD ? proizvod + d : proizvod - d
  const bezZagrade = zbir
    ? a + b * c + (plusD ? d : -d)
    : a - b * c + (plusD ? d : -d)
  return {
    text: `(${a} ${zbir ? '+' : '−'} ${b}) · ${c} ${plusD ? '+' : '−'} ${d}`,
    tacan,
    pogresanRedosled: bezZagrade >= 0 && bezZagrade <= 1000 ? bezZagrade : tacan + 10,
    signature: `kombinovane:(${a}${zbir ? '+' : '-'}${b})*${c}${plusD ? '+' : '-'}${d}`,
    objasnjenje: `Prvo zagrada: ${a} ${zbir ? '+' : '−'} ${b} = ${unutra}, zatim množenje: ${unutra} · ${c} = ${proizvod}, na kraju ${plusD ? 'sabiranje' : 'oduzimanje'}: ${proizvod} ${plusD ? '+' : '−'} ${d} = ${tacan}.`,
  }
}

export const kombinovane: TopicGenerator = {
  slug: 'kombinovane-operacije',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const izraz = napraviIzraz(rng, cfg.difficulty)
    if (taken.has(izraz.signature)) return null

    return upakujRacun(cfg, rng, {
      text: `Izračunaj: ${izraz.text} = ?`,
      tacan: izraz.tacan,
      kandidati: [
        izraz.pogresanRedosled, // pogrešan redosled operacija — ključna zamka
        izraz.tacan + 10,
        izraz.tacan - 10,
        izraz.tacan + 1,
      ],
      explanation: izraz.objasnjenje,
      hint: 'Množenje i deljenje rade se pre sabiranja i oduzimanja. Zagrade uvek prve!',
      signature: izraz.signature,
    })
  },
}
