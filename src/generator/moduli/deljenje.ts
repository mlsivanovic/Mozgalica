// Generator: deljenje — UVEK konstruisano kao proizvod ÷ činilac, pa nema ostatka
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { genMn, izaberiPredmet, kolicina, upakujRacun, dvaImena } from './zajednicko'

const DRUG: [string, string, string, string] = ['drug', 'druga', 'drugova', 'druga']
const KUTIJA: [string, string, string, string] = ['kutija', 'kutije', 'kutija', 'kutiju']

// Vraća [deljenik, delilac, količnik]
function napraviDeljenje(rng: Rng, tezina: 1 | 2 | 3): [number, number, number] {
  if (tezina === 1) {
    const delilac = ceoBroj(rng, 2, 5)
    const kolicnik = ceoBroj(rng, 2, 10)
    return [delilac * kolicnik, delilac, kolicnik]
  }
  if (tezina === 2) {
    const delilac = ceoBroj(rng, 6, 9)
    const kolicnik = ceoBroj(rng, 2, 10)
    return [delilac * kolicnik, delilac, kolicnik]
  }
  // Teško: količnik je pun broj desetica (npr. 480 ÷ 6 = 80)
  const delilac = ceoBroj(rng, 2, 9)
  const kolicnik = ceoBroj(rng, 2, Math.floor(100 / delilac)) * 10
  return [delilac * kolicnik, delilac, kolicnik]
}

export const deljenje: TopicGenerator = {
  slug: 'deljenje',
  supportedTypes: ['numeric', 'single'],
  supportsWordProblems: true,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    const [deljenik, delilac, kolicnik] = napraviDeljenje(rng, cfg.difficulty)
    const signature = `deljenje:${deljenik}:${delilac}`
    if (taken.has(signature)) return null

    let text = `Izračunaj: ${deljenik} : ${delilac} = ?`
    if (cfg.wordProblems) {
      const predmet = izaberiPredmet(rng)
      const [ime1] = dvaImena(rng)
      const sabloni = [
        `${ime1} ima ${kolicina(deljenik, predmet, 'akuz')} i podeli ih podjednako na ${kolicina(delilac, DRUG, 'akuz')}. Koliko ${genMn(predmet)} dobije svaki?`,
        `${kolicina(deljenik, predmet)} treba podjednako rasporediti u ${kolicina(delilac, KUTIJA, 'akuz')}. Koliko ${genMn(predmet)} ide u svaku kutiju?`,
      ]
      text = izaberi(rng, sabloni)
    }

    return upakujRacun(cfg, rng, {
      text,
      tacan: kolicnik,
      kandidati: [
        kolicnik + 1, // greška u tablici
        kolicnik - 1,
        kolicnik + 2,
        delilac, // zamena delioca i količnika
        deljenik - delilac, // pogrešna operacija
      ],
      explanation: `${deljenik} : ${delilac} = ${kolicnik}, jer je ${kolicnik} · ${delilac} = ${deljenik}`,
      hint: 'Pomozi se tablicom množenja: koji broj pomnožen deliocem daje deljenik?',
      signature,
    })
  },
}
