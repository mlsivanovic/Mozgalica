const EMAIL_OBLIK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizujEmail(vrednost: string): string {
  return vrednost.trim().toLowerCase()
}

export function emailJeIspravan(vrednost: string): boolean {
  const email = normalizujEmail(vrednost)
  return email.length >= 3 && email.length <= 254 && EMAIL_OBLIK.test(email)
}

export function podrazumevanoSlanjeMejla(
  email: string | null | undefined,
  profilUkljucen: boolean,
): boolean {
  return Boolean(email && profilUkljucen)
}
