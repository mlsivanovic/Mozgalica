import { describe, expect, it } from 'vitest'
import {
  danasUBeogradu, imaPodatkeZaGrafik, izracunajTrendPoslednjaTri,
  odrediBrziPeriod, validirajPrilagodjeniPeriod,
} from './statistikaDeteta'

describe('period statistike deteta', () => {
  it('računa poslednjih 7 i 30 dana inkluzivno u beogradskoj zoni', () => {
    const sada = new Date('2026-08-12T12:00:00Z')

    expect(odrediBrziPeriod('7d', sada)).toEqual({ from: '2026-08-06', to: '2026-08-12' })
    expect(odrediBrziPeriod('30d', sada)).toEqual({ from: '2026-07-14', to: '2026-08-12' })
  })

  it('određuje početak tekuće školske godine na granici septembra', () => {
    expect(odrediBrziPeriod('school-year', new Date('2026-08-31T10:00:00Z')))
      .toEqual({ from: '2025-09-01', to: '2026-08-31' })
    expect(odrediBrziPeriod('school-year', new Date('2026-09-01T10:00:00Z')))
      .toEqual({ from: '2026-09-01', to: '2026-09-01' })
    expect(danasUBeogradu(new Date('2026-08-12T22:30:00Z'))).toBe('2026-08-13')
  })

  it('validira prilagođen opseg', () => {
    expect(validirajPrilagodjeniPeriod('', '2026-08-12')).toBe('Izaberi početni i završni datum.')
    expect(validirajPrilagodjeniPeriod('2026-02-30', '2026-08-12')).toBe('Unesi ispravne datume.')
    expect(validirajPrilagodjeniPeriod('2026-08-13', '2026-08-12'))
      .toBe('Početni datum ne može biti posle završnog datuma.')
    expect(validirajPrilagodjeniPeriod('2026-08-01', '2026-08-12')).toBeNull()
  })
})

describe('trend i prazna stanja statistike deteta', () => {
  it('poredi poslednja tri rezultata sa tri prethodna', () => {
    expect(izracunajTrendPoslednjaTri([100, 90, 80, 70, 60, 50])).toBe(30)
    expect(izracunajTrendPoslednjaTri([80, 80, 80, 80, 80, 80])).toBe(0)
  })

  it('ne izmišlja trend ni grafik bez dovoljno podataka', () => {
    expect(izracunajTrendPoslednjaTri([100, 90, 80, 70, 60])).toBeNull()
    expect(imaPodatkeZaGrafik(0)).toBe(false)
    expect(imaPodatkeZaGrafik(1)).toBe(true)
  })
})
