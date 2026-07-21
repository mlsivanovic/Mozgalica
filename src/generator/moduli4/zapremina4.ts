// Generator: zapremina (4. razred) — merne jedinice za zapreminu, identitet
// 1 dm³ = 1 l, i formule V=a·b·c (kvadar) / V=a·a·a (kocka) — MEŠANO na svim
// računskim nivoima (ne samo kvadar), uz inverzne zadatke.
// Grade-3 modul „merne-jedinice" radi samo konverziju tečnosti (l/dl/cl/ml) —
// ovaj modul dodaje stvarno RAČUNANJE zapremine preko formule.
import { ceoBroj, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from '../moduli/zajednicko'

interface Konverzija {
  iz: string
  u: string
  faktor: number
}

// mm³ ↔ cm³ ↔ dm³ ↔ m³ — svaki korak je faktor 1000 (10³ za dužinu → 1000 za zapreminu)
const MALE: Konverzija[] = [
  { iz: 'cm3', u: 'mm3', faktor: 1000 },
  { iz: 'dm3', u: 'cm3', faktor: 1000 },
  { iz: 'm3', u: 'dm3', faktor: 1000 },
]

// Identitet 1 dm³ = 1 l, i dm³ ↔ m³
const SREDNJE: Konverzija[] = [
  { iz: 'dm3', u: 'l', faktor: 1 },
  { iz: 'm3', u: 'dm3', faktor: 1000 },
  { iz: 'm3', u: 'l', faktor: 1000 },
]

function izaberiKonverziju(rng: Rng, niz: Konverzija[]): Konverzija {
  return niz[Math.floor(rng() * niz.length)]
}

export const zapremina4: TopicGenerator = {
  slug: 'zapremina-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1 || cfg.difficulty === 2) {
      const k = izaberiKonverziju(rng, cfg.difficulty === 1 ? MALE : SREDNJE)
      const n = ceoBroj(rng, 2, 99)
      const tacan = n * k.faktor
      const signature = `zapremina4:jedinica:${k.iz}-${k.u}:${n}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko je ${n} ${k.iz} izraženo u jedinici ${k.u}?`,
        tacan,
        kandidati: k.faktor === 1
          ? [n + 1, n - 1, n * 10, Math.max(0, n - 2)]
          : [n * (k.faktor / 10), n * k.faktor * 10, tacan + k.faktor, tacan - k.faktor],
        explanation: k.faktor === 1
          ? `1 ${k.iz} = 1 ${k.u} (litar je zapremina kocke ivice 1 dm), pa je ${n} ${k.iz} = ${n} ${k.u}.`
          : `1 ${k.iz} = ${k.faktor} ${k.u}, pa je ${n} ${k.iz} = ${n} · ${k.faktor} = ${tacan} ${k.u}.`,
        hint: `Seti se: 1 ${k.iz} = ${k.faktor} ${k.u}.`,
        signature,
        sufiks: k.u,
        maxDistraktor: 2_000_000,
      })
    }

    if (cfg.difficulty === 3) {
      // Mešano: V = a · b · c (kvadar), ILI V = a · a · a (kocka) — dimenzije 2-12
      const kocka = rng() < 0.5
      if (kocka) {
        const a = ceoBroj(rng, 2, 12)
        const tacan = a * a * a
        const signature = `zapremina4:t3kocka:${a}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Izračunaj zapreminu kocke čija je ivica a = ${a} cm.`,
          tacan,
          kandidati: [a * a, 6 * a * a, tacan + 10, tacan - 10],
          explanation: `V = a · a · a = ${a} · ${a} · ${a} = ${tacan} cm³.`,
          hint: 'Zapreminu kocke računaš tako što ivicu pomnožiš samu sa sobom, pa još jednom sa sobom.',
          signature,
          sufiks: 'cm³',
          maxDistraktor: 2_000,
        })
      }
      const a = ceoBroj(rng, 2, 12)
      const b = ceoBroj(rng, 2, 12)
      const c = ceoBroj(rng, 2, 12)
      const tacan = a * b * c
      const signature = `zapremina4:kvadar:${a},${b},${c}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Izračunaj zapreminu kvadra čije su dimenzije a = ${a} cm, b = ${b} cm, c = ${c} cm.`,
        tacan,
        kandidati: [a * b + c, a + b + c, tacan + 10, tacan - 10],
        explanation: `V = a · b · c = ${a} · ${b} · ${c} = ${tacan} cm³.`,
        hint: 'Zapreminu kvadra računaš tako što pomnožiš sve tri dimenzije.',
        signature,
        sufiks: 'cm³',
        maxDistraktor: 2_000,
      })
    }

    if (cfg.difficulty === 4) {
      // 3 grane: veća kocka, veći kvadar, ili inverz kocke (data V → ivica)
      const grana = ceoBroj(rng, 0, 2)
      if (grana === 0) {
        const a = ceoBroj(rng, 2, 30)
        const tacan = a * a * a
        const signature = `zapremina4:kocka:${a}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Izračunaj zapreminu kocke čija je ivica a = ${a} cm.`,
          tacan,
          kandidati: [a * a, 6 * a * a, tacan + 10, tacan - 10],
          explanation: `V = a · a · a = ${a} · ${a} · ${a} = ${tacan} cm³.`,
          hint: 'Zapreminu kocke računaš tako što ivicu pomnožiš samu sa sobom, pa još jednom sa sobom.',
          signature,
          sufiks: 'cm³',
          maxDistraktor: 30_000,
        })
      }
      if (grana === 1) {
        const a = ceoBroj(rng, 2, 30)
        const b = ceoBroj(rng, 2, 30)
        const c = ceoBroj(rng, 2, 30)
        const tacan = a * b * c
        const signature = `zapremina4:kvadar-veci:${a},${b},${c}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Izračunaj zapreminu kvadra čije su dimenzije a = ${a} cm, b = ${b} cm, c = ${c} cm.`,
          tacan,
          kandidati: [a * b + c, a + b + c, tacan + 10, tacan - 10],
          explanation: `V = a · b · c = ${a} · ${b} · ${c} = ${tacan} cm³.`,
          hint: 'Zapreminu kvadra računaš tako što pomnožiš sve tri dimenzije.',
          signature,
          sufiks: 'cm³',
          maxDistraktor: 30_000,
        })
      }
      // Inverzno: data zapremina kocke, nađi ivicu (konstruisano unazad — uvek ceo broj)
      const a = ceoBroj(rng, 2, 20)
      const V = a * a * a
      const signature = `zapremina4:kocka-inv:${a}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Zapremina kocke je ${V} cm³. Kolika je dužina njene ivice?`,
        tacan: a,
        kandidati: [Math.floor(V / 6), a * a, a + 1, a - 1],
        explanation: `Tražimo broj koji pomnožen sa samim sobom dva puta (a · a · a) daje ${V}. Pošto je ${a} · ${a} · ${a} = ${V}, ivica je a = ${a} cm.`,
        hint: 'Probaj cele brojeve: koji broj pomnožen samim sobom tri puta daje zapreminu?',
        signature,
        sufiks: 'cm',
        maxDistraktor: 1_000,
      })
    }

    // Ekspert: 3 grane — sinteza sa litrima (kvadar ili kocka), ili inverz kvadra (data V i 2 dimenzije)
    const grana = ceoBroj(rng, 0, 2)
    if (grana === 0) {
      const a = ceoBroj(rng, 2, 9)
      const b = ceoBroj(rng, 2, 9)
      const c = ceoBroj(rng, 2, 9)
      const tacan = a * b * c // dm³ = litara, po identitetu 1 dm³ = 1 l
      const signature = `zapremina4:litar:${a},${b},${c}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Kutija ima oblik kvadra dimenzija ${a} dm × ${b} dm × ${c} dm. Koliko litara vode može stati u nju?`,
        tacan,
        kandidati: [a * b + c, a + b + c, tacan + 10, tacan - 10],
        explanation: `V = a · b · c = ${a} · ${b} · ${c} = ${tacan} dm³, a pošto je 1 dm³ = 1 l, stane ${tacan} l.`,
        hint: 'Prvo izračunaj zapreminu u dm³, pa se seti da je 1 dm³ = 1 l.',
        signature,
        sufiks: 'l',
        maxDistraktor: 2_000,
      })
    }
    if (grana === 1) {
      const a = ceoBroj(rng, 2, 9)
      const tacan = a * a * a
      const signature = `zapremina4:litar-kocka:${a}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Kutija ima oblik kocke ivice ${a} dm. Koliko litara vode može stati u nju?`,
        tacan,
        kandidati: [a * a, 6 * a * a, tacan + 10, tacan - 10],
        explanation: `V = a · a · a = ${a} · ${a} · ${a} = ${tacan} dm³, a pošto je 1 dm³ = 1 l, stane ${tacan} l.`,
        hint: 'Prvo izračunaj zapreminu u dm³, pa se seti da je 1 dm³ = 1 l.',
        signature,
        sufiks: 'l',
        maxDistraktor: 2_000,
      })
    }
    const a = ceoBroj(rng, 2, 15)
    const b = ceoBroj(rng, 2, 15)
    const c = ceoBroj(rng, 2, 15)
    const V = a * b * c
    const signature = `zapremina4:inverzno:${a},${b},${c}`
    if (taken.has(signature)) return null
    return upakujRacun(cfg, rng, {
      text: `Zapremina kvadra je ${V} cm³. Dve njegove dimenzije su a = ${a} cm i b = ${b} cm. Kolika je treća dimenzija c?`,
      tacan: c,
      kandidati: [V, a * b, c + 1, c - 1],
      explanation: `c = V : (a · b) = ${V} : (${a} · ${b}) = ${V} : ${a * b} = ${c} cm.`,
      hint: 'Poznate dimenzije pomnoži, pa zapreminu podeli tim proizvodom.',
      signature,
      sufiks: 'cm',
      maxDistraktor: 5_000,
    })
  },
}
