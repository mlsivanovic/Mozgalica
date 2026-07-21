// Sadržaj modala za CSV uvoz pitanja srpskog jezika u banku pitanja.
import { useState, type ChangeEvent } from 'react'
import { upisiPitanjaUvoz } from '../../lib/api'
import { napraviCsv, preuzmiCsv } from '../../lib/csv'
import { mapirajRedove, parsirajCsv, PRIMERI_UVOZA, ZAGLAVLJA_UVOZA, type RezultatMapiranja } from '../../lib/csvUvoz'
import type { Oblast } from '../../types/db'

interface Props {
  oblastiSrpski: Oblast[]
  onZatvori: () => void
  onUvezeno: () => void
}

export function UvozCsv({ oblastiSrpski, onZatvori, onUvezeno }: Props) {
  const [rezultat, setRezultat] = useState<RezultatMapiranja | null>(null)
  const [imeFajla, setImeFajla] = useState<string | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [uvozi, setUvozi] = useState(false)

  function preuzmiSablon() {
    preuzmiCsv('mozgalica-sablon-uvoz-srpski.csv', napraviCsv(ZAGLAVLJA_UVOZA, PRIMERI_UVOZA))
  }

  async function izaberiFajl(e: ChangeEvent<HTMLInputElement>) {
    const fajl = e.target.files?.[0]
    e.target.value = '' // dozvoljava ponovni izbor istog fajla posle ispravke
    if (!fajl) return
    setGreska(null)
    setRezultat(null)
    setImeFajla(fajl.name)
    try {
      const tekst = await fajl.text()
      setRezultat(mapirajRedove(parsirajCsv(tekst), oblastiSrpski))
    } catch (err) {
      setGreska(`Nije uspelo čitanje fajla: ${String((err as Error).message ?? err)}`)
    }
  }

  async function uvezi() {
    if (!rezultat || rezultat.validni.length === 0) return
    setUvozi(true)
    setGreska(null)
    try {
      const broj = await upisiPitanjaUvoz(rezultat.validni)
      alert(`Uvezeno je ${broj} pitanja.`)
      onUvezeno()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUvozi(false)
    }
  }

  return (
    <div>
      <p className="blago razmak-dole">
        Uvezi pitanja srpskog jezika iz CSV fajla. Podržana su samo dva tipa: <strong>tekst</strong> (otvoren
        odgovor koji ručno ocenjuje administrator) i <strong>tacno-netacno</strong> (ocenjuje se automatski).
        Obavezne kolone: <code>tema</code> (naziv ili slug postojeće teme srpskog jezika), <code>tip</code>{' '}
        (<code>tekst</code> ili <code>tacno-netacno</code>), <code>pitanje</code>, <code>odgovor</code>. Opcione:{' '}
        <code>poeni</code> (podrazumevano 1), <code>tezina</code> (1–5, podrazumevano 3), <code>objasnjenje</code>,{' '}
        <code>hint</code>. Za tip <code>tekst</code> je <code>odgovor</code> opcioni referentni odgovor koji admin
        vidi pri ocenjivanju (više varijanti razdvoj znakom „|"). Za <code>tacno-netacno</code>, odgovor mora biti
        tačno „tacno" ili „netacno".
      </p>

      <button type="button" className="dugme dugme--senka razmak-dole" onClick={preuzmiSablon}>
        ⬇ Preuzmi šablon
      </button>

      <div className="polje">
        <label htmlFor="uvoz-fajl">CSV fajl</label>
        <input id="uvoz-fajl" type="file" accept=".csv,text/csv" onChange={izaberiFajl} />
      </div>

      {greska && <p className="poruka poruka--greska">{greska}</p>}

      {rezultat && (
        <>
          <p className="razmak-gore razmak-dole">
            <strong>{imeFajla}</strong> — {rezultat.validni.length} spremno za uvoz
            {rezultat.greske.length > 0 && `, ${rezultat.greske.length} sa greškom`}.
          </p>

          {rezultat.pregled.length > 0 && (
            <div className="tabela-omot" style={{ maxHeight: 300 }}>
              <table className="tabela">
                <thead><tr><th>Red</th><th>Pitanje</th><th>Status</th></tr></thead>
                <tbody>
                  {rezultat.pregled.map((p, i) => (
                    <tr key={i}>
                      <td>{p.red}</td>
                      <td style={{ maxWidth: 280 }}>{p.pitanje}</td>
                      <td>
                        {p.ok
                          ? <span className="bedz bedz--uspeh">✓ Spremno</span>
                          : <span className="bedz bedz--greska">✗ {p.poruka}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="red red--kraj razmak-gore">
            <button type="button" className="dugme dugme--senka" onClick={onZatvori}>Otkaži</button>
            <button
              type="button" className="dugme dugme--akcenat"
              disabled={uvozi || rezultat.validni.length === 0} onClick={uvezi}
            >
              {uvozi ? 'Uvozim…' : `Uvezi ${rezultat.validni.length} pitanja`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
