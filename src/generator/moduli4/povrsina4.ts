// Generator: površina (4. razred) — merne jedinice za površinu (uklj. mešoviti
// zapis), površina pravougaonika/kvadrata (P=a·b, P=a·a) i inverz, površina
// kvadra P=2·(a·b+b·c+a·c), i kocke P=6·a·a (uklj. inverz i sintezu "3 strane").
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from '../moduli/zajednicko'

interface Konverzija {
  iz: string
  u: string
  faktor: number
}

// mm² ↔ cm² ↔ dm² ↔ m² — svaki korak je faktor 100 (10² za dužinu → 100 za površinu)
const MALE: Konverzija[] = [
  { iz: 'cm2', u: 'mm2', faktor: 100 },
  { iz: 'dm2', u: 'cm2', faktor: 100 },
  { iz: 'm2', u: 'dm2', faktor: 100 },
]

// m² ↔ a ↔ ha ↔ km² — isti faktor 100 po koraku, ali veće jedinice
const VELIKE: Konverzija[] = [
  { iz: 'a', u: 'm2', faktor: 100 },
  { iz: 'ha', u: 'a', faktor: 100 },
  { iz: 'km2', u: 'ha', faktor: 100 },
  { iz: 'ha', u: 'm2', faktor: 10_000 },
]

interface Mesovito {
  iz1: string
  iz2: string
  u: string
  faktor: number
}

// Mešoviti zapis, npr. "3 dm² 4 cm² = ? cm²"
const MESOVITO: Mesovito[] = [
  { iz1: 'dm2', iz2: 'cm2', u: 'cm2', faktor: 100 },
  { iz1: 'm2', iz2: 'dm2', u: 'dm2', faktor: 100 },
  { iz1: 'm2', iz2: 'cm2', u: 'cm2', faktor: 10_000 },
  { iz1: 'm2', iz2: 'mm2', u: 'mm2', faktor: 1_000_000 },
]

export const povrsina4: TopicGenerator = {
  slug: 'povrsina-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      const k = izaberi(rng, MALE)
      const n = ceoBroj(rng, 2, 99)
      const tacan = n * k.faktor
      const signature = `povrsina4:jedinica:${k.iz}-${k.u}:${n}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko je ${n} ${k.iz} izraženo u jedinici ${k.u}?`,
        tacan,
        kandidati: [n * (k.faktor / 10), n * k.faktor * 10, tacan + k.faktor, tacan - k.faktor],
        explanation: `1 ${k.iz} = ${k.faktor} ${k.u}, pa je ${n} ${k.iz} = ${n} · ${k.faktor} = ${tacan} ${k.u}.`,
        hint: `Seti se: 1 ${k.iz} = ${k.faktor} ${k.u}.`,
        signature,
        sufiks: k.u,
        maxDistraktor: 2_000_000,
      })
    }

    if (cfg.difficulty === 2) {
      if (rng() < 0.5) {
        const k = izaberi(rng, VELIKE)
        const n = ceoBroj(rng, 2, 99)
        const tacan = n * k.faktor
        const signature = `povrsina4:jedinica:${k.iz}-${k.u}:${n}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Koliko je ${n} ${k.iz} izraženo u jedinici ${k.u}?`,
          tacan,
          kandidati: [n * (k.faktor / 10), n * k.faktor * 10, tacan + k.faktor, tacan - k.faktor],
          explanation: `1 ${k.iz} = ${k.faktor} ${k.u}, pa je ${n} ${k.iz} = ${n} · ${k.faktor} = ${tacan} ${k.u}.`,
          hint: `Seti se: 1 ${k.iz} = ${k.faktor} ${k.u}.`,
          signature,
          sufiks: k.u,
          maxDistraktor: 2_000_000,
        })
      }
      // Mešoviti zapis
      const par = izaberi(rng, MESOVITO)
      const v1 = ceoBroj(rng, 1, 9)
      const maks2 = Math.min(par.faktor - 1, 9_999)
      const v2 = ceoBroj(rng, 1, maks2)
      const tacan = v1 * par.faktor + v2
      const signature = `povrsina4:mesovito:${v1}${par.iz1}${v2}${par.iz2}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko je ${v1} ${par.iz1} ${v2} ${par.iz2} izraženo u jedinici ${par.u}?`,
        tacan,
        kandidati: [v1 + v2, v1 * 10 + v2, v1 * par.faktor * 10 + v2, tacan + par.faktor],
        explanation: `${v1} ${par.iz1} = ${v1 * par.faktor} ${par.u}, pa je ${v1} ${par.iz1} ${v2} ${par.iz2} = ${v1 * par.faktor} + ${v2} = ${tacan} ${par.u}.`,
        hint: `Prvo ${par.iz1} pretvori u ${par.u} (1 ${par.iz1} = ${par.faktor} ${par.u}), pa dodaj ostatak.`,
        signature,
        sufiks: par.u,
        maxDistraktor: 10_000_000,
      })
    }

    if (cfg.difficulty === 3) {
      const kvadrat = rng() < 0.5
      if (rng() < 0.5) {
        // Direktan izračun, veće strane
        const a = ceoBroj(rng, 2, 200)
        const b = kvadrat ? a : ceoBroj(rng, 2, 200)
        const tacan = a * b
        const signature = `povrsina4:${kvadrat ? 'kvadrat' : 'pravougaonik'}:${a},${b}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: kvadrat
            ? `Izračunaj površinu kvadrata čija je stranica a = ${a} cm.`
            : `Izračunaj površinu pravougaonika čije su stranice a = ${a} cm i b = ${b} cm.`,
          tacan,
          kandidati: [a + b, (a + b) * 2, a * b + 10, a * b - 10],
          explanation: kvadrat
            ? `P = a · a = ${a} · ${a} = ${tacan} cm².`
            : `P = a · b = ${a} · ${b} = ${tacan} cm².`,
          hint: 'Površinu pravougaonika/kvadrata računaš tako što pomnožiš dužine susednih (ili istih) strana.',
          signature,
          sufiks: 'cm²',
          maxDistraktor: 50_000,
        })
      }
      // Inverzno: data površina i jedna strana, nađi drugu
      const a = ceoBroj(rng, 2, 150)
      const b = kvadrat ? a : ceoBroj(rng, 2, 150)
      const P = a * b
      const signature = `povrsina4:${kvadrat ? 'kvadrat-inv' : 'pravougaonik-inv'}:${a},${b}`
      if (taken.has(signature)) return null
      if (kvadrat) {
        return upakujRacun(cfg, rng, {
          text: `Površina kvadrata je ${P} cm². Kolika je dužina njegove stranice?`,
          tacan: a,
          kandidati: [P, Math.floor(P / 2), a + 1, a - 1],
          explanation: `Tražimo broj koji pomnožen samim sobom daje ${P}. Pošto je ${a} · ${a} = ${P}, stranica je a = ${a} cm.`,
          hint: 'Koji broj pomnožen samim sobom daje površinu?',
          signature,
          sufiks: 'cm',
          maxDistraktor: 25_000,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Površina pravougaonika je ${P} cm², a jedna stranica je a = ${a} cm. Kolika je stranica b?`,
        tacan: b,
        kandidati: [P, a, b + 1, b - 1],
        explanation: `b = P : a = ${P} : ${a} = ${b} cm.`,
        hint: 'Drugu stranicu nalaziš tako što površinu podeliš poznatom stranicom.',
        signature,
        sufiks: 'cm',
        maxDistraktor: 25_000,
      })
    }

    if (cfg.difficulty === 4) {
      // Površina kvadra
      const a = ceoBroj(rng, 2, 50)
      const b = ceoBroj(rng, 2, 50)
      const c = ceoBroj(rng, 2, 50)
      const tacan = 2 * (a * b + b * c + a * c)
      const signature = `povrsina4:kvadar:${a},${b},${c}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj površinu kvadra čije su dimenzije a = ${a} cm, b = ${b} cm, c = ${c} cm.`,
        tacan,
        kandidati: [a * b + b * c + a * c, a * b * c, tacan + 10, tacan - 10],
        explanation: `P = 2 · (a·b + b·c + a·c) = 2 · (${a * b} + ${b * c} + ${a * c}) = 2 · ${a * b + b * c + a * c} = ${tacan} cm².`,
        hint: 'Kvadar ima 3 para podudarnih strana — saberi površine tri različite strane i pomnoži sa 2.',
        signature,
        sufiks: 'cm²',
        maxDistraktor: 60_000,
      })
    }

    // Ekspert: kocka (direktno/inverzno), ili sinteza "3 date površine strana" kvadra
    const grana = ceoBroj(rng, 0, 2)
    if (grana === 0) {
      const a = ceoBroj(rng, 2, 40)
      const tacan = 6 * a * a
      const signature = `povrsina4:kocka:${a}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj površinu kocke čija je ivica a = ${a} cm.`,
        tacan,
        kandidati: [a * a, 4 * a * a, 6 * a, tacan + 10],
        explanation: `Kocka ima 6 podudarnih strana oblika kvadrata. P = 6 · (a · a) = 6 · ${a * a} = ${tacan} cm².`,
        hint: 'Kocka ima 6 podudarnih kvadratnih strana — izračunaj površinu jedne i pomnoži sa 6.',
        signature,
        sufiks: 'cm²',
        maxDistraktor: 60_000,
      })
    }
    if (grana === 1) {
      // Inverzno: data površina kocke, nađi ivicu (konstruisano unazad — uvek ceo broj)
      const a = ceoBroj(rng, 2, 40)
      const P = 6 * a * a
      const signature = `povrsina4:kocka-inv:${a}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Površina kocke je ${P} cm². Kolika je dužina njene ivice?`,
        tacan: a,
        kandidati: [Math.floor(P / 6), P, a + 1, a - 1],
        explanation: `Površina jedne strane je ${P} : 6 = ${a * a} cm², a strana je kvadrat čija je stranica ${a} cm (jer ${a} · ${a} = ${a * a}).`,
        hint: 'Prvo podeli površinu sa 6 (dobijaš površinu jedne strane), pa nađi koji broj pomnožen samim sobom to daje.',
        signature,
        sufiks: 'cm',
        maxDistraktor: 3_000,
      })
    }
    // Sinteza: date su površine tri strane kvadra (a·b, b·c, a·c) — ne treba a,b,c pojedinačno
    const a = ceoBroj(rng, 2, 20)
    const b = ceoBroj(rng, 2, 20)
    const c = ceoBroj(rng, 2, 20)
    const p1 = a * b
    const p2 = b * c
    const p3 = a * c
    const tacan = 2 * (p1 + p2 + p3)
    const signature = `povrsina4:kvadar-3strane:${p1},${p2},${p3}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Kolika je površina kvadra, ako su površine njegove tri strane ${p1} cm², ${p2} cm² i ${p3} cm²?`,
      tacan,
      kandidati: [p1 + p2 + p3, 2 * p1 + p2 + p3, tacan + 10, tacan - 10],
      explanation: `Površina kvadra je zbir površina svih 6 strana (svaka od tri se javlja dvaput): P = 2 · (${p1} + ${p2} + ${p3}) = 2 · ${p1 + p2 + p3} = ${tacan} cm².`,
      hint: 'Ne treba ti a, b, c pojedinačno — samo saberi tri date površine i pomnoži sa 2.',
      signature,
      sufiks: 'cm²',
      maxDistraktor: 5_000,
    })
  },
}
