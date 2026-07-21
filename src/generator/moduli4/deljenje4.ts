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

export const deljenje4: TopicGenerator = {
  slug: 'deljenje-4',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
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
