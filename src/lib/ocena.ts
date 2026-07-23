// Ovi pomoćnici samo predstavljaju broj zvezdica koji je već izračunao server.
export const MAKSIMALNO_ZVEZDICA = 5

export function porukaOhrabrenja(zvezdice: number): string {
  if (zvezdice === 5) return 'Savršeno! Osvojio/la si svih pet zvezdica! 🌟'
  if (zvezdice === 4) return 'Fenomenalno! Još samo mali korak do savršenog rezultata! 🚀'
  if (zvezdice === 3) return 'Sjajno urađeno! Nastavi tako! 💪'
  if (zvezdice === 2) return 'Vrlo dobro! Još malo vežbe i stižu nove zvezdice!'
  if (zvezdice === 1) return 'Bravo! Vežbaj još malo pa će biti još bolje!'
  return 'Ne brini — svaka vežba te čini boljim. Pokušaj ponovo, možeš ti to! 🍀'
}
