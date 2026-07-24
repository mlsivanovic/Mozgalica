import { describe, expect, it } from 'vitest'
import {
  emailJeIspravan, normalizujEmail, podrazumevanoSlanjeMejla,
} from './email'

describe('email deteta', () => {
  it('normalizuje adresu bez menjanja sadržaja lokalnog dela', () => {
    expect(normalizujEmail('  Dete.Primer+kviz@Example.COM ')).toBe('dete.primer+kviz@example.com')
  })

  it('prihvata razumnu adresu, a odbija nepotpun ili predugačak unos', () => {
    expect(emailJeIspravan('dete@example.com')).toBe(true)
    expect(emailJeIspravan('dete@localhost')).toBe(false)
    expect(emailJeIspravan('dete @example.com')).toBe(false)
    expect(emailJeIspravan(`${'a'.repeat(250)}@x.rs`)).toBe(false)
  })

  it('uključuje podrazumevano slanje samo kada postoje i adresa i profilna postavka', () => {
    expect(podrazumevanoSlanjeMejla('dete@example.com', true)).toBe(true)
    expect(podrazumevanoSlanjeMejla('dete@example.com', false)).toBe(false)
    expect(podrazumevanoSlanjeMejla(null, true)).toBe(false)
  })
})
