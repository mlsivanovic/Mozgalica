import { describe, expect, it } from 'vitest'
import { MAKSIMALNO_ZVEZDICA, porukaOhrabrenja } from './ocena'

describe('porukaOhrabrenja', () => {
  it.each([
    [0, 'Ne brini — svaka vežba te čini boljim. Pokušaj ponovo, možeš ti to! 🍀'],
    [1, 'Bravo! Vežbaj još malo pa će biti još bolje!'],
    [2, 'Vrlo dobro! Još malo vežbe i stižu nove zvezdice!'],
    [3, 'Sjajno urađeno! Nastavi tako! 💪'],
    [4, 'Fenomenalno! Još samo mali korak do savršenog rezultata! 🚀'],
    [5, 'Savršeno! Osvojio/la si svih pet zvezdica! 🌟'],
  ])('bira poruku na osnovu %i serverskih zvezdica', (zvezdice, poruka) => {
    expect(porukaOhrabrenja(zvezdice)).toBe(poruka)
  })

  it('prikazuje skalu do pet zvezdica', () => {
    expect(MAKSIMALNO_ZVEZDICA).toBe(5)
  })
})
