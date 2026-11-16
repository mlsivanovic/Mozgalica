// Deterministički generatori matematike za 5. razred. Geometrijski sadržaji
// koriste koordinate i opisane odnose, jer pitanje namerno nema slikovni payload.
import { ceoBroj, izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { kolicina, upakujRacun } from '../moduli/zajednicko.ts'
import {
  formatirajRazlomak, normalizujRazlomak, nzd, nzs, oduzmiRazlomke,
  podeliRazlomke, pomnoziRazlomke, saberiRazlomke, upakujIzbor,
  upakujRazlomak, upakujTvrdnju, uporediRazlomke, type Razlomak,
} from './zajednicko5.ts'

function racun(
  cfg: GeneratorConfig, rng: Rng, text: string, tacan: number,
  kandidati: number[], explanation: string, hint: string, signature: string,
  decimals = 0, maxDistraktor?: number,
): GenerisanoPitanje {
  return upakujRacun(cfg, rng, {
    text, tacan, kandidati, explanation, hint, signature,
    decimals,
    maxDistraktor: maxDistraktor ?? Math.max(100, Math.abs(tacan) * 3 + 30),
  })
}

function tvrdnja(
  cfg: GeneratorConfig, _rng: Rng, text: string, tacno: boolean,
  explanation: string, hint: string, signature: string,
): GenerisanoPitanje {
  return upakujTvrdnju(cfg, text, tacno, explanation, hint, signature)
}

function prost(n: number): boolean {
  if (n < 2) return false
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false
  return true
}

function prostiCinioci(n: number): number[] {
  const rezultat: number[] = []
  for (let d = 2; d * d <= n; d++) {
    while (n % d === 0) { rezultat.push(d); n /= d }
  }
  if (n > 1) rezultat.push(n)
  return rezultat
}

function skupTekst(s: Set<number>): string {
  return `{${[...s].sort((a, b) => a - b).join(', ')}}`
}

function koordinate(x: number, y: number): string {
  return `(${x}, ${y})`
}

function razlomak(rng: Rng, maxImenilac = 12, allowWhole = false): Razlomak {
  while (true) {
    const i = ceoBroj(rng, 2, maxImenilac)
    const b = ceoBroj(rng, 1, i * 2 - 1)
    if (allowWhole || b % i !== 0) return normalizujRazlomak(b, i)
  }
}

function izborRazlomka(
  cfg: GeneratorConfig, rng: Rng, text: string, tacan: Razlomak,
  explanation: string, hint: string, signature: string,
): GenerisanoPitanje {
  return upakujRazlomak(cfg, rng, {
    text, tacan,
    netacni: [
      normalizujRazlomak(tacan.b + 1, tacan.i),
      normalizujRazlomak(Math.max(1, tacan.b - 1), tacan.i),
      normalizujRazlomak(tacan.b, tacan.i + 1),
      normalizujRazlomak(tacan.b + tacan.i, tacan.i),
    ],
    explanation, hint, signature,
  })
}

export const prirodniBrojevi5: TopicGenerator = {
  slug: 'prirodni-brojevi-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const smer = rng() < 0.5 ? -1 : 1
      const n = ceoBroj(rng, smer < 0 ? 2 : 1, 100_000)
      const tacan = n + smer
      const signature = `prirodni5:sused:${n}:${smer}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `${smer < 0 ? 'Prethodnik' : 'Sledbenik'} broja ${n} je:`, tacan,
        [n, n - smer, tacan + smer], `${n} ${smer < 0 ? '− 1' : '+ 1'} = ${tacan}.`,
        'Prethodnik je za jedan manji, a sledbenik za jedan veći.', signature)
    }
    if (t === 2) {
      const d = ceoBroj(rng, 2, 30), q = ceoBroj(rng, 2, 200), o = ceoBroj(rng, 0, d - 1), a = d * q + o
      const signature = `prirodni5:ostatak:${a}:${d}:${q}:${o}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliki je ostatak pri deljenju ${a} sa ${d}?`, o,
        [q, d - o, o + 1], `${a} = ${d} · ${q} + ${o}, a ${o} < ${d}.`,
        'Zapiši deljenik u obliku delilac · količnik + ostatak.', signature)
    }
    if (t === 3) {
      const a = ceoBroj(rng, 10, 500), b = ceoBroj(rng, 2, 30), c = ceoBroj(rng, 2, 20)
      const zagrade = rng() < 0.5
      const tacan = zagrade ? (a + b) * c : a + b * c
      const text = zagrade ? `Izračunaj: (${a} + ${b}) · ${c}` : `Izračunaj: ${a} + ${b} · ${c}`
      const signature = `prirodni5:izraz:${zagrade ? 1 : 0}:${a}:${b}:${c}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, text, tacan, [a + b + c, (a + b) * c, a + b * c],
        `Primenom redosleda operacija dobija se ${tacan}.`, 'Zagrade imaju prednost, zatim množenje, pa sabiranje.', signature)
    }
    if (t === 4) {
      const x = ceoBroj(rng, 2, 80), a = ceoBroj(rng, 2, 20), b = ceoBroj(rng, 1, 100)
      const tacan = a * (x + b)
      const signature = `prirodni5:promenljiva:${x}:${a}:${b}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Izračunaj vrednost izraza ${a} · (x + ${b}) za x = ${x}.`, tacan,
        [a * x + b, x + a * b, tacan - a], `Najpre x + ${b} = ${x + b}, zatim ${a} · ${x + b} = ${tacan}.`,
        'Zameni x datom vrednošću i poštuj zagrade.', signature)
    }
    let a = ceoBroj(rng, 2, 30)
    if (a % 10 === 1 && a % 100 !== 11) a += 1
    const x = ceoBroj(rng, 20, 500), b = ceoBroj(rng, 5, 15), ukupno = a * x + b
    const signature = `prirodni5:jednacina:${x}:${a}:${b}`
    if (taken.has(signature)) return null
    const kutijeTekst = a % 10 >= 2 && a % 10 <= 4 && (a % 100 < 12 || a % 100 > 14) ? `${a} jednake kutije` : `${a} jednakih kutija`
    const text = cfg.wordProblems
      ? `U ${kutijeTekst} je po isti broj olovaka, a još ${b} olovaka je van kutija. Ukupno ih je ${ukupno}. Koliko je olovaka u svakoj kutiji?`
      : `Reši jednačinu: ${a} · x + ${b} = ${ukupno}.`
    return racun(cfg, rng, text, x, [x + b, ukupno / a, x - 1],
      `Oduzmemo ${b}: ${ukupno - b}, zatim podelimo sa ${a}: x = ${x}.`,
      'Najpre oslobodi član sa x od sabiranja, zatim od množenja.', signature)
  },
}

export const deljivost5: TopicGenerator = {
  slug: 'deljivost-5', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const d = ceoBroj(rng, 2, 15), q = ceoBroj(rng, 2, 30), n = d * q
      const signature = `deljivost5:delilac:${n}`
      if (taken.has(signature)) return null
      const kandidati = [d + 1, Math.max(2, d - 1), d + 2, d + 3, n + 1, Math.max(2, n - 1), 2, 3, 5, 7, 11, 13]
      const netacni: string[] = []
      for (const k of kandidati) {
        if (k >= 2 && n % k !== 0 && !netacni.includes(String(k))) netacni.push(String(k))
      }
      for (let k = 2; netacni.length < 3; k++) {
        if (n % k !== 0 && !netacni.includes(String(k))) netacni.push(String(k))
      }
      return upakujIzbor(cfg, rng, { text: `Koji broj je delilac broja ${n}?`, tacan: String(d),
        netacni: netacni.slice(0, 3),
        explanation: `${n} : ${d} = ${q}, bez ostatka.`, hint: 'Delilac deli broj bez ostatka.', signature })
    }
    const pravila = t === 2 ? [2, 5, 10] : [3, 4, 9, 25]
    if (t <= 3) {
      const d = izaberi(rng, pravila)
      const tacno = rng() < 0.5
      let n = tacno
        ? d * ceoBroj(rng, Math.ceil(20 / d), Math.floor(5000 / d))
        : ceoBroj(rng, 20, 5000)
      if (!tacno && n % d === 0) n += ceoBroj(rng, 1, d - 1)
      const signature = `deljivost5:pravilo:${d}:${n}`
      if (taken.has(signature)) return null
      return tvrdnja(cfg, rng, `Broj ${n} je deljiv sa ${d}.`, tacno,
        tacno ? `${n} je deljiv sa ${d} bez ostatka.` : `${n} pri deljenju sa ${d} ima ostatak ${n % d}.`,
        'Primeni pravilo deljivosti za dati delilac.', signature)
    }
    if (t === 4) {
      const d = izaberi(rng, [3, 4, 9, 25]), stotine = ceoBroj(rng, 10, 99)
      const validne = [...Array(10).keys()].filter((c) => Number(`${stotine}${c}`) % d === 0)
      if (validne.length === 0) return null
      const tacna = izaberi(rng, validne)
      const nevalidne = promesaj(rng, [...Array(10).keys()].filter((c) => !validne.includes(c))).slice(0, 3)
      if (nevalidne.length < 3) return null
      const signature = `deljivost5:cifra:${stotine}:${d}`
      if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, { text: `Koja cifra može stajati umesto □ da broj ${stotine}□ bude deljiv sa ${d}?`,
        tacan: String(tacna), netacni: nevalidne.map(String), explanation: `${Number(`${stotine}${tacna}`)} je deljiv sa ${d}.`,
        hint: 'Isprobaj ponuđene cifre primenom pravila deljivosti.', signature })
    }
    const d = izaberi(rng, [6, 8, 9, 12, 15, 25]), n = ceoBroj(rng, 100, 3000), dodatak = (d - n % d) % d
    const signature = `deljivost5:dopuna:${n}:${d}`
    if (taken.has(signature)) return null
    const text = cfg.wordProblems
      ? `Pakovanje prima tačno ${d} predmeta. Koliko najmanje predmeta treba dodati na postojećih ${n} da nijedno pakovanje ne ostane nepotpuno?`
      : `Koliko najmanje treba dodati broju ${n} da rezultat bude deljiv sa ${d}?`
    return racun(cfg, rng, text, dodatak, [n % d, d, d - dodatak],
      `${n} pri deljenju sa ${d} daje ostatak ${n % d}, pa do sledećeg sadržaoca nedostaje ${dodatak}.`,
      'Nađi ostatak, pa koliko nedostaje do delioca.', signature)
  },
}

export const skupoviILogika5: TopicGenerator = {
  slug: 'skupovi-i-logika-5', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const baza = promesaj(rng, [...Array(10).keys()].map((x) => x + 1))
    const k1 = ceoBroj(rng, 4, 6)
    const startB = ceoBroj(rng, 1, k1 - 2)
    const endB = ceoBroj(rng, k1 + 2, 9)
    const A = new Set(baza.slice(0, k1))
    const B = new Set(baza.slice(startB, endB))
    const t = cfg.difficulty
    if (t === 1) {
      const x = ceoBroj(rng, 1, 10), tacno = A.has(x), signature = `skupovi5:pripada:${skupTekst(A)}:${x}`
      if (taken.has(signature)) return null
      return tvrdnja(cfg, rng, `${x} ∈ ${skupTekst(A)}.`, tacno,
        tacno ? `${x} je naveden kao element skupa.` : `${x} nije naveden u skupu.`,
        'Proveri da li se broj nalazi između vitičastih zagrada.', signature)
    }
    const unija = new Set([...A, ...B]), presek = new Set([...A].filter((x) => B.has(x))), razlika = new Set([...A].filter((x) => !B.has(x)))
    const simRazlika = new Set([...unija].filter((x) => !presek.has(x)))
    const ciljni = t === 2 ? unija : t === 3 ? razlika : t === 4 ? presek : simRazlika
    const operacija = t === 2 ? 'A ∪ B' : t === 3 ? 'A \\ B' : t === 4 ? 'A ∩ B' : '(A ∪ B) \\ (A ∩ B)'
    const signature = `skupovi5:operacija:${t}:${skupTekst(A)}:${skupTekst(B)}`
    if (taken.has(signature)) return null
    if (t === 4) {
      return racun(cfg, rng, `Ako je A = ${skupTekst(A)}, a B = ${skupTekst(B)}, koliko elemenata ima ${operacija}?`, ciljni.size,
        [A.size, B.size, unija.size], `${operacija} = ${skupTekst(ciljni)}, pa ima ${ciljni.size} elemenata.`,
        'Najpre odredi traženu skupovnu operaciju, pa prebroj elemente.', signature)
    }
    const tacan = skupTekst(ciljni)
    const netacni = [skupTekst(A), skupTekst(B), skupTekst(unija), skupTekst(presek), skupTekst(razlika), skupTekst(simRazlika)]
      .filter((s, idx, arr) => s !== tacan && arr.indexOf(s) === idx)
      .slice(0, 3)
    return upakujIzbor(cfg, rng, { text: `Za A = ${skupTekst(A)} i B = ${skupTekst(B)}, odredi ${operacija}.`,
      tacan, netacni,
      explanation: `${operacija} = ${tacan}.`, hint: 'Unija spaja, presek zadržava zajedničke, a razlika uklanja elemente drugog skupa.', signature })
  },
}

export const prostiBrojevi5: TopicGenerator = {
  slug: 'prosti-brojevi-5', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const zeliProst = rng() < 0.5
      let n = ceoBroj(rng, 2, 100)
      while (prost(n) !== zeliProst) n = ceoBroj(rng, 2, 100)
      const p = prost(n), signature = `prosti5:tvrdnja:${n}`
      if (taken.has(signature)) return null
      return tvrdnja(cfg, rng, `${n} je prost broj.`, p,
        p ? `${n} ima tačno dva pozitivna delioca.` : `${n} je složen broj.`, 'Prost broj ima samo delioce 1 i samog sebe.', signature)
    }
    if (t === 2) {
      const n = ceoBroj(rng, 10, 150); let sledeci = n + 1
      while (!prost(sledeci)) sledeci++
      const signature = `prosti5:sledeci:${n}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Koji je prvi prost broj veći od ${n}?`, sledeci, [n + 1, sledeci + 1, sledeci - 1],
        `Proverom brojeva posle ${n}, prvi koji ima samo dva delioca jeste ${sledeci}.`, 'Eliminiši parne brojeve i proveravaj delioce do kvadratnog korena.', signature)
    }
    const p1 = izaberi(rng, [2, 3, 5, 7, 11])
    const p2 = izaberi(rng, [2, 3, 5, 7].filter((p) => p !== p1))
    const e1 = ceoBroj(rng, t >= 4 ? 2 : 1, t >= 4 ? 4 : 2), e2 = ceoBroj(rng, 1, 3)
    const n = p1 ** e1 * p2 ** e2, cinioci = prostiCinioci(n)
    const signature = `prosti5:faktori:${t}:${n}`
    if (taken.has(signature)) return null
    if (t === 3) {
      const tacan = Math.max(...cinioci)
      return racun(cfg, rng, `Koji je najveći prost činilac broja ${n}?`, tacan, [Math.min(...cinioci), cinioci.length, tacan + 2],
        `${n} = ${cinioci.join(' · ')}, pa je najveći prost činilac ${tacan}.`, 'Rastavi broj uzastopnim deljenjem prostim brojevima.', signature)
    }
    if (t === 4) {
      const tacan = cinioci.join(' · ')
      const izmenjeni = `${cinioci.slice(0, -1).join(' · ')} · ${cinioci[cinioci.length - 1] + 2}`
      return upakujIzbor(cfg, rng, { text: `Koje je potpuno rastavljanje broja ${n} na proste činioce?`, tacan,
        netacni: [`${p1} · ${Math.floor(n / p1)}`, `${cinioci.slice(1).join(' · ')}`, izmenjeni],
        explanation: `${n} = ${tacan}.`, hint: 'Nastavi deljenje dok svaki činilac ne bude prost.', signature })
    }
    const frekv = new Map<number, number>(); cinioci.forEach((p) => frekv.set(p, (frekv.get(p) ?? 0) + 1))
    const brojDelilaca = [...frekv.values()].reduce((a, e) => a * (e + 1), 1)
    return racun(cfg, rng, `Koliko pozitivnih delilaca ima broj ${n}?`, brojDelilaca, [cinioci.length, brojDelilaca - 1, brojDelilaca + 2],
      `Iz rastavljanja ${n} = ${cinioci.join(' · ')} broj delilaca dobija se množenjem uvećanih eksponenata: ${brojDelilaca}.`,
      'Ako je n = pᵃ · qᵇ, broj delilaca je (a + 1)(b + 1).', signature)
  },
}

export const nzdINzs5: TopicGenerator = {
  slug: 'nzd-i-nzs-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    const faktor = ceoBroj(rng, 2, t === 1 ? 10 : t === 5 ? 12 : 20)
    const maxMult = t === 1 ? 6 : t === 5 ? 10 : 20
    const m1 = ceoBroj(rng, 2, maxMult)
    let m2 = ceoBroj(rng, 2, maxMult)
    while (m2 === m1) m2 = ceoBroj(rng, 2, maxMult)
    const a = faktor * m1, b = faktor * m2
    const g = nzd(a, b), l = nzs(a, b), signature = `nzdnzs5:${t}:${a}:${b}`
    if (taken.has(signature)) return null
    if (t === 1) {
      const zajednicki = [...Array(Math.min(a, b)).keys()].map((x) => x + 1).filter((d) => a % d === 0 && b % d === 0)
      return racun(cfg, rng, `Koliko zajedničkih delilaca imaju ${a} i ${b}?`, zajednicki.length, [g, 2, zajednicki.length + 1],
        `Zajednički delioci su ${zajednicki.join(', ')}, ukupno ${zajednicki.length}.`, 'Nabroj delioce oba broja i uzmi zajedničke.', signature)
    }
    if (t <= 3) {
      const traziNzs = t === 3 || rng() < 0.5, tacan = traziNzs ? l : g
      return racun(cfg, rng, `Odredi ${traziNzs ? 'NZS' : 'NZD'}(${a}, ${b}).`, tacan, [traziNzs ? g : l, Math.abs(a - b), faktor],
        `${traziNzs ? 'Najmanji zajednički sadržalac' : 'Najveći zajednički delilac'} brojeva ${a} i ${b} je ${tacan}.`,
        t === 3 ? 'Rastavi brojeve na proste činioce ili primeni Euklidov algoritam.' : 'Nabroj zajedničke delioce ili sadržaoce.', signature)
    }
    if (t === 4) {
      const text = cfg.wordProblems
        ? `Dve lampice trepnu zajedno sada. Jedna trepće u razmacima od ${a} s, a druga u razmacima od ${b} s. Posle koliko sekundi će ponovo trepnuti zajedno?`
        : `Dva događaja ponavljaju se u razmacima od ${a} i ${b} jedinica vremena. Posle koliko jedinica se prvi put poklapaju?`
      return racun(cfg, rng, text, l, [g, a + b, a * b], `Traži se NZS(${a}, ${b}) = ${l}.`, 'Kod ponavljajućih ciklusa traži se NZS.', signature)
    }
    let m3 = ceoBroj(rng, 2, maxMult)
    while (m3 === m1 || m3 === m2) m3 = ceoBroj(rng, 2, maxMult)
    const c = faktor * m3, tacan = nzs(l, c)
    return racun(cfg, rng, `Odredi NZS(${a}, ${b}, ${c}).`, tacan, [l, nzd(g, c), a * b * c],
      `Najpre NZS(${a}, ${b}) = ${l}, zatim NZS(${l}, ${c}) = ${tacan}.`, 'Određuj NZS dva po dva.', `${signature}:${c}`)
  },
}

export const tackePraveIDuzi5: TopicGenerator = {
  slug: 'tacke-prave-i-duzi-5', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const pojmovi = [
        ['jedan početak i prostire se neograničeno u jednom smeru', 'poluprava'],
        ['dva kraja i konačnu dužinu', 'duž'], ['nema ni početak ni kraj', 'prava'],
        ['nema dimenziju i označava položaj', 'tačka'],
      ] as const
      if (cfg.type !== 'numeric' && rng() < 0.2) {
        const [opis, tacan] = izaberi(rng, pojmovi), signature = `geometrija5:pojam:${tacan}`
        if (!taken.has(signature)) {
          return upakujIzbor(cfg, rng, { text: `Koji geometrijski objekat ima sledeći opis: ${opis}?`, tacan,
            netacni: ['duž', 'prava', 'poluprava', 'tačka'], explanation: `Opis odgovara pojmu: ${tacan}.`,
            hint: 'Uporedi broj krajeva i da li se objekat prostire neograničeno.', signature })
        }
      }
      if (rng() < 0.5) {
        const k = ceoBroj(rng, 2, 20), signature = `geometrija5:poluprave:${k}`
        if (taken.has(signature)) return null
        return racun(cfg, rng, `Na jednoj pravoj označeno je ${k} različitih tačaka. Koliko različitih poluprava one određuju?`,
          2 * k, [k, k + 2, 2 * k - 1], `Svaka tačka na pravoj određuje dve poluprave: 2 · ${k} = ${2 * k}.`,
          'Svaka tačka deli pravu na dve poluprave suprotnih smerova.', signature)
      }
      const n = ceoBroj(rng, 3, 20), tacan = (n * (n - 1)) / 2, signature = `geometrija5:duzi-broj:${n}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Na pravoj je označeno ${n} različitih tačaka. Koliko duži one određuju?`,
        tacan, [n, 2 * n, n * (n - 1)], `Broj duži je ${n} · (${n} − 1) / 2 = ${tacan}.`,
        'Svaki par različitih tačaka određuje tačno jednu duž.', signature)
    }
    if (t === 2) {
      const odnosi = [
        ['nemaju nijednu zajedničku tačku', 'paralelne'], ['imaju tačno jednu zajedničku tačku', 'seku se'],
        ['seku se pod pravim uglom', 'normalne'], ['imaju sve zajedničke tačke', 'poklapaju se'],
      ] as const
      if (cfg.type !== 'numeric' && rng() < 0.25) {
        const [opis, tacan] = izaberi(rng, odnosi), signature = `geometrija5:prave:${tacan}`
        if (!taken.has(signature)) {
          return upakujIzbor(cfg, rng, { text: `Dve prave u ravni ${opis}. Kakve su one?`, tacan,
            netacni: ['paralelne', 'normalne', 'seku se', 'poklapaju se'], explanation: `Po datom odnosu prave su ${tacan}.`,
            hint: 'Broj zajedničkih tačaka određuje odnos pravih.', signature })
        }
      }
      const n = ceoBroj(rng, 2, 18), tacan = (n * (n - 1)) / 2
      if (rng() < 0.5) {
        const signature = `geometrija5:preseci:${n}`
        if (taken.has(signature)) return null
        return racun(cfg, rng, `Koliko najviše tačaka preseka može imati ${n} pravih u ravni (ako se svake dve seku u različitoj tački)?`,
          tacan, [n, n * 2, n * (n - 1)], `Svaki par pravih daje po jednu tačku preseka: ${n} · (${n} − 1) / 2 = ${tacan}.`,
          'Prebroj sve parove od datog broja pravih.', signature)
      }
      const m = ceoBroj(rng, 3, 20), tacanPrave = (m * (m - 1)) / 2, signature = `geometrija5:tacke-prave:${m}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `U ravni je ${m} tačaka takvih da nijedne tri ne leže na istoj pravoj. Koliko različitih pravih određuju?`,
        tacanPrave, [m, m * 2, m * (m - 1)], `Svake dve tačke određuju jednu pravu: ${m} · (${m} − 1) / 2 = ${tacanPrave}.`,
        'Svaki par tačaka određuje tačno jednu pravu.', signature)
    }
    const ab = ceoBroj(rng, 2, 50), bc = ceoBroj(rng, 2, 50), cd = ceoBroj(rng, 2, 50)
    if (t === 3) { const signature = `geometrija5:duzi:${ab}:${bc}`; if (taken.has(signature)) return null; return racun(cfg, rng, `Tačka B je između A i C. Ako je AB = ${ab} cm i BC = ${bc} cm, koliko je AC?`, ab + bc,
      [Math.abs(ab - bc), ab, bc], `AC = AB + BC = ${ab + bc} cm.`, 'Nadovezane duži se sabiraju.', signature)
    }
    if (t === 4) { const signature = `geometrija5:lanac:${ab}:${bc}:${cd}`; if (taken.has(signature)) return null; return racun(cfg, rng, `Na istoj pravoj redom su A–B–C–D. Ako je AB=${ab}, BC=${bc}, CD=${cd}, odredi AD.`, ab + bc + cd,
      [ab + bc, bc + cd, Math.abs(ab + bc - cd)], `AD = ${ab} + ${bc} + ${cd} = ${ab + bc + cd}.`, 'Saberi sve uzastopne delove.', signature)
    }
    const ac = ab + bc, bd = bc + cd
    const signature = `geometrija5:preklop:${ac}:${bd}:${bc}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, `A–B–C–D su redom na pravoj. AC=${ac}, BD=${bd}, a BC=${bc}. Odredi AD.`, ab + bc + cd,
      [ac + bd, ac + bd - bc * 2, ab + cd], `AB=${ac}−${bc}=${ab}, CD=${bd}−${bc}=${cd}, pa je AD=${ab + bc + cd}.`,
      'Zajednička duž BC ne sme se brojati dvaput.', signature)
  },
}

export const kruznicaIKrug5: TopicGenerator = {
  slug: 'kruznica-i-krug-5', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty, r = ceoBroj(rng, 2, 50)
    if (t === 1) {
      const pojmovi = [
        ['duž koja spaja centar sa tačkom kružnice', 'poluprečnik'],
        ['tetiva koja prolazi kroz centar', 'prečnik'], ['duž čija su oba kraja na kružnici', 'tetiva'],
        ['prava koja sa kružnicom ima jednu zajedničku tačku', 'tangenta'],
      ] as const
      if (cfg.type !== 'numeric' && rng() < 0.25) {
        const [opis, tacan] = izaberi(rng, pojmovi), signature = `krug5:pojam:${tacan}`
        if (!taken.has(signature)) {
          return upakujIzbor(cfg, rng, { text: `Kako se zove ${opis}?`, tacan, netacni: ['tetiva', 'prečnik', 'tangenta', 'poluprečnik'],
            explanation: `Opisani pojam je ${tacan}.`, hint: 'Razmisli gde su krajevi duži i koliko zajedničkih tačaka prava ima sa kružnicom.', signature })
        }
      }
      const signature = `krug5:najduza-tetiva:${r}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Poluprečnik kružnice je ${r} cm. Kolika je najveća moguća dužina njene tetive?`, 2 * r,
        [r, r + 1, 2 * r + 2], `Najduža tetiva kružnice je prečnik: 2 · ${r} = ${2 * r} cm.`, 'Najduža tetiva kružnice prolazi kroz centar.', signature)
    }
    if (t === 2) { const signature = `krug5:precnik:${r}`; if (taken.has(signature)) return null; return racun(cfg, rng, `Poluprečnik kružnice je ${r} cm. Koliki je prečnik?`, 2 * r, [r, r * r, 2 * r + 1],
      `Prečnik je dva poluprečnika: 2 · ${r} = ${2 * r} cm.`, 'd = 2r.', signature)
    }
    const udaljenost = ceoBroj(rng, 1, r * 2), odnos = udaljenost < r ? 'unutar kruga' : udaljenost === r ? 'na kružnici' : 'izvan kruga'
    if (t === 3) { const signature = `krug5:tacka:${r}:${udaljenost}`; if (taken.has(signature)) return null; return upakujIzbor(cfg, rng, { text: `Tačka je od centra udaljena ${udaljenost} cm, a poluprečnik je ${r} cm. Gde je tačka?`, tacan: odnos,
      netacni: ['unutar kruga', 'na kružnici', 'izvan kruga', 'u centru kruga'], explanation: `Poredi se ${udaljenost} sa poluprečnikom ${r}: tačka je ${odnos}.`, hint: 'Manje od r je unutra, jednako r na kružnici, veće od r izvan.', signature })
    }
    const polozajPrave = udaljenost < r ? 'sečica' : udaljenost === r ? 'tangenta' : 'nema zajedničkih tačaka'
    if (t === 4) { const signature = `krug5:prava:${r}:${udaljenost}`; if (taken.has(signature)) return null; return upakujIzbor(cfg, rng, { text: `Udaljenost centra kružnice od prave je ${udaljenost} cm, a r=${r} cm. Kakav je odnos prave i kružnice?`, tacan: polozajPrave,
      netacni: ['sečica', 'tangenta', 'nema zajedničkih tačaka'], explanation: `Pošto se udaljenost poredi sa r, prava je: ${polozajPrave}.`, hint: 'Udaljenost manja od r: sečica; jednaka r: tangenta; veća: nema preseka.', signature })
    }
    const r1 = ceoBroj(rng, 3, 25), r2 = ceoBroj(rng, 2, 20), d = ceoBroj(rng, 1, r1 + r2 + 8)
    const sekuSe = Math.abs(r1 - r2) < d && d < r1 + r2
    const signature = `krug5:dve-kruznice:${r1}:${r2}:${d}`
    if (taken.has(signature)) return null
    return tvrdnja(cfg, rng, `Kružnice poluprečnika ${r1} cm i ${r2} cm imaju centre na rastojanju ${d} cm. One se seku u dve tačke.`, sekuSe,
      sekuSe ? `Važi |${r1} − ${r2}| < ${d} < ${r1} + ${r2}, pa se kružnice seku.` : `Ne važi |${r1} − ${r2}| < ${d} < ${r1} + ${r2}, pa se ne seku u dve tačke.`,
      'Dve kružnice se seku ako je rastojanje centara između razlike i zbira poluprečnika.', signature)
  },
}

export const centralnaSimetrijaITranslacija5: TopicGenerator = {
  slug: 'centralna-simetrija-i-translacija-5', supportedTypes: ['single'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    let x = ceoBroj(rng, -9, 9), y = ceoBroj(rng, -9, 9)
    if (t === 1 && x === 0 && y === 0) x = ceoBroj(rng, 1, 9)
    let dx = ceoBroj(rng, -6, 6), dy = ceoBroj(rng, -6, 6)
    if (t >= 2 && dx === 0 && dy === 0) dx = ceoBroj(rng, 1, 6)
    const signature = t === 1 ? `centralna5:1:${x}:${y}` : `centralna5:${t}:${x}:${y}:${dx}:${dy}`
    if (taken.has(signature)) return null
    let tacan: string, text: string, explanation: string
    if (t === 1) { tacan = koordinate(-x, -y); text = `Koja je slika tačke A${koordinate(x, y)} centralnom simetrijom oko koordinatnog početka?`; explanation = `Obe koordinate menjaju znak: ${tacan}.` }
    else if (t === 2) { const x2 = x + 2 * dx, y2 = y + 2 * dy; tacan = koordinate(x + dx, y + dy); text = `Koji je centar centralne simetrije koja A${koordinate(x, y)} preslikava u A′${koordinate(x2, y2)}?`; explanation = `Centar je sredina AA′: ${tacan}.` }
    else if (t === 3) { tacan = koordinate(x + dx, y + dy); text = `Tačku A${koordinate(x, y)} transliramo vektorom ${koordinate(dx, dy)}. Odredi A′.`; explanation = `Koordinate vektora se dodaju: ${tacan}.` }
    else if (t === 4) { tacan = koordinate(x + dx, y + dy); text = `Trougao se translira vektorom ${koordinate(dx, dy)}. Gde prelazi njegovo teme B${koordinate(x, y)}?`; explanation = `Svako teme pomera se za isti vektor, pa B′=${tacan}.` }
    else { tacan = koordinate(-x + dx, -y + dy); text = `A${koordinate(x, y)} se prvo centralno preslika oko O(0,0), zatim translira vektorom ${koordinate(dx, dy)}. Gde završava?`; explanation = `Posle simetrije je ${koordinate(-x, -y)}, zatim dodajemo vektor i dobijamo ${tacan}.` }
    const kandidati = [
      koordinate(x, y), koordinate(-x, y), koordinate(x, -y), koordinate(-x, -y),
      koordinate(x + dx, y + dy), koordinate(x - dx, y - dy), koordinate(-x - dx, -y - dy),
      koordinate(-x + dy, -y + dx), koordinate(y, x), koordinate(x + dx + 1, y + dy - 1),
    ].filter((c, i, arr) => c !== tacan && arr.indexOf(c) === i)
    return upakujIzbor(cfg, rng, { text, tacan, netacni: kandidati.slice(0, 3),
      explanation, hint: 'Centralna simetrija oko O menja oba znaka; translacija dodaje koordinate vektora.', signature })
  },
}

export const uglovi5: TopicGenerator = {
  slug: 'uglovi-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty, a = ceoBroj(rng, 10, 170)
    if (t === 1) {
      const vrsta = a < 90 ? 'oštar' : a === 90 ? 'prav' : 'tup'
      const signature = `uglovi5:vrsta:${a}`; if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, { text: `Koje vrste je ugao od ${a}°?`, tacan: vrsta,
        netacni: ['oštar', 'prav', 'tup', 'opružen'], explanation: `Ugao od ${a}° je ${vrsta}.`, hint: 'Uporedi meru sa 90° i 180°.', signature })
    }
    if (t === 2) { const doPravog = rng() < 0.5 && a < 90, zbir = doPravog ? 90 : 180, tacan = zbir - a, signature = `uglovi5:dopuna:${zbir}:${a}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Koliki je ${doPravog ? 'komplementni' : 'suplementni'} ugao uglu od ${a}°?`, tacan, [a, 180 - tacan, 90 - Math.min(a, 90)],
        `${zbir}° − ${a}° = ${tacan}°.`, `Zbir je ${zbir}°.`, signature) }
    if (t === 3) { const unakrsni = rng() < 0.5, tacan = unakrsni ? a : 180 - a, signature = `uglovi5:par:${unakrsni ? 'unakrsni' : 'uporedni'}:${a}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Jedan ugao je ${a}°. Koliki je njemu ${unakrsni ? 'unakrsni' : 'uporedni'} ugao?`, tacan, [a, 90 - Math.min(a, 90), 180 - tacan],
        unakrsni ? 'Unakrsni uglovi su jednaki.' : `Uporedni uglovi imaju zbir 180°, pa je drugi ${tacan}°.`,
        unakrsni ? 'Unakrsni uglovi su jednaki.' : 'Uporedni uglovi daju 180°.', signature) }
    if (t === 4) { const odgovarajuci = rng() < 0.5, tacan = odgovarajuci ? a : 180 - a, signature = `uglovi5:transverzala:${odgovarajuci ? 'odg' : 'ista'}:${a}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Dve paralelne prave sečene su transverzalom. Jedan ugao je ${a}°. Koliki je ${odgovarajuci ? 'odgovarajući' : 'unutrašnji sa iste strane'} ugao?`, tacan,
        [a, 180 - tacan, 90], odgovarajuci ? 'Odgovarajući uglovi su jednaki.' : 'Unutrašnji uglovi sa iste strane imaju zbir 180°.',
        'Prepoznaj par uglova na transverzali.', signature) }
    const ugao1 = ceoBroj(rng, 20, 110), ugao2 = ceoBroj(rng, 20, 160 - ugao1), tacan = 180 - ugao1 - ugao2
    const signature = `uglovi5:trougao:${ugao1}:${ugao2}`; if (taken.has(signature)) return null
    return racun(cfg, rng, `Dva unutrašnja ugla trougla su ${ugao1}° i ${ugao2}°. Koliki je treći ugao trougla?`, tacan,
      [ugao1 + ugao2, 360 - ugao1 - ugao2, Math.abs(ugao1 - ugao2)],
      `Zbir uglova u trouglu je 180°, pa je treći ugao 180° − (${ugao1}° + ${ugao2}°) = ${tacan}°.`,
      'Zbir svih unutrašnjih uglova trougla je 180°.', signature)
  },
}

export const razlomci5: TopicGenerator = {
  slug: 'razlomci-5', supportedTypes: ['single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty, r = razlomak(rng, t >= 4 ? 20 : 12)
    if (t === 1) {
      const traziPravi = rng() < 0.5
      const pravi = (): Razlomak => { const i = ceoBroj(rng, 2, 12); return normalizujRazlomak(ceoBroj(rng, 1, i - 1), i) }
      const nepravi = (): Razlomak => { const i = ceoBroj(rng, 2, 10), ceo = ceoBroj(rng, 1, 3); return normalizujRazlomak(ceo * i + ceoBroj(rng, 1, i - 1), i) }
      const tacanR = traziPravi ? pravi() : nepravi()
      const tacan = formatirajRazlomak(tacanR)
      const netacni: string[] = []
      while (netacni.length < 3) {
        const s = formatirajRazlomak(traziPravi ? nepravi() : pravi())
        if (s !== tacan && !netacni.includes(s)) netacni.push(s)
      }
      const signature = `razlomci5:vrsta:${traziPravi ? 'pravi' : 'nepravi'}:${tacan}:${netacni[0]}`; if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, { text: `Koji od navedenih razlomaka je ${traziPravi ? 'pravi' : 'nepravi'} razlomak?`, tacan,
        netacni, explanation: `${tacan} je ${traziPravi ? 'pravi jer mu je brojilac manji od imenioca' : 'nepravi jer mu je brojilac veći od imenioca'}.`,
        hint: 'Kod pravog razlomka brojilac je manji od imenioca, a kod nepravog veći ili jednak.', signature })
    }
    if (t === 2) { const k = ceoBroj(rng, 2, 7), tacan = `${r.b * k}/${r.i * k}`, signature = `razlomci5:prosiri:${r.b}:${r.i}`; if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, { text: `Koji razlomak je jednak ${formatirajRazlomak(r)}?`, tacan,
        netacni: [`${r.b + k}/${r.i + k}`, `${r.b * k}/${r.i}`, `${r.b}/${r.i * k}`],
        explanation: `Brojilac i imenilac množimo istim brojem ${k}: ${tacan}.`, hint: 'Proširivanje menja oba člana istim činiocem.', signature }) }
    if (t === 3) { const s = razlomak(rng, 15), znak = uporediRazlomke(r, s) < 0 ? '<' : uporediRazlomke(r, s) > 0 ? '>' : '=', signature = `razlomci5:poredi:${r.b}:${r.i}:${s.b}:${s.i}`; if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, { text: `Uporedi: ${formatirajRazlomak(r)} __ ${formatirajRazlomak(s)}`, tacan: znak,
        netacni: ['<', '=', '>'], explanation: `Unakrsni proizvodi su ${r.b * s.i} i ${s.b * r.i}, zato važi znak ${znak}.`,
        hint: 'Svedi na zajednički imenilac ili pomnoži unakrsno.', signature }) }
    if (t === 4) {
      const i = ceoBroj(rng, 2, 12), ceo = ceoBroj(rng, 1, 5), ost = ceoBroj(rng, 1, i - 1)
      const nepravi = normalizujRazlomak(ceo * i + ost, i), stvarniOst = nepravi.b % nepravi.i, stvarniCeo = Math.floor(nepravi.b / nepravi.i)
      const tacan = `${stvarniCeo} ${stvarniOst}/${nepravi.i}`
      const signature = `razlomci5:mesoviti:${nepravi.b}:${nepravi.i}`; if (taken.has(signature)) return null
      const kandidati = [`${stvarniCeo + 1} ${stvarniOst}/${nepravi.i}`, `${stvarniCeo} ${nepravi.i}/${stvarniOst}`, `${stvarniOst} ${stvarniCeo}/${nepravi.i}`, `${stvarniCeo + 2} ${stvarniOst}/${nepravi.i}`]
        .filter((v, idx, arr) => v !== tacan && arr.indexOf(v) === idx)
      return upakujIzbor(cfg, rng, { text: `Pretvori ${nepravi.b}/${nepravi.i} u mešoviti broj.`, tacan,
        netacni: kandidati.slice(0, 3),
        explanation: `${nepravi.b} : ${nepravi.i} = ${stvarniCeo} i ostatak ${stvarniOst}, pa je zapis ${tacan}.`, hint: 'Podeli brojilac imeniocem.', signature })
    }
    const niz: Razlomak[] = [r]
    while (niz.length < 4) {
      const kand = razlomak(rng, 20)
      if (!niz.some((v) => uporediRazlomke(v, kand) === 0)) niz.push(kand)
    }
    const najveci = niz.reduce((a, b) => uporediRazlomke(a, b) > 0 ? a : b)
    const signature = `razlomci5:najveci:${niz.map((v) => `${v.b},${v.i}`).join(':')}`; if (taken.has(signature)) return null
    return upakujIzbor(cfg, rng, { text: `Koji razlomak je najveći: ${niz.map(formatirajRazlomak).join(', ')}?`, tacan: formatirajRazlomak(najveci),
      netacni: niz.map(formatirajRazlomak), explanation: `Svođenjem na zajednički imenilac najveći je ${formatirajRazlomak(najveci)}.`,
      hint: 'Uporedi razlomke preko zajedničkog imenioca ili unakrsnih proizvoda.', signature })
  },
}

function fmt(n: number, d = 2): string { return n.toFixed(d).replace('.', ',') }

export const decimalniBrojevi5: TopicGenerator = {
  slug: 'decimalni-brojevi-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty, stoti = ceoBroj(rng, 1, 99_999), n = stoti / 100
    if (t === 1) { const cifra = Math.floor(stoti / 10) % 10
      const signature = `decimalni5:deseti:${stoti}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Koja cifra je na mestu desetih u broju ${fmt(n)}?`, cifra,
        [stoti % 10, Math.floor(stoti / 100) % 10, (cifra + 1) % 10, (cifra + 2) % 10],
        `Prva cifra desno od decimalne zapete je ${cifra}.`, 'Deseti su prvo mesto desno od zapete.', signature, 0, 9) }
    if (t === 2) { const mStoti = Math.max(0, stoti + ceoBroj(rng, -30, 30)), m = mStoti / 100, znak = n < m ? '<' : n > m ? '>' : '=', signature = `decimalni5:poredi:${stoti}:${mStoti}`; if (taken.has(signature)) return null
      return upakujIzbor(cfg, rng, { text: `Uporedi: ${fmt(n)} __ ${fmt(m)}`, tacan: znak, netacni: ['<', '=', '>'],
        explanation: `Poravnavanjem decimalnih mesta dobijamo ${fmt(n)} ${znak} ${fmt(m)}.`, hint: 'Upoređuj cifre istih mesnih vrednosti.', signature }) }
    if (t === 3) {
      const imenilac = izaberi(rng, [2, 4, 5, 10, 20, 25, 50, 100])
      const brojilac = ceoBroj(rng, 1, imenilac * 3)
      const stotiTacan = Math.round((brojilac * 100) / imenilac), tacan = stotiTacan / 100
      const signature = `decimalni5:pretvori:${brojilac}:${imenilac}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Pretvori u decimalni zapis: ${brojilac}/${imenilac}`, tacan,
        [brojilac / 10, (stotiTacan + 10) / 100, Math.max(1, stotiTacan - 5) / 100],
        `${brojilac} : ${imenilac} = ${String(tacan).replace('.', ',')}.`, 'Podeli brojilac imeniocem.', signature, 2) }
    if (t === 4) { const desetiTacan = Math.round(stoti / 10), tacan = desetiTacan / 10, signature = `decimalni5:zaokruzi:${stoti}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Zaokruži ${fmt(n)} na jednu decimalu.`, tacan,
        [(desetiTacan + 1) / 10, Math.max(0, desetiTacan - 1) / 10, Math.ceil(n)],
        `Posmatramo cifru stotih i dobijamo ${fmt(tacan, 1)}.`, 'Ako je sledeća cifra 5 ili veća, prethodnu povećaj.', signature, 1) }
    const zaokruzen = Math.round(stoti / 100), stotiGreska = Math.abs(stoti - zaokruzen * 100), greska = stotiGreska / 100
    const signature = `decimalni5:greska:${stoti}`; if (taken.has(signature)) return null
    return racun(cfg, rng, `Broj ${fmt(n)} zaokružen je na ceo broj ${zaokruzen}. Kolika je apsolutna greška?`, greska,
      [(100 - stotiGreska) / 100, (stotiGreska + 10) / 100, Math.abs(zaokruzen)], `|${fmt(n)} − ${zaokruzen}| = ${fmt(greska)}.`,
      'Apsolutna greška je apsolutna razlika tačne i približne vrednosti.', signature, 2)
  },
}

export const operacijeSaRazlomcima5: TopicGenerator = {
  slug: 'operacije-sa-razlomcima-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty, a = razlomak(rng, 12), b = razlomak(rng, 12), c = razlomak(rng, 10)
    let tacan: Razlomak, znak: string, izraz: string, signature: string, cEff = c
    if (t === 1) {
      const i = ceoBroj(rng, 3, 15), x = ceoBroj(rng, 1, i - 1), y = ceoBroj(rng, 1, i - 1)
      tacan = normalizujRazlomak(x + y, i); znak = '+'; izraz = `${x}/${i} + ${y}/${i}`
      signature = `operacijeRazlomci5:1:${i}:${x}:${y}`
    } else if (t === 2) {
      tacan = saberiRazlomke(a, b); znak = '+'; izraz = `${formatirajRazlomak(a)} + ${formatirajRazlomak(b)}`
      signature = `operacijeRazlomci5:2:${a.b},${a.i}:${b.b},${b.i}`
    } else if (t === 3) {
      const deli = rng() < 0.5; tacan = deli ? podeliRazlomke(a, b) : pomnoziRazlomke(a, b); znak = deli ? ':' : '·'
      izraz = `${formatirajRazlomak(a)} ${znak} ${formatirajRazlomak(b)}`
      signature = `operacijeRazlomci5:3:${znak}:${a.b},${a.i}:${b.b},${b.i}`
    } else if (t === 4) {
      tacan = pomnoziRazlomke(saberiRazlomke(a, b), c); znak = 'komb'
      izraz = `(${formatirajRazlomak(a)} + ${formatirajRazlomak(b)}) · ${formatirajRazlomak(c)}`
      signature = `operacijeRazlomci5:4:${a.b},${a.i}:${b.b},${b.i}:${c.b},${c.i}`
    } else {
      const zbirAB = saberiRazlomke(a, b)
      cEff = uporediRazlomke(zbirAB, c) >= 0 ? c : pomnoziRazlomke(zbirAB, { b: 1, i: 2 })
      tacan = oduzmiRazlomke(zbirAB, cEff)
      znak = 'problem'
      izraz = `${formatirajRazlomak(a)} + ${formatirajRazlomak(b)} − ${formatirajRazlomak(cEff)}`
      signature = `operacijeRazlomci5:5:${a.b},${a.i}:${b.b},${b.i}:${cEff.b},${cEff.i}`
    }
    if (taken.has(signature)) return null
    const text = t === 5 && cfg.wordProblems
      ? `Mina je prešla ${formatirajRazlomak(a)} km pre odmora i ${formatirajRazlomak(b)} km posle odmora, a zatim se vratila ${formatirajRazlomak(cEff)} km unazad. Koliko kilometara je Mina tada udaljena od polazišta?`
      : `Izračunaj: ${izraz}`
    return izborRazlomka(cfg, rng, text, tacan, `${izraz} = ${formatirajRazlomak(tacan)}.`,
      'Skrati razlomke kada možeš i poštuj redosled operacija.', signature)
  },
}

export const jednacineINejednacine5: TopicGenerator = {
  slug: 'jednacine-i-nejednacine-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty, x = razlomak(rng, 10), a = razlomak(rng, 8), k = ceoBroj(rng, 2, 8)
    let text: string, explanation: string, signature: string
    if (t === 1) {
      const b = saberiRazlomke(x, a)
      text = `Reši: x + ${formatirajRazlomak(a)} = ${formatirajRazlomak(b)}.`
      explanation = `x = ${formatirajRazlomak(b)} − ${formatirajRazlomak(a)} = ${formatirajRazlomak(x)}.`
      signature = `jednacineRazlomci5:1:${x.b},${x.i}:${a.b},${a.i}`
    } else if (t === 2) {
      const b = pomnoziRazlomke(x, { b: k, i: 1 })
      text = `Reši: ${k} · x = ${formatirajRazlomak(b)}.`
      explanation = `x = ${formatirajRazlomak(b)} : ${k} = ${formatirajRazlomak(x)}.`
      signature = `jednacineRazlomci5:2:${x.b},${x.i}:${k}`
    } else if (t === 3) {
      const b = saberiRazlomke(x, a)
      text = `Odredi graničnu vrednost za x u nejednačini x + ${formatirajRazlomak(a)} < ${formatirajRazlomak(b)}.`
      explanation = `Oduzimanjem ${formatirajRazlomak(a)} dobijamo x < ${formatirajRazlomak(x)}; tražena granica je ${formatirajRazlomak(x)}.`
      signature = `jednacineRazlomci5:3:${x.b},${x.i}:${a.b},${a.i}`
    } else if (t === 4) {
      const b = pomnoziRazlomke(saberiRazlomke(x, a), { b: k, i: 1 })
      text = `Reši: ${k} · (x + ${formatirajRazlomak(a)}) = ${formatirajRazlomak(b)}.`
      explanation = `Podelimo sa ${k}, zatim oduzmemo ${formatirajRazlomak(a)}: x = ${formatirajRazlomak(x)}.`
      signature = `jednacineRazlomci5:4:${x.b},${x.i}:${a.b},${a.i}:${k}`
    } else {
      const b = saberiRazlomke(pomnoziRazlomke(x, { b: k, i: 1 }), a)
      text = cfg.wordProblems
        ? `${kolicina(k, ['ista kutija', 'iste kutije', 'istih kutija', 'istu kutiju'])} i još ${formatirajRazlomak(a)} kg jabuka zajedno imaju masu ${formatirajRazlomak(b)} kg. Kolika je masa jedne kutije?`
        : `Reši jednačinu: ${k} · x + ${formatirajRazlomak(a)} = ${formatirajRazlomak(b)}.`
      explanation = `Najpre oduzmemo ${formatirajRazlomak(a)}, zatim podelimo sa ${k}: x = ${formatirajRazlomak(x)}.`
      signature = `jednacineRazlomci5:5:${x.b},${x.i}:${a.b},${a.i}:${k}`
    }
    if (taken.has(signature)) return null
    return izborRazlomka(cfg, rng, text, x, explanation, 'Primeni istu suprotnu operaciju na obe strane.', signature)
  },
}

export const procentiProsekIRazmera5: TopicGenerator = {
  slug: 'procenti-prosek-i-razmera-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t <= 2) { const procenat = t === 1 ? izaberi(rng, [10, 25, 50]) : izaberi(rng, [5, 15, 20, 30, 40, 75]), osnovica = ceoBroj(rng, 2, 50) * 20, tacan = osnovica * procenat / 100
      const signature = `primene5:procenat:${procenat}:${osnovica}`; if (taken.has(signature)) return null
      const text = cfg.wordProblems ? `U biblioteci je ${osnovica} knjiga, a ${procenat}% je pozajmljeno. Koliko je knjiga pozajmljeno?` : `Koliko je ${procenat}% od ${osnovica}?`
      return racun(cfg, rng, text, tacan, [osnovica - tacan, procenat, osnovica / procenat], `${procenat}/100 · ${osnovica} = ${tacan}.`, 'Procenat pretvori u razlomak sa imeniocem 100.', signature) }
    if (t === 3) { const brojevi = [ceoBroj(rng, 10, 80), ceoBroj(rng, 10, 80), ceoBroj(rng, 10, 80)], suma = brojevi.reduce((a, b) => a + b, 0), dodatak = (3 - suma % 3) % 3; brojevi[2] += dodatak; const tacan = brojevi.reduce((a, b) => a + b, 0) / 3, signature = `primene5:prosek:${brojevi.join(':')}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Odredi aritmetičku sredinu brojeva ${brojevi.join(', ')}.`, tacan, [brojevi.reduce((a,b)=>a+b,0), Math.max(...brojevi), Math.min(...brojevi)],
        `Zbir je ${brojevi.reduce((a,b)=>a+b,0)}, a deljenjem sa 3 dobijamo ${tacan}.`, 'Saberi brojeve i podeli njihovim brojem.', signature) }
    if (t === 4) { const razmera = ceoBroj(rng, 10, 200) * 100, cm = ceoBroj(rng, 2, 20), metri = (cm * razmera) / 100, signature = `primene5:razmera:${razmera}:${cm}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Na karti razmere 1:${razmera}, rastojanje je ${cm} cm. Koliko je to metara u prirodi?`, metri, [cm * razmera, Math.max(1, Math.round(metri / 10)), Math.round(razmera / 100)],
        `${cm} · ${razmera} = ${cm * razmera} cm = ${metri} m.`, 'Pomnoži dužinu sa imeniocem razmere, pa pretvori centimetre u metre.', signature) }
    const cena = ceoBroj(rng, 20, 100) * 100, popust = izaberi(rng, [10, 15, 20, 25]), nova = cena * (100 - popust) / 100
    const signature = `primene5:popust:${cena}:${popust}`; if (taken.has(signature)) return null
    return racun(cfg, rng, `Cena ${cena} dinara snižena je ${popust}%. Kolika je nova cena?`, nova, [cena * popust / 100, cena - popust, cena + popust],
      `Popust je ${cena * popust / 100} dinara, pa je nova cena ${nova} dinara.`, 'Izračunaj iznos popusta, pa ga oduzmi od početne cene.', signature)
  },
}

export const obradaPodataka5: TopicGenerator = {
  slug: 'obrada-podataka-5', supportedTypes: ['numeric', 'single'], supportsWordProblems: true,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t <= 3) {
      const podaci = [ceoBroj(rng, 5, 30), ceoBroj(rng, 5, 30), ceoBroj(rng, 5, 30), ceoBroj(rng, 5, 30)]
      const signature = `podaci5:${t}:${podaci.join(',')}`
      if (taken.has(signature)) return null
      const tabela = `Ponedeljak ${podaci[0]}, utorak ${podaci[1]}, sreda ${podaci[2]}, četvrtak ${podaci[3]}`
      if (t === 1) return racun(cfg, rng, `Tabela pročitanih strana: ${tabela}. Koliko je pročitano u sredu?`, podaci[2], [podaci[0], podaci[1], podaci[3]],
        `U tabeli uz sredu stoji ${podaci[2]}.`, 'Pronađi traženi red tabele.', signature)
      if (t === 2) { const tacan = podaci[0] + podaci[1]
        return racun(cfg, rng, `Podaci su: ${tabela}. Koliko je ukupno pročitano u ponedeljak i utorak?`, tacan, [podaci[0], podaci[1], podaci.reduce((a,b)=>a+b,0)],
          `${podaci[0]} + ${podaci[1]} = ${tacan}.`, 'Saberi samo tražene kategorije.', signature) }
      const max = Math.max(...podaci)
      if (podaci.filter((v) => v === max).length > 1) return null
      const dan = ['ponedeljak','utorak','sreda','četvrtak'][podaci.indexOf(max)]
      return upakujIzbor(cfg, rng, { text: `Stubičasti dijagram je tekstualno dat vrednostima: ${tabela}. Koji dan bi imao najviši stubić?`, tacan: dan,
        netacni: ['ponedeljak','utorak','sreda','četvrtak'], explanation: `Najveća vrednost je ${max}, zabeležena za ${dan}.`, hint: 'Najviši stubić odgovara najvećem broju.', signature })
    }
    if (t === 4) {
      const proc = izaberi(rng, [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 95])
      const ugao = (360 * proc) / 100
      const obrnuto = rng() < 0.5
      const signature = `podaci5:krug:${proc}:${obrnuto ? 1 : 0}`
      if (taken.has(signature)) return null
      if (obrnuto) {
        return racun(cfg, rng, `Sektor kružnog dijagrama ima centralni ugao ${ugao}°. Koliko procenata celine predstavlja?`, proc,
          [ugao, 100 - proc, proc + 10], `${ugao}° / 360° = ${proc}%.`, 'Podeli ugao sa 360° i pomnoži sa 100.', signature)
      }
      return racun(cfg, rng, `Jedna kategorija zauzima ${proc}% kružnog dijagrama. Koliki je ugao njenog sektora?`, ugao,
        [proc, (180 * proc) / 100, 360 - ugao], `${proc}% od 360° je ${ugao}°.`, 'Pomnoži 360 sa procentom zapisanim kao razlomak kroz 100.', signature)
    }
    const poznati = [ceoBroj(rng, 5, 30), ceoBroj(rng, 5, 30), ceoBroj(rng, 5, 30)], ciljniProsek = ceoBroj(rng, 15, 30)
    const nedostaje = ciljniProsek * 4 - poznati.reduce((a, b) => a + b, 0)
    if (nedostaje < 0) return null
    const signature = `podaci5:prosek:${poznati.join(',')}:${ciljniProsek}`
    if (taken.has(signature)) return null
    return racun(cfg, rng, `Tri vrednosti su ${poznati.join(', ')}. Koja četvrta vrednost daje prosek ${ciljniProsek}?`, nedostaje,
      [ciljniProsek, poznati.reduce((a, b) => a + b, 0), nedostaje + 4], `Potreban zbir je ${ciljniProsek} · 4 = ${ciljniProsek * 4}; nedostaje ${nedostaje}.`,
      'Željeni prosek pomnoži brojem podataka, pa oduzmi poznati zbir.', signature)
  },
}

export const osnaSimetrija5: TopicGenerator = {
  slug: 'osna-simetrija-5', supportedTypes: ['numeric', 'single', 'truefalse'], supportsWordProblems: false,
  generateOne(cfg, rng, taken) {
    const t = cfg.difficulty
    if (t === 1) {
      const figure = [
        ['kvadrat', 4], ['pravougaonik', 2], ['jednakostranični trougao', 3], ['raznostranični trougao', 0],
        ['jednakokraki trougao', 1], ['jednakokraki trapez', 1], ['romb', 2],
      ] as const
      if (rng() < 0.25) {
        const [ime, brojOsa] = izaberi(rng, figure), signature = `osna5:ose:${ime}`
        if (!taken.has(signature)) {
          return racun(cfg, rng, `Koliko osa simetrije ima ${ime}?`, brojOsa, [1, 2, 3, 4],
            `${ime.charAt(0).toUpperCase() + ime.slice(1)} ima ${kolicina(brojOsa, ['osa', 'ose', 'osa', 'osu'], 'akuz')} simetrije.`,
            'Zamisli preklapanje figure preko moguće ose.', signature)
        }
      }
      if (rng() < 0.5) {
        const uglovi = ceoBroj(rng, 5, 20), signature = `osna5:pravilni:${uglovi}`
        if (taken.has(signature)) return null
        return racun(cfg, rng, `Koliko osa simetrije ima pravilni mnogougao sa ${uglovi} stranica?`, uglovi,
          [uglovi - 1, uglovi * 2, Math.floor(uglovi / 2)],
          `Svaki pravilni ${uglovi}-ugao ima tačno ${uglovi} osa simetrije.`, 'Pravilni n-tougao ima n osa simetrije.', signature)
      }
      const d = ceoBroj(rng, 2, 30), signature = `osna5:rastojanje:${d}`
      if (taken.has(signature)) return null
      return racun(cfg, rng, `Tačka A je udaljena ${d} cm od ose simetrije p. Koliko su udaljene tačka A i njena osno simetrična slika A′?`,
        2 * d, [d, d + 2, 2 * d + 2], `A i A′ su sa suprotnih strana na po ${d} cm od ose, ukupno ${2 * d} cm.`,
        'Osa simetrije je sredina duži AA′.', signature)
    }
    let x = ceoBroj(rng, -9, 9), y = ceoBroj(rng, -9, 9), k = ceoBroj(rng, -5, 5)
    if (x === 0) x = ceoBroj(rng, 1, 9)
    if (y === 0) y = ceoBroj(rng, 1, 9)
    if (k === 0) k = ceoBroj(rng, 1, 5)
    if (t === 2) {
      const osaX = rng() < 0.5, tacan = osaX ? koordinate(x, -y) : koordinate(-x, y), signature = `osna5:koordinate:${osaX ? 'x' : 'y'}:${x}:${y}`
      if (taken.has(signature)) return null
      const netacni = [koordinate(-x, -y), koordinate(-x, y), koordinate(x, -y), koordinate(y, x), koordinate(-y, -x)]
        .filter((v, i, arr) => v !== tacan && arr.indexOf(v) === i).slice(0, 3)
      return upakujIzbor(cfg, rng, { text: `Preslikaj ${koordinate(x, y)} osnom simetrijom preko ${osaX ? 'x' : 'y'}-ose.`, tacan,
        netacni, explanation: `${osaX ? 'y' : 'x'} koordinata menja znak: ${tacan}.`, hint: 'Koordinata duž ose ostaje ista, druga menja znak.', signature })
    }
    if (t === 3) {
      const tvrdnje = [
        ['Svaka tačka simetrale duži jednako je udaljena od krajeva te duži.', true],
        ['Simetrala duži prolazi kroz njenu sredinu i normalna je na nju.', true],
        ['Simetrala duži mora prolaziti kroz jedan njen kraj.', false],
        ['Krajevi duži osno su simetrični u odnosu na njenu simetralu.', true],
      ] as const
      if (rng() < 0.2) {
        const idx = ceoBroj(rng, 0, tvrdnje.length - 1), [text, tacno] = tvrdnje[idx], signature = `osna5:simetrala-duzi:${idx}`
        if (!taken.has(signature)) {
          return tvrdnja(cfg, rng, text, tacno, tacno ? 'Tvrdnja sledi iz definicije simetrale duži.' : 'Simetrala prolazi kroz sredinu, ne kroz kraj duži.',
            'Simetrala duži je normalna na duž i prolazi kroz njenu sredinu.', signature)
        }
      }
      const osaX = rng() < 0.5, tacno = rng() < 0.5
      const bx = osaX ? (tacno ? x : -x) : (tacno ? -x : x)
      const by = osaX ? (tacno ? -y : y) : (tacno ? y : -y)
      const signature = `osna5:tvrdnja-osa:${osaX ? 'x' : 'y'}:${x}:${y}:${tacno ? 1 : 0}`
      if (taken.has(signature)) return null
      return tvrdnja(cfg, rng, `Tačke ${koordinate(x, y)} i ${koordinate(bx, by)} su osno simetrične u odnosu na ${osaX ? 'x' : 'y'}-osu.`, tacno,
        tacno ? `Pri simetriji preko ${osaX ? 'x' : 'y'}-ose ${osaX ? 'y' : 'x'}-koordinata menja znak.` : `Pri simetriji preko ${osaX ? 'x' : 'y'}-ose menja se znak ${osaX ? 'y' : 'x'}-koordinate, a ovde je promenjen pogrešan znak.`,
        'Pri osnoj simetriji oko ose menja se znak samo koordinate normalne na tu osu.', signature)
    }
    if (t === 4) { const ugao = ceoBroj(rng, 20, 160) * 2
      const signature = `osna5:simetrala-ugla:${ugao}`; if (taken.has(signature)) return null
      return racun(cfg, rng, `Simetrala ugla deli ugao od ${ugao}° na dva jednaka dela. Kolika je mera jednog dela?`, ugao / 2, [ugao, 180 - ugao / 2, ugao / 4],
        `${ugao}° : 2 = ${ugao / 2}°.`, 'Simetrala ugla daje dva jednaka ugla.', signature) }
    if (x === k) x += 1
    if (y === k) y += 1
    const vertikalna = rng() < 0.5, tacan = vertikalna ? koordinate(2 * k - x, y) : koordinate(x, 2 * k - y)
    const signature = `osna5:osa:${vertikalna ? 'x' : 'y'}:${k}:${x}:${y}`; if (taken.has(signature)) return null
    const netacni = [
      koordinate(-x, y), koordinate(x, -y), koordinate(2 * k + x, y), koordinate(x, 2 * k + y), koordinate(2 * k + x, 2 * k + y),
    ].filter((v, i, arr) => v !== tacan && arr.indexOf(v) === i).slice(0, 3)
    return upakujIzbor(cfg, rng, { text: `Preslikaj tačku ${koordinate(x, y)} preko prave ${vertikalna ? `x=${k}` : `y=${k}`}.`, tacan,
      netacni, explanation: `Tačka ostaje na istoj normalnoj udaljenosti sa druge strane ose: ${tacan}.`,
      hint: 'Osa je sredina između početne tačke i njene slike.', signature })
  },
}

export const MODULI5: TopicGenerator[] = [
  prirodniBrojevi5, deljivost5, skupoviILogika5, prostiBrojevi5, nzdINzs5,
  tackePraveIDuzi5, kruznicaIKrug5, centralnaSimetrijaITranslacija5, uglovi5,
  razlomci5, decimalniBrojevi5, operacijeSaRazlomcima5, jednacineINejednacine5,
  procentiProsekIRazmera5, obradaPodataka5, osnaSimetrija5,
]
