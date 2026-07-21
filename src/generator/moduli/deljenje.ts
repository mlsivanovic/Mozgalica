// Generator: deljenje — UVEK konstruisano iz proizvoda, pa nema ostatka.
// Nivo 1/2: jedno deljenje. Nivo 3: LANAC dva uzastopna deljenja (deljenik : d1 : d2).
// Nivo 4: deljenje dvocifrenim deliocem. Nivo 5: lanac sa dvocifrenim prvim deliocem.
import type { Tezina } from '../../types/db'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { genMn, izaberiPredmet, kolicina, upakujRacun, dvaImena } from './zajednicko'

const DRUG: [string, string, string, string] = ['drug', 'druga', 'drugova', 'druga']
const KUTIJA: [string, string, string, string] = ['kutija', 'kutije', 'kutija', 'kutiju']

// Vraća [deljenik, delilac1, delilac2, ...] (bez konačnog količnika)
function napraviDeljenje(rng: Rng, tezina: Tezina): number[] {
  if (tezina === 1) {
    const delilac = ceoBroj(rng, 2, 5)
    const kolicnik = ceoBroj(rng, 2, 10)
    return [delilac * kolicnik, delilac]
  }
  if (tezina === 2) {
    const delilac = ceoBroj(rng, 6, 9)
    const kolicnik = ceoBroj(rng, 2, 10)
    return [delilac * kolicnik, delilac]
  }
  if (tezina === 3) {
    // Lanac dva deljenja, konstruisan iznutra-napolje (nema ostatka nikad)
    const kolicnik = ceoBroj(rng, 2, 10)
    const delilac1 = ceoBroj(rng, 2, 9)
    const delilac2 = ceoBroj(rng, 2, 9)
    return [kolicnik * delilac1 * delilac2, delilac1, delilac2]
  }
  if (tezina === 4) {
    // Dvocifreni delilac
    const delilac = ceoBroj(rng, 11, 25)
    const kolicnik = ceoBroj(rng, 2, 40)
    return [delilac * kolicnik, delilac]
  }
  // Ekspert: lanac, prvi delilac dvocifren (količnik budžetiran da deljenik ostane ≤ 1000)
  const delilac1 = ceoBroj(rng, 11, 19)
  const delilac2 = ceoBroj(rng, 2, 6)
  const budzetK = Math.max(2, Math.floor(1000 / (delilac1 * delilac2)))
  const kolicnik = ceoBroj(rng, 2, budzetK)
  return [kolicnik * delilac1 * delilac2, delilac1, delilac2]
}

export const deljenje: TopicGenerator = {
  slug: 'deljenje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const [deljenik, ...delioci] = napraviDeljenje(rng, cfg.difficulty)
    const tacan = delioci.reduce((kol, d) => kol / d, deljenik)
    const signature = `deljenje:${[deljenik, ...delioci].join(':')}`
    if (taken.has(signature)) return null

    const izraz = `${deljenik} : ${delioci.join(' : ')}`
    let text = `Izračunaj: ${izraz} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1] = dvaImena(rng)
      if (delioci.length === 1) {
        const delilac = delioci[0]
        const sabloni = [
          `${ime1} ima ${kolicina(deljenik, predmet, 'akuz')} i podeli ih podjednako na ${kolicina(delilac, DRUG, 'akuz')}. Koliko ${genMn(predmet)} dobije svaki?`,
          `${kolicina(deljenik, predmet)} treba podjednako rasporediti u ${kolicina(delilac, KUTIJA, 'akuz')}. Koliko ${genMn(predmet)} ide u svaku kutiju?`,
        ]
        text = izaberi(rng, sabloni)
      } else {
        text = `Podeli broj ${deljenik} prvo sa ${delioci[0]}, pa dobijeni rezultat podeli sa ${delioci[1]}. Koliki je konačan rezultat?`
      }
    }

    const kandidati = delioci.length === 1
      ? [tacan + 1, tacan - 1, tacan + 2, delioci[0], deljenik - delioci[0]]
      : [deljenik / delioci[0], tacan + 1, tacan - 1] // stao posle prvog deljenja (zaboravio drugi korak)

    const objasnjenje = delioci.length === 1
      ? `${deljenik} : ${delioci[0]} = ${tacan}, jer je ${tacan} · ${delioci[0]} = ${deljenik}`
      : `${deljenik} : ${delioci[0]} = ${deljenik / delioci[0]}, pa ${deljenik / delioci[0]} : ${delioci[1]} = ${tacan}`

    return upakujRacun(cfg, rng, {
      text, tacan, kandidati,
      explanation: objasnjenje,
      hint: 'Pomozi se tablicom množenja: koji broj pomnožen deliocem daje deljenik?',
      signature,
    })
  },
}
