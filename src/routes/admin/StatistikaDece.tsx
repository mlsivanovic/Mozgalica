// Pregled svih profila sa najvažnijim pokazateljima statistike.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TitleAvatar } from '../../components/TitleAvatar'
import { Loader } from '../../components/Zajednicke'
import { ucitajPregledStatistikeDece } from '../../lib/api'
import { formatDatum, formatProcenat } from '../../lib/format'
import type { PregledStatistikeDeteta } from '../../types/kviz'
import './statistika-dece.css'

function oznakaTrenda(trend: number | null): { tekst: string; klasa: string } {
  if (trend == null) return { tekst: 'Trend: potrebno je 6 kvizova', klasa: 'bedz--neutral' }
  if (trend > 0) return { tekst: `↗ +${formatProcenat(Math.abs(trend))} u poslednja 3`, klasa: 'bedz--uspeh' }
  if (trend < 0) return { tekst: `↘ ${formatProcenat(Math.abs(trend))} u poslednja 3`, klasa: 'bedz--upozorenje' }
  return { tekst: '→ Stabilan rezultat', klasa: 'bedz--neutral' }
}

function KarticaStatistikeDeteta({ dete }: { dete: PregledStatistikeDeteta }) {
  const trend = oznakaTrenda(dete.recentTrendPct)
  const titula = dete.rewards.currentTitle

  return (
    <article className="kartica statistika-dete-kartica">
      <div className="statistika-dete-kartica-zaglavlje">
        <div className="statistika-dete-identitet">
          <span className="statistika-dete-avatar" aria-hidden="true">{dete.avatar}</span>
          <div>
            <h2><Link to={`/admin/rezultati/statistika/${dete.profileId}`}>{dete.name}</Link></h2>
            <p className="malo blago">
              {dete.completedAttempts === 0
                ? 'Još nema potpuno ocenjenih kvizova.'
                : `Poslednja aktivnost: ${formatDatum(dete.lastActivityAt)}`}
            </p>
          </div>
        </div>
        <span className={`bedz ${trend.klasa}`}>{trend.tekst}</span>
      </div>

      <dl className="statistika-metrike statistika-metrike--kartica">
        <div>
          <dt>Završeno</dt>
          <dd>{dete.completedAttempts}</dd>
        </div>
        <div>
          <dt>Prosek</dt>
          <dd>{formatProcenat(dete.avgScorePct)}</dd>
        </div>
        <div>
          <dt>Prolaznost</dt>
          <dd>{formatProcenat(dete.passRatePct)}</dd>
        </div>
      </dl>

      <div className="statistika-nagrade-pregled">
        <div className="statistika-titula">
          <TitleAvatar name={titula?.name ?? 'Bez titule'} avatar={titula?.avatar} size={30} />
          <span>
            <strong>{titula?.name ?? 'Bez titule'}</strong>
            <small>Zvanične nagrade profila</small>
          </span>
        </div>
        <div className="statistika-zvezdice" aria-label={`${dete.rewards.totalStars} ukupno i ${dete.rewards.spendableStars} raspoloživih zvezdica`}>
          <span>⭐ <strong>{dete.rewards.totalStars}</strong> ukupno</span>
          <span>🛒 <strong>{dete.rewards.spendableStars}</strong> raspoloživo</span>
        </div>
      </div>

      <Link className="dugme dugme--senka dugme--malo statistika-dete-kartica-link" to={`/admin/rezultati/statistika/${dete.profileId}`}>
        Otvori detaljnu statistiku →
      </Link>
    </article>
  )
}

export function StatistikaDece() {
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [deca, setDeca] = useState<PregledStatistikeDeteta[]>([])

  useEffect(() => {
    let aktivno = true
    ucitajPregledStatistikeDece()
      .then((odgovor) => {
        if (aktivno) setDeca(odgovor.children ?? [])
      })
      .catch((e) => {
        if (aktivno) setGreska(String((e as Error).message ?? e))
      })
      .finally(() => {
        if (aktivno) setUcitava(false)
      })
    return () => { aktivno = false }
  }, [])

  if (ucitava) return <Loader tekst="Učitavanje statistike dece…" />

  return (
    <div>
      <div className="zaglavlje-strane">
        <div>
          <h1>Statistika</h1>
          <p className="blago razmak-gore">
            Pregled napretka zasnovan je na potpuno ocenjenim kvizovima.
          </p>
        </div>
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      {deca.length === 0 ? (
        <section className="kartica statistika-prazno">
          <span aria-hidden="true">📊</span>
          <h2>Još nema profila dece</h2>
          <p className="blago">Dodaj profil u Podešavanjima da bi se ovde pojavio pregled napretka.</p>
          <Link to="/admin/podesavanja" className="dugme dugme--akcenat">Otvori podešavanja</Link>
        </section>
      ) : (
        <section className="statistika-dece-kartice" aria-label="Pregled statistike po detetu">
          {deca.map((dete) => <KarticaStatistikeDeteta key={dete.profileId} dete={dete} />)}
        </section>
      )}
    </div>
  )
}
