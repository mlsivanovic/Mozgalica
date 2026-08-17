import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
  POCETNI_FEN, ogranicenPlyPregleda, plyZaBrojPoteza, pozicijaPregleda,
} from './pregled'

function poteziIzSan(sanovi: string[]) {
  const igra = new Chess()
  return sanovi.map((san) => {
    const potez = igra.move(san)
    return { uci: `${potez.from}${potez.to}${potez.promotion ?? ''}`, san: potez.san, fenAfter: igra.fen() }
  })
}

describe('pregled šahovske partije', () => {
  const potezi = poteziIzSan(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])

  it('na nuli vraća početnu poziciju bez poslednjeg poteza', () => {
    expect(pozicijaPregleda(potezi, 0)).toEqual({ fen: POCETNI_FEN, lastMove: null, san: null })
  })

  it('skače na tačan FEN i poslednji potez za dati ply', () => {
    const drugi = pozicijaPregleda(potezi, 2)
    expect(drugi.san).toBe('e5')
    expect(drugi.lastMove).toEqual({ from: 'e7', to: 'e5' })
    expect(drugi.fen).toBe(potezi[1].fenAfter)

    const peti = pozicijaPregleda(potezi, 5)
    expect(peti.san).toBe('Bb5')
    expect(peti.lastMove).toEqual({ from: 'f1', to: 'b5' })
    expect(peti.fen).toBe(potezi[4].fenAfter)
  })

  it('seče indeks van opsega', () => {
    expect(ogranicenPlyPregleda(-3, 5)).toBe(0)
    expect(ogranicenPlyPregleda(99, 5)).toBe(5)
    expect(ogranicenPlyPregleda(2.9, 5)).toBe(2)
    expect(ogranicenPlyPregleda(1, 0)).toBe(0)
    expect(pozicijaPregleda(potezi, 99).fen).toBe(potezi[4].fenAfter)
  })

  it('klik na broj poteza ide na kraj tog punog poteza', () => {
    expect(plyZaBrojPoteza(1, 5)).toBe(2)
    expect(plyZaBrojPoteza(2, 5)).toBe(4)
    expect(plyZaBrojPoteza(3, 5)).toBe(5)
    expect(plyZaBrojPoteza(1, 1)).toBe(1)
  })

  it('čita polja i iz promocije od 5 karaktera', () => {
    const promocija = poteziIzSan(['e4', 'd5', 'exd5', 'c6', 'dxc6', 'h6', 'cxb7', 'a6', 'bxa8=Q'])
    const poslednji = pozicijaPregleda(promocija, promocija.length)
    expect(poslednji.lastMove).toEqual({ from: 'b7', to: 'a8' })
    expect(poslednji.san).toMatch(/Q/)
  })
})
