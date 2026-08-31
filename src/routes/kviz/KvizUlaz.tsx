// Ulazna strana kviza za dete: unos imena + start (bez naloga)
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { kvizMeta, zapocniPokusaj } from '../../lib/api'
import { zapocniStanje } from '../../lib/offlineQueue'
import { Loader, TemaDugme } from '../../components/Zajednicke'
import { Ikona } from '../../components/Ikona'
import { Maskota } from '../../components/Maskota'
import type { KvizMeta } from '../../types/kviz'
import './kviz.css'

const PORUKE_GRESAKA: Record<string, string> = {
  not_found: 'Ovaj link ne postoji. Proveri da li si ga ispravno otkucao/la ili zalepio/la.',
  inactive: 'Ovaj link je deaktiviran.',
  expired: 'Ovom linku je istekao rok važenja.',
  no_attempts_left: 'Iskorišćeni su svi dozvoljeni pokušaji za ovaj kviz.',
  name_required: 'Unesi svoje ime.',
  no_questions: 'Ovaj kviz još nema pitanja.',
  too_many_tries: 'Previše pokušaja sa ovog linka. Obratite se osobi koja vam je poslala link.',
  already_completed: 'Ovaj kviz je već završen i nalazi se u prethodnim rezultatima.',
}

export function KvizUlaz() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [ucitava, setUcitava] = useState(true)
  const [meta, setMeta] = useState<KvizMeta | null>(null)
  const [ime, setIme] = useState('')
  const [oznaka, setOznaka] = useState('')
  const [greska, setGreska] = useState<string | null>(null)
  const [pokrece, setPokrece] = useState(false)

  useEffect(() => {
    kvizMeta(token)
      .then((m) => setMeta(m))
      .catch((e) => setMeta({ ok: false, error: String((e as Error).message ?? e) }))
      .finally(() => setUcitava(false))
  }, [token])

  if (ucitava) return <Loader tekst="Učitavanje kviza…" />

  if (!meta?.ok) {
    return (
      <div className="sadrzaj sadrzaj--usko centar" style={{ paddingTop: '15vh' }}>
        <h1>😕 Ups!</h1>
        <p className="poruka poruka--greska razmak-gore">
          {PORUKE_GRESAKA[meta?.error ?? ''] ?? 'Nešto nije u redu sa ovim linkom.'}
        </p>
        {meta?.profileToken && (
          <p className="razmak-gore"><Link to={`/dete/${meta.profileToken}`}>← Nazad na moj profil</Link></p>
        )}
      </div>
    )
  }

  async function pokreni() {
    if (meta!.accessMode !== 'profile' && meta!.requireName && ime.trim() === '') {
      setGreska('Unesi svoje ime pre početka.')
      return
    }
    setGreska(null)
    setPokrece(true)
    try {
      const r = await zapocniPokusaj(
        token,
        meta!.accessMode === 'profile' ? (meta!.childName ?? '') : ime.trim(),
        meta!.accessMode === 'profile' ? null : (oznaka.trim() || null),
      )
      if (!r.ok || !r.attemptToken) {
        setGreska(PORUKE_GRESAKA[r.error ?? ''] ?? 'Nije uspelo pokretanje kviza. Pokušaj ponovo.')
        return
      }
      if (!r.childName) {
        setGreska('Server nije vratio ime za ovaj pokušaj. Pokušaj ponovo.')
        return
      }
      zapocniStanje(
        localStorage,
        token,
        r.attemptToken,
        r.childName,
        { accessMode: r.accessMode, profileToken: r.profileToken },
      )
      navigate(`/kviz/${token}/resi`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setPokrece(false)
    }
  }

  return (
    <div className="sadrzaj sadrzaj--usko" style={{ paddingTop: '6vh' }}>
      <div className="red red--kraj">
        {meta.profileToken && (
          <Link to={`/dete/${meta.profileToken}`} className="dugme dugme--senka dugme--malo">
            ← Moj profil
          </Link>
        )}
        <TemaDugme />
      </div>
      <div className="kartica kviz-kartica-uvod">
        <div className="kviz-maskota"><Maskota stanje="pozdrav" velicina={96} /></div>
        {meta.accessMode === 'profile' && (
          <p className="centar blago">Kviz za {meta.childName}</p>
        )}
        <h1 className="centar razmak-gore">{meta.title}</h1>
        {meta.description && <p className="centar blago razmak-dole">{meta.description}</p>}

        <div className="kviz-cipovi">
          <span className="kviz-cip"><Ikona ime="zadaci" velicina={18} /> {meta.questionCount} pitanja</span>
          <span className="kviz-cip"><Ikona ime="zvezda" velicina={18} /> {meta.totalPoints} poena</span>
          {meta.timeLimitSeconds && (
            <span className="kviz-cip"><Ikona ime="vreme" velicina={18} /> {Math.round(meta.timeLimitSeconds / 60)} min</span>
          )}
        </div>

        {meta.accessMode !== 'profile' && meta.requireName && (
          <div className="polje">
            <label htmlFor="ku-ime">Kako se zoveš?</label>
            <input id="ku-ime" type="text" value={ime} onChange={(e) => setIme(e.target.value)} autoFocus maxLength={60} />
          </div>
        )}
        {meta.accessMode !== 'profile' && !meta.requireName && (
          <div className="polje">
            <label htmlFor="ku-ime">Nadimak (opciono)</label>
            <input id="ku-ime" type="text" value={ime} onChange={(e) => setIme(e.target.value)} maxLength={60} />
          </div>
        )}
        {meta.accessMode !== 'profile' && meta.requireLabel && (
          <div className="polje">
            <label htmlFor="ku-oznaka">{meta.labelName}</label>
            <input id="ku-oznaka" type="text" value={oznaka} onChange={(e) => setOznaka(e.target.value)} maxLength={60} />
          </div>
        )}

        {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}

        <button type="button" className="dugme dugme--akcenat" style={{ width: '100%' }} disabled={pokrece} onClick={pokreni}>
          {pokrece
            ? 'Pokrećem…'
            : meta.attemptState === 'in_progress'
              ? `Nastavi kviz (${meta.answeredCount ?? 0}/${meta.questionCount ?? 0})`
              : 'Počni kviz 🚀'}
        </button>
      </div>
    </div>
  )
}
