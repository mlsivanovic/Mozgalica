import { describe, expect, it } from 'vitest'
import { validirajSahNagrade, type SahNagradaZaCuvanje } from './nagrade'

const NAGRADE: SahNagradaZaCuvanje[] = [
  { approximate_elo: 700, win_stars: 1, draw_stars: 0 },
  { approximate_elo: 900, win_stars: 2, draw_stars: 1 },
  { approximate_elo: 1100, win_stars: 3, draw_stars: 1 },
  { approximate_elo: 1300, win_stars: 6, draw_stars: 2 },
  { approximate_elo: 1500, win_stars: 10, draw_stars: 5 },
]

describe('podešavanje šahovskih nagrada', () => {
  it('prihvata svih pet ELO nivoa i do 10 zvezdica za pobedu', () => {
    expect(validirajSahNagrade(NAGRADE)).toBeNull()
  })

  it('zahteva svih pet ELO nivoa', () => {
    expect(validirajSahNagrade(NAGRADE.slice(0, 4))).toBe('Podesi nagradu za svaki ELO nivo.')
  })

  it('odbija više od 10 zvezdica za pobedu', () => {
    const nagrade = NAGRADE.map((nagrada) => ({ ...nagrada }))
    nagrade[4].win_stars = 11
    expect(validirajSahNagrade(nagrade)).toContain('od 0 do 10')
  })

  it('zadržava najviše 5 zvezdica za remi', () => {
    const nagrade = NAGRADE.map((nagrada) => ({ ...nagrada }))
    nagrade[4].draw_stars = 6
    expect(validirajSahNagrade(nagrade)).toContain('od 0 do 5')
  })
})
