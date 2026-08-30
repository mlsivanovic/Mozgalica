// Deterministički generatori matematike za 2. razred. Opseg je prva stotina
// i tablično računanje; geometrija je tekstualna jer pitanje nema sliku.
import { bezPozajmice, bezPrenosa, zamenaCifara } from '../distraktori.ts'
import { ceoBroj, izaberi, type Rng } from '../random.ts'
import type { GeneratorConfig, TopicGenerator } from '../types.ts'
import { dvaImena, genMn, izaberiPredmet, kolicina } from '../moduli/zajednicko.ts'
import { uRimski } from '../moduli/rimski.ts'
import {
  najblizaDesetica, oduzmiPar, racun, saberiPar, tablica, tvrdnja, upakujIzbor,
} from './zajednicko2.ts'

function tekstSabiranja(
  cfg: GeneratorConfig, rng: Rng, a: number, b: number, treci?: number,
): string {
  if (!cfg.wordProblems) {
    return treci == null ? `Izračunaj: ${a} + ${b} = ?` : `Izračunaj: ${a} + ${b} + ${treci} = ?`
  }
  const predmet = izaberiPredmet(rng)
  const [ime1, ime2] = dvaImena(rng)
  if (treci == null) {
    return izaberi(rng, [
      `${ime1} ima ${kolicina(a, predmet, 'akuz')}, a ${ime2} ima ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} imaju zajedno?`,
      `U jednoj kutiji je ${kolicina(a, predmet)}, a u drugoj ${kolicina(b, predmet)}. Koliko je ukupno ${genMn(predmet)}?`,
    ])
  }
  return `${ime1} sakupi redom ${kolicina(a, predmet, 'akuz')}, ${kolicina(b, predmet, 'akuz')} i još ${kolicina(treci, predmet, 'akuz')}. Koliko je to ukupno ${genMn(predmet)}?`
}

function tekstOduzimanja(cfg: GeneratorConfig, rng: Rng, a: number, b: number): string {
  if (!cfg.wordProblems) return `Izračunaj: ${a} − ${b} = ?`
  const predmet = izaberiPredmet(rng)
  const [ime] = dvaImena(rng)
  return izaberi(rng, [
    `${ime} ima ${kolicina(a, predmet, 'akuz')} i da ${kolicina(b, predmet, 'akuz')}. Koliko ${genMn(predmet)} mu ostaje?`,
    `Na polici je bilo ${kolicina(a, predmet)}. Uzeto je ${kolicina(b, predmet, 'akuz')}. Koliko je ostalo ${genMn(predmet)}?`,
  ])
}

export const brojeviDo100: TopicGenerator = {
  slug: 'brojevi-do-100-2', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const n = ceoBroj(rng, 1, 99)
      const smer = rng() < 0.5 ? 1 : -1
      const tacan = n + smer
      if (tacan < 0 || tacan > 100) return null
      const signature = `brojevi2:sused:${n}:${smer}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `${smer < 0 ? 'Prethodnik' : 'Sledbenik'} broja ${n} je:`, tacan,
        [n, n - smer, tacan + smer], `${n} ${smer < 0 ? '− 1' : '+ 1'} = ${tacan}.`,
        'Prethodnik je za jedan manji, a sledbenik za jedan veći.', signature)
    }
    if (t === 2) {
      const n = ceoBroj(rng, 10, 99)
      const desetice = Math.floor(n / 10)
      const signature = `brojevi2:desetice:${n}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko desetica ima broj ${n}?`, desetice,
        [n % 10, desetice + 1, n], `Broj ${n} ima ${desetice} desetica i ${n % 10} jedinica.`,
        'Prva cifra dvocifrenog broja pokazuje desetice.', signature)
    }
    if (t === 3) {
      const a = ceoBroj(rng, 0, 100)
      let b = ceoBroj(rng, 0, 100)
      if (b === a) b = (a + 1) % 101
      const znak = a < b ? '<' : a > b ? '>' : '='
      const signature = `brojevi2:poredi:${a}:${b}`
      if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, {
        text: `Uporedi: ${a} __ ${b}`, tacan: znak, netacni: ['<', '=', '>'],
        explanation: `${a} ${znak} ${b}.`, hint: 'Poredi najpre desetice, pa jedinice.', signature,
      })
    }
    if (t === 4) {
      let n = ceoBroj(rng, 1, 99)
      if (n % 10 === 5) n = n + 1
      const tacan = najblizaDesetica(n)
      const signature = `brojevi2:najbliza:${n}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koja desetica je najbliža broju ${n}?`, tacan,
        [tacan + 10, tacan - 10, n],
        n % 10 < 5 ? `${n} je bliže desetici ${tacan}.` : `${n} je bliže desetici ${tacan}.`,
        'Pogledaj cifru jedinica: 1–4 naniže, 6–9 naviše.', signature)
    }
    const des = ceoBroj(rng, 1, 9)
    const jed = ceoBroj(rng, 0, 9)
    const tacan = des * 10 + jed
    const signature = `brojevi2:sastav:${des}:${jed}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, `Koji broj ima ${des} desetica i ${jed} jedinica?`, tacan,
      [jed * 10 + des, des + jed, des * 10],
      `${des} desetica i ${jed} jedinica čine broj ${tacan}.`,
      'Desetice stoje na mestu desetica, jedinice na mestu jedinica.', signature)
  },
}

export const sabiranje2: TopicGenerator = {
  slug: 'sabiranje-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t <= 3) {
      const maxSuma = t === 1 ? 20 : 100
      const [a, b] = saberiPar(rng, maxSuma, t === 3)
      const tacan = a + b
      if (tacan > 100) return null
      const signature = `sabiranje2:${a}+${b}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, tekstSabiranja(cfg, rng, a, b), tacan,
        [bezPrenosa(a, b), tacan + 10, tacan - 10, zamenaCifara(tacan)],
        `${a} + ${b} = ${tacan}.`, t === 3 ? 'Pazi na prenos preko desetice.' : 'Saberi jedinice, pa desetice.', signature)
    }
    if (t === 4) {
      if (rng() < 0.5) {
        const [a, b] = saberiPar(rng, 80, true)
        const c = ceoBroj(rng, 1, Math.max(1, 100 - (a + b)))
        const tacan = a + b + c
        if (tacan > 100) return null
        const signature = `sabiranje2:${a}+${b}+${c}`
        if (taken.has(signature)) return null
        return racun(cfg, rng, tekstSabiranja(cfg, rng, a, b, c), tacan,
          [a + b, tacan - c, bezPrenosa(a, b) + c],
          `${a} + ${b} + ${c} = ${tacan}.`, 'Zameni mesta sabiraka ako ti je lakše.', signature)
      }
      const [a, b] = saberiPar(rng, 100, true)
      const signature = `sabiranje2:zamena:${a}+${b}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj lakše: ${a} + ${b} = ${b} + □. Koji broj stoji umesto □?`, a,
        [b, a + b, b + a], `Zamenom mesta sabiraka zbir se ne menja, pa je □ = ${a}.`,
        'Zbir ne zavisi od redosleda sabiraka.', signature)
    }
    const [a, b] = saberiPar(rng, 100, true)
    const tacan = a + b
    const signature = `sabiranje2:tekst:${a}+${b}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, tekstSabiranja({ ...cfg, wordProblems: true }, rng, a, b), tacan,
      [bezPrenosa(a, b), Math.abs(a - b), tacan + 10],
      `${a} + ${b} = ${tacan}.`, 'Iz teksta izdvoji sabirke pa ih saber.', signature)
  },
}

export const oduzimanje2: TopicGenerator = {
  slug: 'oduzimanje-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t <= 3) {
      const [a, b] = oduzmiPar(rng, t === 1 ? 20 : 100, t === 3)
      const tacan = a - b
      if (tacan < 0) return null
      const signature = `oduzimanje2:${a}-${b}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, tekstOduzimanja(cfg, rng, a, b), tacan,
        [bezPozajmice(a, b), a + b, tacan + 10, zamenaCifara(tacan)],
        `${a} − ${b} = ${tacan}.`, t === 3 ? 'Ako jedinice nisu dovoljne, pozajmi deseticu.' : 'Oduzmi jedinice, pa desetice.', signature)
    }
    if (t === 4) {
      const [a, b] = oduzmiPar(rng, 100, true)
      let c = ceoBroj(rng, 0, Math.max(0, a - b))
      if (a - b - c < 0) c = 0
      const tacan = a - b - c
      const signature = `oduzimanje2:${a}-${b}-${c}`
      if (taken.has(signature)) return null
      const text = cfg.wordProblems
        ? tekstOduzimanja(cfg, rng, a, b + c)
        : `Izračunaj: ${a} − ${b} − ${c} = ?`
      return racun(cfg, rng, text, tacan,
        [a - b, a - c, bezPozajmice(a, b) - c],
        `${a} − ${b} − ${c} = ${tacan}.`, 'Oduzimaj redom i ne idi u minus.', signature)
    }
    const [a, b] = oduzmiPar(rng, 100, true)
    const tacan = a - b
    const signature = `oduzimanje2:tekst:${a}-${b}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, tekstOduzimanja({ ...cfg, wordProblems: true }, rng, a, b), tacan,
      [bezPozajmice(a, b), a + b, tacan + 10],
      `${a} − ${b} = ${tacan}.`, 'Iz teksta izdvoji umanjenik i umanjilac.', signature)
  },
}

export const mnozenje2: TopicGenerator = {
  slug: 'mnozenje-2', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t <= 3) {
      const cinioci = t === 1 ? [2, 5, 10] : t === 2 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 7, 8, 9, 10]
      const [a, b] = tablica(rng, cinioci)
      const tacan = a * b
      const signature = `mnozenje2:${a}x${b}`
      if (taken.has(signature)) return null
      const text = cfg.wordProblems
        ? `${dvaImena(rng)[0]} ima ${a} kutije sa po ${b} ${genMn(izaberiPredmet(rng))}. Koliko ih ima ukupno?`
        : `Izračunaj: ${a} · ${b} = ?`
      return racun(cfg, rng, text, tacan, [a + b, a * (b + 1), Math.abs(a - b) * b],
        `${a} · ${b} = ${tacan}.`, 'Množenje je sabiranje jednakih sabiraka.', signature)
    }
    if (t === 4) {
      if (rng() < 0.5) {
        const n = ceoBroj(rng, 0, 10)
        const nula = rng() < 0.5
        const a = nula ? 0 : 1
        const tacan = a * n
        const signature = `mnozenje2:specijal:${a}x${n}`
        if (taken.has(signature)) return null
        return racun(cfg, rng, `Izračunaj: ${a} · ${n} = ?`, tacan, [n, a + n, n + 1],
          nula ? `Nula kao činilac daje proizvod 0.` : `Jedinica kao činilac ne menja drugi činilac.`,
          nula ? 'Sve puta nula je nula.' : 'Sve puta jedan ostaje isti broj.', signature)
      }
      const [a, b] = tablica(rng, [2, 3, 4, 5, 6, 7, 8, 9])
      const signature = `mnozenje2:zamena:${a}x${b}`
      if (taken.has(signature)) return null
      return tvrdnja(cfg, rng, `${a} · ${b} = ${b} · ${a}`, true,
        `Zamenom mesta činilaca proizvod se ne menja: ${a * b}.`,
        'Redosled činilaca nije važan.', signature)
    }
    const a = ceoBroj(rng, 1, 8)
    const b = ceoBroj(rng, 1, 8)
    const c = ceoBroj(rng, 2, Math.max(2, Math.floor(100 / Math.max(1, a + b))))
    const tacan = (a + b) * c
    if (tacan > 100) return null
    const signature = `mnozenje2:zbir:${a}+${b}x${c}`
    if (taken.has(signature)) return null
    const text = cfg.wordProblems
      ? `${dvaImena(rng)[0]} ima ${a} crvene i ${b} plave sličice u svakoj od ${c} kesica. Koliko sličica ima ukupno?`
      : `Izračunaj: (${a} + ${b}) · ${c}`
    return racun(cfg, rng, text, tacan, [a + b * c, a * c + b, (a + b) + c],
      `(${a} + ${b}) · ${c} = ${a + b} · ${c} = ${tacan}.`,
      'Najpre zbir u zagradi, pa množenje.', signature)
  },
}

export const deljenje2: TopicGenerator = {
  slug: 'deljenje-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const [a, b] = tablica(rng, [2, 5, 10])
      const proizvod = a * b
      const signature = `deljenje2:${proizvod}:${a}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj: ${proizvod} : ${a} = ?`, b,
        [a, proizvod - a, b + 1], `${proizvod} : ${a} = ${b}, jer ${a} · ${b} = ${proizvod}.`,
        'Deljenje je obrnuto od množenja.', signature)
    }
    if (t === 2) {
      const d = ceoBroj(rng, 1, 10)
      const signature = `deljenje2:nula:${d}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj: 0 : ${d} = ?`, 0, [d, 1, d - 1],
        `Nula podeljena bilo kojim brojem različitim od nule daje 0.`,
        'Nula kao deljenik daje količnik 0.', signature)
    }
    if (t === 3) {
      const [a, b] = tablica(rng, [2, 3, 4, 5, 6, 7, 8, 9])
      const proizvod = a * b
      const signature = `deljenje2:veza:${proizvod}:${b}`
      if (taken.has(signature)) return null
      const text = cfg.wordProblems
        ? `${proizvod} ${genMn(izaberiPredmet(rng))} raspoređeno je u ${b} jednakih grupa. Koliko ima u jednoj grupi?`
        : `Izračunaj: ${proizvod} : ${b} = ?`
      return racun(cfg, rng, text, a, [b, proizvod - b, a + 1],
        `${a} · ${b} = ${proizvod}, pa je ${proizvod} : ${b} = ${a}.`,
        'Seti se tablice množenja.', signature)
    }
    if (t === 4) {
      const d = izaberi(rng, [2, 4, 5, 10])
      const k = ceoBroj(rng, 2, Math.floor(100 / d))
      const n = d * k
      const signature = `deljenje2:sadrzalac:${n}:${d}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko puta se broj ${d} sadrži u broju ${n}?`, k,
        [d, n - d, k + 1], `${n} : ${d} = ${k}, pa se ${d} sadrži ${k} puta.`,
        'Sadržalac je količnik tabličnog deljenja.', signature)
    }
    const [a, b] = tablica(rng, [2, 3, 4, 5, 6, 7, 8, 9])
    const proizvod = a * b
    const signature = `deljenje2:tekst:${proizvod}:${a}`
    if (taken.has(signature)) return null
    const predmet = izaberiPredmet(rng)
    const [ime] = dvaImena(rng)
    return racun(cfg, rng,
      `${ime} deli ${kolicina(proizvod, predmet, 'akuz')} u ${a} jednakih grupa. Koliko ${genMn(predmet)} ima u jednoj grupi?`,
      b, [a, proizvod - a, b + 1], `${proizvod} : ${a} = ${b}.`,
      'Ukupan broj podeli brojem grupa.', signature)
  },
}

export const kombinovane2: TopicGenerator = {
  slug: 'kombinovane-operacije-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const [a, b] = saberiPar(rng, 80, false)
      const c = ceoBroj(rng, 0, a + b)
      const tacan = a + b - c
      const signature = `kombinovane2:+-:${a}+${b}-${c}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj: ${a} + ${b} − ${c}`, tacan,
        [a + b + c, a - b + c, a + b], `${a} + ${b} = ${a + b}, zatim ${a + b} − ${c} = ${tacan}.`,
        'Sabiranje i oduzimanje rade se sleva nadesno.', signature)
    }
    if (t === 2) {
      const [a, b] = tablica(rng, [2, 3, 4, 5])
      const proizvod = a * b
      const plus = rng() < 0.5
      const c = plus ? ceoBroj(rng, 1, Math.max(1, 100 - proizvod)) : ceoBroj(rng, 0, proizvod)
      const tacan = plus ? proizvod + c : proizvod - c
      const signature = `kombinovane2:*${plus ? '+' : '-'}:${a}x${b}:${c}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj: ${a} · ${b} ${plus ? '+' : '−'} ${c}`, tacan,
        [a + b + c, a * (plus ? b + c : Math.max(0, b - c)), plus ? proizvod - c : proizvod + c],
        `Najpre ${a} · ${b} = ${proizvod}, zatim ${proizvod} ${plus ? '+' : '−'} ${c} = ${tacan}.`,
        'Množenje ide pre sabiranja i oduzimanja.', signature)
    }
    if (t === 3) {
      const b = ceoBroj(rng, 2, 9)
      const c = ceoBroj(rng, 2, 9)
      const a = ceoBroj(rng, 1, Math.max(1, 100 - b * c))
      const tacan = a + b * c
      const signature = `kombinovane2:redosled:${a}+${b}x${c}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj: ${a} + ${b} · ${c}`, tacan,
        [(a + b) * c, a + b + c, a * b + c],
        `Najpre ${b} · ${c} = ${b * c}, zatim ${a} + ${b * c} = ${tacan}.`,
        'Množenje ima prednost nad sabiranjem.', signature)
    }
    if (t === 4) {
      const a = ceoBroj(rng, 2, 20)
      const b = ceoBroj(rng, 1, 15)
      const zbir = a + b
      const c = ceoBroj(rng, 2, Math.max(2, Math.min(9, Math.floor(100 / zbir))))
      const tacan = zbir * c
      if (tacan > 100) return null
      const signature = `kombinovane2:zagrada:${a}+${b}x${c}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj: (${a} + ${b}) · ${c}`, tacan,
        [a + b * c, a * c + b, zbir + c],
        `(${a} + ${b}) = ${zbir}, zatim ${zbir} · ${c} = ${tacan}.`,
        'Zagrade se računaju prve.', signature)
    }
    const a = ceoBroj(rng, 4, 20)
    const b = ceoBroj(rng, 2, 8)
    const c = ceoBroj(rng, 1, Math.min(9, a))
    const tacan = a * b - c
    if (tacan < 0 || tacan > 100) return null
    const signature = `kombinovane2:tekst:${a}x${b}-${c}`
    if (taken.has(signature)) return null
    const predmet = izaberiPredmet(rng)
    const [ime] = dvaImena(rng)
    const text = cfg.wordProblems
      ? `${ime} ima ${a} kutije sa po ${b} ${genMn(predmet)} i da ${kolicina(c, predmet, 'akuz')}. Koliko ${genMn(predmet)} mu ostaje?`
      : `Izračunaj: ${a} · ${b} − ${c}`
    return racun(cfg, rng, text, tacan, [a * b + c, a * (b - c), a + b - c],
      `${a} · ${b} = ${a * b}, zatim ${a * b} − ${c} = ${tacan}.`,
      'Najpre množenje, pa oduzimanje.', signature)
  },
}

export const jednacine2: TopicGenerator = {
  slug: 'jednacine-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    let text: string, x: number, explanation: string, signature: string, kandidati: number[]
    if (t === 1) {
      x = ceoBroj(rng, 1, 15)
      const a = ceoBroj(rng, 1, 15)
      const b = x + a
      if (b > 100) return null
      signature = `jednacine2:x+${a}=${b}`
      text = `Reši: x + ${a} = ${b}`
      explanation = `x = ${b} − ${a} = ${x}.`
      kandidati = [b + a, a, b]
    } else if (t === 2) {
      const a = ceoBroj(rng, 1, 20)
      x = a + ceoBroj(rng, 1, 20)
      const b = x - a
      signature = `jednacine2:x-${a}=${b}`
      text = `Reši: x − ${a} = ${b}`
      explanation = `x = ${b} + ${a} = ${x}.`
      kandidati = [b, a, Math.abs(a - b)]
    } else if (t === 3) {
      x = ceoBroj(rng, 1, 20)
      const b = ceoBroj(rng, 1, 20)
      const a = x + b
      signature = `jednacine2:${a}-x=${b}`
      text = `Reši: ${a} − x = ${b}`
      explanation = `x = ${a} − ${b} = ${x}.`
      kandidati = [a + b, b, a]
    } else if (t === 4) {
      const a = ceoBroj(rng, 2, 9)
      x = ceoBroj(rng, 2, 10)
      const b = a * x
      signature = `jednacine2:${a}x=${b}`
      text = `Reši: ${a} · x = ${b}`
      explanation = `x = ${b} : ${a} = ${x}.`
      kandidati = [a, b - a, x + 1]
    } else {
      const a = ceoBroj(rng, 2, 9)
      x = ceoBroj(rng, 2, 10)
      const b = a * x
      signature = `jednacine2:${a}x=${b}:t5`
      if (taken.has(signature)) return null
      const predmet = izaberiPredmet(rng)
      const text5 = cfg.wordProblems
        ? `${kolicina(b, predmet, 'akuz')} stavljeno je u ${a} jednakih grupa. Koliko ${genMn(predmet)} ima u jednoj grupi?`
        : `Reši: ${a} · x = ${b}`
      return racun(cfg, rng, text5, x, [a, b - a, x + 1],
        `${b} : ${a} = ${x}, pa je x = ${x}.`, 'Jednačina sa množenjem rešava se deljenjem.', signature)
    }
    if (taken.has(signature)) return null
    return racun(cfg, rng, text, x, kandidati, explanation, 'Primeni obrnutu operaciju na obe strane.', signature)
  },
}

export const deloviCeline2: TopicGenerator = {
  slug: 'delovi-celine-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t <= 3) {
      const imenilac = t === 1 ? 2 : t === 2 ? 3 : 4
      const k = ceoBroj(rng, 1, Math.floor(100 / imenilac))
      const n = k * imenilac
      const naziv = imenilac === 2 ? 'polovina' : imenilac === 3 ? 'trećina' : 'četvrtina'
      const signature = `delovi2:${imenilac}:${n}`
      if (taken.has(signature)) return null
      const text = cfg.wordProblems
        ? `${dvaImena(rng)[0]} ima ${n} sličica i da ${naziv}. Koliko sličica daje?`
        : `Koliko je ${naziv} broja ${n}?`
      return racun(cfg, rng, text, k, [n - k, n / Math.max(1, imenilac - 1), k + imenilac],
        `${naziv} od ${n} je ${n} : ${imenilac} = ${k}.`,
        `Podeli broj sa ${imenilac}.`, signature)
    }
    if (t === 4) {
      const imenilac = izaberi(rng, [2, 3, 4])
      const k = ceoBroj(rng, 2, 12)
      const n = k * imenilac
      const naziv = imenilac === 2 ? 'polovina' : imenilac === 3 ? 'trećina' : 'četvrtina'
      const signature = `delovi2:koji:${n}:${k}`
      if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, {
        text: `Broj ${k} je koji deo broja ${n}?`, tacan: naziv,
        netacni: ['polovina', 'trećina', 'četvrtina', 'celina'],
        explanation: `${k} · ${imenilac} = ${n}, pa je ${k} ${naziv} od ${n}.`,
        hint: 'Pitaj se koliko puta manji broj staje u veći.', signature,
      })
    }
    const n = ceoBroj(rng, 2, 20) * 4
    const tacan = (n / 2) + (n / 4)
    const signature = `delovi2:komb:${n}`
    if (taken.has(signature)) return null
    const text = cfg.wordProblems
      ? `Od ${n} kuglica uzeto je pola, pa još četvrtina. Koliko kuglica je uzeto?`
      : `Koliko je polovina broja ${n} uvećana za četvrtinu broja ${n}?`
    return racun(cfg, rng, text, tacan, [n / 2, n / 4, n],
      `Polovina je ${n / 2}, četvrtina ${n / 4}, zbir ${tacan}.`,
      'Izračunaj svaki deo, pa saber.', signature)
  },
}

export const novac2: TopicGenerator = {
  slug: 'novac-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const apoen = izaberi(rng, [2, 5, 10])
      const k = ceoBroj(rng, 2, Math.floor(100 / apoen))
      const signature = `novac2:komadi:${apoen}x${k}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko novčanica od ${apoen} dinara treba da se dobije ${k * apoen} dinara?`, k,
        [apoen, k + 1, k * apoen], `${k * apoen} : ${apoen} = ${k}.`,
        'Podeli iznos vrednošću apoena.', signature, 'novčanica')
    }
    if (t === 2) {
      const apoen = izaberi(rng, [2, 5, 10, 20])
      const k = ceoBroj(rng, 2, Math.min(8, Math.floor(100 / apoen)))
      const tacan = apoen * k
      const signature = `novac2:zbir:${apoen}x${k}`
      if (taken.has(signature)) return null
      const [ime] = dvaImena(rng)
      return racun(cfg, rng, `${ime} ima ${k} novčanica od ${apoen} dinara. Koliko dinara ima?`, tacan,
        [apoen + k, tacan + apoen, k], `${k} · ${apoen} = ${tacan} dinara.`,
        'Pomnoži broj novčanica vrednošću jedne.', signature, 'dinara')
    }
    if (t === 3) {
      const placa = izaberi(rng, [20, 50, 100])
      const cena = ceoBroj(rng, 1, placa - 1)
      const tacan = placa - cena
      const signature = `novac2:kusur:${placa}-${cena}`
      if (taken.has(signature)) return null
      const [ime] = dvaImena(rng)
      return racun(cfg, rng, `${ime} plaća ${placa} dinara za stvar od ${cena} dinara. Koliki je kusur?`, tacan,
        [placa + cena, cena, placa], `${placa} − ${cena} = ${tacan} dinara.`,
        'Kusur je razlika datog novca i cene.', signature, 'dinara')
    }
    if (t === 4) {
      const desetice = ceoBroj(rng, 1, 4)
      const petice = ceoBroj(rng, 1, 4)
      const tacan = desetice * 10 + petice * 5
      if (tacan > 100) return null
      const signature = `novac2:mesovito:${desetice}x10+${petice}x5`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko dinara je ${desetice} novčanica od 10 i ${petice} od 5 dinara?`, tacan,
        [desetice * 5 + petice * 10, desetice + petice, tacan + 5],
        `${desetice} · 10 + ${petice} · 5 = ${tacan}.`,
        'Izračunaj svaku vrstu apoena, pa saber.', signature, 'dinara')
    }
    const c1 = ceoBroj(rng, 5, 30)
    const c2 = ceoBroj(rng, 5, 30)
    const suma = c1 + c2
    if (suma > 100) return null
    const placa = suma <= 50 ? 50 : 100
    const tacan = placa - suma
    const signature = `novac2:dva:${c1}+${c2}:${placa}`
    if (taken.has(signature)) return null
    const [ime] = dvaImena(rng)
    return racun(cfg, rng,
      `${ime} kupuje dve stvari od ${c1} i ${c2} dinara i daje ${placa} dinara. Koliki je kusur?`,
      tacan, [placa - c1, suma, placa + suma],
      `${c1} + ${c2} = ${suma}, kusur ${placa} − ${suma} = ${tacan}.`,
      'Saberi cene, pa oduzmi od datog novca.', signature, 'dinara')
  },
}

export const rimski2: TopicGenerator = {
  slug: 'rimski-brojevi-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    let n: number
    if (t === 1) n = ceoBroj(rng, 1, 12)
    else if (t === 2) n = ceoBroj(rng, 1, 20)
    else if (t === 3) n = ceoBroj(rng, 1, 50)
    else if (t === 4) n = izaberi(rng, [4, 9, 14, 19, 24, 29, 34, 39, 40, 44, 49])
    else n = ceoBroj(rng, 1, 100)
    const rimskiZapis = uRimski(n)
    const arabic = rng() < 0.5
    const signature = `rimski2:${arabic ? 'ar' : 'ri'}:${n}`
    if (taken.has(signature)) return null
    if (arabic) {
      return racun(cfg, rng, `Koji broj je zapisan rimskim ciframa: ${rimskiZapis}?`, n,
        [n + 1, n - 1, n + 10].map((x) => Math.max(1, x)),
        `${rimskiZapis} = ${n}.`, 'Saberi vrednosti znakova, pazeći na oduzimanje (IV, IX, XL).', signature)
    }
    const netacni = [n + 1, n - 1, n + 10, n + 5]
      .map((x) => Math.max(1, Math.min(100, x)))
      .filter((x) => x !== n)
      .map(uRimski)
    return upakujIzbor(cfg, rng, {
      text: `Kako se rimskim ciframa piše broj ${n}?`, tacan: rimskiZapis, netacni,
      explanation: `${n} se piše ${rimskiZapis}.`,
      hint: 'I=1, V=5, X=10, L=50, C=100. Manji znak ispred većeg se oduzima.', signature,
    })
  },
}

export const nizovi2: TopicGenerator = {
  slug: 'nizovi-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const korak = izaberi(rng, [2, 5, 10])
      const start = ceoBroj(rng, 1, 40)
      const clanovi = [0, 1, 2, 3].map((i) => start + i * korak)
      const sledeci = start + 4 * korak
      if (sledeci > 100) return null
      const signature = `nizovi2:${start},${korak}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Nastavi niz: ${clanovi.join(', ')}, □`, sledeci,
        [sledeci + korak, clanovi[3] + 1, sledeci - 1],
        `Svaki sledeći član veći je za ${korak}, pa je □ = ${sledeci}.`,
        'Nađi za koliko raste niz.', signature)
    }
    if (t === 2) {
      const rastuci = rng() < 0.5
      const korak = ceoBroj(rng, 2, 8)
      const start = rastuci ? ceoBroj(rng, 1, 50) : ceoBroj(rng, korak * 5, 90)
      const smer = rastuci ? 1 : -1
      const clanovi = [0, 1, 2, 3].map((i) => start + i * korak * smer)
      const sledeci = start + 4 * korak * smer
      if (sledeci < 0 || sledeci > 100 || clanovi.some((x) => x < 0 || x > 100)) return null
      const signature = `nizovi2:${start},${korak * smer}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Nastavi niz: ${clanovi.join(', ')}, □`, sledeci,
        [sledeci + smer, clanovi[3] + korak, Math.abs(sledeci - korak)],
        `Korak je ${rastuci ? '+' : '−'}${korak}, pa je □ = ${sledeci}.`,
        'Proveri da li niz raste ili opada.', signature)
    }
    if (t === 3) {
      const p = ceoBroj(rng, 2, 8)
      const q = ceoBroj(rng, 1, p - 1)
      const start = ceoBroj(rng, q + 1, 40)
      const clanovi = [start, start + p, start + p - q, start + 2 * p - q]
      const sledeci = start + 2 * p - 2 * q
      if (clanovi.some((x) => x < 0 || x > 100) || sledeci < 0 || sledeci > 100) return null
      const signature = `nizovi2:naizm:${start},${p},${q}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Nastavi niz: ${clanovi.join(', ')}, □`, sledeci,
        [sledeci + p, clanovi[3] + p, sledeci + q],
        `Naizmenično +${p} i −${q}, pa je sledeći ${sledeci}.`,
        'Pogledaj dva koraka koji se smenjuju.', signature)
    }
    if (t === 4) {
      const a = ceoBroj(rng, 2, 9)
      const clanovi = [1, 2, 3, 4].map((i) => a * i)
      const sledeci = a * 5
      if (sledeci > 100) return null
      const signature = `nizovi2:tablica:${a}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Nastavi niz: ${clanovi.join(', ')}, □`, sledeci,
        [sledeci + a, clanovi[3] + 1, a * 4],
        `To je tablica broja ${a}: sledeći je 5 · ${a} = ${sledeci}.`,
        'Niz su uzastopni proizvodi istog činioca.', signature)
    }
    const korak = izaberi(rng, [2, 3, 4, 5])
    const start = ceoBroj(rng, 1, 20)
    const clanovi = [0, 1, 2, 3].map((i) => start + i * korak)
    const sledeci = start + 4 * korak
    if (sledeci > 100) return null
    const signature = `nizovi2:ekspert:${start},${korak}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, `U nizu ${clanovi.join(', ')}, □ koji je peti član?`, sledeci,
      [start + 5 * korak, clanovi[3], sledeci - korak],
      `Korak je ${korak}, peti član je ${sledeci}.`,
      'Prebroj korake od prvog do petog člana.', signature)
  },
}

export const tabele2: TopicGenerator = {
  slug: 'tabele-i-dijagrami-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    const podaci = [ceoBroj(rng, 2, 20), ceoBroj(rng, 2, 20), ceoBroj(rng, 2, 20), ceoBroj(rng, 2, 20)]
    const dani = ['ponedeljak', 'utorak', 'sreda', 'četvrtak'] as const
    const tabela = dani.map((d, i) => `${d} ${podaci[i]}`).join(', ')
    const signature = `tabele2:${t}:${podaci.join(',')}`
    if (taken.has(signature)) return null
    if (t === 1) {
      return racun(cfg, rng, `Tabela pročitanih strana: ${tabela}. Koliko je pročitano u sredu?`, podaci[2],
        [podaci[0], podaci[1], podaci[3]], `Uz sredu stoji ${podaci[2]}.`,
        'Pronađi traženi dan u tabeli.', signature)
    }
    if (t === 2) {
      const tacan = podaci[0] + podaci[1]
      return racun(cfg, rng, `Podaci su: ${tabela}. Koliko je ukupno pročitano u ponedeljak i utorak?`, tacan,
        [podaci[0], podaci[1], podaci.reduce((a, b) => a + b, 0)],
        `${podaci[0]} + ${podaci[1]} = ${tacan}.`, 'Saberi samo tražene dane.', signature)
    }
    if (t === 3) {
      const max = Math.max(...podaci)
      const dan = dani[podaci.indexOf(max)]
      return upakujIzbor(cfg, rng, {
        text: `Stubičasti dijagram ima vrednosti: ${tabela}. Koji dan ima najviši stubić?`,
        tacan: dan, netacni: [...dani],
        explanation: `Najveća vrednost je ${max} (${dan}).`,
        hint: 'Najviši stubić odgovara najvećem broju.', signature,
      })
    }
    if (t === 4) {
      const tacan = Math.abs(podaci[0] - podaci[1])
      return racun(cfg, rng, `Podaci: ${tabela}. Za koliko se razlikuju ponedeljak i utorak?`, tacan,
        [podaci[0] + podaci[1], podaci[0], podaci[1]],
        `|${podaci[0]} − ${podaci[1]}| = ${tacan}.`, 'Oduzmi manji broj od većeg.', signature)
    }
    const zbir3 = podaci[0] + podaci[1] + podaci[2]
    const cilj = zbir3 + podaci[3]
    return racun(cfg, rng,
      `Za tri dana pročitano je ${podaci[0]}, ${podaci[1]} i ${podaci[2]} strana. Ukupno za četiri dana ${cilj}. Koliko je pročitano četvrtog dana?`,
      podaci[3], [cilj - podaci[0], zbir3, cilj],
      `${cilj} − (${podaci[0]} + ${podaci[1]} + ${podaci[2]}) = ${podaci[3]}.`,
      'Od ukupnog zbira oduzmi poznate dane.', signature)
  },
}

export const geometrija2: TopicGenerator = {
  slug: 'geometrija-2', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const pojmovi = [
        ['dva kraja i konačnu dužinu', 'duž'],
        ['jedan početak i prostire se neograničeno u jednom smeru', 'poluprava'],
        ['nema ni početak ni kraj', 'prava'],
      ] as const
      const [opis, tacan] = izaberi(rng, pojmovi)
      const signature = `geometrija2:pojam:${tacan}`
      if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, {
        text: `Koji geometrijski objekat ima ${opis}?`, tacan,
        netacni: ['duž', 'prava', 'poluprava', 'tačka'],
        explanation: `Opis odgovara pojmu: ${tacan}.`,
        hint: 'Uporedi broj krajeva i da li se objekat prostire neograničeno.', signature,
      })
    }
    if (t === 2) {
      const a = ceoBroj(rng, 2, 20)
      const b = ceoBroj(rng, 2, 20)
      const c = ceoBroj(rng, 2, 20)
      const tacan = a + b + c
      if (tacan > 100) return null
      const signature = `geometrija2:izlomljena:${a}+${b}+${c}`
      if (taken.has(signature)) return null
      return racun(cfg, rng,
        `Izlomljena linija sastavljena je od duži ${a} cm, ${b} cm i ${c} cm. Kolika je njena dužina?`,
        tacan, [a + b, Math.max(a, b, c), tacan - a],
        `${a} + ${b} + ${c} = ${tacan} cm.`,
        'Dužina izlomljene linije je zbir duži.', signature, 'cm')
    }
    if (t === 3) {
      const figura = izaberi(rng, ['kvadrat', 'pravougaonik', 'trougao'] as const)
      if (figura === 'kvadrat') {
        const a = ceoBroj(rng, 2, 20)
        const signature = `geometrija2:obim:kvadrat:${a}`
        if (taken.has(signature)) return null
        return racun(cfg, rng,
          `Kvadrat ima sve četiri stranice po ${a} cm. Koliki je obim?`, 4 * a,
          [2 * a, 3 * a, a * a], `${a} + ${a} + ${a} + ${a} = ${4 * a} cm.`,
          'Obim je zbir svih stranica.', signature, 'cm')
      }
      if (figura === 'pravougaonik') {
        const a = ceoBroj(rng, 5, 20)
        let b = ceoBroj(rng, 2, 15)
        if (b === a) b = a + 1
        const tacan = a + b + a + b
        const signature = `geometrija2:obim:pravougaonik:${a}x${b}`
        if (taken.has(signature)) return null
        return racun(cfg, rng,
          `Pravougaonik ima stranice ${a} cm i ${b} cm. Koliki je obim?`, tacan,
          [a + b, 2 * a + b, a * b], `${a} + ${b} + ${a} + ${b} = ${tacan} cm.`,
          'Saberi sve četiri stranice.', signature, 'cm')
      }
      const a = ceoBroj(rng, 3, 15)
      const b = ceoBroj(rng, 3, 15)
      const c = ceoBroj(rng, 3, 15)
      const tacan = a + b + c
      const signature = `geometrija2:obim:trougao:${a}+${b}+${c}`
      if (taken.has(signature)) return null
      return racun(cfg, rng,
        `Trougao ima stranice ${a} cm, ${b} cm i ${c} cm. Koliki je obim?`, tacan,
        [a + b, Math.max(a, b, c), a * b], `${a} + ${b} + ${c} = ${tacan} cm.`,
        'Obim trougla je zbir tri stranice.', signature, 'cm')
    }
    if (t === 4) {
      const a = ceoBroj(rng, 3, 12)
      const b = ceoBroj(rng, 3, 12)
      const isti = rng() < 0.5
      const c = isti ? a : a + 1
      const d = isti ? b : b + 2
      const signature = `geometrija2:podudarni:${a}x${b}:${c}x${d}`
      if (taken.has(signature)) return null
      return tvrdnja(cfg, rng,
        `Pravougaonik stranica ${a} cm i ${b} cm i pravougaonik stranica ${c} cm i ${d} cm su podudarni.`,
        isti,
        isti ? 'Iste dužine odgovarajućih stranica znače da su figure podudarne.'
          : 'Stranice se razlikuju, pa figure nisu podudarne.',
        'Podudarne figure imaju jednake odgovarajuće stranice.', signature)
    }
    const figura = izaberi(rng, [['kvadrat', 4], ['pravougaonik', 2], ['jednakokraki trougao', 1]] as const)
    const signature = `geometrija2:ose:${figura[0]}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, `Koliko osa simetrije ima ${figura[0]}?`, figura[1],
      [0, 1, 3, 4].filter((n) => n !== figura[1]),
      `${figura[0]} ima ${figura[1]} ${figura[1] === 1 ? 'osu' : 'ose'} simetrije.`,
      'Zamisli preklapanje figure preko prave.', signature)
  },
}

export const merenje2: TopicGenerator = {
  slug: 'merenje-2', supportedTypes: ['numeric', 'single'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const n = ceoBroj(rng, 1, 9)
      const signature = `merenje2:dm-cm:${n}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko je ${n} dm izraženo u centimetrima?`, n * 10,
        [n, n * 100, n + 10], `1 dm = 10 cm, pa je ${n} dm = ${n * 10} cm.`,
        'U jednom decimetru ima 10 centimetara.', signature, 'cm')
    }
    if (t === 2) {
      const n = ceoBroj(rng, 1, 9)
      const signature = `merenje2:m-dm:${n}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko je ${n} m izraženo u decimetrima?`, n * 10,
        [n, n * 100, n + 10], `1 m = 10 dm, pa je ${n} m = ${n * 10} dm.`,
        'U jednom metru ima 10 decimetara.', signature, 'dm')
    }
    if (t === 3) {
      const n = ceoBroj(rng, 1, 9)
      const signature = `merenje2:m-cm:${n}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko je ${n} m izraženo u centimetrima?`, n * 100,
        [n * 10, n, n * 1000], `1 m = 100 cm, pa je ${n} m = ${n * 100} cm.`,
        'U jednom metru ima 100 centimetara.', signature, 'cm')
    }
    if (t === 4) {
      if (rng() < 0.5) {
        const n = ceoBroj(rng, 1, 3)
        const signature = `merenje2:cas-min:${n}`
        if (taken.has(signature)) return null
        return racun(cfg, rng, `Koliko minuta ima u ${n} ${n === 1 ? 'času' : 'časa'}?`, n * 60,
          [n * 24, n * 10, 60], `1 čas = 60 minuta, pa je ${n} · 60 = ${n * 60}.`,
          'U jednom času ima 60 minuta.', signature, 'minuta')
      }
      const signature = 'merenje2:godina-mesec'
      if (taken.has(signature)) return null
      return racun(cfg, rng, 'Koliko meseci ima u jednoj godini?', 12,
        [10, 24, 7], 'Godina ima 12 meseci.', 'Seti se kalendara.', signature, 'meseci')
    }
    if (rng() < 0.5) {
      const m = ceoBroj(rng, 1, 5)
      const dm = ceoBroj(rng, 1, 9)
      const tacan = m * 10 + dm
      const signature = `merenje2:mesovito:${m}m${dm}dm`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliko je ${m} m ${dm} dm izraženo u decimetrima?`, tacan,
        [m + dm, m * 10, m * 100 + dm],
        `${m} m = ${m * 10} dm, plus ${dm} dm daje ${tacan} dm.`,
        'Pretvori metre u decimetre, pa saber.', signature, 'dm')
    }
    const h = ceoBroj(rng, 1, 2)
    const min = izaberi(rng, [10, 15, 20, 30, 45])
    const tacan = h * 60 + min
    const signature = `merenje2:vreme:${h}h${min}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, `Koliko minuta je ${h} ${h === 1 ? 'čas' : 'časa'} i ${min} minuta?`, tacan,
      [h * 60, min, h + min], `${h} · 60 + ${min} = ${tacan} minuta.`,
      'Časove pretvori u minute, pa saber.', signature, 'minuta')
  },
}

export const MODULI2: TopicGenerator[] = [
  brojeviDo100, sabiranje2, oduzimanje2, mnozenje2, deljenje2, kombinovane2,
  jednacine2, deloviCeline2, novac2, rimski2, nizovi2, tabele2, geometrija2, merenje2,
]
