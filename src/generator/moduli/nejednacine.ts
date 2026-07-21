// Generator: nejednačine — traži se granični ceo broj (jedinstven, proverljiv odgovor),
// umesto "koji broj zadovoljava x < 15" što ima beskonačno mnogo tačnih odgovora
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { upakujRacun } from './zajednicko'

export const nejednacine: TopicGenerator = {
  slug: 'nejednacine',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty < 3) {
      const maks = cfg.difficulty === 1 ? 50 : 500
      const N = ceoBroj(rng, 2, maks)
      const smer = izaberi(rng, ['lt', 'gt'] as const)
      const signature = `nejednacine:${smer}:${N}`
      if (taken.has(signature)) return null

      if (smer === 'lt') {
        return upakujRacun(cfg, rng, {
          text: `Koji je najveći ceo broj koji je manji od ${N}?`,
          tacan: N - 1,
          kandidati: [N, N + 1, N - 2],
          explanation: `Najveći ceo broj manji od ${N} je ${N - 1}.`,
          hint: 'Broj mora biti strogo manji od granice, dakle jedan manji.',
          signature,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Koji je najmanji ceo broj koji je veći od ${N}?`,
        tacan: N + 1,
        kandidati: [N, N - 1, N + 2],
        explanation: `Najmanji ceo broj veći od ${N} je ${N + 1}.`,
        hint: 'Broj mora biti strogo veći od granice, dakle jedan veći.',
        signature,
      })
    }

    if (cfg.difficulty === 3) {
      // Dve granice — x je između L i U
      const L = ceoBroj(rng, 2, 700)
      const U = L + ceoBroj(rng, 2, 80)
      const trazi = izaberi(rng, ['max', 'min'] as const)
      const signature = `nejednacine:dva:${L},${U},${trazi}`
      if (taken.has(signature)) return null

      if (trazi === 'max') {
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${L} < x < ${U}. Koji je najveći mogući ceo broj x?`,
          tacan: U - 1,
          kandidati: [U, L, L + 1],
          explanation: `Najveći ceo broj manji od ${U} (a veći od ${L}) je ${U - 1}.`,
          hint: 'Traži broj tik ispod gornje granice.',
          signature,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${L} < x < ${U}. Koji je najmanji mogući ceo broj x?`,
        tacan: L + 1,
        kandidati: [L, U, U - 1],
        explanation: `Najmanji ceo broj veći od ${L} (a manji od ${U}) je ${L + 1}.`,
        hint: 'Traži broj tik iznad donje granice.',
        signature,
      })
    }

    if (cfg.difficulty === 4) {
      // Granica data kao izraz (proizvod ili zbir), a ne goli broj
      const smer = izaberi(rng, ['lt', 'gt'] as const)
      const jeProizvod = rng() < 0.5
      let N: number
      let izraz: string
      if (jeProizvod) {
        // Granica proizvoda mora ostati ≤ 999 (a·x je odgovor u ovom testu granice)
        const a = ceoBroj(rng, 9, 31)
        const b = ceoBroj(rng, 8, 31)
        N = a * b
        izraz = `${a} · ${b}`
      } else {
        const a = ceoBroj(rng, 100, 470)
        const b = ceoBroj(rng, 60, 470)
        N = a + b
        izraz = `${a} + ${b}`
      }
      const signature = `nejednacine:izraz:${smer}:${izraz}`
      if (taken.has(signature)) return null

      if (smer === 'lt') {
        return upakujRacun(cfg, rng, {
          text: `Koji je najveći ceo broj koji je manji od ${izraz}?`,
          tacan: N - 1,
          kandidati: [N, N + 1, N - 2],
          explanation: `${izraz} = ${N}. Najveći ceo broj manji od ${N} je ${N - 1}.`,
          hint: 'Prvo izračunaj vrednost izraza, pa nađi broj tik ispod nje.',
          signature,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Koji je najmanji ceo broj koji je veći od ${izraz}?`,
        tacan: N + 1,
        kandidati: [N, N - 1, N + 2],
        explanation: `${izraz} = ${N}. Najmanji ceo broj veći od ${N} je ${N + 1}.`,
        hint: 'Prvo izračunaj vrednost izraza, pa nađi broj tik iznad nje.',
        signature,
      })
    }

    // Ekspert: dvokoračna granica a·x ± c ? b — prvo se poništava ±c, tek onda deli
    // sa a (jedna operacija više nego na nivou 4, a k (granica za x) sme biti
    // veliko jer se b nigde ne proverava — samo k∓1 mora ostati ≤ 1000).
    const smer = izaberi(rng, ['lt', 'gt'] as const)
    const a = ceoBroj(rng, 2, 9)
    const k = ceoBroj(rng, 5, 900)
    const ax = a * k
    const plus = rng() < 0.5
    const c = plus ? ceoBroj(rng, 3, 200) : ceoBroj(rng, 3, Math.max(3, Math.min(200, ax)))
    const b = plus ? ax + c : ax - c
    const signature = `nejednacine:dvokorak:${smer}:${plus ? '+' : '-'}:${a},${k},${c}`
    if (taken.has(signature)) return null
    if (smer === 'lt') {
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${a} · x ${plus ? '+' : '−'} ${c} < ${b}. Koji je najveći mogući ceo broj x?`,
        tacan: k - 1,
        kandidati: [k, k + 1, k - 2],
        explanation: `${a} · x ${plus ? '+' : '−'} ${c} < ${b} znači ${a} · x < ${ax}, pa x < ${k} (jer ${a} · ${k} = ${ax}). Najveći ceo broj manji od ${k} je ${k - 1}.`,
        hint: `Prvo poništi ${plus ? 'sabiranje' : 'oduzimanje'} sa ${c}, pa podeli sa ${a} da dobiješ granicu za x.`,
        signature,
      })
    }
    return upakujRacun(cfg, rng, {
      text: `Data je nejednačina ${a} · x ${plus ? '+' : '−'} ${c} > ${b}. Koji je najmanji mogući ceo broj x?`,
      tacan: k + 1,
      kandidati: [k, k - 1, k + 2],
      explanation: `${a} · x ${plus ? '+' : '−'} ${c} > ${b} znači ${a} · x > ${ax}, pa x > ${k} (jer ${a} · ${k} = ${ax}). Najmanji ceo broj veći od ${k} je ${k + 1}.`,
      hint: `Prvo poništi ${plus ? 'sabiranje' : 'oduzimanje'} sa ${c}, pa podeli sa ${a} da dobiješ granicu za x.`,
      signature,
    })
  },
}
