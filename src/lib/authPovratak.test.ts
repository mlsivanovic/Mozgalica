import { describe, expect, it } from 'vitest'
import {
  KLJUC_GRESKE_PRIJAVE, KLJUC_POTVRDE_LINKA, KLJUC_ZAHTEVA_LOZINKE, jeAuthHash,
  jeIstekaoIliNeispravanOtp, obradiAuthPovratak, porukaGreskePotvrde, procitajAuthPovratak,
  procitajPotvrduLinka, procitajSacuvanuPotvrduLinka, proveriNovuLozinku, vrstaZaTipPotvrde,
} from './authPovratak'

const TOKENI = 'access_token=abc&expires_in=3600&refresh_token=r&token_type=bearer'

function lazniPregledac(hash: string, search = '') {
  const mapa = new Map<string, string>()
  const skladiste = {
    getItem: (k: string) => mapa.get(k) ?? null,
    setItem: (k: string, v: string) => { mapa.set(k, v) },
    removeItem: (k: string) => { mapa.delete(k) },
  } as unknown as Storage
  const zamene: string[] = []
  const istorija = { replaceState: (_s: unknown, _t: string, url: string) => { zamene.push(url) } } as unknown as History
  const lokacija = { pathname: '/Mozgalica/', search, hash } as Location
  return { mapa, skladiste, istorija, lokacija, zamene }
}

describe('jeAuthHash', () => {
  it('prepoznaje tokene i greške, ali ne i rute', () => {
    expect(jeAuthHash(`#${TOKENI}`)).toBe(true)
    expect(jeAuthHash('#error=access_denied&error_code=otp_expired')).toBe(true)
    expect(jeAuthHash('#/admin')).toBe(false)
    expect(jeAuthHash('#/potvrda?token_hash=abc&type=invite')).toBe(false)
    expect(jeAuthHash('#/dete/abc?x=1')).toBe(false)
    expect(jeAuthHash('')).toBe(false)
  })
})

describe('procitajPotvrduLinka', () => {
  it('čita token_hash i tip iz query stringa i hash rute', () => {
    expect(procitajPotvrduLinka('', '?token_hash=th_123&type=invite')).toEqual({
      tokenHash: 'th_123',
      tip: 'invite',
    })
    expect(procitajPotvrduLinka('', '?token_hash=th_456&type=recovery')).toEqual({
      tokenHash: 'th_456',
      tip: 'recovery',
    })
    expect(procitajPotvrduLinka('', '?token_hash=th_789&type=magiclink')).toEqual({
      tokenHash: 'th_789',
      tip: 'email',
    })
    expect(procitajPotvrduLinka('#/potvrda?token_hash=th_hash&type=email', '')).toEqual({
      tokenHash: 'th_hash',
      tip: 'email',
    })
  })

  it('odbacuje nepotpune ili nepoznate parametre', () => {
    expect(procitajPotvrduLinka('', '?token_hash=th_123')).toBeNull()
    expect(procitajPotvrduLinka('', '?type=invite')).toBeNull()
    expect(procitajPotvrduLinka('', '?token_hash=th_123&type=nepoznat')).toBeNull()
    expect(procitajPotvrduLinka('#/admin', '')).toBeNull()
  })
})

describe('vrstaZaTipPotvrde', () => {
  it('mapira tipove potvrde na odgovarajući tok posle verifikacije', () => {
    expect(vrstaZaTipPotvrde('invite')).toBe('pozivnica')
    expect(vrstaZaTipPotvrde('recovery')).toBe('oporavak')
    expect(vrstaZaTipPotvrde('email')).toBe('prijava')
  })
})

describe('procitajAuthPovratak', () => {
  it('razlikuje pozivnicu, oporavak i običnu prijavu', () => {
    expect(procitajAuthPovratak(`#${TOKENI}&type=invite`, '')).toEqual({ uspeh: true, vrsta: 'pozivnica' })
    expect(procitajAuthPovratak(`#${TOKENI}&type=recovery`, '')).toEqual({ uspeh: true, vrsta: 'oporavak' })
    expect(procitajAuthPovratak(`#${TOKENI}&type=magiclink`, '')).toEqual({ uspeh: true, vrsta: 'prijava' })
  })

  it('istekao link daje srpsku poruku, i iz hash-a i iz query-ja', () => {
    const izHasha = procitajAuthPovratak('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', '')
    expect(izHasha).toMatchObject({ uspeh: false })
    expect(izHasha && !izHasha.uspeh && izHasha.poruka).toMatch(/istekao/)
    expect(procitajAuthPovratak('#/admin', '?error=access_denied')).toMatchObject({ uspeh: false })
  })

  it('obična ruta nije povratak', () => {
    expect(procitajAuthPovratak('#/admin', '')).toBeNull()
    expect(procitajAuthPovratak('', '?aplikacija=dete')).toBeNull()
  })
})

describe('obradiAuthPovratak', () => {
  it('link sa token_hash pamti u skladištu, čisti URL i vodi na #/potvrda', () => {
    const p = lazniPregledac('', '?token_hash=pkce_abc&type=invite')
    obradiAuthPovratak(p.lokacija, p.istorija, p.skladiste)
    expect(p.zamene).toEqual(['/Mozgalica/#/potvrda'])
    expect(p.mapa.has(KLJUC_POTVRDE_LINKA)).toBe(true)
    expect(procitajSacuvanuPotvrduLinka(p.skladiste)).toEqual({
      tokenHash: 'pkce_abc',
      tip: 'invite',
    })
    expect(p.mapa.has(KLJUC_ZAHTEVA_LOZINKE)).toBe(false)
  })

  it('grešku pamti i prebacuje na prijavu pre rendera', () => {
    const p = lazniPregledac('#error=access_denied&error_code=otp_expired')
    obradiAuthPovratak(p.lokacija, p.istorija, p.skladiste)
    expect(p.zamene).toEqual(['/Mozgalica/#/prijava'])
    expect(p.mapa.get(KLJUC_GRESKE_PRIJAVE)).toMatch(/istekao/)
  })

  it('pozivnicu pamti, a hash ostavlja za supabase-js', () => {
    const p = lazniPregledac(`#${TOKENI}&type=invite`)
    obradiAuthPovratak(p.lokacija, p.istorija, p.skladiste)
    expect(p.zamene).toEqual([])
    expect(p.mapa.get(KLJUC_ZAHTEVA_LOZINKE)).toBe('pozivnica')
  })

  it('magic link ne traži novu lozinku', () => {
    const p = lazniPregledac(`#${TOKENI}&type=magiclink`)
    obradiAuthPovratak(p.lokacija, p.istorija, p.skladiste)
    expect(p.mapa.size).toBe(0)
  })
})

describe('greške potvrde linka', () => {
  it('razlikuje istekao token od privremene mrežne greške', () => {
    expect(jeIstekaoIliNeispravanOtp('otp_expired', 'Token has expired')).toBe(true)
    expect(jeIstekaoIliNeispravanOtp(null, 'Failed to fetch')).toBe(false)
    expect(porukaGreskePotvrde('otp_expired', null)).toMatch(/istekao/)
    expect(porukaGreskePotvrde(null, 'Failed to fetch')).toMatch(/internet vezu/)
  })
})

describe('proveriNovuLozinku', () => {
  it('traži dužinu, slovo, broj i poklapanje', () => {
    expect(proveriNovuLozinku('kratko1', 'kratko1')).toMatch(/8 znakova/)
    expect(proveriNovuLozinku('samoslova', 'samoslova')).toMatch(/slovo i jedan broj/)
    expect(proveriNovuLozinku('12345678', '12345678')).toMatch(/slovo i jedan broj/)
    expect(proveriNovuLozinku('šifra2024', 'šifra2025')).toMatch(/ne poklapaju/)
    expect(proveriNovuLozinku('šifra2024', 'šifra2024')).toBeNull()
  })
})
