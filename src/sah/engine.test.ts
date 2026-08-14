import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { izaberiPotezRacunara, type SahElo } from './engine'

describe('šahovski engine', () => {
  it.each<SahElo>([700, 900, 1100, 1300, 1500])('uvek bira legalan potez na nivou %i', (elo) => {
    const igra = new Chess()
    igra.move('e4')
    const legalni = new Set(igra.moves({ verbose: true }).map((p) => `${p.from}${p.to}${p.promotion ?? ''}`))
    const potez = izaberiPotezRacunara(igra, elo, 'partija:1')
    expect(legalni.has(`${potez.from}${potez.to}${potez.promotion ?? ''}`)).toBe(true)
  })

  it('isti seed i pozicija daju isti potez', () => {
    const prvi = izaberiPotezRacunara(new Chess(), 1100, 'stabilan-seed')
    const drugi = izaberiPotezRacunara(new Chess(), 1100, 'stabilan-seed')
    expect({ from: prvi.from, to: prvi.to, promotion: prvi.promotion }).toEqual({
      from: drugi.from, to: drugi.to, promotion: drugi.promotion,
    })
  })

  it('uzima mat u jednom bez obzira na nivo', () => {
    const igra = new Chess('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1')
    const potez = izaberiPotezRacunara(igra, 700, 'mat')
    igra.move({ from: potez.from, to: potez.to, promotion: potez.promotion })
    expect(igra.isCheckmate()).toBe(true)
  })

  it('poštuje budžet pretrage najjačeg nivoa', () => {
    const potez = izaberiPotezRacunara(new Chess(), 1500, 'budzet')
    expect(potez.nodes).toBeLessThanOrEqual(20_000)
    expect(potez.elapsedMs).toBeLessThan(350)
  })
})
