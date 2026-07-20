// Prikazni pomoćnici za rezultat deteta (zvezdice i poruke) — NE ocenjuje odgovore,
// ocenjivanje se dešava isključivo na serveru
export function brojZvezdica(scorePct: number, prag: number): 0 | 1 | 2 | 3 {
  if (scorePct >= 90) return 3
  if (scorePct >= 70) return 2
  if (scorePct >= prag) return 1
  return 0
}

export function porukaOhrabrenja(scorePct: number, prag: number): string {
  if (scorePct >= 90) return 'Sjajno! Pravi si matematički as! 🌟'
  if (scorePct >= 70) return 'Odlično urađeno! Samo tako nastavi! 💪'
  if (scorePct >= prag) return 'Bravo, uspešno si završio kviz! Vežbaj još malo pa će biti još bolje!'
  return 'Ne brini — svaka vežba te čini boljim. Pokušaj ponovo, možeš ti to! 🍀'
}
