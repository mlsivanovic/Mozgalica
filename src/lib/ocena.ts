// Ovi pomoćnici samo predstavljaju broj zvezdica koji je već izračunao server.
export function porukaOhrabrenja(zvezdice: number): string {
  if (zvezdice === 3) return 'Sjajno! Pravi si matematički as! 🌟'
  if (zvezdice === 2) return 'Odlično urađeno! Samo tako nastavi! 💪'
  if (zvezdice === 1) return 'Bravo! Vežbaj još malo pa će biti još bolje!'
  return 'Ne brini — svaka vežba te čini boljim. Pokušaj ponovo, možeš ti to! 🍀'
}
