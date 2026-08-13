// Generator: nejednačine (4. razred) — a·x ? b, a:x ? b, x:a ? b sa velikim
// brojevima, dupla granica (uklj. "koliko rešenja"), nepoznata unutar zagrade
// a·(x±b) [± d] ? c, i deljenje N:(x±b) ? c (pravac nejednakosti se OKREĆE kod
// deljenja, jer je količnik OPADAJUĆA funkcija delioca). Traži se granični ceo
// broj x — isti princip kao src/generator/moduli/nejednacine.ts.
import { ceoBroj, izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { upakujRacun } from '../moduli/zajednicko.ts'

const MAX_DISTRAKTOR = 2_000_000

export const nejednacine4: TopicGenerator = {
  slug: 'nejednacine-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1) {
      // a · x ? b — granica x = k je poznata, b = a·k
      const a = ceoBroj(rng, 2, 20)
      const k = ceoBroj(rng, 5, 5_000)
      const b = a * k
      const smer = izaberi(rng, ['lt', 'gt'] as const)
      const signature = `nejednacine4:1korak:${smer}:${a},${k},${b}`
      if (taken.has(signature)) return null
      if (smer === 'lt') {
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${a} · x < ${b}. Koji je najveći mogući ceo broj x?`,
          tacan: k - 1,
          kandidati: [k, k + 1, k - 2],
          explanation: `${a} · x < ${b} znači x < ${k} (jer ${a} · ${k} = ${b}). Najveći ceo broj manji od ${k} je ${k - 1}.`,
          hint: 'Podeli obe strane sa a da dobiješ granicu za x.',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${a} · x > ${b}. Koji je najmanji mogući ceo broj x?`,
        tacan: k + 1,
        kandidati: [k, k - 1, k + 2],
        explanation: `${a} · x > ${b} znači x > ${k} (jer ${a} · ${k} = ${b}). Najmanji ceo broj veći od ${k} je ${k + 1}.`,
        hint: 'Podeli obe strane sa a da dobiješ granicu za x.',
        signature,
        maxDistraktor: MAX_DISTRAKTOR,
      })
    }

    if (cfg.difficulty === 2) {
      // Tri oblika mešano: a·x?b (veći), x:a?b, i a:x?b (deljenje delilcem x — OKREĆE pravac!)
      const oblik = izaberi(rng, ['axb', 'xab', 'abx'] as const)
      if (oblik === 'axb') {
        const a = ceoBroj(rng, 2, 80)
        const k = ceoBroj(rng, 5, 20_000)
        const b = a * k
        const smer = izaberi(rng, ['lt', 'gt'] as const)
        const signature = `nejednacine4:1korak:${smer}:${a},${k},${b}`
        if (taken.has(signature)) return null
        if (smer === 'lt') {
          return upakujRacun(cfg, rng, {
            text: `Data je nejednačina ${a} · x < ${b}. Koji je najveći mogući ceo broj x?`,
            tacan: k - 1,
            kandidati: [k, k + 1, k - 2],
            explanation: `${a} · x < ${b} znači x < ${k} (jer ${a} · ${k} = ${b}). Najveći ceo broj manji od ${k} je ${k - 1}.`,
            hint: 'Podeli obe strane sa a da dobiješ granicu za x.',
            signature,
            maxDistraktor: MAX_DISTRAKTOR,
          })
        }
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${a} · x > ${b}. Koji je najmanji mogući ceo broj x?`,
          tacan: k + 1,
          kandidati: [k, k - 1, k + 2],
          explanation: `${a} · x > ${b} znači x > ${k} (jer ${a} · ${k} = ${b}). Najmanji ceo broj veći od ${k} je ${k + 1}.`,
          hint: 'Podeli obe strane sa a da dobiješ granicu za x.',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      if (oblik === 'xab') {
        // x : a ? b — x je deljenik, isti pravac kao a·x (raste sa x)
        const a = ceoBroj(rng, 2, 50)
        const b = ceoBroj(rng, 2, 500)
        const k = a * b // granica za x
        const smer = izaberi(rng, ['lt', 'gt'] as const)
        const signature = `nejednacine4:xab:${smer}:${a},${b},${k}`
        if (taken.has(signature)) return null
        if (smer === 'lt') {
          return upakujRacun(cfg, rng, {
            text: `Data je nejednačina x : ${a} < ${b}. Koji je najveći mogući ceo broj x?`,
            tacan: k - 1,
            kandidati: [k, k + 1, k - 2],
            explanation: `x : ${a} < ${b} znači x < ${k} (jer ${k} : ${a} = ${b}). Najveći ceo broj manji od ${k} je ${k - 1}.`,
            hint: 'Pomnoži obe strane sa a da dobiješ granicu za x.',
            signature,
            maxDistraktor: MAX_DISTRAKTOR,
          })
        }
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina x : ${a} > ${b}. Koji je najmanji mogući ceo broj x?`,
          tacan: k + 1,
          kandidati: [k, k - 1, k + 2],
          explanation: `x : ${a} > ${b} znači x > ${k} (jer ${k} : ${a} = ${b}). Najmanji ceo broj veći od ${k} je ${k + 1}.`,
          hint: 'Pomnoži obe strane sa a da dobiješ granicu za x.',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      // a : x ? b — x je DELILAC — količnik OPADA kad x raste, pravac se okreće!
      const x0 = ceoBroj(rng, 5, 500)
      const b = ceoBroj(rng, 2, 50)
      const a = x0 * b
      const smer = izaberi(rng, ['lt', 'gt'] as const)
      const signature = `nejednacine4:abx:${smer}:${a},${b},${x0}`
      if (taken.has(signature)) return null
      if (smer === 'gt') {
        // a:x > b ⟺ x < x0 (manji delilac daje veći količnik)
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${a} : x > ${b}. Koji je najveći mogući ceo broj x?`,
          tacan: x0 - 1,
          kandidati: [x0, x0 + 1, x0 - 2],
          explanation: `${a} : x > ${b} znači x < ${x0} (jer ${a} : ${x0} = ${b} — manji delilac daje veći količnik). Najveći ceo broj manji od ${x0} je ${x0 - 1}.`,
          hint: 'Pažljivo: kod deljenja, VEĆI delilac daje MANJI količnik — pravac nejednačine se okreće!',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      // a:x < b ⟺ x > x0
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${a} : x < ${b}. Koji je najmanji mogući ceo broj x?`,
        tacan: x0 + 1,
        kandidati: [x0, x0 - 1, x0 + 2],
        explanation: `${a} : x < ${b} znači x > ${x0} (jer ${a} : ${x0} = ${b} — veći delilac daje manji količnik). Najmanji ceo broj veći od ${x0} je ${x0 + 1}.`,
        hint: 'Pažljivo: kod deljenja, VEĆI delilac daje MANJI količnik — pravac nejednačine se okreće!',
        signature,
        maxDistraktor: MAX_DISTRAKTOR,
      })
    }

    if (cfg.difficulty === 3) {
      // Dupla granica L < x < U, veliki brojevi; ili "koliko celih rešenja ima"
      const L = ceoBroj(rng, 2, 500_000)
      const U = L + ceoBroj(rng, 2, 50_000)
      const trazi = izaberi(rng, ['max', 'min', 'koliko'] as const)
      const signature = `nejednacine4:dva:${L},${U},${trazi}`
      if (taken.has(signature)) return null

      if (trazi === 'max') {
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${L} < x < ${U}. Koji je najveći mogući ceo broj x?`,
          tacan: U - 1,
          kandidati: [U, L, L + 1],
          explanation: `Najveći ceo broj manji od ${U} (a veći od ${L}) je ${U - 1}.`,
          hint: 'Traži broj tik ispod gornje granice.',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      if (trazi === 'min') {
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${L} < x < ${U}. Koji je najmanji mogući ceo broj x?`,
          tacan: L + 1,
          kandidati: [L, U, U - 1],
          explanation: `Najmanji ceo broj veći od ${L} (a manji od ${U}) je ${L + 1}.`,
          hint: 'Traži broj tik iznad donje granice.',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      const brojResenja = U - L - 1
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${L} < x < ${U}. Koliko celih brojeva x zadovoljava ovu nejednačinu?`,
        tacan: brojResenja,
        kandidati: [U - L, U - L + 1, brojResenja + 1, brojResenja - 1],
        explanation: `Celi brojevi između ${L} i ${U} (bez njih samih) su ${L + 1}, ${L + 2}, ..., ${U - 1} — ima ih ${U - 1} − ${L + 1} + 1 = ${brojResenja}.`,
        hint: 'Prebroj koliko celih brojeva ima strogo između donje i gornje granice (ne uklj. granice).',
        signature,
        maxDistraktor: MAX_DISTRAKTOR,
      })
    }

    if (cfg.difficulty === 4) {
      // a · (x ± b) ? c — nepoznata unutar zagrade
      const a = ceoBroj(rng, 2, 20)
      const k = ceoBroj(rng, 5, 3_000) // granica za x
      const oblik = rng() < 0.5 ? '+' : '-'
      // Za oblik "-" mora biti b < k da (x−b) granica ostane nenegativna (bez negativnih brojeva u N0).
      const b = oblik === '+' ? ceoBroj(rng, 2, 500) : ceoBroj(rng, 2, Math.max(2, Math.min(500, k - 1)))
      const unutarnjaGranica = oblik === '+' ? k + b : k - b // granica za (x±b)
      const c = a * unutarnjaGranica
      const smer = izaberi(rng, ['lt', 'gt'] as const)
      const signature = `nejednacine4:zagrada:${smer}:${oblik}:${a},${b},${k}`
      if (taken.has(signature)) return null

      const izraz = `${a} · (x ${oblik === '+' ? '+' : '−'} ${b})`
      if (smer === 'lt') {
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${izraz} < ${c}. Koji je najveći mogući ceo broj x?`,
          tacan: k - 1,
          kandidati: [k, k + 1, k - 2],
          explanation: `${izraz} < ${c} znači x ${oblik === '+' ? '+' : '−'} ${b} < ${unutarnjaGranica}, pa x < ${k}. Najveći ceo broj manji od ${k} je ${k - 1}.`,
          hint: `Prvo podeli obe strane sa ${a}, pa poništi ${oblik === '+' ? 'sabiranje' : 'oduzimanje'} sa ${b}.`,
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${izraz} > ${c}. Koji je najmanji mogući ceo broj x?`,
        tacan: k + 1,
        kandidati: [k, k - 1, k + 2],
        explanation: `${izraz} > ${c} znači x ${oblik === '+' ? '+' : '−'} ${b} > ${unutarnjaGranica}, pa x > ${k}. Najmanji ceo broj veći od ${k} je ${k + 1}.`,
        hint: `Prvo podeli obe strane sa ${a}, pa poništi ${oblik === '+' ? 'sabiranje' : 'oduzimanje'} sa ${b}.`,
        signature,
        maxDistraktor: MAX_DISTRAKTOR,
      })
    }

    // Ekspert: 50/50 — a·(x±b)+d ? c (dodatni sabirak van zagrade), ili N:(x±b) ? c
    // (deljenje SA zagradom — pravac se okreće, kao kod a:x u t2).
    if (rng() < 0.5) {
      const a = ceoBroj(rng, 2, 15)
      const k = ceoBroj(rng, 5, 3_000)
      const d = ceoBroj(rng, 10, 5_000)
      const oblik = rng() < 0.5 ? '+' : '-'
      const b = oblik === '+' ? ceoBroj(rng, 2, 300) : ceoBroj(rng, 2, Math.max(2, Math.min(300, k - 1)))
      const unutarnjaGranica = oblik === '+' ? k + b : k - b
      const c = a * unutarnjaGranica + d
      const smer = izaberi(rng, ['lt', 'gt'] as const)
      const signature = `nejednacine4:zagradaplus:${smer}:${oblik}:${a},${b},${k},${d}`
      if (taken.has(signature)) return null

      const izraz = `${a} · (x ${oblik === '+' ? '+' : '−'} ${b}) + ${d}`
      if (smer === 'lt') {
        return upakujRacun(cfg, rng, {
          text: `Data je nejednačina ${izraz} < ${c}. Koji je najveći mogući ceo broj x?`,
          tacan: k - 1,
          kandidati: [k, k + 1, k - 2],
          explanation: `${izraz} < ${c} znači ${a} · (x ${oblik === '+' ? '+' : '−'} ${b}) < ${c - d}, pa x ${oblik === '+' ? '+' : '−'} ${b} < ${unutarnjaGranica}, pa x < ${k}. Najveći ceo broj manji od ${k} je ${k - 1}.`,
          hint: 'Prvo poništi sabiranje sa d, pa podeli sa a, pa poništi zagradu — redom, od kraja izraza.',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${izraz} > ${c}. Koji je najmanji mogući ceo broj x?`,
        tacan: k + 1,
        kandidati: [k, k - 1, k + 2],
        explanation: `${izraz} > ${c} znači ${a} · (x ${oblik === '+' ? '+' : '−'} ${b}) > ${c - d}, pa x ${oblik === '+' ? '+' : '−'} ${b} > ${unutarnjaGranica}, pa x > ${k}. Najmanji ceo broj veći od ${k} je ${k + 1}.`,
        hint: 'Prvo poništi sabiranje sa d, pa podeli sa a, pa poništi zagradu — redom, od kraja izraza.',
        signature,
        maxDistraktor: MAX_DISTRAKTOR,
      })
    }

    // N : (x ± b) ? c — deljenje SA zagradom, pravac se okreće (kao a:x)
    const k = ceoBroj(rng, 5, 1_000) // granica za x
    const c = ceoBroj(rng, 2, 30)
    const oblik = rng() < 0.5 ? '+' : '-'
    const b = oblik === '+' ? ceoBroj(rng, 2, 300) : ceoBroj(rng, 2, Math.max(2, Math.min(300, k - 1)))
    const unutarnjaGranica = oblik === '+' ? k + b : k - b // granica za (x±b), uvek nenegativna
    const N = unutarnjaGranica * c
    const smer = izaberi(rng, ['lt', 'gt'] as const)
    const signature = `nejednacine4:deljenjezagrada:${smer}:${oblik}:${N},${b},${c},${k}`
    if (taken.has(signature)) return null

    const izraz = `${N} : (x ${oblik === '+' ? '+' : '−'} ${b})`
    if (smer === 'gt') {
      // N:(x±b) > c ⟺ (x±b) < granica ⟺ x < k
      return upakujRacun(cfg, rng, {
        text: `Data je nejednačina ${izraz} > ${c}. Koji je najveći mogući ceo broj x?`,
        tacan: k - 1,
        kandidati: [k, k + 1, k - 2],
        explanation: `${izraz} > ${c} znači x ${oblik === '+' ? '+' : '−'} ${b} < ${unutarnjaGranica} (manji delilac daje veći količnik), pa x < ${k}. Najveći ceo broj manji od ${k} je ${k - 1}.`,
        hint: 'Pažljivo: kod deljenja, VEĆI delilac daje MANJI količnik — pravac nejednačine se okreće!',
        signature,
        maxDistraktor: MAX_DISTRAKTOR,
      })
    }
    // N:(x±b) < c ⟺ x > k
    return upakujRacun(cfg, rng, {
      text: `Data je nejednačina ${izraz} < ${c}. Koji je najmanji mogući ceo broj x?`,
      tacan: k + 1,
      kandidati: [k, k - 1, k + 2],
      explanation: `${izraz} < ${c} znači x ${oblik === '+' ? '+' : '−'} ${b} > ${unutarnjaGranica} (veći delilac daje manji količnik), pa x > ${k}. Najmanji ceo broj veći od ${k} je ${k + 1}.`,
      hint: 'Pažljivo: kod deljenja, VEĆI delilac daje MANJI količnik — pravac nejednačine se okreće!',
      signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
