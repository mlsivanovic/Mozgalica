// Generator: deljenje (4. razred) — UVEK konstruisano iz proizvoda (nema ostatka),
// isti pattern kao src/generator/moduli/deljenje.ts, naglasak na dvocifrenom deliocu.
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { genMn, izaberiPredmet, kolicina, upakujRacun, dvaImena } from '../moduli/zajednicko'

const MAX_DISTRAKTOR = 1_500_000
const DRUG: [string, string, string, string] = ['drug', 'druga', 'drugova', 'druga']
const KUTIJA: [string, string, string, string] = ['kutija', 'kutije', 'kutija', 'kutiju']

interface Ostatak {
  deljenik: number
  delilac: number
  kolicnik: number
  ostatak: number
  trazi: 'kolicnik' | 'ostatak'
}

// Konstruiše deljenje SA ostatkom: deljenik = kolicnik·delilac + ostatak,
// ostatak uvek 1..delilac-1 (nikad 0, inače bi to bilo obično tačno deljenje).
function napraviOstatak(rng: Rng, delilac: number, kolicnik: number): Ostatak {
  const ostatak = ceoBroj(rng, 1, delilac - 1)
  const deljenik = kolicnik * delilac + ostatak
  const trazi = rng() < 0.5 ? 'kolicnik' : 'ostatak'
  return { deljenik, delilac, kolicnik, ostatak, trazi }
}

// Vraća [deljenik, delilac1, delilac2, ...] (bez konačnog količnika) — za egzaktno deljenje
function napraviDeljenje(rng: Rng, tezina: 1 | 2 | 4): number[] {
  if (tezina === 1) {
    // 1-cifreni delilac, deljenik 4-5 cifara
    const delilac = ceoBroj(rng, 2, 9)
    const kolicnik = ceoBroj(rng, 500, 4_999)
    return [delilac * kolicnik, delilac]
  }
  if (tezina === 2) {
    // Dvocifreni delilac, bez ostatka
    const delilac = ceoBroj(rng, 11, 99)
    const kolicnik = ceoBroj(rng, 100, 999)
    return [delilac * kolicnik, delilac]
  }
  // t4: trocifreni delilac, deljenik 5-6 cifara (npr. 43885 : 131)
  const delilac = ceoBroj(rng, 100, 999)
  const kolicnik = ceoBroj(rng, 100, 999)
  return [delilac * kolicnik, delilac]
}

// ---------------------------------------------------------------------------
// Svojstva deljenja + dekadne jedinice (uklopljeno u istu oblast, iz radne
// sveske: deljenje dekadnom jedinicom, zavisnost/stalnost količnika,
// deljenje zbira/razlike brojem).

// Deljenje dekadnom jedinicom (10/100/1000) — n konstruisan kao umnožak
function dekadnoDeljenje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const d = izaberi(rng, [10, 100, 1_000] as const)
  const kolicnik = ceoBroj(rng, 12, 9_999)
  const n = kolicnik * d
  const signature = `deljenje4:dek:del:${n},${d}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Izračunaj: ${n} : ${d} = ?`,
    tacan: kolicnik,
    kandidati: [n, kolicnik * 10, Math.max(1, Math.floor(kolicnik / 10)), kolicnik + 1],
    explanation: `Broj se deli dekadnom jedinicom tako što mu se sa desne strane „skine" onoliko nula koliko ima ta dekadna jedinica: ${n} : ${d} = ${kolicnik}.`,
    hint: `Podeli sa ${d} tako što ćeš skinuti odgovarajući broj nula sa kraja broja.`,
    signature,
    maxDistraktor: 10_000_000,
  })
}

// Zavisnost količnika od promene deljenika (isti smer) ili delioca (suprotan smer)
function zavisnostKolicnika(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const Q = ceoBroj(rng, 10, 9_999)
  const k = ceoBroj(rng, 2, 12)
  const deljenikMenja = rng() < 0.5
  const pov = rng() < 0.5
  let tacan: number
  if (deljenikMenja) {
    if (pov) tacan = Q * k
    else { if (Q % k !== 0) return null; tacan = Q / k }
  } else {
    if (pov) { if (Q % k !== 0) return null; tacan = Q / k }
    else tacan = Q * k
  }
  const signature = `deljenje4:sv:zav:${Q},${k},${deljenikMenja ? 'deljenik' : 'delilac'},${pov ? 'pov' : 'sman'}`
  if (taken.has(signature)) return null
  const opis = deljenikMenja
    ? `Kad se deljenik ${pov ? 'poveća' : 'smanji'} ${k} puta, količnik se menja u ISTOM smeru.`
    : `Kad se delilac ${pov ? 'poveća' : 'smanji'} ${k} puta, količnik se menja u SUPROTNOM smeru.`
  return upakujRacun(cfg, rng, {
    text: `Količnik dva broja je ${Q}. Koliki će biti količnik ako se ${deljenikMenja ? 'deljenik' : 'delilac'} ${pov ? 'poveća' : 'smanji'} ${k} puta?`,
    tacan,
    kandidati: [Q, Q * k, Q % k === 0 ? Q / k : Q + 1, tacan + 10],
    explanation: `${opis} Novi količnik je ${tacan}.`,
    hint: deljenikMenja
      ? 'Ako se promeni deljenik, količnik se menja u istom smeru.'
      : 'Pažljivo: ako se promeni delilac, količnik se menja u SUPROTNOM smeru.',
    signature,
    maxDistraktor: 500_000,
  })
}

// Deljenje zbira/razlike brojem: (a ± b) : c = a:c ± b:c
function deljenjeZbiraRazlike(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const c = ceoBroj(rng, 2, 20)
  const qa = ceoBroj(rng, 10, 999)
  const qb = ceoBroj(rng, 10, 999)
  const a = qa * c
  const b = qb * c
  const zbir = rng() < 0.5
  if (!zbir && qa === qb) return null
  const tacan = zbir ? qa + qb : Math.abs(qa - qb)
  const signature = `deljenje4:sv:distrib:${a},${b},${c},${zbir ? 'zbir' : 'razlika'}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Izračunaj: (${a} ${zbir ? '+' : '−'} ${b}) : ${c} = ?`,
    tacan,
    kandidati: [a + b, qa, qb, tacan + 10],
    explanation: `${zbir ? 'Zbir' : 'Razliku'} možemo podeliti tako što svaki broj podelimo pojedinačno, pa rezultate saberemo/oduzmemo: ${a} : ${c} = ${qa}, ${b} : ${c} = ${qb}, pa je rezultat ${qa} ${zbir ? '+' : '−'} ${qb} = ${tacan}.`,
    hint: 'Podeli svaki broj u zagradi pojedinačno istim deliocem, pa rezultate saberi/oduzmi.',
    signature,
    maxDistraktor: 2_000,
  })
}

// Stalnost količnika (dopuna): (deljenik · k) : (delilac · __) = Q
function stalnostKolicnika(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const k = izaberi(rng, [2, 3, 4, 5] as const)
  const Q = ceoBroj(rng, 10, 9_999)
  const delilac = ceoBroj(rng, 2, 99)
  const deljenik = Q * delilac
  const signature = `deljenje4:sv:stal:${deljenik},${delilac},${k}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Bez računanja, upiši broj: (${deljenik} · ${k}) : (${delilac} · __) = ${Q}`,
    tacan: k,
    kandidati: [deljenik, delilac, Q, k + 1],
    explanation: `Količnik ostaje isti ako deljenik i delilac pomnožimo istim brojem: pošto je deljenik pomnožen sa ${k}, i delilac mora biti pomnožen sa ${k} da količnik ostane ${Q}.`,
    hint: 'Količnik se ne menja ako deljenik i delilac pomnožiš (ili podeliš) ISTIM brojem.',
    signature,
    maxDistraktor: 200_000,
  })
}

// Ekspert identitet: ako je a : b = Q, koliko je (a · k) : (b · k)
function identitetDeljenje(rng: Rng, cfg: GeneratorConfig, taken: Set<string>): GenerisanoPitanje | null {
  const Q = ceoBroj(rng, 10, 9_999)
  const k = ceoBroj(rng, 2, 12)
  const signature = `deljenje4:sv:ident:${Q},${k}`
  if (taken.has(signature)) return null
  return upakujRacun(cfg, rng, {
    text: `Ako je a : b = ${Q}, koliko je (a · ${k}) : (b · ${k})?`,
    tacan: Q,
    kandidati: [Q * k, Math.max(1, Math.floor(Q / k)), Q + k, Math.max(0, Q - 1)],
    explanation: `Ako deljenik i delilac pomnožimo istim brojem, količnik ostaje isti: (a · ${k}) : (b · ${k}) = a : b = ${Q}.`,
    hint: 'Množenje deljenika i delioca istim brojem ne menja količnik.',
    signature,
    maxDistraktor: 200_000,
  })
}

export const deljenje4: TopicGenerator = {
  slug: 'deljenje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    if (cfg.difficulty === 1 && rng() < 0.3) {
      const r = dekadnoDeljenje(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 2 && rng() < 0.3) {
      const r = zavisnostKolicnika(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 3 && rng() < 0.25) {
      const r = deljenjeZbiraRazlike(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 4 && rng() < 0.3) {
      const r = stalnostKolicnika(rng, cfg, taken)
      if (r) return r
    }
    if (cfg.difficulty === 5 && rng() < 0.25) {
      const r = identitetDeljenje(rng, cfg, taken)
      if (r) return r
    }

    if (cfg.difficulty === 3 || cfg.difficulty === 5) {
      // t3: dvocifreni delilac sa ostatkom. t5: 50/50 trocifreni delilac sa
      // ostatkom, ili lanac dva egzaktna deljenja sa dvocifrenim prvim deliocem.
      if (cfg.difficulty === 5 && rng() < 0.5) {
        const delilac1 = ceoBroj(rng, 11, 99)
        const delilac2 = ceoBroj(rng, 2, 9)
        const budzetK = Math.max(2, Math.floor(5_000_000 / (delilac1 * delilac2)))
        const kolicnik = ceoBroj(rng, 2, budzetK)
        const deljenik = kolicnik * delilac1 * delilac2
        const signature = `deljenje4:${deljenik}:${delilac1}:${delilac2}`
        if (taken.has(signature)) return null
        const medjurezultat = deljenik / delilac1
        return upakujRacun(cfg, rng, {
          text: `Podeli broj ${deljenik} prvo sa ${delilac1}, pa dobijeni rezultat podeli sa ${delilac2}. Koliki je konačan rezultat?`,
          tacan: kolicnik,
          kandidati: [medjurezultat, kolicnik + 1, kolicnik - 1],
          explanation: `${deljenik} : ${delilac1} = ${medjurezultat}, pa ${medjurezultat} : ${delilac2} = ${kolicnik}.`,
          hint: 'Podeli u dva koraka, redom — prvo prvim deliocem, pa rezultat drugim.',
          signature,
          maxDistraktor: MAX_DISTRAKTOR,
        })
      }
      const delilac = cfg.difficulty === 3 ? ceoBroj(rng, 11, 99) : ceoBroj(rng, 100, 999)
      const kolicnik = ceoBroj(rng, 100, 999)
      const { deljenik, ostatak, trazi } = napraviOstatak(rng, delilac, kolicnik)
      const signature = `deljenje4:ost:${deljenik}:${delilac}:${ostatak}:${trazi}`
      if (taken.has(signature)) return null
      const tacan = trazi === 'kolicnik' ? kolicnik : ostatak
      return upakujRacun(cfg, rng, {
        text: trazi === 'kolicnik'
          ? `Podeli sa ostatkom: ${deljenik} : ${delilac} = ? (upiši količnik, bez ostatka)`
          : `Podeli sa ostatkom: ${deljenik} : ${delilac} = ? (upiši OSTATAK)`,
        tacan,
        kandidati: trazi === 'kolicnik'
          ? [kolicnik + 1, kolicnik - 1, ostatak, delilac]
          : [ostatak + 1, ostatak - 1, kolicnik, delilac - ostatak],
        explanation: `${deljenik} : ${delilac} = ${kolicnik} (ostatak ${ostatak}), jer je ${kolicnik} · ${delilac} + ${ostatak} = ${deljenik}.`,
        hint: 'Ostatak pri deljenju je uvek manji od delioca. Provera: količnik · delilac + ostatak = deljenik.',
        signature,
        maxDistraktor: MAX_DISTRAKTOR,
      })
    }

    const [deljenik, ...delioci] = napraviDeljenje(rng, cfg.difficulty)
    const tacan = delioci.reduce((kol, d) => kol / d, deljenik)
    const signature = `deljenje4:${[deljenik, ...delioci].join(':')}`
    if (taken.has(signature)) return null

    const izraz = `${deljenik} : ${delioci.join(' : ')}`
    let text = `Izračunaj: ${izraz} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1] = dvaImena(rng)
      const delilac = delioci[0]
      const sabloni = [
        `${ime1} ima ${kolicina(deljenik, predmet, 'akuz')} i podeli ih podjednako na ${kolicina(delilac, DRUG, 'akuz')}. Koliko ${genMn(predmet)} dobije svaki?`,
        `${kolicina(deljenik, predmet)} treba podjednako rasporediti u ${kolicina(delilac, KUTIJA, 'akuz')}. Koliko ${genMn(predmet)} ide u svaku kutiju?`,
      ]
      text = izaberi(rng, sabloni)
    }

    const kandidati = [tacan + 1, tacan - 1, tacan + 2, delioci[0], deljenik - delioci[0]]
    const objasnjenje = `${deljenik} : ${delioci[0]} = ${tacan}, jer je ${tacan} · ${delioci[0]} = ${deljenik}`

    return upakujRacun(cfg, rng, {
      text, tacan, kandidati,
      explanation: objasnjenje,
      hint: 'Deli pismeno počevši od najviše decimalne jedinice deljenika (hiljade, pa stotine, pa desetice, pa jedinice).',
      signature,
      maxDistraktor: MAX_DISTRAKTOR,
    })
  },
}
