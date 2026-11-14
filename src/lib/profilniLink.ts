// Isti string koji se kopira i koji se crta kao QR. Bez mrežnog poziva.
export function profilniLink(bazaUrl: string, publicToken: string): string {
  return `${bazaUrl}#/dete/${publicToken}`
}
