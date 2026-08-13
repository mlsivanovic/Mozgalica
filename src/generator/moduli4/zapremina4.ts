// Generator: zapremina (4. razred) — merne jedinice za zapreminu, identitet
// 1 dm³ = 1 l, i formule V=a·b·c (kvadar) / V=a·a·a (kocka) — MEŠANO na svim
// računskim nivoima (ne samo kvadar), uz inverzne zadatke.
// Grade-3 modul „merne-jedinice" radi samo konverziju tečnosti (l/dl/cl/ml) —
// ovaj modul dodaje stvarno RAČUNANJE zapremine preko formule.
import { ceoBroj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujRacun } from '../moduli/zajednicko.ts'

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
    if (cfg.difficulty === 1) {
      const k = izaberiKonverziju(rng, MALE)
      const n = ceoBroj(rng, 2, 99)
      const tacan = n * k.faktor
      const signature = `zapremina4:jedinica:${k.iz}-${k.u}:${n}`
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
        const k = izaberiKonverziju(rng, SREDNJE)
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
      // Mešoviti zapis — svaki manji član se svodi na cm³ i sabira (faktor po koraku 1000)
      const mesovitoTri = rng() < 0.5
      if (!mesovitoTri) {
        // Dvočlano: "a dm³ b cm³ = ? cm³"
        const a = ceoBroj(rng, 1, 50)
        const b = ceoBroj(rng, 1, 999)
        const tacan = a * 1000 + b
        const signature = `zapremina4:mesovito2:${a},${b}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Koliko je ${a} dm³ ${b} cm³ izraženo u jedinici cm³?`,
          tacan,
          kandidati: [a * 100 + b, a * 10 + b, a + b, tacan + 1000, tacan - 1000],
          explanation: `${a} dm³ = ${a * 1000} cm³ (1 dm³ = 1000 cm³), pa je ${a} dm³ ${b} cm³ = ${a * 1000} + ${b} = ${tacan} cm³.`,
          hint: 'Prvo dm³ pretvori u cm³ (1 dm³ = 1000 cm³), pa dodaj ostatak.',
          signature,
          sufiks: 'cm³',
          maxDistraktor: 100_000,
        })
      }
      // Tročlano: "a m³ b dm³ c cm³ = ? cm³"
      const a = ceoBroj(rng, 1, 30)
      const b = ceoBroj(rng, 1, 999)
      const c = ceoBroj(rng, 1, 999)
      const tacan = a * 1_000_000 + b * 1000 + c
      const signature = `zapremina4:mesovito3:${a},${b},${c}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Koliko je ${a} m³ ${b} dm³ ${c} cm³ izraženo u jedinici cm³?`,
        tacan,
        kandidati: [a * 1000 + b * 100 + c, a * 100_000 + b * 1000 + c, tacan + 1000, tacan - 1000],
        explanation: `${a} m³ = ${a * 1_000_000} cm³, ${b} dm³ = ${b * 1000} cm³, a ${c} cm³ ostaje isto — ukupno ${a * 1_000_000} + ${b * 1000} + ${c} = ${tacan} cm³.`,
        hint: 'Svaku jedinicu posebno pretvori u cm³ (1 m³ = 1 000 000 cm³, 1 dm³ = 1000 cm³), pa sve saberi.',
        signature,
        sufiks: 'cm³',
        maxDistraktor: 40_000_000,
      })
    }

    if (cfg.difficulty === 3) {
      // Mešano: V = a · a · a (kocka), V = a · b · c (kvadar), ILI brojanje jediničnih
      // kocki (1 cm³) koje popunjavaju kvadar — isti račun kao kvadar, ali direktno
      // pokazuje ŠTA zapremina znači (broj jediničnih kockica), ne samo golu formulu.
      const grana = ceoBroj(rng, 0, 2)
      if (grana === 0) {
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
      if (grana === 1) {
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
      const a = ceoBroj(rng, 2, 12)
      const b = ceoBroj(rng, 2, 12)
      const c = ceoBroj(rng, 2, 12)
      const tacan = a * b * c
      const signature = `zapremina4:kockice:${a},${b},${c}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Kutija ima oblik kvadra dimenzija ${a} cm × ${b} cm × ${c} cm. Koliko kockica ivice 1 cm stane u kutiju bez praznina?`,
        tacan,
        kandidati: [a * b + c, a + b + c, tacan + 10, tacan - 10],
        explanation: `Broj jediničnih kockica jednak je zapremini: V = a · b · c = ${a} · ${b} · ${c} = ${tacan} kockica.`,
        hint: 'Svaka kockica ima zapreminu 1 cm³ — prebroj koliko ih stane množenjem sve tri dimenzije.',
        signature,
        maxDistraktor: 2_000,
      })
    }

    if (cfg.difficulty === 4) {
      // 4 grane: veća kocka, veći kvadar, inverz kocke (data V → ivica), ili
      // SLOŽENO telo (dva kvadra spojena u jedno telo, zapremina se sabira).
      const grana = ceoBroj(rng, 0, 3)
      if (grana === 3) {
        const a1 = ceoBroj(rng, 2, 15)
        const b1 = ceoBroj(rng, 2, 15)
        const c1 = ceoBroj(rng, 2, 15)
        const a2 = ceoBroj(rng, 2, 15)
        const b2 = ceoBroj(rng, 2, 15)
        const c2 = ceoBroj(rng, 2, 15)
        const V1 = a1 * b1 * c1
        const V2 = a2 * b2 * c2
        const tacan = V1 + V2
        const signature = `zapremina4:slozeno-zbir:${a1},${b1},${c1},${a2},${b2},${c2}`
        if (taken.has(signature)) return null
        return upakujRacun(cfg, rng, {
          text: `Telo je sastavljeno od dva kvadra: prvi ima dimenzije ${a1} cm × ${b1} cm × ${c1} cm, a drugi ${a2} cm × ${b2} cm × ${c2} cm. Kolika je ukupna zapremina tela?`,
          tacan,
          kandidati: [V1, V2, Math.abs(V1 - V2), tacan + 10, tacan - 10],
          explanation: `Zapremina prvog kvadra je ${a1} · ${b1} · ${c1} = ${V1} cm³, a drugog ${a2} · ${b2} · ${c2} = ${V2} cm³. Ukupna zapremina je zbir: ${V1} + ${V2} = ${tacan} cm³.`,
          hint: 'Izračunaj zapreminu svakog kvadra posebno, pa ih saberi.',
          signature,
          sufiks: 'cm³',
          maxDistraktor: 15_000,
        })
      }
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

    // Ekspert: 4 grane — sinteza sa litrima (kvadar ili kocka), inverz kvadra (data V
    // i 2 dimenzije), ili SLOŽENO telo sa najvećim brojevima u celoj oblasti.
    const grana = ceoBroj(rng, 0, 3)
    if (grana === 3) {
      const a1 = ceoBroj(rng, 2, 25)
      const b1 = ceoBroj(rng, 2, 25)
      const c1 = ceoBroj(rng, 2, 25)
      const a2 = ceoBroj(rng, 2, 25)
      const b2 = ceoBroj(rng, 2, 25)
      const c2 = ceoBroj(rng, 2, 25)
      const V1 = a1 * b1 * c1
      const V2 = a2 * b2 * c2
      const tacan = V1 + V2
      const signature = `zapremina4:slozeno-zbir-veliko:${a1},${b1},${c1},${a2},${b2},${c2}`
      if (taken.has(signature)) return null
      return upakujRacun(cfg, rng, {
        text: `Telo je sastavljeno od dva kvadra: prvi ima dimenzije ${a1} cm × ${b1} cm × ${c1} cm, a drugi ${a2} cm × ${b2} cm × ${c2} cm. Kolika je ukupna zapremina tela?`,
        tacan,
        kandidati: [V1, V2, Math.abs(V1 - V2), tacan + 10, tacan - 10],
        explanation: `Zapremina prvog kvadra je ${a1} · ${b1} · ${c1} = ${V1} cm³, a drugog ${a2} · ${b2} · ${c2} = ${V2} cm³. Ukupna zapremina je zbir: ${V1} + ${V2} = ${tacan} cm³.`,
        hint: 'Izračunaj zapreminu svakog kvadra posebno, pa ih saberi.',
        signature,
        sufiks: 'cm³',
        maxDistraktor: 60_000,
      })
    }
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
