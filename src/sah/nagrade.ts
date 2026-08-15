import type { SahNagradaPodesavanje } from '../types/db'
import { SAH_ELO_NIVOI } from './podesavanja'

export type SahNagradaZaCuvanje = Pick<
  SahNagradaPodesavanje,
  'approximate_elo' | 'win_stars' | 'draw_stars'
>

export function validirajSahNagrade(nagrade: SahNagradaZaCuvanje[]): string | null {
  const nivoi = new Set(nagrade.map((nagrada) => nagrada.approximate_elo))
  if (nagrade.length !== SAH_ELO_NIVOI.length || SAH_ELO_NIVOI.some((elo) => !nivoi.has(elo))) {
    return 'Podesi nagradu za svaki ELO nivo.'
  }

  for (const nagrada of nagrade) {
    if (!Number.isInteger(nagrada.win_stars) || nagrada.win_stars < 0 || nagrada.win_stars > 10) {
      return `Nagrada za pobedu na ELO ${nagrada.approximate_elo} mora biti od 0 do 10 zvezdica.`
    }
    if (!Number.isInteger(nagrada.draw_stars) || nagrada.draw_stars < 0 || nagrada.draw_stars > 5) {
      return `Nagrada za remi na ELO ${nagrada.approximate_elo} mora biti od 0 do 5 zvezdica.`
    }
  }

  return null
}
