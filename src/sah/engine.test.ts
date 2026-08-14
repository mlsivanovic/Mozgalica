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
    if (elo >= 1100) expect(potez.depth).toBeGreaterThanOrEqual(2)
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
    expect(potez.nodes).toBeLessThanOrEqual(30_000)
    expect(potez.depth).toBeGreaterThanOrEqual(2)
    expect(potez.elapsedMs).toBeLessThan(350)
  })

  it('na nivou 1100 zaustavlja slobodnog pešaka pred promocijom', () => {
    const igra = new Chess()
    for (const potez of ['d4', 'c6', 'e3', 'f5', 'Nc3', 'd5', 'f3', 'g6', 'e4', 'h5', 'exd5', 'Rh6', 'dxc6', 'Nf6', 'cxb7']) {
      igra.move(potez)
    }
    const izbor = izaberiPotezRacunara(igra, 1100, '53ade5ef-b887-4fa3-b854-044cf588272d:15')
    igra.move({ from: izbor.from, to: izbor.to, promotion: izbor.promotion })
    expect(igra.moves()).not.toContain('bxa8=Q')
  })

  it('na nivou 1300 ne ostavlja damu pešaku bez nadoknade', () => {
    const igra = new Chess()
    for (const potez of ['d4', 'f5', 'f3', 'd6', 'e4', 'Nc6', 'Bg5', 'fxe4', 'fxe4', 'Na5', 'Bb5+', 'c6', 'Ba4', 'Qb6', 'b3']) {
      igra.move(potez)
    }
    const izbor = izaberiPotezRacunara(igra, 1300, '367284f3-c313-4fa4-b52e-cd4d96a6076b:15')
    igra.move({ from: izbor.from, to: izbor.to, promotion: izbor.promotion })
    const uzimanjaDame = igra.moves({ verbose: true }).filter((potez) => potez.captured === 'q')
    expect(uzimanjaDame).toHaveLength(0)
  })
})
