import { describe, expect, it } from 'vitest'
import { dozvoljeniEloZaPokusaj, MAX_PONOVNIH_POKUSAJA, preostaloPokusaja } from './pokusaj'

describe('dozvoljeniEloZaPokusaj', () => {
  it('dozvoljava samo isti ELO posle poraza od najslabijeg protivnika', () => {
    expect(dozvoljeniEloZaPokusaj(700)).toEqual([700])
  })

  it('dozvoljava slabije nivoe posle poraza od jačeg protivnika', () => {
    expect(dozvoljeniEloZaPokusaj(1100)).toEqual([1100, 900, 700])
  })

  it('vraća sve nivoe od najjačeg ka najslabijem posle poraza od ELO 1500', () => {
    expect(dozvoljeniEloZaPokusaj(1500)).toEqual([1500, 1300, 1100, 900, 700])
  })

  it('nikad ne dozvoljava jači nivo od poraženog', () => {
    for (const porazeni of [700, 900, 1100, 1300, 1500]) {
      for (const nivo of dozvoljeniEloZaPokusaj(porazeni)) {
        expect(nivo).toBeLessThanOrEqual(porazeni)
      }
    }
  })
})

describe('preostaloPokusaja', () => {
  it('računa preostale pokušaje iz broja iskorišćenih', () => {
    expect(preostaloPokusaja(0)).toBe(MAX_PONOVNIH_POKUSAJA)
    expect(preostaloPokusaja(1)).toBe(2)
    expect(preostaloPokusaja(MAX_PONOVNIH_POKUSAJA)).toBe(0)
  })

  it('tretira nepoznat broj pokušaja kao nula iskorišćenih', () => {
    expect(preostaloPokusaja(null)).toBe(MAX_PONOVNIH_POKUSAJA)
    expect(preostaloPokusaja(undefined)).toBe(MAX_PONOVNIH_POKUSAJA)
  })

  it('nikad ne vraća negativan broj', () => {
    expect(preostaloPokusaja(5)).toBe(0)
  })
})
