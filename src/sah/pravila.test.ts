import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'

describe('šahovska pravila koja koristi serverska partija', () => {
  it('dozvoljava rokadu i pravilno pomera topa', () => {
    const igra = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    igra.move({ from: 'e1', to: 'g1' })
    expect(igra.get('g1')?.type).toBe('k')
    expect(igra.get('f1')?.type).toBe('r')
  })

  it('obrađuje an pasan', () => {
    const igra = new Chess()
    for (const potez of ['e4', 'a6', 'e5', 'd5']) igra.move(potez)
    igra.move({ from: 'e5', to: 'd6' })
    expect(igra.get('d6')?.type).toBe('p')
    expect(igra.get('d5')).toBeUndefined()
  })

  it('zahteva i čuva promociju', () => {
    const igra = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1')
    igra.move({ from: 'a7', to: 'a8', promotion: 'q' })
    expect(igra.get('a8')?.type).toBe('q')
  })

  it('razlikuje mat i pat', () => {
    expect(new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1').isCheckmate()).toBe(true)
    expect(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').isStalemate()).toBe(true)
  })

  it('prepoznaje trostruko ponavljanje, 50 poteza i nedovoljno materijala', () => {
    const ponavljanje = new Chess()
    for (const potez of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) {
      ponavljanje.move(potez)
    }
    expect(ponavljanje.isThreefoldRepetition()).toBe(true)

    const pedeset = new Chess('8/8/8/8/8/4k3/8/R3K3 w - - 99 50')
    pedeset.move({ from: 'a1', to: 'a2' })
    expect(pedeset.isDrawByFiftyMoves()).toBe(true)
    expect(new Chess('8/8/8/8/8/4k3/8/4K3 w - - 0 1').isInsufficientMaterial()).toBe(true)
  })
})
