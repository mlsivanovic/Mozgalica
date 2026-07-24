import { describe, expect, it, vi } from 'vitest'
import {
  apsolutnaHashRuta, escapeHtml, proceniHttpIsporuku, prolaznaHttpGreska,
  sledeciPokusaj,
} from '../../supabase/functions/_shared/notification-utils'
import { oznaciInboxProcitanim } from './obavestenja'
import { base64UrlUUint8Array } from './push'

describe('isporuka obaveštenja', () => {
  it('pravi propisane razmake ponovnih pokušaja i zaustavlja se posle petog', () => {
    const pocetak = new Date('2026-07-24T10:00:00.000Z')
    expect(sledeciPokusaj(1, pocetak)).toBe('2026-07-24T10:01:00.000Z')
    expect(sledeciPokusaj(2, pocetak)).toBe('2026-07-24T10:05:00.000Z')
    expect(sledeciPokusaj(3, pocetak)).toBe('2026-07-24T10:30:00.000Z')
    expect(sledeciPokusaj(4, pocetak)).toBe('2026-07-24T12:00:00.000Z')
    expect(sledeciPokusaj(5, pocetak)).toBeNull()
  })

  it('ponavlja ograničenje i serverske greške, ali ne trajnu klijentsku grešku', () => {
    expect(prolaznaHttpGreska(429)).toBe(true)
    expect(prolaznaHttpGreska(503)).toBe(true)
    expect(prolaznaHttpGreska(400)).toBe(false)
  })

  it.each([429, 500, 503])('ponavlja mockovanu Brevo grešku %i', async (status) => {
    const brevo = vi.fn().mockResolvedValue(new Response('privremena greška', { status }))
    const odgovor = await brevo('https://api.brevo.com/v3/smtp/email')

    expect(await proceniHttpIsporuku(odgovor, 'email')).toMatchObject({
      uspesno: false,
      status,
      ponoviti: true,
      deaktiviratiPretplatu: false,
    })
  })

  it.each([404, 410])('deaktivira istekli mockovani push endpoint za status %i', async (status) => {
    const push = vi.fn().mockResolvedValue(new Response('endpoint je istekao', { status }))
    const odgovor = await push('https://push.example.test/subscription')

    expect(await proceniHttpIsporuku(odgovor, 'push')).toMatchObject({
      uspesno: false,
      status,
      ponoviti: false,
      deaktiviratiPretplatu: true,
    })
  })

  it('prihvata uspešne mockovane odgovore oba provajdera', async () => {
    const provider = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))

    expect((await proceniHttpIsporuku(await provider('brevo'), 'email')).uspesno).toBe(true)
    expect((await proceniHttpIsporuku(await provider('push'), 'push')).uspesno).toBe(true)
  })

  it('escape-uje HTML i pravi link ka HashRouter ruti', () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`))
      .toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;')
    expect(apsolutnaHashRuta('https://primer.rs/Mozgalica/', '/dete/token'))
      .toBe('https://primer.rs/Mozgalica/#/dete/token')
  })

  it('ažurira pojedinačni i grupni broj nepročitanih obaveštenja', () => {
    const inbox = {
      neprocitano: 2,
      obavestenja: [
        {
          id: 'novo', event_type: 'new_quiz' as const, title: 'Novi kviz',
          body: 'Stigao je kviz.', target_url: '/kviz/token', read_at: null,
          created_at: '2026-07-24T10:00:00.000Z',
        },
        {
          id: 'rezultat', event_type: 'quiz_completed' as const, title: 'Rezultat',
          body: 'Kviz je završen.', target_url: '/admin/rezultati/1', read_at: null,
          created_at: '2026-07-24T09:00:00.000Z',
        },
      ],
    }

    const jedno = oznaciInboxProcitanim(inbox, ['novo'], '2026-07-24T11:00:00.000Z')
    expect(jedno.neprocitano).toBe(1)
    expect(jedno.obavestenja[0].read_at).toBe('2026-07-24T11:00:00.000Z')
    expect(jedno.obavestenja[1].read_at).toBeNull()
    expect(oznaciInboxProcitanim(jedno).neprocitano).toBe(0)
  })

  it('pretvara URL-safe VAPID ključ u bajtove', () => {
    expect(Array.from(base64UrlUUint8Array('AQID-_8'))).toEqual([1, 2, 3, 251, 255])
  })
})
