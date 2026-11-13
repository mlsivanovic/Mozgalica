import { describe, expect, it } from 'vitest'
import {
  ANDROID_PAKET,
  adresaDecjeAplikacije,
  hashDecjeAplikacije,
  prikaziAndroidPreuzimanje,
} from './decjaAplikacija'

describe('ulaz iz Android omotača', () => {
  it('prazan hash i podrazumevani admin vode na dečji početak', () => {
    for (const hash of ['', '#', '#/', '#/admin', '/', '/admin']) {
      expect(hashDecjeAplikacije('?aplikacija=dete', hash)).toBe('#/dete/pocetak')
    }
  })

  it('ne dira već otvorenu dečju ili drugu rutu', () => {
    expect(hashDecjeAplikacije('?aplikacija=dete', '#/dete/pocetak')).toBeNull()
    expect(hashDecjeAplikacije('?aplikacija=dete', '#/dete/abc123')).toBeNull()
    expect(hashDecjeAplikacije('?aplikacija=dete', '#/kviz/abc')).toBeNull()
    expect(hashDecjeAplikacije('?aplikacija=dete', '#/admin/podesavanja')).toBeNull()
  })

  it('bez query parametra ostavlja sajt kakav jeste', () => {
    expect(hashDecjeAplikacije('', '')).toBeNull()
    expect(hashDecjeAplikacije('?aplikacija=admin', '#/')).toBeNull()
  })

  it('čuva putanju i ostale parametre', () => {
    expect(adresaDecjeAplikacije({
      pathname: '/Mozgalica/',
      search: '?aplikacija=dete&izvor=ikona',
      hash: '',
    })).toBe('/Mozgalica/?aplikacija=dete&izvor=ikona#/dete/pocetak')
  })
})

describe('dugme za preuzimanje APK-a', () => {
  const android = 'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile'
  const racunar = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0'
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148'

  it('prikazuje dugme na Androidu i računaru', () => {
    expect(prikaziAndroidPreuzimanje({ userAgent: android, referrer: '', search: '' })).toBe(true)
    expect(prikaziAndroidPreuzimanje({ userAgent: racunar, referrer: '', search: '' })).toBe(true)
  })

  it('sakriva dugme na iOS-u, u omotaču i kad je sajt otvoren iz aplikacije', () => {
    expect(prikaziAndroidPreuzimanje({ userAgent: iphone, referrer: '', search: '' })).toBe(false)
    expect(prikaziAndroidPreuzimanje({ userAgent: ipad, referrer: '', search: '' })).toBe(false)
    expect(prikaziAndroidPreuzimanje({
      userAgent: android,
      referrer: `android-app://${ANDROID_PAKET}`,
      search: '',
    })).toBe(false)
    expect(prikaziAndroidPreuzimanje({
      userAgent: android,
      referrer: '',
      search: '?aplikacija=dete',
    })).toBe(false)
  })
})
