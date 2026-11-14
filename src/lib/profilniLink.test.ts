import { describe, expect, it } from 'vitest'
import { izdvojiProfilniToken } from './profilPwa'
import { profilniLink } from './profilniLink'

const TOKEN = 's6x6i9AdsRRuadngZOWYI_OEpi95grqI'

describe('profilni link za QR', () => {
  it('spaja bazu i token isto kao kopiranje', () => {
    expect(profilniLink('https://primer.test/Mozgalica/', TOKEN))
      .toBe(`https://primer.test/Mozgalica/#/dete/${TOKEN}`)
  })

  it('QR string se vraća u isti token', () => {
    const link = profilniLink('https://mlsivanovic.github.io/Mozgalica/', TOKEN)
    expect(izdvojiProfilniToken(link)).toBe(TOKEN)
  })
})
