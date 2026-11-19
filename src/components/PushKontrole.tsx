import { useCallback, useEffect, useState } from 'react'
import {
  iskljuciPushZaAdmina, iskljuciPushZaDete, statusPushObavestenja,
  ukljuciPushZaAdmina, ukljuciPushZaDete,
} from '../lib/push'
import type { StatusPushObavestenja } from '../types/db'
import { Ikona } from './Ikona'

interface Props {
  profilToken?: string
}

export function PushKontrole({ profilToken }: Props) {
  const [status, setStatus] = useState<StatusPushObavestenja | null>(null)
  const [radi, setRadi] = useState(false)
  const [poruka, setPoruka] = useState<string | null>(null)

  const osvezi = useCallback(async () => {
    try {
      setStatus(await statusPushObavestenja(profilToken))
    } catch {
      setStatus({
        podrzano: false,
        dozvola: 'unsupported',
        aktivno: false,
        razlog: 'Status obaveštenja trenutno nije moguće proveriti.',
      })
    }
  }, [profilToken])

  useEffect(() => {
    void osvezi()
  }, [osvezi])

  async function ukljuci() {
    setRadi(true)
    setPoruka(null)
    try {
      if (profilToken) await ukljuciPushZaDete(profilToken)
      else await ukljuciPushZaAdmina()
      await osvezi()
      setPoruka('Obaveštenja su uključena na ovom uređaju.')
    } catch (e) {
      setPoruka(String((e as Error).message ?? e))
    } finally {
      setRadi(false)
    }
  }

  async function iskljuci() {
    setRadi(true)
    setPoruka(null)
    try {
      if (profilToken) await iskljuciPushZaDete(profilToken)
      else await iskljuciPushZaAdmina()
      setStatus((prethodni) => prethodni ? { ...prethodni, aktivno: false } : prethodni)
      setPoruka('Obaveštenja su isključena za ovaj profil na uređaju.')
    } catch (e) {
      setPoruka(String((e as Error).message ?? e))
    } finally {
      setRadi(false)
    }
  }

  if (!status) return <p className="malo blago">Proveravam podršku uređaja…</p>

  const blokirano = !status.aktivno && status.dozvola === 'denied'
  const nepodrzano = !status.aktivno && !status.podrzano

  return (
    <div className="push-kontrole">
      <div className="push-kontrole-info">
        <span
          className={`push-kontrole-ikona${status.aktivno ? ' je-aktivna' : ''}`}
          aria-hidden="true"
        >
          <Ikona ime={status.aktivno ? 'obavestenja' : 'obavestenjaIskljucena'} velicina={18} />
        </span>
        <div className="push-kontrole-tekst">
          <div className="push-kontrole-naslov">
            <strong>{status.aktivno ? 'Obaveštenja su uključena' : 'Obaveštenja nisu uključena'}</strong>
            <span className={`bedz ${status.aktivno ? 'bedz--uspeh' : blokirano ? 'bedz--greska' : 'bedz--neutral'}`}>
              {status.aktivno ? 'Aktivno' : blokirano ? 'Blokirano' : nepodrzano ? 'Nedostupno' : 'Isključeno'}
            </span>
          </div>
          <p className="malo blago">
            {status.razlog ?? (
              status.dozvola === 'denied'
                ? 'Dozvola je blokirana u podešavanjima pregledača.'
                : 'Telefon koristi svoj podrazumevani zvuk i vibraciju kada ih podržava.'
            )}
          </p>
        </div>
      </div>
      <div className="push-kontrole-akcija">
        {status.aktivno ? (
          <button type="button" className="dugme dugme--senka dugme--malo" disabled={radi} onClick={iskljuci}>
            {radi ? 'Isključujem…' : 'Isključi na uređaju'}
          </button>
        ) : (
          <button
            type="button" className="dugme dugme--akcenat dugme--malo"
            disabled={radi || !status.podrzano || status.dozvola === 'denied'} onClick={ukljuci}
          >
            {radi ? 'Uključujem…' : 'Uključi obaveštenja'}
          </button>
        )}
      </div>
      {poruka && <p className="malo push-kontrole-poruka">{poruka}</p>}
    </div>
  )
}
