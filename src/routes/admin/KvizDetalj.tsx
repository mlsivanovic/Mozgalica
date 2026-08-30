// Detalji kviza: podešavanja, izbor pitanja (snapshot), linkovi za decu
import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import {
  dodajPitanjaUKviz, dodeliKvizProfilu, izmeniLink, kvizImaPokusaje, listajLinkove,
  listajOblasti, listajPitanja, listajPitanjaKviza, listajPokusajeKviza,
  listajProfileDeteta, napraviLink, obrisiPitanjeKviza, sacuvajKviz,
  statusLinkovaKviza, ucitajKviz, type StatusLinka,
} from '../../lib/api'
import { formatDatum, formatProcenat } from '../../lib/format'
import { podrazumevanoSlanjeMejla } from '../../lib/email'
import { mapaPredmetaPoTemi } from '../../lib/predmet'
import { Loader } from '../../components/Zajednicke'
import {
  NAZIVI_PREDMETA, NAZIVI_TIPOVA, type Kviz, type KvizLink, type KvizPitanje,
  type Oblast, type Pitanje, type Pokusaj, type Predmet, type ProfilDeteta,
  type Razred, type StatusPokusaja,
} from '../../types/db'

const BAZA_URL = `${window.location.origin}${import.meta.env.BASE_URL}`

const NAZIVI_STATUSA: Record<StatusPokusaja, string> = {
  in_progress: 'U toku', submitted: 'Završen', expired: 'Istekao',
}

export function KvizDetalj() {
  const { id } = useParams<{ id: string }>()
  const [ucitava, setUcitava] = useState(true)
  const [greska, setGreska] = useState<string | null>(null)
  const [kviz, setKviz] = useState<Kviz | null>(null)
  const [zakljucano, setZakljucano] = useState(false)
  const [snapshotPitanja, setSnapshotPitanja] = useState<KvizPitanje[]>([])
  const [bankaPitanja, setBankaPitanja] = useState<Pitanje[]>([])
  const [oblasti, setOblasti] = useState<Oblast[]>([])
  const [linkovi, setLinkovi] = useState<KvizLink[]>([])
  const [statusi, setStatusi] = useState<StatusLinka[]>([])
  const [pokusaji, setPokusaji] = useState<Pokusaj[]>([])
  const [profili, setProfili] = useState<ProfilDeteta[]>([])

  async function ucitajSve() {
    if (!id) return
    setUcitava(true)
    try {
      const [k, zakljuc, snap, banka, obl, lnk, stat, pok, deca] = await Promise.all([
        ucitajKviz(id), kvizImaPokusaje(id), listajPitanjaKviza(id),
        listajPitanja({}), listajOblasti(), listajLinkove(id), statusLinkovaKviza(id),
        listajPokusajeKviza(id), listajProfileDeteta(),
      ])
      setKviz(k); setZakljucano(zakljuc); setSnapshotPitanja(snap)
      setBankaPitanja(banka); setOblasti(obl); setLinkovi(lnk); setStatusi(stat)
      setPokusaji(pok)
      setProfili(deca)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { ucitajSve() }, [id])

  if (ucitava) return <Loader />
  if (!kviz) return <p className="poruka poruka--greska">{greska ?? 'Kviz nije pronađen.'}</p>

  return (
    <div>
      <h1>{kviz.title}</h1>
      {greska && <p className="poruka poruka--greska">{greska}</p>}

      <PodesavanjaKviza kviz={kviz} onSacuvano={ucitajSve} />

      <PitanjaKviza
        quizId={kviz.id} zakljucano={zakljucano} snapshot={snapshotPitanja} banka={bankaPitanja}
        oblasti={oblasti} razred={kviz.grade} onSacuvano={ucitajSve}
      />

      <RezultatiKviza pokusaji={pokusaji} />

      <LinkoviKviza
        quizId={kviz.id} linkovi={linkovi} statusi={statusi}
        profili={profili} imaPitanja={snapshotPitanja.length > 0} onPromena={ucitajSve}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
function PodesavanjaKviza({
  kviz, onSacuvano,
}: { kviz: Kviz; onSacuvano: () => void }) {
  const [otvoreno, setOtvoreno] = useState(false)
  const [f, setF] = useState(kviz)
  const [cuva, setCuva] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)

  async function sacuvaj() {
    setCuva(true); setGreska(null)
    try {
      await sacuvajKviz({
        title: f.title, description: f.description, time_limit_seconds: f.time_limit_seconds,
        default_max_attempts: f.default_max_attempts, shuffle_questions: f.shuffle_questions,
        shuffle_answers: f.shuffle_answers, show_result: f.show_result, show_correct: f.show_correct,
        pass_threshold_pct: f.pass_threshold_pct, require_name: true,
        fixed_child_name: f.fixed_child_name,
        require_label: f.require_label, label_name: f.label_name,
        grade: f.grade,
      }, kviz.id)
      setOtvoreno(false)
      onSacuvano()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuva(false)
    }
  }

  return (
    <div className="kartica razmak-dole">
      <div className="red red--razmak">
        <h2>Podešavanja</h2>
        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setOtvoreno(!otvoreno)}>
          {otvoreno ? 'Sakrij' : 'Uredi podešavanja'}
        </button>
      </div>

      {!otvoreno ? (
        <p className="malo blago">
          {f.time_limit_seconds ? `${Math.round(f.time_limit_seconds / 60)} min` : 'Bez vremenskog ograničenja'} ·
          {' '}Prag {f.pass_threshold_pct}% · Max {f.default_max_attempts} pokušaja
        </p>
      ) : (
        <>
          <div className="polje">
            <label htmlFor="kd-naziv">Naziv</label>
            <input id="kd-naziv" type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="polje">
            <label htmlFor="kd-opis">Poruka detetu</label>
            <textarea id="kd-opis" value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="red-polja">
            <div className="polje">
              <label htmlFor="kd-vreme">Vremensko ograničenje (min, prazno = bez)</label>
              <input
                id="kd-vreme" type="number" min={1}
                value={f.time_limit_seconds ? Math.round(f.time_limit_seconds / 60) : ''}
                onChange={(e) => setF({ ...f, time_limit_seconds: e.target.value ? Number(e.target.value) * 60 : null })}
              />
            </div>
            <div className="polje">
              <label htmlFor="kd-pokusaji">Maks. broj pokušaja</label>
              <input id="kd-pokusaji" type="number" min={1} max={20} value={f.default_max_attempts} onChange={(e) => setF({ ...f, default_max_attempts: Number(e.target.value) })} />
            </div>
            <div className="polje">
              <label htmlFor="kd-prag">Prag za uspeh (%)</label>
              <input id="kd-prag" type="number" min={0} max={100} value={f.pass_threshold_pct} onChange={(e) => setF({ ...f, pass_threshold_pct: Number(e.target.value) })} />
            </div>
          </div>
          <label className="stiklir"><input type="checkbox" checked={f.shuffle_questions} onChange={(e) => setF({ ...f, shuffle_questions: e.target.checked })} /> Nasumičan redosled pitanja</label>
          <label className="stiklir"><input type="checkbox" checked={f.shuffle_answers} onChange={(e) => setF({ ...f, shuffle_answers: e.target.checked })} /> Nasumičan redosled ponuđenih odgovora</label>
          <label className="stiklir"><input type="checkbox" checked={f.show_result} onChange={(e) => setF({ ...f, show_result: e.target.checked })} /> Dete vidi procenat i poene (zvezdice vidi uvek)</label>
          <label className="stiklir"><input type="checkbox" checked={f.show_correct} onChange={(e) => setF({ ...f, show_correct: e.target.checked })} /> Dete vidi tačne odgovore i objašnjenja</label>
          <label className="stiklir razmak-dole"><input type="checkbox" checked={f.require_label} onChange={(e) => setF({ ...f, require_label: e.target.checked })} /> Traži dodatnu oznaku ({f.label_name})</label>

          {greska && <p className="poruka poruka--greska">{greska}</p>}
          <button type="button" className="dugme" disabled={cuva} onClick={sacuvaj}>{cuva ? 'Čuvam…' : 'Sačuvaj podešavanja'}</button>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// VAŽNO: pitanja se u kviz DODAJU preko dodajPitanjaUKviz (nadovezuje na kraj),
// nikad ne prepravljaju ceo sastav sa postaviPitanjaKviza — inače bi pitanja
// koja su u kviz stigla direktno iz generatora (source_question_id je null jer
// nikad nisu sačuvana u banku) tiho ispala iz kviza čim se sastav "sačuva" iz
// ove liste, pošto se ona ne mogu prikazati kao štiklirana u tabeli banke.
function PitanjaKviza({
  quizId, zakljucano, snapshot, banka, oblasti, razred, onSacuvano,
}: {
  quizId: string; zakljucano: boolean; snapshot: KvizPitanje[]; banka: Pitanje[]
  oblasti: Oblast[]; razred: Razred | null; onSacuvano: () => void
}) {
  const [pitanjaOtvoreno, setPitanjaOtvoreno] = useState(false)
  const [bankaOtvoreno, setBankaOtvoreno] = useState(false)
  const [izabrana, setIzabrana] = useState<string[]>([])
  const [dodaje, setDodaje] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [brise, setBrise] = useState<string | null>(null)
  const [filterPredmet, setFilterPredmet] = useState<'' | Predmet>('')
  const mapaOblasti = new Map(oblasti.map((o) => [o.id, o.name]))
  const mapaPredmeta = mapaPredmetaPoTemi(oblasti)
  const mapaRazreda = new Map(oblasti.map((o) => [o.id, o.grade]))

  const vecUKvizu = new Set(snapshot.map((s) => s.source_question_id).filter((x): x is string => !!x))
  const dostupnaBanka = banka.filter((p) =>
    !vecUKvizu.has(p.id) && (razred === null || mapaRazreda.get(p.topic_id) === razred)
  )
  const bankaFiltrirana = filterPredmet ? dostupnaBanka.filter((p) => mapaPredmeta.get(p.topic_id) === filterPredmet) : dostupnaBanka

  async function obrisiJedno(qqId: string) {
    if (!confirm('Obrisati ovo pitanje iz kviza?' + (zakljucano ? ' Odgovori dece na njega se brišu, a rezultati predatih pokušaja se preračunavaju.' : ''))) return
    setBrise(qqId); setGreska(null)
    try {
      await obrisiPitanjeKviza(qqId)
      onSacuvano()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setBrise(null)
    }
  }

  function preklopi(qId: string) {
    setIzabrana(izabrana.includes(qId) ? izabrana.filter((x) => x !== qId) : [...izabrana, qId])
  }

  function preklopiSve() {
    const sviVidljivi = bankaFiltrirana.map((p) => p.id)
    const svePrisutne = sviVidljivi.length > 0 && sviVidljivi.every((id) => izabrana.includes(id))
    setIzabrana(svePrisutne ? [] : sviVidljivi)
  }

  async function dodaj() {
    setDodaje(true); setGreska(null)
    try {
      const noviUnosi = izabrana.map((qid) => {
        const p = banka.find((b) => b.id === qid)!
        return {
          source_question_id: p.id, topic_id: p.topic_id, topic_name: mapaOblasti.get(p.topic_id) ?? '—',
          type: p.type, text: p.text, options: p.options, correct: p.correct,
          explanation: p.explanation, hint: p.hint, points: p.points, manual_review: p.manual_review,
        }
      })
      await dodajPitanjaUKviz(quizId, noviUnosi)
      setIzabrana([])
      onSacuvano()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setDodaje(false)
    }
  }

  return (
    <>
      <div className="kartica razmak-dole">
        <div className="red red--razmak">
          <h2>Pitanja u kvizu ({snapshot.length})</h2>
          <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setPitanjaOtvoreno(!pitanjaOtvoreno)}>
            {pitanjaOtvoreno ? 'Sakrij' : 'Prikaži'}
          </button>
        </div>

        {greska && <p className="poruka poruka--greska">{greska}</p>}

        {!pitanjaOtvoreno ? (
          <p className="malo blago">
            {snapshot.length === 0 ? 'Kviz još nema pitanja.' : `${snapshot.length} ${snapshot.length === 1 ? 'pitanje' : snapshot.length < 5 ? 'pitanja' : 'pitanja'}`}
          </p>
        ) : (
          <>
            {snapshot.length === 0 ? (
              <p className="blago">Kviz još nema pitanja.</p>
            ) : (
              <ol className="razmak-dole">
                {snapshot.map((s) => (
                  <li key={s.id} className="red red--razmak">
                    <span>{s.text}</span>
                    <button
                      type="button" className="dugme dugme--opasno dugme--malo"
                      disabled={brise === s.id} onClick={() => obrisiJedno(s.id)}
                    >
                      {brise === s.id ? 'Brišem…' : 'Obriši'}
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {zakljucano && (
              <p className="poruka poruka--info">
                Ovaj kviz već ima pokušaje, pa se nova pitanja ne mogu dodavati (za drugačiji izbor napravi novi kviz).
                Pojedinačna pitanja i dalje mogu da se obrišu — rezultati predatih pokušaja se tada automatski preračunavaju.
              </p>
            )}
          </>
        )}
      </div>

      {!zakljucano && (
        <div className="kartica razmak-dole">
          <div className="red red--razmak">
            <h2>Dodaj pitanja iz banke</h2>
            <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setBankaOtvoreno(!bankaOtvoreno)}>
              {bankaOtvoreno ? 'Sakrij' : 'Prikaži'}
            </button>
          </div>

          {!bankaOtvoreno ? (
            <p className="malo blago">
              Dodaj nova pitanja iz baze pitanja u ovaj kviz.
            </p>
          ) : (
            <>
              <div className="polje" style={{ maxWidth: 220 }}>
                <label htmlFor="pk-predmet">Predmet</label>
                <select id="pk-predmet" value={filterPredmet} onChange={(e) => setFilterPredmet(e.target.value as '' | Predmet)}>
                  <option value="">Svi predmeti</option>
                  {Object.entries(NAZIVI_PREDMETA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="tabela-omot" style={{ maxHeight: 360 }}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={bankaFiltrirana.length > 0 && bankaFiltrirana.every((p) => izabrana.includes(p.id))}
                          onChange={preklopiSve}
                          aria-label="Izaberi sva prikazana pitanja"
                        />
                      </th>
                      <th>Pitanje</th><th>Oblast</th><th>Tip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankaFiltrirana.map((p) => (
                      <tr key={p.id}>
                        <td><input type="checkbox" checked={izabrana.includes(p.id)} onChange={() => preklopi(p.id)} /></td>
                        <td>{p.text}</td>
                        <td>{mapaOblasti.get(p.topic_id) ?? '—'}</td>
                        <td>{NAZIVI_TIPOVA[p.type]}</td>
                      </tr>
                    ))}
                    {bankaFiltrirana.length === 0 && (
                      <tr><td colSpan={4} className="centar blago" style={{ padding: '1rem' }}>Nema dostupnih pitanja za dodavanje.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button type="button" className="dugme dugme--akcenat razmak-gore" disabled={dodaje || izabrana.length === 0} onClick={dodaj}>
                {dodaje ? 'Dodajem…' : `Dodaj izabrana pitanja u kviz (${izabrana.length})`}
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
function RezultatiKviza({ pokusaji }: { pokusaji: Pokusaj[] }) {
  const [otvoreno, setOtvoreno] = useState(false)
  const zavrseno = pokusaji.filter((p) => p.status === 'submitted').length

  return (
    <div className="kartica razmak-dole">
      <div className="red red--razmak">
        <h2>Rezultati ({pokusaji.length})</h2>
        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => setOtvoreno(!otvoreno)}>
          {otvoreno ? 'Sakrij' : 'Prikaži'}
        </button>
      </div>

      {!otvoreno ? (
        <p className="malo blago">
          {pokusaji.length === 0 ? 'Još nema pokušaja.' : `${pokusaji.length} ${pokusaji.length === 1 ? 'pokušaj' : 'pokušaja'} · ${zavrseno} završeno`}
        </p>
      ) : pokusaji.length === 0 ? (
        <p className="blago">Još nema rezultata za ovaj kviz.</p>
      ) : (
        <div className="tabela-omot">
          <table className="tabela tabela--kartice">
            <thead>
              <tr><th>Dete</th><th>Status</th><th>Rezultat</th><th>Zvezdice</th><th>Pokušaj</th><th>Kraj</th><th></th></tr>
            </thead>
            <tbody>
              {pokusaji.map((p) => (
                <tr key={p.id}>
                  <td data-naslov="Dete">{p.child_name}{p.child_label ? ` (${p.child_label})` : ''}</td>
                  <td data-naslov="Status">
                    <span className={`bedz ${
                      p.status === 'submitted' && p.review_pending ? 'bedz--neutral'
                      : p.status === 'submitted' ? (p.passed ? 'bedz--uspeh' : 'bedz--upozorenje')
                      : p.status === 'expired' ? 'bedz--greska' : 'bedz--neutral'
                    }`}>
                      {p.status === 'submitted' && p.review_pending ? 'Čeka pregled' : NAZIVI_STATUSA[p.status]}
                    </span>
                  </td>
                  <td data-naslov="Rezultat">{p.review_pending ? 'Čeka pregled' : formatProcenat(p.score_pct)}</td>
                  <td data-naslov="Zvezdice">
                    {p.stars_awarded == null && p.stars_earned == null
                      ? '—'
                      : `${p.stars_awarded ?? p.stars_earned} / 5 ⭐`}
                  </td>
                  <td data-naslov="Pokušaj">#{p.attempt_no}</td>
                  <td data-naslov="Kraj">{formatDatum(p.submitted_at)}</td>
                  <td><Link to={`/admin/rezultati/${p.id}`}>Detalji</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function LinkoviKviza({
  quizId, linkovi, statusi, profili, imaPitanja, onPromena,
}: {
  quizId: string
  linkovi: KvizLink[]
  statusi: StatusLinka[]
  profili: ProfilDeteta[]
  imaPitanja: boolean
  onPromena: () => void
}) {
  const [label, setLabel] = useState('')
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [params] = useSearchParams()
  const { deteId } = useRoditelj()
  const zahtevDodele = useRef(crypto.randomUUID())
  const slanjeDodele = useRef(false)
  const [dodelaZapoceta, setDodelaZapoceta] = useState(false)
  const [izabraniProfil, setIzabraniProfil] = useState(() => {const id=params.get('primalac') ?? deteId; return linkovi.some(l => l.child_profile_id === id) ? '' : id})
  const [posaljiEmail, setPosaljiEmail] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState(false)
  const mapaStatus = new Map(statusi.map((s) => [s.link_id, s]))
  const mapaProfila = new Map(profili.map((p) => [p.id, p]))
  const profilniLinkovi = linkovi.filter((l) => l.child_profile_id)
  const generickiLinkovi = linkovi.filter((l) => !l.child_profile_id)
  const dodeljeniProfili = new Set(profilniLinkovi.map((l) => l.child_profile_id))
  const dostupniProfili = profili.filter((p) => !dodeljeniProfili.has(p.id))
  const profilZaDodelu = dostupniProfili.find((p) => p.id === izabraniProfil)

  async function napravi() {
    setRadi(true); setGreska(null)
    try {
      await napraviLink(quizId, label.trim() || null, maxAttempts, null)
      setLabel('')
      onPromena()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadi(false)
    }
  }

  async function dodeli() {
    if (slanjeDodele.current) return
    if (!imaPitanja) {setGreska('Najpre dodaj pitanja u kviz.'); return}
    if (!izabraniProfil) {
      setGreska('Izaberi profil deteta.')
      return
    }
    setRadi(true)
    setGreska(null)
    try {
      slanjeDodele.current = true
      setDodelaZapoceta(true)
      await dodeliKvizProfilu(quizId, izabraniProfil, posaljiEmail, zahtevDodele.current)
      setDodelaZapoceta(false)
      zahtevDodele.current = crypto.randomUUID()
      setIzabraniProfil('')
      setPosaljiEmail(false)
      onPromena()
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      slanjeDodele.current = false
      setRadi(false)
    }
  }

  async function kopiraj(token: string) {
    await navigator.clipboard.writeText(`${BAZA_URL}#/kviz/${token}`)
    alert('Link je kopiran.')
  }

  async function preklopiAktivnost(l: KvizLink) {
    await izmeniLink(l.id, { is_active: !l.is_active })
    onPromena()
  }

  async function produzi(l: KvizLink) {
    const dana = prompt('Za koliko dana produžiti važenje linka?', '14')
    if (!dana) return
    const noviDatum = new Date(Date.now() + Number(dana) * 86400000).toISOString()
    await izmeniLink(l.id, { expires_at: noviDatum })
    onPromena()
  }

  async function reissue(l: KvizLink) {
    if (!confirm('Napraviti novi link i deaktivirati stari? Stari link više neće raditi.')) return
    await izmeniLink(l.id, { is_active: false })
    await napraviLink(quizId, l.label, l.max_attempts, l.expires_at)
    onPromena()
  }

  return (
    <>
      <section className="kartica razmak-dole">
        <h2>Dodela profilima</h2>
        {!imaPitanja && <p className="poruka poruka--info">Najpre dodaj pitanja, zatim dodeli kviz.</p>}
        <p className="blago razmak-dole">
          Dodeljeni kviz se pojavljuje na stalnom profilnom linku deteta i može da se završi samo jednom.
          Naziv se automatski menja u format „Predmet — Ime deteta”.
        </p>
        {greska && <p className="poruka poruka--greska">{greska}</p>}
        <div className="red-polja">
          <div className="polje">
            <label htmlFor="lk-profil">Profil deteta</label>
            <select
              id="lk-profil"
              value={izabraniProfil} disabled={dodelaZapoceta}
              onChange={(e) => {
                const id = e.target.value
                const profil = dostupniProfili.find((p) => p.id === id)
                setIzabraniProfil(id)
                setPosaljiEmail(podrazumevanoSlanjeMejla(
                  profil?.email,
                  profil?.notify_new_quiz_email ?? false,
                ))
              }}
            >
              <option value="">Izaberi profil…</option>
              {dostupniProfili.map((p) => <option key={p.id} value={p.id}>{p.avatar} {p.name}</option>)}
            </select>
          </div>
          <button
            type="button" className="dugme dugme--akcenat"
            style={{ alignSelf: 'flex-end', marginBottom: '1rem' }}
            disabled={radi || !imaPitanja || dostupniProfili.length === 0} onClick={dodeli}
          >
            Dodeli kviz
          </button>
        </div>
        {izabraniProfil && (
          <div className="razmak-dole">
            <label className="stiklir">
              <input
                type="checkbox"
                checked={posaljiEmail}
                disabled={dodelaZapoceta || !profilZaDodelu?.email}
                onChange={(e) => setPosaljiEmail(e.target.checked)}
              />
              Pošalji i mejl detetu kada kviz stigne
            </label>
            <p className="malo blago">
              {profilZaDodelu?.email
                ? `Mejl će biti poslat na ${profilZaDodelu.email}.`
                : <>Profil nema email adresu. <Link to="/admin/deca">Dodaj je u profilu deteta.</Link></>}
            </p>
          </div>
        )}

        {profilniLinkovi.length === 0 ? (
          <p className="blago">Kviz još nije dodeljen nijednom profilu.</p>
        ) : (
          <div className="tabela-omot">
            <table className="tabela tabela--kartice">
              <thead><tr><th>Dete</th><th>Status</th><th>Napredak</th><th></th></tr></thead>
              <tbody>
                {profilniLinkovi.map((l) => {
                  const profil = mapaProfila.get(l.child_profile_id!)
                  const s = mapaStatus.get(l.id)
                  const status = !l.is_active ? 'Pauziran'
                    : s && s.submitted_count > 0 ? 'Završen'
                    : s && s.in_progress_count > 0 ? 'U toku'
                    : 'Nije započet'
                  return (
                    <tr key={l.id}>
                      <td data-naslov="Dete">{profil?.avatar} {profil?.name ?? 'Nepoznat profil'}</td>
                      <td data-naslov="Status">
                        <span className={`bedz ${
                          status === 'Završen' ? 'bedz--uspeh'
                          : status === 'U toku' ? 'bedz--upozorenje'
                          : status === 'Pauziran' ? 'bedz--greska' : ''
                        }`}>{status}</span>
                      </td>
                      <td data-naslov="Napredak">
                        {s?.submitted_count ? 'Završeno' : s?.in_progress_count ? 'Odgovori se čuvaju' : '—'}
                      </td>
                      <td>
                        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => preklopiAktivnost(l)}>
                          {l.is_active ? 'Sakrij sa profila' : 'Vrati na profil'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {profili.length === 0 && (
          <p className="poruka poruka--info">Prvo napravi profil deteta u Podešavanjima.</p>
        )}
      </section>

      <section className="kartica">
        <h2>Generički linkovi</h2>
        <p className="blago razmak-dole">
          Svaki početak preko ovakvog linka pravi novi pokušaj, do podešenog limita.
        </p>

        <div className="red-polja razmak-dole">
          <div className="polje">
            <label htmlFor="lk-label">Oznaka (opciono)</label>
            <input id="lk-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="polje">
            <label htmlFor="lk-max">Dozvoljeno pokušaja</label>
            <input id="lk-max" type="number" min={1} max={20} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />
          </div>
        </div>
        <button type="button" className="dugme dugme--akcenat razmak-dole" disabled={radi} onClick={napravi}>
          + Napravi generički link
        </button>

        {generickiLinkovi.length === 0 ? <p className="blago">Još nema generičkih linkova.</p> : (
          <div className="tabela-omot">
            <table className="tabela tabela--kartice">
              <thead><tr><th>Oznaka</th><th>Status</th><th>Pokušaji</th><th>Ističe</th><th></th></tr></thead>
              <tbody>
                {generickiLinkovi.map((l) => {
                  const s = mapaStatus.get(l.id)
                  return (
                    <tr key={l.id}>
                      <td data-naslov="Oznaka">{l.label || '—'}</td>
                      <td data-naslov="Status">
                        {!l.is_active ? <span className="bedz bedz--greska">Deaktiviran</span>
                          : <span className="bedz">Aktivan</span>}
                      </td>
                      <td data-naslov="Pokušaji">{s?.submitted_count ?? 0} / {l.max_attempts}</td>
                      <td data-naslov="Ističe">{l.expires_at ? formatDatum(l.expires_at) : 'Ne ističe'}</td>
                      <td className="red">
                        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => kopiraj(l.token)}>Kopiraj</button>
                        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => preklopiAktivnost(l)}>
                          {l.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                        </button>
                        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => produzi(l)}>Produži</button>
                        <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => reissue(l)}>Novi link</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
