// Generator: veliki brojevi (4. razred) — čitanje/pisanje/mesna vrednost cifre,
// zbir cifara, poređenje, "koliko hiljada/miliona", prethodnik/sledbenik, i
// izbor najvećeg/najmanjeg — u opsegu do milijarde (udžbenik ide do klase
// milijardi/biliona). Više tipova pitanja po nivou da fond ne bude tanak.
import type { Opcija } from '../../types/db.ts'
import { ceoBroj, izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types.ts'
import { poeniZaTezinu, upakujRacun } from '../moduli/zajednicko.ts'

// Nazivi mesta po poziciji cifre (0 = jedinice, računato zdesna), do milijarde.
const MESTA = [
  'jedinice', 'desetice', 'stotine', 'hiljade',
  'desetice hiljada', 'stotine hiljada', 'jedinice miliona',
  'desetice miliona', 'stotine miliona', 'jedinice milijardi',
] as const

function cifraNaMestu(n: number, pozicija: number): number {
  return Math.floor(n / 10 ** pozicija) % 10
}

function zbirCifara(n: number): number {
  return [...String(n)].reduce((s, c) => s + Number(c), 0)
}

interface CifraPitanje {
  n: number
  pozicija: number
}

function napraviCifraPitanje(rng: Rng, minN: number, maxN: number, maksPozicija: number): CifraPitanje {
  const n = ceoBroj(rng, minN, maxN)
  // Pozicija ne prelazi stvarni broj cifara od n (bez veštačkih "vodećih nula").
  const stvarnaMaksPozicija = Math.min(maksPozicija, String(n).length - 1)
  const pozicija = ceoBroj(rng, 0, stvarnaMaksPozicija)
  return { n, pozicija }
}

// Broj "namerno" postavljen blizu okrugle granice (npr. 5 000 000) da
// prethodnik/sledbenik zahteva pravi prelaz preko više mesnih vrednosti
// (999 999 → 1 000 000), a ne trivijalno ±1 bez "posla".
function napraviGranicniBroj(rng: Rng, minN: number, maxN: number): number {
  if (rng() < 0.5) return ceoBroj(rng, minN, maxN)
  const m = izaberi(rng, [3, 4, 5, 6] as const)
  const jedinica = 10 ** m
  let n = Math.round(ceoBroj(rng, minN, maxN) / jedinica) * jedinica
  if (n < minN) n += jedinica
  if (n > maxN) n -= jedinica
  return Math.max(minN, Math.min(maxN, n))
}

function poredi(rng: Rng, minN: number, maxN: number, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const a = ceoBroj(rng, minN, maxN - 100)
  const delta = ceoBroj(rng, 1, Math.min(500, maxN - minN)) * (rng() < 0.5 ? 1 : -1)
  const b = Math.max(minN, Math.min(maxN, a + delta))
  const signature = `veliki4:poredi:${a}?${b}`
  if (taken.has(signature)) return null
  const znak = a < b ? '<' : a > b ? '>' : '='
  const options: Opcija[] = [
    { id: 'o1', text: '<' },
    { id: 'o2', text: '=' },
    { id: 'o3', text: '>' },
  ]
  const correctId = znak === '<' ? 'o1' : znak === '=' ? 'o2' : 'o3'
  return {
    type: 'single',
    text: `Koji znak treba da stoji: ${a} __ ${b}?`,
    options,
    correct: { optionId: correctId },
    explanation: `Brojevi imaju ${String(a).length === String(b).length ? 'isti broj cifara — upoređujemo cifru po cifru sleva' : 'različit broj cifara — veći je onaj sa više cifara'}: ${a} ${znak} ${b}.`,
    hint: 'Prvo upoređuj broj cifara, a ako je isti, cifru po cifru sleva na desno.',
    points: poeniZaTezinu(cfg.difficulty),
    topicSlug: cfg.topicSlug,
    difficulty: cfg.difficulty,
    signature,
  }
}

function izborNajveciNajmanji(rng: Rng, minN: number, maxN: number, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const kolikoBrojeva = rng() < 0.5 ? 3 : 4
  const skup = new Set<number>()
  const baza = ceoBroj(rng, minN, maxN)
  while (skup.size < kolikoBrojeva) {
    const delta = ceoBroj(rng, 0, Math.min(2000, maxN - minN))
    const kandidat = Math.max(minN, Math.min(maxN, baza + delta * (rng() < 0.5 ? 1 : -1)))
    skup.add(kandidat)
  }
  const brojevi = [...skup]
  const trazi = rng() < 0.5 ? 'max' : 'min'
  const tacan = trazi === 'max' ? Math.max(...brojevi) : Math.min(...brojevi)
  const signature = `veliki4:izbor:${[...brojevi].sort((x, y) => x - y).join(',')}:${trazi}`
  if (taken.has(signature)) return null
  const ostali = brojevi.filter((b) => b !== tacan)
  return upakujRacun(cfg, rng, {
    text: `Koji je ${trazi === 'max' ? 'najveći' : 'najmanji'} od datih brojeva: ${brojevi.join(', ')}?`,
    tacan,
    kandidati: ostali,
    explanation: `${trazi === 'max' ? 'Najveći' : 'Najmanji'} broj je ${tacan}.`,
    hint: 'Prvo upoređuj broj cifara svakog broja, a ako je isti, cifru po cifru sleva.',
    signature,
    maxDistraktor: 10_000_000_000,
  })
}

function vrednostMesta(rng: Rng, minN: number, maxN: number, maksPozicija: number, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const { n, pozicija } = napraviCifraPitanje(rng, minN, maxN, maksPozicija)
  const cifra = cifraNaMestu(n, pozicija)
  const tacan = cifra * 10 ** pozicija
  const signature = `veliki4:vrednost:${n}:${pozicija}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Koliko iznosi cifra na mestu ${MESTA[pozicija]} u broju ${n}, izražena kao broj (ne kao cifra)?`,
    tacan,
    kandidati: [cifra, tacan + 10 ** pozicija, tacan - 10 ** pozicija, pozicija > 0 ? cifra * 10 ** (pozicija - 1) : cifra],
    explanation: `Cifra na mestu ${MESTA[pozicija]} je ${cifra}, a njena vrednost je ${cifra} · ${10 ** pozicija} = ${tacan}.`,
    hint: 'Ne pitamo se koja je cifra, već koliko ta cifra VREDI na svom mestu (cifra puta vrednost mesta).',
    signature,
    maxDistraktor: 10_000_000_000,
  })
}

function kojaCifra(rng: Rng, minN: number, maxN: number, maksPozicija: number, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const { n, pozicija } = napraviCifraPitanje(rng, minN, maxN, maksPozicija)
  const cifra = cifraNaMestu(n, pozicija)
  const signature = `veliki4:cifra:${n}:${pozicija}`
  if (taken.has(signature)) return null
  const drugeCifre = [...String(n)].map(Number).filter((c) => c !== cifra)
  const kandidati = [...new Set(drugeCifre)].slice(0, 2)
  kandidati.push(cifra + 1, cifra - 1)
  return upakujRacun(cfg, rng, {
    text: `Koja cifra je na mestu ${MESTA[pozicija]} u broju ${n}?`,
    tacan: cifra,
    kandidati,
    explanation: `U broju ${n} cifra na mestu ${MESTA[pozicija]} je ${cifra}.`,
    hint: 'Mesta brojiš zdesna nalevo: jedinice, desetice, stotine, hiljade...',
    signature,
    maxDistraktor: 9,
  })
}

function zbirCifaraPitanje(rng: Rng, minN: number, maxN: number, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const n = ceoBroj(rng, minN, maxN)
  const tacan = zbirCifara(n)
  const signature = `veliki4:zbircifara:${n}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Izračunaj zbir cifara broja ${n}.`,
    tacan,
    kandidati: [tacan + 1, tacan - 1, Number(String(n)[0]), tacan + 2],
    explanation: `Zbir cifara broja ${n} je ${[...String(n)].join(' + ')} = ${tacan}.`,
    hint: 'Saberi SVE cifre broja, jednu po jednu.',
    signature,
    maxDistraktor: 100,
  })
}

function kolikoJedinica(rng: Rng, minN: number, maxN: number, jedinica: 1_000 | 1_000_000, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const n = ceoBroj(rng, minN, maxN)
  const tacan = Math.floor(n / jedinica)
  const naziv = jedinica === 1_000 ? 'hiljada' : 'miliona'
  const signature = `veliki4:koliko:${jedinica}:${n}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Koliko ${naziv} sadrži broj ${n} (zaokruženo na cele ${jedinica === 1_000 ? 'hiljade' : 'milione'} naniže)?`,
    tacan,
    kandidati: [tacan + 1, tacan - 1, Math.floor(n / (jedinica * 10)), Math.floor(n / (jedinica / 10))],
    explanation: `${n} : ${jedinica} = ${tacan} (celi deo), pa broj ${n} sadrži ${tacan} ${naziv}.`,
    hint: `Podeli broj sa ${jedinica} i uzmi ceo deo količnika.`,
    signature,
    maxDistraktor: 10_000_000,
  })
}

function prethodnikSledbenik(rng: Rng, minN: number, maxN: number, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const n = napraviGranicniBroj(rng, minN, maxN)
  const smer = rng() < 0.5 ? 'prethodnik' : 'sledbenik'
  const tacan = smer === 'prethodnik' ? n - 1 : n + 1
  const signature = `veliki4:sledbenik:${n}:${smer}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Napiši prvi ${smer} broja ${n}.`,
    tacan,
    kandidati: [n, tacan + 10, tacan - 10, smer === 'prethodnik' ? n + 1 : n - 1],
    explanation: `Prvi ${smer} broja ${n} je ${tacan}.`,
    hint: smer === 'prethodnik' ? 'Prethodnik je broj za 1 manji — pazi na "posudbu" kod nula.' : 'Sledbenik je broj za 1 veći — pazi na prelaz kad su sve cifre 9.',
    signature,
    maxDistraktor: 10_000_000_000,
  })
}

// ---------------------------------------------------------------------------
// Skup N i N₀ (uklopljeno u istu oblast, iz radne sveske: str. 21).
function skupNPitanje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const oblici = cfg.type === 'numeric'
    ? (['najmanji-n', 'najmanji-n0'] as const)
    : (['nula-u-n', 'najmanji-n', 'najmanji-n0'] as const)
  const oblik = izaberi(rng, oblici)
  const signature = `veliki4:skup:${oblik}`
  if (taken.has(signature)) return null

  if (oblik === 'nula-u-n') {
    const opcije = promesaj(rng, ['0', '1', '2', '3'] as const)
    const options: Opcija[] = opcije.map((t, i) => ({ id: `o${i + 1}`, text: t }))
    const correctId = options[opcije.indexOf('0')].id
    return {
      type: 'single',
      text: 'Koji od navedenih brojeva NE pripada skupu prirodnih brojeva N?',
      options,
      correct: { optionId: correctId },
      explanation: 'Broj 0 ne pripada skupu N (prirodni brojevi) — N počinje od 1. Skup N₀ (prirodni brojevi sa nulom) počinje od 0 i njemu 0 pripada.',
      hint: 'N je skup {1, 2, 3, ...}, a N₀ je skup {0, 1, 2, 3, ...}.',
      points: poeniZaTezinu(cfg.difficulty),
      topicSlug: cfg.topicSlug,
      difficulty: cfg.difficulty,
      signature,
    }
  }

  const trazimoN = oblik === 'najmanji-n'
  return upakujRacun(cfg, rng, {
    text: `Koji je najmanji broj skupa ${trazimoN ? 'N (prirodni brojevi)' : 'N₀ (prirodni brojevi sa nulom)'}?`,
    tacan: trazimoN ? 1 : 0,
    kandidati: [trazimoN ? 0 : 1, 2, 3],
    explanation: trazimoN
      ? 'Skup N (prirodni brojevi) počinje od 1 — to je njegov najmanji broj.'
      : 'Skup N₀ (prirodni brojevi sa nulom) počinje od 0 — to je njegov najmanji broj.',
    hint: 'N = {1, 2, 3, ...}, N₀ = {0, 1, 2, 3, ...}.',
    signature,
    maxDistraktor: 10,
  })
}

export const veliki4: TopicGenerator = {
  slug: 'veliki-brojevi-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1 && rng() < 0.25) {
      const r = skupNPitanje(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 1) {
      return rng() < 0.5
        ? kojaCifra(rng, 1_000, 99_999, 4, cfg, taken)
        : zbirCifaraPitanje(rng, 1_000, 99_999, cfg, taken)
    }
    if (cfg.difficulty === 2) {
      return rng() < 0.5
        ? vrednostMesta(rng, 10_000, 999_999, 5, cfg, taken)
        : kolikoJedinica(rng, 10_000, 999_999, 1_000, cfg, taken)
    }
    if (cfg.difficulty === 3) {
      return rng() < 0.5
        ? poredi(rng, 100_000, 9_999_999, cfg, taken)
        : izborNajveciNajmanji(rng, 100_000, 9_999_999, cfg, taken)
    }
    if (cfg.difficulty === 4) {
      const izbor = ceoBroj(rng, 0, 2)
      if (izbor === 0) return vrednostMesta(rng, 1_000_000, 99_999_999, 7, cfg, taken)
      if (izbor === 1) return kolikoJedinica(rng, 1_000_000, 99_999_999, 1_000_000, cfg, taken)
      return prethodnikSledbenik(rng, 1_000_000, 99_999_999, cfg, taken)
    }
    // Ekspert: opseg milijardi
    const izbor = ceoBroj(rng, 0, 2)
    if (izbor === 0) return vrednostMesta(rng, 1_000_000_000, 9_999_999_999, 9, cfg, taken)
    if (izbor === 1) return poredi(rng, 1_000_000_000, 9_999_999_999, cfg, taken)
    return kolikoJedinica(rng, 1_000_000_000, 9_999_999_999, 1_000_000, cfg, taken)
  },
}
