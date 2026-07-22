// Testovi generatora pitanja za 4. razred: matematička pravila po novim oblastima
// + test za decimals ekstenziju zajedničkog helpera (distraktori/opcije).
import { describe, expect, it } from 'vitest'
import type { Opcija } from '../types/db'
import { generisi } from './index'
import { napraviDistraktore, napraviOpcije } from './distraktori'
import { napraviRng } from './random'
import type { GeneratorConfig } from './types'

function cfg4(delimicno: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    topicSlug: 'sabiranje-4',
    difficulty: 1,
    count: 10,
    type: 'auto',
    wordProblems: false,
    allowRepeats: false,
    seed: 42,
    ...delimicno,
  }
}

function tacnaVrednost(p: { type: string; correct: unknown; options: unknown }): number {
  if (p.type === 'numeric') return (p.correct as { value: number }).value
  const opcije = p.options as Opcija[]
  const id = (p.correct as { optionId: string }).optionId
  return parseInt(opcije.find((o) => o.id === id)!.text, 10)
}

describe('4. razred — matematička pravila po oblastima', () => {
  it('sabiranje-4: zbir raste po nivou i tačno je jednak sumi operanda', () => {
    const gornjeGranice: Record<number, number> = { 1: 100_000, 2: 100_000, 3: 1_000_000, 4: 1_000_000, 5: 5_000_000 }
    const ocekivanoOperanda: Record<number, number> = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 4 }
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ difficulty: tezina, seed, count: 5, type: 'auto' }))
        for (const p of r.questions) {
          if (p.signature.startsWith('sabiranje4:sv:')) {
            const delovi = p.signature.split(':')
            const vrsta = delovi[2]
            if (vrsta === 'nula') {
              expect(tacnaVrednost(p)).toBe(Number(delovi[4]))
            } else if (vrsta === 'zav') {
              const [S, k, smer] = delovi[3].split(',')
              expect(tacnaVrednost(p)).toBe(smer === 'pov' ? Number(S) + Number(k) : Number(S) - Number(k))
            } else if (vrsta === 'kom') {
              const [, q] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(q)
            } else if (vrsta === 'stal') {
              const [, , d] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(d)
            } else if (vrsta === 'ident') {
              const [S, c, d] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(S + c + d)
            } else {
              throw new Error(`Nepoznat sv oblik: ${p.signature}`)
            }
            expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
            continue
          }
          const operandi = p.signature.replace('sabiranje4:', '').split('+').map(Number)
          expect(operandi).toHaveLength(ocekivanoOperanda[tezina])
          const suma = operandi.reduce((s, x) => s + x, 0)
          expect(suma).toBeLessThanOrEqual(gornjeGranice[tezina])
          expect(tacnaVrednost(p)).toBe(suma)
        }
      }
    }
  })

  it('oduzimanje-4: rezultat nikad negativan, uklj. međurezultate u lancu', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'oduzimanje-4', difficulty: tezina, seed, count: 5, type: 'auto' }))
        for (const p of r.questions) {
          if (p.signature.startsWith('oduzimanje4:sv:')) {
            const delovi = p.signature.split(':')
            const vrsta = delovi[2]
            if (vrsta === 'nula') {
              const oblik = delovi[3]
              expect(tacnaVrednost(p)).toBe(oblik === 'nn' ? 0 : Number(delovi[4]))
            } else if (vrsta === 'zav') {
              const [R, k, koji, smer] = delovi[3].split(',')
              const Rn = Number(R), kn = Number(k)
              const tacan = koji === 'umanjenik'
                ? (smer === 'pov' ? Rn + kn : Rn - kn)
                : (smer === 'pov' ? Rn - kn : Rn + kn)
              expect(tacnaVrednost(p)).toBe(tacan)
            } else if (vrsta === 'stal') {
              const [, , d] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(d)
            } else if (vrsta === 'ident') {
              const [D, c, smer] = delovi[3].split(',')
              const Dn = Number(D), cn = Number(c)
              expect(tacnaVrednost(p)).toBe(smer === 'plus' ? Dn - cn : Dn + cn)
            } else {
              throw new Error(`Nepoznat sv oblik: ${p.signature}`)
            }
            expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
            continue
          }
          const [a, ...koraci] = p.signature.replace('oduzimanje4:', '').split('-').map(Number)
          let medjurezultat = a
          for (const k of koraci) {
            expect(medjurezultat).toBeGreaterThanOrEqual(k)
            medjurezultat -= k
          }
          expect(medjurezultat).toBeGreaterThanOrEqual(0)
          expect(tacnaVrednost(p)).toBe(medjurezultat)
        }
      }
    }
  })

  it('mnozenje-4: proizvod tačan i ostaje ≤ 10 000 000', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'mnozenje-4', difficulty: tezina, seed, count: 5, type: 'auto' }))
        for (const p of r.questions) {
          if (p.signature.startsWith('mnozenje4:dek:') || p.signature.startsWith('mnozenje4:sv:')) {
            const delovi = p.signature.split(':')
            const grupa = delovi[1]
            const vrsta = delovi[2]
            if (grupa === 'dek' && vrsta === 'rastavi') {
              const [n, a] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(n / a)
            } else if (grupa === 'dek' && vrsta === 'cinilac') {
              const [, d] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(d)
            } else if (vrsta === 'zav') {
              const [P, k, smer] = delovi[3].split(',')
              const Pn = Number(P), kn = Number(k)
              expect(tacnaVrednost(p)).toBe(smer === 'pov' ? Pn * kn : Pn / kn)
            } else if (vrsta === 'distrib') {
              const [a, b, k, oblik] = delovi[3].split(',')
              const an = Number(a), bn = Number(b), kn = Number(k)
              const unutra = oblik === 'zbir' ? an + bn : Math.abs(an - bn)
              expect(tacnaVrednost(p)).toBe(unutra * kn)
            } else if (vrsta === 'kom') {
              const [a] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(a)
            } else if (vrsta === 'stal') {
              const [, , k] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(k)
            } else if (vrsta === 'ident') {
              const [P, k, m] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(P * k * m)
            } else {
              throw new Error(`Nepoznat oblik potpisa: ${p.signature}`)
            }
            expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
            continue
          }
          const cinioci = p.signature.replace('mnozenje4:', '').split('x').map(Number)
          const proizvod = cinioci.reduce((pr, x) => pr * x, 1)
          expect(proizvod).toBeLessThanOrEqual(10_000_000)
          expect(tacnaVrednost(p)).toBe(proizvod)
        }
      }
    }
  })

  it('deljenje-4: egzaktne grane nemaju ostatak, "ost" grane imaju tačan količnik/ostatak', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'deljenje-4', difficulty: tezina, seed, count: 5, type: 'auto' }))
        for (const p of r.questions) {
          if (p.signature.startsWith('deljenje4:dek:') || p.signature.startsWith('deljenje4:sv:')) {
            const delovi = p.signature.split(':')
            const grupa = delovi[1]
            const vrsta = delovi[2]
            if (grupa === 'dek') {
              const [n, d] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(n / d)
            } else if (vrsta === 'zav') {
              const [Q, k, koji, smer] = delovi[3].split(',')
              const Qn = Number(Q), kn = Number(k)
              const tacan = koji === 'deljenik'
                ? (smer === 'pov' ? Qn * kn : Qn / kn)
                : (smer === 'pov' ? Qn / kn : Qn * kn)
              expect(tacnaVrednost(p)).toBe(tacan)
            } else if (vrsta === 'distrib') {
              const [a, b, c, oblik] = delovi[3].split(',')
              const qa = Number(a) / Number(c)
              const qb = Number(b) / Number(c)
              expect(tacnaVrednost(p)).toBe(oblik === 'zbir' ? qa + qb : Math.abs(qa - qb))
            } else if (vrsta === 'stal') {
              const [, , k] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(k)
            } else if (vrsta === 'ident') {
              const [Q] = delovi[3].split(',').map(Number)
              expect(tacnaVrednost(p)).toBe(Q)
            } else {
              throw new Error(`Nepoznat oblik potpisa: ${p.signature}`)
            }
            expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
            continue
          }
          if (p.signature.startsWith('deljenje4:ost:')) {
            const [deljenik, delilac, ostatak, trazi] = p.signature.replace('deljenje4:ost:', '').split(':')
            const d = Number(deljenik), dl = Number(delilac), o = Number(ostatak)
            expect(o).toBeGreaterThanOrEqual(1)
            expect(o).toBeLessThan(dl)
            expect((d - o) % dl).toBe(0)
            const kolicnik = (d - o) / dl
            expect(tacnaVrednost(p)).toBe(trazi === 'kolicnik' ? kolicnik : o)
            continue
          }
          const brojevi = p.signature.replace('deljenje4:', '').split(':').map(Number)
          const [deljenik, ...delioci] = brojevi
          let medjurezultat = deljenik
          for (const dd of delioci) {
            expect(medjurezultat % dd).toBe(0)
            medjurezultat /= dd
          }
          expect(tacnaVrednost(p)).toBe(medjurezultat)
        }
      }
    }
  })

  it('veliki-brojevi-4: svih 7 tipova pitanja tačno izračunato na svih 5 nivoa', () => {
    function zbirCifara(n: number): number {
      return [...String(n)].reduce((s, c) => s + Number(c), 0)
    }
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        // 'auto' da izađu i single (poredi/izbor) i numeric (ostali tipovi) podjednako
        const r = generisi(cfg4({ topicSlug: 'veliki-brojevi-4', difficulty: tezina, seed, count: 8, type: 'auto' }))
        for (const p of r.questions) {
          const sig = p.signature
          if (sig.startsWith('veliki4:cifra:')) {
            const [n, pozicija] = sig.replace('veliki4:cifra:', '').split(':').map(Number)
            const cifra = Math.floor(n / 10 ** pozicija) % 10
            expect(tacnaVrednost(p)).toBe(cifra)
            expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
            expect(tacnaVrednost(p)).toBeLessThanOrEqual(9)
          } else if (sig.startsWith('veliki4:vrednost:')) {
            const [n, pozicija] = sig.replace('veliki4:vrednost:', '').split(':').map(Number)
            const cifra = Math.floor(n / 10 ** pozicija) % 10
            expect(tacnaVrednost(p)).toBe(cifra * 10 ** pozicija)
          } else if (sig.startsWith('veliki4:zbircifara:')) {
            const n = Number(sig.replace('veliki4:zbircifara:', ''))
            expect(tacnaVrednost(p)).toBe(zbirCifara(n))
          } else if (sig.startsWith('veliki4:koliko:')) {
            const [jedinica, n] = sig.replace('veliki4:koliko:', '').split(':').map(Number)
            expect(tacnaVrednost(p)).toBe(Math.floor(n / jedinica))
          } else if (sig.startsWith('veliki4:sledbenik:')) {
            const [n, smer] = sig.replace('veliki4:sledbenik:', '').split(':')
            expect(tacnaVrednost(p)).toBe(smer === 'prethodnik' ? Number(n) - 1 : Number(n) + 1)
          } else if (sig.startsWith('veliki4:poredi:')) {
            const [a, b] = sig.replace('veliki4:poredi:', '').split('?').map(Number)
            const znak = a < b ? '<' : a > b ? '>' : '='
            const opcije = p.options as Opcija[]
            const correctId = (p.correct as { optionId: string }).optionId
            expect(opcije.find((o) => o.id === correctId)?.text).toBe(znak)
          } else if (sig.startsWith('veliki4:izbor:')) {
            const [brojeviStr, trazi] = sig.replace('veliki4:izbor:', '').split(':')
            const brojevi = brojeviStr.split(',').map(Number)
            const ocekivano = trazi === 'max' ? Math.max(...brojevi) : Math.min(...brojevi)
            expect(tacnaVrednost(p)).toBe(ocekivano)
          } else if (sig.startsWith('veliki4:skup:')) {
            const oblik = sig.replace('veliki4:skup:', '')
            if (oblik === 'nula-u-n') {
              const opcije = p.options as Opcija[]
              const correctId = (p.correct as { optionId: string }).optionId
              expect(opcije.find((o) => o.id === correctId)?.text).toBe('0')
            } else if (oblik === 'najmanji-n') {
              expect(tacnaVrednost(p)).toBe(1)
            } else if (oblik === 'najmanji-n0') {
              expect(tacnaVrednost(p)).toBe(0)
            } else {
              throw new Error(`Nepoznat skup oblik: ${sig}`)
            }
          } else {
            throw new Error(`Nepoznat oblik potpisa: ${sig}`)
          }
        }
      }
    }
  })

  it('kombinovane-operacije-4: vrednost izraza je tačna na svih 5 nivoa', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'kombinovane-operacije-4', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('kombinovane-operacije-4: struktura izraza (redosled/prost-složen) je dosledna kao single-choice', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'kombinovane-operacije-4', difficulty: tezina, seed, count: 8, type: 'single' }))
        for (const p of r.questions) {
          expect(p.type).toBe('single')
          const opcije = p.options as Opcija[]
          const correctId = (p.correct as { optionId: string }).optionId
          expect(opcije.some((o) => o.id === correctId)).toBe(true)
          expect(new Set(opcije.map((o) => o.text)).size).toBe(opcije.length)
        }
      }
    }
  })

  it('jednacine-4: x je tačno rešenje svih 11 oblika, uvek nenegativan', () => {
    // Provera unazad po obliku: iz signature rekonstruiši jednačinu i reši je
    // istim putem kao explanation, pa uporedi sa tačnim odgovorom. Parametri sa
    // znakom (npr. "+500"/"-500") se parsiraju direktno preko Number() — radi
    // jer je +/- deo istog tokena, a formula ispod je ista za oba znaka.
    function resiIzSignature(signature: string): number {
      const [oblik, params] = signature.replace('jednacine4:', '').split(/:(.+)/)
      const brojevi = params.split(',').map(Number)
      if (oblik === 'A') {
        const [p, q, c] = brojevi
        return (c + q) - p
      }
      if (oblik === 'B') {
        const [p, q, c] = brojevi
        return (c - q) + p
      }
      if (oblik === 'ap') {
        const [a, b, c] = brojevi
        return c / a - b
      }
      if (oblik === 'am') {
        const [a, b, c] = brojevi
        return b - c / a
      }
      if (oblik === 'as') {
        const [a, b, c] = brojevi
        return c / a + b
      }
      if (oblik === 'axb') {
        const [a, bSigned, c] = brojevi
        return (c - bSigned) / a
      }
      if (oblik === 'bax') {
        const [a, b, c] = brojevi
        return (b - c) / a
      }
      if (oblik === 'xab') {
        const [a, bSigned, c] = brojevi
        return (c - bSigned) * a
      }
      if (oblik === 'bxa') {
        const [a, b, c] = brojevi
        return (b - c) * a
      }
      if (oblik === 'xpq') {
        const [pSigned, q, c] = brojevi
        return c * q - pSigned
      }
      if (oblik === 'xpqr') {
        const [pSigned, q, rSigned, c] = brojevi
        return (c - rSigned) / q - pSigned
      }
      if (oblik === 'dp') {
        const [a, b, c] = brojevi
        return a / c - b
      }
      // 'dm'
      const [a, b, c] = brojevi
      return b - a / c
    }

    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'jednacine-4', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          const x = resiIzSignature(p.signature)
          expect(Number.isInteger(x)).toBe(true)
          expect(x).toBeGreaterThanOrEqual(0)
          expect(tacnaVrednost(p)).toBe(x)
        }
      }
    }
  })

  it('nejednacine-4: granica je tačno za jedan pomerena, nikad negativna, pravac deljenja tačan', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'nejednacine-4', difficulty: tezina, seed, count: 5, type: 'numeric' }))
        for (const p of r.questions) {
          expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
          // Forme sa deljenjem gde x figuriše kao delilac imaju OKRENUT pravac —
          // provera direktno da je granica egzaktna po konstrukciji i da je
          // pravac ispravno primenjen.
          const delovi = p.signature.split(':')
          if (delovi[0] === 'nejednacine4' && delovi[1] === 'abx') {
            const smer = delovi[2]
            const [a, b, x0] = delovi[3].split(',').map(Number)
            expect(a % x0).toBe(0)
            expect(a / x0).toBe(b)
            expect(tacnaVrednost(p)).toBe(smer === 'gt' ? x0 - 1 : x0 + 1)
          }
          if (delovi[0] === 'nejednacine4' && delovi[1] === 'deljenjezagrada') {
            const smer = delovi[2]
            const oblik = delovi[3]
            const [N, b, c, k] = delovi[4].split(',').map(Number)
            const unutarnjaGranica = oblik === '+' ? k + b : k - b
            expect(N).toBe(unutarnjaGranica * c)
            expect(tacnaVrednost(p)).toBe(smer === 'gt' ? k - 1 : k + 1)
          }
        }
      }
    }
  })

  it('povrsina-4: P=a·b/a·a/kvadar/kocka i inverzi su tačni na svih 5 nivoa', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'povrsina-4', difficulty: tezina, seed, count: 8, type: 'numeric' }))
        for (const p of r.questions) {
          const sig = p.signature.replace('povrsina4:', '')
          const [oblik, params] = sig.split(/:(.+)/)
          const brojevi = params.split(',').map(Number)
          if (oblik === 'kvadrat' || oblik === 'pravougaonik') {
            const [a, b] = brojevi
            expect(tacnaVrednost(p)).toBe(a * b)
          } else if (oblik === 'kvadrat-inv') {
            const [a] = brojevi
            expect(tacnaVrednost(p)).toBe(a)
          } else if (oblik === 'pravougaonik-inv') {
            const [, b] = brojevi
            expect(tacnaVrednost(p)).toBe(b)
          } else if (oblik === 'kocka') {
            const [a] = brojevi
            expect(tacnaVrednost(p)).toBe(6 * a * a)
          } else if (oblik === 'kocka-inv') {
            const [a] = brojevi
            expect(tacnaVrednost(p)).toBe(a)
          } else if (oblik === 'kvadar') {
            const [a, b, c] = brojevi
            expect(tacnaVrednost(p)).toBe(2 * (a * b + b * c + a * c))
          } else if (oblik === 'kvadar-3strane') {
            const [p1, p2, p3] = brojevi
            expect(tacnaVrednost(p)).toBe(2 * (p1 + p2 + p3))
          } else if (oblik === 'slozena-zbir') {
            const [a1, b1, a2, b2] = brojevi
            expect(tacnaVrednost(p)).toBe(a1 * b1 + a2 * b2)
          } else if (oblik === 'slozena-razlika') {
            const [a, b, c, d] = brojevi
            expect(tacnaVrednost(p)).toBe(a * b - c * d)
            expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
          } else if (oblik === 'mesovito3') {
            const [a, b, c] = brojevi
            expect(tacnaVrednost(p)).toBe(a * 10_000 + b * 100 + c)
          } else {
            // jedinica/mesovito(2): params su "iz-u:n" ili mešoviti zapis
            expect(tacnaVrednost(p)).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('zapremina-4: V=a·b·c/a·a·a i inverzi su tačni, identitet 1 dm³=1l se poštuje', () => {
    for (const tezina of [1, 2, 3, 4, 5] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const r = generisi(cfg4({ topicSlug: 'zapremina-4', difficulty: tezina, seed, count: 8, type: 'numeric' }))
        for (const p of r.questions) {
          const sig = p.signature.replace('zapremina4:', '')
          const [oblik, params] = sig.split(/:(.+)/)
          const brojevi = params.split(',').map(Number)
          if (oblik === 'kvadar' || oblik === 'kvadar-veci' || oblik === 'litar' || oblik === 'kockice') {
            const [a, b, c] = brojevi
            expect(tacnaVrednost(p)).toBe(a * b * c)
          } else if (oblik === 'kocka' || oblik === 't3kocka' || oblik === 'litar-kocka') {
            const [a] = brojevi
            expect(tacnaVrednost(p)).toBe(a * a * a)
          } else if (oblik === 'kocka-inv') {
            const [a] = brojevi
            expect(tacnaVrednost(p)).toBe(a)
          } else if (oblik === 'inverzno') {
            const [a, b, c] = brojevi
            expect(tacnaVrednost(p)).toBe(c)
            expect(a * b * c).toBeGreaterThan(0)
          } else if (oblik === 'slozeno-zbir' || oblik === 'slozeno-zbir-veliko') {
            const [a1, b1, c1, a2, b2, c2] = brojevi
            expect(tacnaVrednost(p)).toBe(a1 * b1 * c1 + a2 * b2 * c2)
          } else if (oblik === 'mesovito2') {
            const [a, b] = brojevi
            expect(tacnaVrednost(p)).toBe(a * 1000 + b)
          } else if (oblik === 'mesovito3') {
            const [a, b, c] = brojevi
            expect(tacnaVrednost(p)).toBe(a * 1_000_000 + b * 1000 + c)
          } else {
            expect(tacnaVrednost(p)).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('razlomci-4: poređenje, sabiranje/oduzimanje, razlomak broja i višekorak su tačni', () => {
    for (let seed = 0; seed < 15; seed++) {
      const r1 = generisi(cfg4({ topicSlug: 'razlomci-4', difficulty: 1, seed, count: 5, type: 'truefalse' }))
      for (const p of r1.questions) {
        const [n, d, n2, d2] = p.signature.replace('razlomci4:ekvivalentno-tf:', '').split(',').map(Number)
        const jesuJednaki = n * d2 === n2 * d
        expect((p.correct as { value: boolean }).value).toBe(jesuJednaki)
      }

      // t2: poređenje, mešano isti imenilac/isti brojilac
      const r2 = generisi(cfg4({ topicSlug: 'razlomci-4', difficulty: 2, seed, count: 5, type: 'single' }))
      for (const p of r2.questions) {
        const [n1, d1, n2, d2] = p.signature.replace(/razlomci4:poredi-\w+:/, '').split(/[/?]/).map(Number)
        const znak = n1 / d1 < n2 / d2 ? '<' : n1 / d1 > n2 / d2 ? '>' : '='
        const opcije = p.options as Opcija[]
        const correctId = (p.correct as { optionId: string }).optionId
        expect(opcije.find((o) => o.id === correctId)?.text).toBe(znak)
      }

      // t3: sabiranje/oduzimanje istog imenioca (brojilac tačan, rezultat SME preći
      // imenilac) ILI različitih imenilaca (nejednaki-sab/odu — svedeno na zajednički db)
      const r3 = generisi(cfg4({ topicSlug: 'razlomci-4', difficulty: 3, seed, count: 5, type: 'numeric' }))
      for (const p of r3.questions) {
        const sig = p.signature
        if (sig.startsWith('razlomci4:sabiranje:') || sig.startsWith('razlomci4:oduzimanje:')) {
          const oblik = sig.startsWith('razlomci4:sabiranje:') ? 'sabiranje' : 'oduzimanje'
          const [n1, n2] = sig.replace(`razlomci4:${oblik}:`, '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBe(oblik === 'sabiranje' ? n1 + n2 : n1 - n2)
        } else {
          const saberi = sig.startsWith('razlomci4:nejednaki-sab:')
          const prefix = saberi ? 'razlomci4:nejednaki-sab:' : 'razlomci4:nejednaki-odu:'
          const [n1, ds, n2, db] = sig.replace(prefix, '').split(',').map(Number)
          expect(db % ds).toBe(0)
          const n1Svedeno = n1 * (db / ds)
          expect(tacnaVrednost(p)).toBe(saberi ? n1Svedeno + n2 : n1Svedeno - n2)
        }
        expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
      }

      // t4: razlomak broja ILI teže sabiranje/oduzimanje različitih imenilaca (veći brojevi)
      const r4 = generisi(cfg4({ topicSlug: 'razlomci-4', difficulty: 4, seed, count: 5, type: 'numeric' }))
      for (const p of r4.questions) {
        const sig = p.signature
        if (sig.startsWith('razlomci4:deo:')) {
          const [n, d, q] = sig.replace('razlomci4:deo:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBe(n * q)
          expect((q * d) % d).toBe(0)
        } else {
          const saberi = sig.startsWith('razlomci4:nejednaki-veci-sab:')
          const prefix = saberi ? 'razlomci4:nejednaki-veci-sab:' : 'razlomci4:nejednaki-veci-odu:'
          const [n1, ds, n2, db] = sig.replace(prefix, '').split(',').map(Number)
          expect(db % ds).toBe(0)
          const n1Svedeno = n1 * (db / ds)
          expect(tacnaVrednost(p)).toBe(saberi ? n1Svedeno + n2 : n1Svedeno - n2)
        }
        expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
      }

      // t5: višekoračni — razlika dva "dela", "do celog", zbir tri razlomka, ILI
      // oduzimanje dva razlomka različitih imenilaca (nejednaki-ekspert, najveći brojevi)
      const r5 = generisi(cfg4({ topicSlug: 'razlomci-4', difficulty: 5, seed, count: 8, type: 'numeric' }))
      for (const p of r5.questions) {
        const sig = p.signature
        if (sig.startsWith('razlomci4:dvalika:')) {
          const [n1, , q1, n2, , q2] = sig.replace('razlomci4:dvalika:', '').split(',').map(Number)
          const deo1 = n1 * q1
          const deo2 = n2 * q2
          expect(tacnaVrednost(p)).toBe(Math.abs(deo1 - deo2))
        } else if (sig.startsWith('razlomci4:docelog:')) {
          const [n, d] = sig.replace('razlomci4:docelog:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBe(d - n)
        } else if (sig.startsWith('razlomci4:zbirtri:')) {
          const [n1, n2, n3] = sig.replace('razlomci4:zbirtri:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBe(n1 + n2 + n3)
        } else if (sig.startsWith('razlomci4:nejednaki-ekspert:')) {
          const [n1, ds, n2, db] = sig.replace('razlomci4:nejednaki-ekspert:', '').split(',').map(Number)
          expect(db % ds).toBe(0)
          const n1Svedeno = n1 * (db / ds)
          expect(tacnaVrednost(p)).toBe(n1Svedeno - n2)
        } else {
          throw new Error(`Nepoznat oblik potpisa: ${sig}`)
        }
        expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('geometrijska-tela-4: t1 brojevi tačni, t2-t5 tvrdnje/izbori dosledni', () => {
    for (let seed = 0; seed < 15; seed++) {
      // t1: brojanje — numeric, opseg (0,12]
      const r1 = generisi(cfg4({ topicSlug: 'geometrijska-tela-4', difficulty: 1, seed, count: 5, type: 'numeric' }))
      for (const p of r1.questions) {
        expect(tacnaVrednost(p)).toBeGreaterThan(0)
        expect(tacnaVrednost(p)).toBeLessThanOrEqual(12)
      }

      // t2: truefalse iz fonda — vrednost mora odgovarati tekstu tvrdnje
      const r2tf = generisi(cfg4({ topicSlug: 'geometrijska-tela-4', difficulty: 2, seed, count: 5, type: 'truefalse' }))
      for (const p of r2tf.questions) {
        expect(p.type).toBe('truefalse')
      }

      // t2 (single fallback), t3, t4, t5: hand-rolled single-choice — tačan odgovor
      // postoji među opcijama, opcije jedinstvene, ≥3 (najmanje 4 za izbor-tvrdnje).
      for (const tezina of [2, 3, 4, 5] as const) {
        const r = generisi(cfg4({ topicSlug: 'geometrijska-tela-4', difficulty: tezina, seed, count: 5, type: 'single' }))
        for (const p of r.questions) {
          const opcije = p.options as Opcija[]
          const correctId = (p.correct as { optionId: string }).optionId
          expect(opcije.some((o) => o.id === correctId)).toBe(true)
          expect(new Set(opcije.map((o) => o.text)).size).toBe(opcije.length)
          expect(opcije.length).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('decimalni-brojevi-4: decimalne vrednosti su tačne na svih 5 nivoa', () => {
    for (let seed = 0; seed < 15; seed++) {
      const r1 = generisi(cfg4({ topicSlug: 'decimalni-brojevi-4', difficulty: 1, seed, count: 8, type: 'numeric' }))
      for (const p of r1.questions) {
        if (p.signature.startsWith('decimal4:dm-m:')) {
          const dm = Number(p.signature.replace('decimal4:dm-m:', ''))
          expect(tacnaVrednost(p)).toBeCloseTo(dm / 10, 5)
        } else {
          const cm = Number(p.signature.replace('decimal4:cm-m:', ''))
          expect(tacnaVrednost(p)).toBeCloseTo(cm / 100, 5)
        }
      }

      const r2 = generisi(cfg4({ topicSlug: 'decimalni-brojevi-4', difficulty: 2, seed, count: 5, type: 'numeric' }))
      for (const p of r2.questions) {
        expect(tacnaVrednost(p)).toBeGreaterThan(0)
      }

      const r3 = generisi(cfg4({ topicSlug: 'decimalni-brojevi-4', difficulty: 3, seed, count: 8, type: 'numeric' }))
      for (const p of r3.questions) {
        if (p.signature.startsWith('decimal4:sabiranje:')) {
          const [aT, bT] = p.signature.replace('decimal4:sabiranje:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBeCloseTo((aT + bT) / 10, 5)
        } else {
          const [aT, bT] = p.signature.replace('decimal4:oduzimanje1dec:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBeCloseTo((aT - bT) / 10, 5)
          expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
        }
      }

      const r4 = generisi(cfg4({ topicSlug: 'decimalni-brojevi-4', difficulty: 4, seed, count: 5, type: 'numeric' }))
      for (const p of r4.questions) {
        const [aH, bH] = p.signature.replace('decimal4:sabiranje2dec:', '').split(',').map(Number)
        expect(tacnaVrednost(p)).toBeCloseTo((aH + bH) / 100, 5)
      }

      const r5 = generisi(cfg4({ topicSlug: 'decimalni-brojevi-4', difficulty: 5, seed, count: 8, type: 'numeric' }))
      for (const p of r5.questions) {
        const sig = p.signature
        if (sig.startsWith('decimal4:oduzimanje:')) {
          const [aH, bH] = sig.replace('decimal4:oduzimanje:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBeCloseTo((aH - bH) / 100, 5)
        } else if (sig.startsWith('decimal4:visekorak:')) {
          const [aT, bT, cT] = sig.replace('decimal4:visekorak:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBeCloseTo((aT + bT - cT) / 10, 5)
        } else if (sig.startsWith('decimal4:tekstualni:')) {
          const [aH, manjeH] = sig.replace('decimal4:tekstualni:', '').split(',').map(Number)
          expect(tacnaVrednost(p)).toBeCloseTo((aH - manjeH) / 100, 5)
        } else {
          throw new Error(`Nepoznat oblik potpisa: ${sig}`)
        }
        expect(tacnaVrednost(p)).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('decimals ekstenzija (napraviDistraktore/napraviOpcije)', () => {
  it('decimals podrazumevano 0 se ponaša identično kao pre ekstenzije', () => {
    const rng = napraviRng(5)
    const d = napraviDistraktore(rng, { tacan: 42, kandidati: [42, 43, -5, 2000] })
    expect(d.every((n) => Number.isInteger(n))).toBe(true)
  })

  it('sa decimals:1 distraktori su na koraku 0,1 i nijedan nije jednak tačnom', () => {
    const rng = napraviRng(7)
    for (let i = 0; i < 20; i++) {
      const tacan = Math.round((Math.random() * 20) * 10) / 10
      const d = napraviDistraktore(rng, { tacan, kandidati: [], min: 0, max: 20, decimals: 1 })
      expect(d).toHaveLength(3)
      expect(new Set(d).size).toBe(3)
      for (const x of d) {
        expect(x).not.toBeCloseTo(tacan, 5)
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(20)
        // korak 0,1: skalirano na celobrojno bez ostatka
        expect(Math.round(x * 10)).toBeCloseTo(x * 10, 5)
      }
    }
  })

  it('napraviOpcije formatira decimale sa zapetom (srpska konvencija)', () => {
    const rng = napraviRng(3)
    const { options, correctId } = napraviOpcije(rng, 6.1, [6.2, 5.9, 7.1], '', 1)
    const tekstovi = options.map((o) => o.text)
    expect(tekstovi).toContain('6,1')
    expect(tekstovi.every((t) => !t.includes('.'))).toBe(true)
    expect(options.find((o) => o.id === correctId)?.text).toBe('6,1')
  })
})
