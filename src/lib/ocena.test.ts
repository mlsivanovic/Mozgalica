import { describe, expect, it } from 'vitest'
import { porukaOhrabrenja } from './ocena'

describe('porukaOhrabrenja', () => {
  it.each([
    [0, 'Ne brini — svaka vežba te čini boljim. Pokušaj ponovo, možeš ti to! 🍀'],
    [1, 'Bravo! Vežbaj još malo pa će biti još bolje!'],
    [2, 'Odlično urađeno! Samo tako nastavi! 💪'],
    [3, 'Sjajno! Pravi si matematički as! 🌟'],
  ])('bira poruku na osnovu %i serverskih zvezdica', (zvezdice, poruka) => {
    expect(porukaOhrabrenja(zvezdice)).toBe(poruka)
  })
})
