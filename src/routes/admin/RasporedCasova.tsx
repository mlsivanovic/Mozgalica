import { useEffect, useRef, useState } from 'react'
import { RoditeljskiLink as Link, useRoditelj } from '../../lib/roditelj'
import {
  kopirajRasporedCasova, obrisiRasporedCasova, postaviSmenuNedelje,
  sacuvajRasporedCasova, ucitajRasporedCasova,
} from '../../lib/api'
import {
  belgradeDatum, bojaIzMape, DANI_KRATKO, imaPretcas, mapaBojaPredmeta, nazivCasa, nazivSmene, ponedeljakNedelje,
  postaviPretcas, PREDLOZI_PREDMETA, satnicaPreseta, type SatnicaCasa, type SmenaCasova,
  type SlotRasporedaCasova,
} from '../../lib/rasporedCasova'
import type { PregledRasporedaCasova, RasporedCasovaUnos } from '../../types/kviz'
import { Loader } from '../../components/Zajednicke'
import { RasporedCasovaPregled, RasporedIzvoz } from '../dete/RasporedCasovaPregled'
import './rasporedCasova.css'
import './generator.css'

type Korak = 'lista' | 'carobnjak' | 'urednik'

function prazanUnos(smena: SmenaCasova, rotacija: RasporedCasovaUnos['rotationMode']): RasporedCasovaUnos {
  return {
    rotationMode: rotacija,
    defaultShift: smena,
    anchorMonday: ponedeljakNedelje(belgradeDatum()),
    includeSaturday: false,
    sharedSlots: true,
    morningPeriods: satnicaPreseta('morning', 6, false),
    afternoonPeriods: satnicaPreseta('afternoon', 6, true),
    slots: [],
  }
}

export function RasporedCasova() {
  const { deteId, profili } = useRoditelj()
  const [korak, setKorak] = useState<Korak>(deteId ? 'urednik' : 'lista')
  const [unos, setUnos] = useState<RasporedCasovaUnos | null>(null)
  const [pregled, setPregled] = useState<PregledRasporedaCasova | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, setRadi] = useState(!!deteId)

  async function ucitaj(id: string) {
    setRadi(true); setGreska(null)
    try {
      const data = await ucitajRasporedCasova(id)
      if (!data.ok) { setGreska(data.error ?? 'Raspored nije učitan.'); setUnos(null); setPregled(null); return }
      if (!data.exists || !data.timetable) {
        setUnos(null); setPregled(null); setKorak('carobnjak')
      } else {
        setUnos({
          rotationMode: data.timetable.rotationMode,
          defaultShift: data.timetable.defaultShift,
          anchorMonday: data.timetable.anchorMonday,
          includeSaturday: data.timetable.includeSaturday,
          sharedSlots: data.timetable.sharedSlots,
          morningPeriods: data.timetable.morningPeriods,
          afternoonPeriods: data.timetable.afternoonPeriods,
          slots: data.timetable.slots,
        })
        setPregled(data.resolved ?? null)
        setKorak('urednik')
      }
    } catch (e) { setGreska((e as Error).message) }
    finally { setRadi(false) }
  }

  useEffect(() => {
    if (!deteId) { setKorak('lista'); setUnos(null); setPregled(null); setRadi(false); return }
    void ucitaj(deteId)
  }, [deteId])

  return (
    <div>
      <div className="roditelj-naslov">
        <div>
          <h1>Raspored časova</h1>
          <p className="blago malo">Školski raspored vidi i dete na svom profilu. Ovo nije raspored kvizova.</p>
        </div>
      </div>
      {greska && <p className="poruka poruka--greska" role="alert">{greska}</p>}
      {radi && <Loader tekst="Učitavam raspored…" />}
      {!radi && !deteId && <ListaDece />}
      {!radi && deteId && korak === 'carobnjak' && (
        <Carobnjak
          ime={profili.find((p) => p.id === deteId)?.name ?? 'dete'}
          onGotovo={(novi) => {
            setUnos(novi)
            setKorak('urednik')
            void sacuvajRasporedCasova(deteId, novi).then((data) => {
              if (!data.ok) setGreska(data.error ?? 'Raspored nije sačuvan.')
              else setPregled(data.resolved ?? null)
            })
          }}
        />
      )}
      {!radi && deteId && korak === 'urednik' && unos && (
        <Urednik
          childId={deteId}
          ime={profili.find((p) => p.id === deteId)?.name ?? 'dete'}
          unos={unos}
          pregled={pregled}
          onUnos={setUnos}
          onSacuvano={(data) => {
            if (data.timetable) {
              setUnos({
                rotationMode: data.timetable.rotationMode, defaultShift: data.timetable.defaultShift,
                anchorMonday: data.timetable.anchorMonday, includeSaturday: data.timetable.includeSaturday,
                sharedSlots: data.timetable.sharedSlots, morningPeriods: data.timetable.morningPeriods,
                afternoonPeriods: data.timetable.afternoonPeriods, slots: data.timetable.slots,
              })
            }
            setPregled(data.resolved ?? null)
          }}
          onObrisano={() => { setUnos(null); setPregled(null); setKorak('carobnjak') }}
          onGreska={setGreska}
        />
      )}
    </div>
  )
}

function ListaDece() {
  const { profili } = useRoditelj()
  if (profili.length === 0) {
    return <div className="kartica"><p>Dodaj dete pa unesi raspored časova.</p><Link to="/admin/deca" className="dugme razmak-gore">Upravljaj decom</Link></div>
  }
  return (
    <div className="roditelj-kartice">
      {profili.map((p) => (
        <article key={p.id} className="kartica raspored-kartica-dete">
          <h2>{p.avatar} {p.name}</h2>
          <p className="blago">Izaberi dete gore ili otvori raspored za ovaj profil.</p>
          <Link className="dugme dugme--senka" to={`/admin/raspored-casova?dete=${p.id}`}>Otvori raspored →</Link>
        </article>
      ))}
    </div>
  )
}

function Carobnjak({ ime, onGotovo }: { ime: string; onGotovo: (unos: RasporedCasovaUnos) => void }) {
  const [rezim, setRezim] = useState<'fixed-morning' | 'fixed-afternoon' | 'alternating'>('alternating')
  const [ovaNedelja, setOvaNedelja] = useState<SmenaCasova>('afternoon')
  const [broj, setBroj] = useState(6)
  const [pretcasJutro, setPretcasJutro] = useState(false)
  const [pretcasPopodne, setPretcasPopodne] = useState(true)
  const [subota, setSubota] = useState(false)
  const [isti, setIsti] = useState(true)

  function zavrsi() {
    const smena: SmenaCasova = rezim === 'fixed-morning' ? 'morning' : rezim === 'fixed-afternoon' ? 'afternoon' : ovaNedelja
    const unos = prazanUnos(smena, rezim === 'alternating' ? 'alternating' : 'fixed')
    unos.morningPeriods = satnicaPreseta('morning', broj, pretcasJutro)
    unos.afternoonPeriods = satnicaPreseta('afternoon', broj, pretcasPopodne)
    unos.includeSaturday = subota
    unos.sharedSlots = isti
    onGotovo(unos)
  }

  return (
    <div className="kartica">
      <ol className="roditelj-koraci"><li aria-current="step">Smena i satnica</li><li>Predmeti u mreži</li></ol>
      <h2>Novi raspored za {ime}</h2>
      <fieldset className="razmak-gore" style={{ border: 0 }}>
        <legend className="razmak-dole">Kako škola menja smene?</legend>
        <div className="raspored-izbor">
          <button type="button" aria-pressed={rezim === 'fixed-morning'} onClick={() => setRezim('fixed-morning')}>Uvek prepodne</button>
          <button type="button" aria-pressed={rezim === 'fixed-afternoon'} onClick={() => setRezim('fixed-afternoon')}>Uvek popodne</button>
          <button type="button" aria-pressed={rezim === 'alternating'} onClick={() => setRezim('alternating')}>Jedna nedelja prepodne, druga popodne</button>
        </div>
      </fieldset>
      {rezim === 'alternating' && (
        <fieldset className="razmak-gore" style={{ border: 0 }}>
          <legend className="razmak-dole">Ova nedelja je</legend>
          <div className="raspored-izbor">
            <button type="button" aria-pressed={ovaNedelja === 'morning'} onClick={() => setOvaNedelja('morning')}>Prepodnevna</button>
            <button type="button" aria-pressed={ovaNedelja === 'afternoon'} onClick={() => setOvaNedelja('afternoon')}>Popodnevna</button>
          </div>
        </fieldset>
      )}
      <div className="polje razmak-gore">
        <label htmlFor="broj-casova">Broj redovnih časova</label>
        <select id="broj-casova" value={broj} onChange={(e) => setBroj(Number(e.target.value))}>
          {[4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <label className="stiklir">
        <input type="checkbox" checked={pretcasPopodne} onChange={(e) => setPretcasPopodne(e.target.checked)} />
        Popodne počinje pretčasom (13:10)
      </label>
      <p className="malo blago razmak-dole">Uključi ako škola popodne kreće od 13:10 umesto od 14:00. Većina odeljenja sa smenama ima nulti čas.</p>
      <label className="stiklir">
        <input type="checkbox" checked={pretcasJutro} onChange={(e) => setPretcasJutro(e.target.checked)} />
        Prepodne ima pretčas (7:10)
      </label>
      <label className="stiklir">
        <input type="checkbox" checked={subota} onChange={(e) => setSubota(e.target.checked)} />
        Ima nastavu i subotom
      </label>
      <label className="stiklir">
        <input type="checkbox" checked={isti} onChange={(e) => setIsti(e.target.checked)} />
        Isti predmeti u obe smene (menja se samo satnica)
      </label>
      <button type="button" className="dugme dugme--akcenat razmak-gore" onClick={zavrsi}>Unesi predmete →</button>
    </div>
  )
}

function Urednik({
  childId, ime, unos, pregled, onUnos, onSacuvano, onObrisano, onGreska,
}: {
  childId: string
  ime: string
  unos: RasporedCasovaUnos
  pregled: PregledRasporedaCasova | null
  onUnos: (unos: RasporedCasovaUnos) => void
  onSacuvano: (data: Awaited<ReturnType<typeof sacuvajRasporedCasova>>) => void
  onObrisano: () => void
  onGreska: (poruka: string | null) => void
}) {
  const { profili } = useRoditelj()
  const [smenaPrikaz, setSmenaPrikaz] = useState<SmenaCasova>(unos.defaultShift)
  const [celija, setCelija] = useState<{ weekday: number; periodNo: number } | null>(null)
  const [kopijaNa, setKopijaNa] = useState('')
  const [radi, setRadi] = useState(false)
  const [prikaz, setPrikaz] = useState<'mreza' | 'dete'>('mreza')
  const dani = unos.includeSaturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]
  const periodi = smenaPrikaz === 'afternoon' ? unos.afternoonPeriods : unos.morningPeriods
  const boje = mapaBojaPredmeta(unos.slots.map((s) => s.subject))

  async function sacuvaj(sledeci = unos) {
    setRadi(true); onGreska(null)
    const data = await sacuvajRasporedCasova(childId, sledeci)
    setRadi(false)
    if (!data.ok) { onGreska(data.error ?? 'Čuvanje nije uspelo.'); return }
    onSacuvano(data)
  }

  function slotNa(weekday: number, periodNo: number) {
    return unos.slots.find((s) => s.weekday === weekday && s.periodNo === periodNo
      && (unos.sharedSlots ? s.shift == null : s.shift === smenaPrikaz))
  }

  function upisiSlot(slot: SlotRasporedaCasova | null) {
    if (!celija) return
    const ostali = unos.slots.filter((s) => !(s.weekday === celija.weekday && s.periodNo === celija.periodNo
      && (unos.sharedSlots ? s.shift == null : s.shift === smenaPrikaz)))
    const sledeci = {
      ...unos,
      slots: slot ? [...ostali, slot] : ostali,
    }
    onUnos(sledeci)
    setCelija(null)
    void sacuvaj(sledeci)
  }

  function promeniPretcas(smena: SmenaCasova, ukljuci: boolean) {
    const polje = smena === 'morning' ? 'morningPeriods' : 'afternoonPeriods'
    const sledeci: RasporedCasovaUnos = {
      ...unos,
      [polje]: postaviPretcas(unos[polje], smena, ukljuci),
      slots: ukljuci ? unos.slots : unos.slots.filter((s) => s.periodNo !== 0 || (!unos.sharedSlots && s.shift != null && s.shift !== smena)),
    }
    onUnos(sledeci)
  }

  return (
    <>
      <div className="roditelj-alati">
        <p>Za: <strong>{ime}</strong> · {unos.rotationMode === 'fixed' ? `uvek ${nazivSmene(unos.defaultShift).toLowerCase()}` : 'naizmenične smene'}</p>
        <div className="raspored-izbor">
          <button type="button" aria-pressed={prikaz === 'mreza'} onClick={() => setPrikaz('mreza')}>Mreža</button>
          <button type="button" aria-pressed={prikaz === 'dete'} onClick={() => setPrikaz('dete')}>Kako vidi dete</button>
        </div>
      </div>
      {pregled?.thisWeekShift && (
        <p className="poruka poruka--info">
          Ova nedelja je {nazivSmene(pregled.thisWeekShift).toLowerCase()}.
          {unos.rotationMode === 'alternating' && (
            <>
              {' '}
              <button
                type="button"
                className="dugme dugme--senka dugme--malo"
                disabled={radi}
                onClick={() => {
                  const druga = pregled.thisWeekShift === 'morning' ? 'afternoon' : 'morning'
                  void postaviSmenuNedelje(childId, pregled.weekMonday!, druga).then((data) => {
                    if (!data.ok) onGreska(data.error ?? 'Smena nije promenjena.')
                    else onSacuvano(data)
                  })
                }}
              >
                Promeni na {pregled.thisWeekShift === 'morning' ? 'popodne' : 'prepodne'}
              </button>
            </>
          )}
        </p>
      )}

      {prikaz === 'dete' && pregled?.exists
        ? <RasporedCasovaPregled raspored={pregled} />
        : (
          <>
            {pregled?.exists && <RasporedIzvoz raspored={pregled} />}
            <div className="raspored-izbor razmak-dole">
              <button type="button" aria-pressed={smenaPrikaz === 'morning'} onClick={() => setSmenaPrikaz('morning')}>Prepodne</button>
              <button type="button" aria-pressed={smenaPrikaz === 'afternoon'} onClick={() => setSmenaPrikaz('afternoon')}>Popodne</button>
            </div>
            <details className="kartica razmak-dole">
              <summary>Satnica i pretčas</summary>
              <div className="razmak-gore">
                <label className="stiklir">
                  <input type="checkbox" checked={imaPretcas(unos.afternoonPeriods)} onChange={(e) => promeniPretcas('afternoon', e.target.checked)} />
                  Popodne počinje pretčasom (13:10)
                </label>
                <label className="stiklir">
                  <input type="checkbox" checked={imaPretcas(unos.morningPeriods)} onChange={(e) => promeniPretcas('morning', e.target.checked)} />
                  Prepodne ima pretčas (7:10)
                </label>
                <SatnicaPolja
                  periodi={periodi}
                  onChange={(periodi) => onUnos(smenaPrikaz === 'afternoon'
                    ? { ...unos, afternoonPeriods: periodi }
                    : { ...unos, morningPeriods: periodi })}
                />
                <button type="button" className="dugme dugme--senka razmak-gore" disabled={radi} onClick={() => void sacuvaj()}>
                  Sačuvaj satnicu
                </button>
              </div>
            </details>
            <div className="raspored-mreza-omot">
              <table className="raspored-mreza">
                <thead>
                  <tr>
                    <th>Čas</th>
                    {dani.map((d) => <th key={d}>{DANI_KRATKO[d - 1]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...periodi].sort((a, b) => a.periodNo - b.periodNo).map((p) => (
                    <tr key={p.periodNo}>
                      <th className="raspored-sat">{nazivCasa(p.periodNo)}<br />{p.startsAt}</th>
                      {dani.map((d) => {
                        const slot = slotNa(d, p.periodNo)
                        return (
                          <td key={d}>
                            <button
                              type="button"
                              className={`raspored-celija${slot ? ' raspored-celija--popunjena' : ''}`}
                              style={slot ? { background: bojaIzMape(boje, slot.subject, slot.color), borderColor: 'transparent' } : undefined}
                              onClick={() => setCelija({ weekday: d, periodNo: p.periodNo })}
                            >
                              {slot ? slot.subject : '+'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      <div className="roditelj-radnje">
        <button type="button" className="dugme dugme--akcenat" disabled={radi} onClick={() => void sacuvaj()}>
          {radi ? 'Čuvam…' : 'Sačuvaj raspored'}
        </button>
        {profili.filter((p) => p.id !== childId).length > 0 && (
          <>
            <select value={kopijaNa} onChange={(e) => setKopijaNa(e.target.value)} aria-label="Kopiraj na dete">
              <option value="">Kopiraj na…</option>
              {profili.filter((p) => p.id !== childId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              type="button"
              className="dugme dugme--senka"
              disabled={!kopijaNa || radi}
              onClick={() => {
                void kopirajRasporedCasova(childId, kopijaNa).then((data) => {
                  if (!data.ok) onGreska(data.error ?? 'Kopiranje nije uspelo.')
                })
              }}
            >
              Kopiraj
            </button>
          </>
        )}
        <button
          type="button"
          className="dugme dugme--opasno"
          disabled={radi}
          onClick={() => {
            if (!confirm('Obrisati raspored časova? Dete više neće videti časove na profilu.')) return
            void obrisiRasporedCasova(childId).then(onObrisano).catch((e) => onGreska((e as Error).message))
          }}
        >
          Obriši
        </button>
      </div>
      {celija && (
        <CelijaDijalog
          weekday={celija.weekday}
          periodNo={celija.periodNo}
          slot={slotNa(celija.weekday, celija.periodNo) ?? null}
          shared={unos.sharedSlots}
          smena={smenaPrikaz}
          onZatvori={() => setCelija(null)}
          onSacuvaj={upisiSlot}
        />
      )}
    </>
  )
}

function SatnicaPolja({ periodi, onChange }: { periodi: SatnicaCasa[]; onChange: (p: SatnicaCasa[]) => void }) {
  return (
    <div className="raspored-satnica razmak-gore">
      {[...periodi].sort((a, b) => a.periodNo - b.periodNo).map((p) => (
        <div key={p.periodNo} className="raspored-satnica-red">
          <strong>{nazivCasa(p.periodNo)}</strong>
          <input type="time" value={p.startsAt} aria-label={`${nazivCasa(p.periodNo)} početak`} onChange={(e) => onChange(periodi.map((x) => x.periodNo === p.periodNo ? { ...x, startsAt: e.target.value } : x))} />
          <input type="time" value={p.endsAt} aria-label={`${nazivCasa(p.periodNo)} kraj`} onChange={(e) => onChange(periodi.map((x) => x.periodNo === p.periodNo ? { ...x, endsAt: e.target.value } : x))} />
        </div>
      ))}
    </div>
  )
}

function CelijaDijalog({
  weekday, periodNo, slot, shared, smena, onZatvori, onSacuvaj,
}: {
  weekday: number
  periodNo: number
  slot: SlotRasporedaCasova | null
  shared: boolean
  smena: SmenaCasova
  onZatvori: () => void
  onSacuvaj: (slot: SlotRasporedaCasova | null) => void
}) {
  const dijalog = useRef<HTMLDialogElement>(null)
  const [subject, setSubject] = useState(slot?.subject ?? '')
  const [teacher, setTeacher] = useState(slot?.teacher ?? '')
  const [room, setRoom] = useState(slot?.room ?? '')
  const [note, setNote] = useState(slot?.note ?? '')
  useEffect(() => { dijalog.current?.showModal() }, [])

  return (
    <dialog ref={dijalog} className="raspored-dijalog" onClose={onZatvori}>
      <h2>{nazivCasa(periodNo)} · {DANI_KRATKO[weekday - 1]}</h2>
      <div className="polje razmak-gore">
        <label htmlFor="cas-predmet">Predmet</label>
        <input id="cas-predmet" list="predlozi-predmeta" value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus />
        <datalist id="predlozi-predmeta">{PREDLOZI_PREDMETA.map((p) => <option key={p} value={p} />)}</datalist>
      </div>
      <div className="raspored-izbor razmak-dole">
        {PREDLOZI_PREDMETA.slice(0, 12).map((p) => (
          <button key={p} type="button" aria-pressed={subject === p} onClick={() => setSubject(p)}>{p}</button>
        ))}
      </div>
      <div className="red-polja">
        <div className="polje"><label htmlFor="cas-nastavnik">Nastavnik</label><input id="cas-nastavnik" value={teacher} onChange={(e) => setTeacher(e.target.value)} /></div>
        <div className="polje"><label htmlFor="cas-ucionica">Učionica</label><input id="cas-ucionica" value={room} onChange={(e) => setRoom(e.target.value)} /></div>
      </div>
      <div className="polje"><label htmlFor="cas-napomena">Napomena</label><input id="cas-napomena" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="roditelj-radnje">
        <button type="button" className="dugme dugme--senka" onClick={onZatvori}>Otkaži</button>
        {slot && <button type="button" className="dugme dugme--opasno" onClick={() => onSacuvaj(null)}>Ukloni</button>}
        <button
          type="button"
          className="dugme dugme--akcenat"
          disabled={!subject.trim()}
          onClick={() => onSacuvaj({
            shift: shared ? null : smena, weekday, periodNo,
            subject: subject.trim(), teacher: teacher.trim() || null,
            room: room.trim() || null, color: null, note: note.trim() || null,
          })}
        >
          Sačuvaj čas
        </button>
      </div>
    </dialog>
  )
}
