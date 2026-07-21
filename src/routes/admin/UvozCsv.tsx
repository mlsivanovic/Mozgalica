// Sadržaj modala za CSV uvoz pitanja srpskog jezika u banku pitanja.
// Teme iz CSV-a koje još ne postoje se automatski kreiraju pri uvozu (subject
// 'srpski') — pregled ih unapred prikazuje preko privremenih placeholder ID-jeva
// ('novo:...') koji se NIKAD ne šalju bazi; stvarni uvoz uvek ponovo mapira
// redove sa pravim ID-jevima dobijenim iz dodajOblast.
import { useMemo, useState, type ChangeEvent } from 'react'
import { dodajOblast, upisiPitanjaUvoz } from '../../lib/api'
import { napraviCsv, preuzmiCsv } from '../../lib/csv'
import {
  izdvojNepoznateTeme, mapirajRedove, napraviSlugTeme, parsirajCsv, PRIMERI_UVOZA,
  ZAGLAVLJA_UVOZA,
} from '../../lib/csvUvoz'
import type { Oblast } from '../../types/db'

interface Props {
  oblastiSrpski: Oblast[]
  onZatvori: () => void
  onUvezeno: () => void
}

export function UvozCsv({ oblastiSrpski, onZatvori, onUvezeno }: Props) {
  const [redovi, setRedovi] = useState<string[][] | null>(null)
  const [imeFajla, setImeFajla] = useState<string | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [uvozi, setUvozi] = useState(false)

  const nepoznateTeme = useMemo(
    () => redovi ? izdvojNepoznateTeme(redovi, oblastiSrpski) : [],
    [redovi, oblastiSrpski],
  )

  // Placeholder oblasti SAMO za pregled, da redovi sa novim temama ne ispadnu
  // kao greška pre nego što teme zaista postoje u bazi.
  const rezultat = useMemo(() => {
    if (!redovi) return null
    const placeholderi: Oblast[] = nepoznateTeme.map((naziv) => ({
      id: `novo:${naziv}`, slug: napraviSlugTeme(naziv), name: naziv, sort_order: 100, subject: 'srpski',
    }))
    return mapirajRedove(redovi, [...oblastiSrpski, ...placeholderi])
  }, [redovi, oblastiSrpski, nepoznateTeme])

  function preuzmiSablon() {
    preuzmiCsv('mozgalica-sablon-uvoz-srpski.csv', napraviCsv(ZAGLAVLJA_UVOZA, PRIMERI_UVOZA))
  }

  async function izaberiFajl(e: ChangeEvent<HTMLInputElement>) {
    const fajl = e.target.files?.[0]
    e.target.value = '' // dozvoljava ponovni izbor istog fajla posle ispravke
    if (!fajl) return
    setGreska(null)
    setRedovi(null)
    setImeFajla(fajl.name)
    try {
      const tekst = await fajl.text()
      setRedovi(parsirajCsv(tekst))
    } catch (err) {
      setGreska(`Nije uspelo čitanje fajla: ${String((err as Error).message ?? err)}`)
    }
  }

  async function uvezi() {
    if (!redovi || !rezultat || rezultat.validni.length === 0) return
    setUvozi(true)
    setGreska(null)
    try {
      let sveOblasti = oblastiSrpski
      if (nepoznateTeme.length > 0) {
        const novoKreirane: Oblast[] = []
        for (const naziv of nepoznateTeme) {
          novoKreirane.push(await dodajOblast(naziv, napraviSlugTeme(naziv), 'srpski'))
        }
        sveOblasti = [...oblastiSrpski, ...novoKreirane]
      }
      // Ponovo mapiraj sa STVARNIM ID-jevima (nikad sa placeholder pregledom).
      const finalno = mapirajRedove(redovi, sveOblasti)
      const broj = await upisiPitanjaUvoz(finalno.validni)
      alert(
        `Uvezeno je ${broj} pitanja`
        + (nepoznateTeme.length > 0 ? ` i kreirano ${nepoznateTeme.length} novih tema (${nepoznateTeme.join(', ')}).` : '.'),
      )
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
        Obavezne kolone: <code>tema</code> (naziv ili slug teme srpskog jezika — <strong>ako tema ne postoji,
        biće automatski kreirana</strong>), <code>tip</code> (<code>tekst</code> ili <code>tacno-netacno</code>),
        {' '}<code>pitanje</code>, <code>odgovor</code>. Opcione: <code>poeni</code> (podrazumevano 1),
        {' '}<code>tezina</code> (1–5, podrazumevano 3), <code>objasnjenje</code>, <code>hint</code>. Za tip{' '}
        <code>tekst</code> je <code>odgovor</code> opcioni referentni odgovor koji admin vidi pri ocenjivanju
        (više varijanti razdvoj znakom „|"). Za <code>tacno-netacno</code>, odgovor mora biti tačno „tacno" ili
        {' '}„netacno".
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

          {nepoznateTeme.length > 0 && (
            <p className="poruka poruka--upozorenje razmak-dole">
              🆕 {nepoznateTeme.length === 1 ? 'Nova tema' : 'Nove teme'} koje ne postoje u aplikaciji —{' '}
              {nepoznateTeme.length === 1 ? 'biće kreirana' : 'biće kreirane'} automatski pri uvozu:{' '}
              <strong>{nepoznateTeme.join(', ')}</strong>.
            </p>
          )}

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
