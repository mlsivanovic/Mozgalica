import { izaberi } from '../random.ts'
import type { TopicGenerator } from '../types.ts'
import { hoceTvrdnju, upakujSrpskiTekst, upakujSrpskiTvrdnju } from '../moduli/srpskiZajednicko.ts'

export interface ZadatakSrpski5 {
  id: string
  porodica: string
  pitanje: string
  tacan: string
  prihvaceni?: string[]
  tvrdnjaTacna: string
  tvrdnjaNetacna: string
  objasnjenje: string
}

export function napraviSrpskiGenerator5(slug: string, zadaci: readonly ZadatakSrpski5[]): TopicGenerator {
  return {
    slug, supportedTypes: ['text', 'truefalse'], supportsWordProblems: false,
    generateOne(cfg, rng, taken) {
      const potpis = (z: ZadatakSrpski5) => `${slug}:${z.porodica}:${z.id}`
      // Biramo iz preostalog skupa da kraj male banke ne izazove prerano iscrpljivanje.
      const dostupni = zadaci.filter((z) => !taken.has(potpis(z)))
      if (dostupni.length === 0) return null
      const z = izaberi(rng, dostupni)
      const zajednicko = { explanation: z.objasnjenje, hint: null, signature: potpis(z) }
      return hoceTvrdnju(cfg, rng)
        ? upakujSrpskiTvrdnju(cfg, rng, { ...zajednicko, tvrdnjaTacna: z.tvrdnjaTacna, tvrdnjaNetacna: z.tvrdnjaNetacna })
        : upakujSrpskiTekst(cfg, { ...zajednicko, pitanje: z.pitanje, tacan: z.tacan, prihvaceni: z.prihvaceni })
    },
  }
}

export function zadatak5(
  porodica: string, id: string, pitanje: string, tacan: string, pogresan: string,
  pocetakTvrdnje: string, objasnjenje: string, prihvaceni?: string[],
): ZadatakSrpski5 {
  return {
    porodica, id, pitanje, tacan, prihvaceni, objasnjenje,
    tvrdnjaTacna: `${pocetakTvrdnje} „${tacan}“.`,
    tvrdnjaNetacna: `${pocetakTvrdnje} „${pogresan}“.`,
  }
}
