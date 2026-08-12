// Administratorska podešavanja: profili dece, titule, prodavnica nagrada i mejl obaveštenja.
import { useEffect, useState } from 'react'
import { PushKontrole } from '../../components/PushKontrole'
import { Loader } from '../../components/Zajednicke'
import { OznakaRangaTitule, TitleAvatar } from '../../components/TitleAvatar'
import {
  listajKupovineProdavnice, listajNivoeTitula, listajProfileDeteta, listajStavkeProdavnice,
  oznaciKupovinuKonzumiranom, otkaziKupovinu, postaviEmailObavestenja,
  sacuvajNivoeTitula, sacuvajProfilDeteta, sacuvajStavkeProdavnice, ucitajJavniProfil,
  ucitajPodesavanja, type KupovinaAdminPrikaz,
} from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { emailJeIspravan, normalizujEmail } from '../../lib/email'
import { formatDatum, formatProcenat } from '../../lib/format'
import {
  AVATARI_DECE, type AvatarDeteta, type NivoTitule, type ProfilDeteta, type StavkaProdavnice,
} from '../../types/db'
import type { JavniProfilPayload } from '../../types/kviz'
import './podesavanja.css'

const BAZA_URL = typeof window !== 'undefined' ? `${window.location.origin}${import.meta.env.BASE_URL}` : ''

interface ProfilForma {
  id?: string
  name: string
  birth_date: string
  avatar: AvatarDeteta
  email: string
  notify_new_quiz_email: boolean
}

export interface TitleGroup {
  id: string
  baseName: string
  isExpanded: boolean
  awakenedStars: number
  empoweredStars: number
  unboundStars: number
  avatar?: string | null
}

export function groupTitleLevels(flatList: NivoTitule[]): TitleGroup[] {
  const sorted = [...flatList].sort((a, b) => a.min_stars - b.min_stars)
  
  const groups: TitleGroup[] = []
  const suffixRegex = /\s*(Awakened|Empowered|Unbound)$/
  
  const baseNameMap = new Map<string, { id: string; min_stars: number; rank: string; avatar?: string | null }[]>()
  const baseNameOrder: string[] = []
  
  let hasOldFormat = false
  
  for (const item of sorted) {
    const match = item.name.match(suffixRegex)
    if (match) {
      const baseName = item.name.replace(suffixRegex, '').trim()
      const rank = match[1]
      if (!baseNameMap.has(baseName)) {
        baseNameMap.set(baseName, [])
        baseNameOrder.push(baseName)
      }
      baseNameMap.get(baseName)!.push({ id: item.id, min_stars: item.min_stars, rank, avatar: item.avatar })
    } else {
      hasOldFormat = true
    }
  }
  
  if (hasOldFormat || baseNameOrder.length === 0) {
    const migratedGroups: TitleGroup[] = []
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]
      const baseName = item.name.trim()
      const currentStart = item.min_stars
      const nextStart = i < sorted.length - 1 ? sorted[i + 1].min_stars : currentStart + 15
      const range = nextStart - currentStart
      
      let awakened = currentStart
      let empowered = currentStart + 1
      let unbound = currentStart + 2
      
      if (range >= 3) {
        empowered = currentStart + Math.floor(range / 3)
        unbound = currentStart + Math.floor((2 * range) / 3)
      } else {
        empowered = currentStart + 1
        unbound = currentStart + 2
      }
      
      migratedGroups.push({
        id: item.id || `migrated-${i}`,
        baseName,
        isExpanded: false,
        awakenedStars: awakened,
        empoweredStars: empowered,
        unboundStars: unbound,
        avatar: item.avatar || null,
      })
    }
    
    if (migratedGroups.length === 0) {
      migratedGroups.push({
        id: `new-${Date.now()}`,
        baseName: 'ShadowNoob',
        isExpanded: false,
        awakenedStars: 0,
        empoweredStars: 2,
        unboundStars: 4,
        avatar: null,
      })
    }
    return migratedGroups
  }
  
  for (const baseName of baseNameOrder) {
    const items = baseNameMap.get(baseName)!
    const awakenedItem = items.find(it => it.rank === 'Awakened')
    const empoweredItem = items.find(it => it.rank === 'Empowered')
    const unboundItem = items.find(it => it.rank === 'Unbound')
    
    const awakenedStars = awakenedItem ? awakenedItem.min_stars : 0
    const empoweredStars = empoweredItem ? empoweredItem.min_stars : awakenedStars + 1
    const unboundStars = unboundItem ? unboundItem.min_stars : awakenedStars + 2
    const avatar = awakenedItem?.avatar || empoweredItem?.avatar || unboundItem?.avatar || null
    
    groups.push({
      id: awakenedItem?.id ?? `group-${baseName}-${Date.now()}`,
      baseName,
      isExpanded: false,
      awakenedStars,
      empoweredStars,
      unboundStars,
      avatar,
    })
  }
  
  return groups
}

export function flattenTitleGroups(groups: TitleGroup[]): Array<{ name: string; min_stars: number; avatar?: string | null }> {
  const flat: Array<{ name: string; min_stars: number; avatar?: string | null }> = []
  for (const group of groups) {
    const base = group.baseName.trim()
    const avatar = group.avatar || null
    flat.push({ name: `${base} Awakened`, min_stars: group.awakenedStars, avatar })
    flat.push({ name: `${base} Empowered`, min_stars: group.empoweredStars, avatar })
    flat.push({ name: `${base} Unbound`, min_stars: group.unboundStars, avatar })
  }
  return flat.sort((a, b) => a.min_stars - b.min_stars)
}

export function validateTitleGroups(groups: TitleGroup[]): string | null {
  if (groups.length === 0) {
    return 'Mora postojati barem jedna titula.'
  }
  
  const sortedGroups = [...groups].sort((a, b) => a.awakenedStars - b.awakenedStars)
  
  if (sortedGroups[0].awakenedStars !== 0) {
    return 'Početna titula (prvi rang prve titule) mora kretati od 0 zvezdica.'
  }
  
  for (let i = 0; i < sortedGroups.length; i++) {
    const g = sortedGroups[i]
    if (!g.baseName.trim()) {
      return 'Naziv titule ne sme biti prazan.'
    }
    if (g.awakenedStars < 0 || g.empoweredStars < 0 || g.unboundStars < 0) {
      return `Kod titule „${g.baseName}”, broj zvezdica ne može biti negativan.`
    }
    if (g.awakenedStars >= g.empoweredStars) {
      return `Kod titule „${g.baseName}”, Empowered rang (${g.empoweredStars}⭐) mora zahtevati više zvezdica od Awakened ranga (${g.awakenedStars}⭐).`
    }
    if (g.empoweredStars >= g.unboundStars) {
      return `Kod titule „${g.baseName}”, Unbound rang (${g.unboundStars}⭐) mora zahtevati više zvezdica od Empowered ranga (${g.empoweredStars}⭐).`
    }
    
    if (i < sortedGroups.length - 1) {
      const sledeca = sortedGroups[i + 1]
      if (g.unboundStars >= sledeca.awakenedStars) {
        return `Sledeća titula „${sledeca.baseName}” mora početi sa više zvezdica nego što zahteva prethodni Unbound rang titule „${g.baseName}” (${g.unboundStars}⭐).`
      }
    }
  }
  
  return null
}

type TabPodesavanja = 'profili' | 'titule' | 'prodavnica' | 'obavestenja'

// Lokalna (ne-sačuvana) stavka kataloga — privremeni id se koristi samo za React key.
interface StavkaForma {
  tempId: string
  title: string
  description: string
  emoji: string
  cost: number
  repeatable: boolean
  is_active: boolean
  sort_order: number
}

function stavkaUFormu(s: StavkaProdavnice): StavkaForma {
  return {
    tempId: s.id,
    title: s.title,
    description: s.description ?? '',
    emoji: s.emoji,
    cost: s.cost,
    repeatable: s.repeatable,
    is_active: s.is_active,
    sort_order: s.sort_order,
  }
}

function novuStavku(sortOrder: number): StavkaForma {
  return {
    tempId: `nova-${Date.now()}`,
    title: '',
    description: '',
    emoji: '🎁',
    cost: 5,
    repeatable: false,
    is_active: true,
    sort_order: sortOrder,
  }
}

function validirajStavke(stavke: StavkaForma[]): string | null {
  for (const s of stavke) {
    if (!s.title.trim() || s.title.trim().length > 60) {
      return 'Naslov svake stavke mora imati 1–60 znakova.'
    }
    if (!Number.isFinite(s.cost) || s.cost <= 0) {
      return `Cena stavke „${s.title}” mora biti veća od 0.`
    }
    if (!s.emoji || s.emoji.length < 1 || s.emoji.length > 8) {
      return `Emoji stavke „${s.title}” mora imati 1–8 znakova.`
    }
  }
  return null
}

const TABOVI: Array<{ id: TabPodesavanja, naziv: string, ikona: string }> = [
  { id: 'profili', naziv: 'Profili dece', ikona: '👥' },
  { id: 'titule', naziv: 'Titule', ikona: '🏆' },
  { id: 'prodavnica', naziv: 'Prodavnica', ikona: '🛒' },
  { id: 'obavestenja', naziv: 'Obaveštenja', ikona: '🔔' },
]

export function Podesavanja() {
  const { session } = useAuth()
  const [ucitava, setUcitava] = useState(true)
  const [aktivanTab, setAktivanTab] = useState<TabPodesavanja>('profili')
  const [ukljucena, setUkljucena] = useState(true)
  const [profili, setProfili] = useState<ProfilDeteta[]>([])
  const [preglediProfila, setPreglediProfila] = useState<Record<string, JavniProfilPayload>>({})
  const [titleGroups, setTitleGroups] = useState<TitleGroup[]>([])
  const [forma, setForma] = useState<ProfilForma | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [poruka, setPoruka] = useState<string | null>(null)
  const [cuvaProfil, setCuvaProfil] = useState(false)
  const [cuvaTitule, setCuvaTitule] = useState(false)

  // Prodavnica — katalog i kupovine
  const [stavkeProdavnice, setStavkeProdavnice] = useState<StavkaForma[]>([])
  const [kupovine, setKupovine] = useState<KupovinaAdminPrikaz[]>([])
  const [filterKupovina, setFilterKupovina] = useState<'sve' | 'requested' | 'consumed' | 'cancelled'>('sve')
  const [cuvaKatalog, setCuvaKatalog] = useState(false)
  const [radiKupovinu, setRadiKupovinu] = useState(false)

  async function ucitajSve() {
    setUcitava(true)
    try {
      const [podesavanja, ucitaniProfili, ucitaniNivoi, stavke, ucitaneKupovine] = await Promise.all([
        ucitajPodesavanja(), listajProfileDeteta(), listajNivoeTitula(),
        listajStavkeProdavnice().catch(() => [] as StavkaProdavnice[]),
        listajKupovineProdavnice().catch(() => [] as KupovinaAdminPrikaz[]),
      ])
      setUkljucena(podesavanja?.email_notifications ?? true)
      setProfili(ucitaniProfili)
      setTitleGroups(groupTitleLevels(ucitaniNivoi))
      setStavkeProdavnice(stavke.map(stavkaUFormu))
      setKupovine(ucitaneKupovine)
      const pregledi = await Promise.all(ucitaniProfili.map(async (profil) => (
        [profil.id, await ucitajJavniProfil(profil.public_token)] as const
      )))
      setPreglediProfila(Object.fromEntries(pregledi))
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setUcitava(false)
    }
  }

  useEffect(() => { void ucitajSve() }, [])

  async function promeniEmail(vrednost: boolean) {
    if (!session) return
    setUkljucena(vrednost)
    setPoruka(null)
    setGreska(null)
    try {
      await postaviEmailObavestenja(session.user.id, vrednost)
      setPoruka('Mejl podešavanje je sačuvano.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    }
  }

  function noviProfil() {
    setForma({
      name: '',
      birth_date: '',
      avatar: '🧠',
      email: '',
      notify_new_quiz_email: true,
    })
    setGreska(null)
    setPoruka(null)
  }

  function urediProfil(profil: ProfilDeteta) {
    setForma({
      id: profil.id,
      name: profil.name,
      birth_date: profil.birth_date ?? '',
      avatar: profil.avatar,
      email: profil.email ?? '',
      notify_new_quiz_email: profil.notify_new_quiz_email,
    })
    setGreska(null)
    setPoruka(null)
  }

  async function sacuvajProfil() {
    if (!session || !forma) return
    if (!forma.name.trim()) {
      setGreska('Unesi ime deteta.')
      return
    }
    if (forma.birth_date && forma.birth_date > new Date().toISOString().slice(0, 10)) {
      setGreska('Datum rođenja ne može biti u budućnosti.')
      return
    }
    if (forma.email && !emailJeIspravan(forma.email)) {
      setGreska('Unesi ispravnu email adresu deteta.')
      return
    }
    setCuvaProfil(true)
    setGreska(null)
    try {
      await sacuvajProfilDeteta({
        owner_id: session.user.id,
        name: forma.name.trim(),
        birth_date: forma.birth_date || null,
        avatar: forma.avatar,
        email: forma.email ? normalizujEmail(forma.email) : null,
        notify_new_quiz_email: forma.notify_new_quiz_email,
      }, forma.id)
      setForma(null)
      await ucitajSve()
      setPoruka('Profil je sačuvan.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuvaProfil(false)
    }
  }

  async function kopirajProfilniLink(profil: ProfilDeteta) {
    await navigator.clipboard.writeText(`${BAZA_URL}#/dete/${profil.public_token}`)
    setPoruka(`Profilni link za ${profil.name} je kopiran.`)
  }

  function izmeniBazu(indeks: number, noviNaziv: string) {
    setTitleGroups((prethodni) =>
      prethodni.map((g, i) => (i === indeks ? { ...g, baseName: noviNaziv } : g))
    )
    setPoruka(null)
    setGreska(null)
  }

  function izmeniZvezdice(
    indeks: number,
    polje: 'awakened' | 'empowered' | 'unbound',
    vrednost: number
  ) {
    setTitleGroups((prethodni) =>
      prethodni.map((g, i) => {
        if (i !== indeks) return g
        if (polje === 'awakened') return { ...g, awakenedStars: vrednost }
        if (polje === 'empowered') return { ...g, empoweredStars: vrednost }
        return { ...g, unboundStars: vrednost }
      })
    )
    setPoruka(null)
    setGreska(null)
  }

  function izmeniAvatar(indeks: number, noviAvatar: string | null) {
    setTitleGroups((prethodni) =>
      prethodni.map((g, i) => (i === indeks ? { ...g, avatar: noviAvatar } : g))
    )
    setPoruka(null)
    setGreska(null)
  }

  function toggleExpand(indeks: number) {
    setTitleGroups((prethodni) =>
      prethodni.map((g, i) => (i === indeks ? { ...g, isExpanded: !g.isExpanded } : g))
    )
  }

  function dodajGrupu() {
    const maxZvezdica = titleGroups.length > 0
      ? Math.max(...titleGroups.map((g) => g.unboundStars))
      : -1
    const noviStart = maxZvezdica + 1

    const novaGrupa: TitleGroup = {
      id: `novi-${Date.now()}`,
      baseName: 'Nova titula',
      isExpanded: true,
      awakenedStars: noviStart,
      empoweredStars: noviStart + 2,
      unboundStars: noviStart + 4,
      avatar: null,
    }

    setTitleGroups((prethodni) => [...prethodni, novaGrupa])
    setPoruka(null)
    setGreska(null)
  }

  function obrisiGrupu(indeks: number) {
    setTitleGroups((prethodni) => prethodni.filter((_, i) => i !== indeks))
    setPoruka(null)
    setGreska(null)
  }

  async function sacuvajTitule() {
    setCuvaTitule(true)
    setGreska(null)
    setPoruka(null)

    const greskaValidacije = validateTitleGroups(titleGroups)
    if (greskaValidacije) {
      setGreska(greskaValidacije)
      setCuvaTitule(false)
      return
    }

    try {
      const flatSlanje = flattenTitleGroups(titleGroups)
      await sacuvajNivoeTitula(flatSlanje)
      await ucitajSve()
      setPoruka('Titule su sačuvane.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuvaTitule(false)
    }
  }

  // ---------- Prodavnica: katalog i kupovine ----------
  function dodajStavku() {
    const sledeciSort = stavkeProdavnice.length > 0
      ? Math.max(...stavkeProdavnice.map((s) => s.sort_order)) + 1
      : 0
    setStavkeProdavnice([...stavkeProdavnice, novuStavku(sledeciSort)])
    setGreska(null)
    setPoruka(null)
  }

  function izmeniStavku(tempId: string, izmene: Partial<StavkaForma>) {
    setStavkeProdavnice((prethodno) =>
      prethodno.map((s) => (s.tempId === tempId ? { ...s, ...izmene } : s))
    )
    setGreska(null)
    setPoruka(null)
  }

  function obrisiStavku(tempId: string) {
    setStavkeProdavnice((prethodno) => prethodno.filter((s) => s.tempId !== tempId))
    setGreska(null)
    setPoruka(null)
  }

  async function sacuvajKatalog() {
    setCuvaKatalog(true)
    setGreska(null)
    setPoruka(null)

    const greskaValidacije = validirajStavke(stavkeProdavnice)
    if (greskaValidacije) {
      setGreska(greskaValidacije)
      setCuvaKatalog(false)
      return
    }

    try {
      // save_shop_items je replace-all: šaljemo sve (uključujući neaktivne)
      // da bi istorija kupovina ostala povezana sa stavkama koje više nisu u ponudi.
      const payload = stavkeProdavnice.map((s, i) => ({
        title: s.title.trim(),
        description: s.description.trim() || null,
        emoji: s.emoji,
        cost: s.cost,
        repeatable: s.repeatable,
        is_active: s.is_active,
        sort_order: i,
      }))
      await sacuvajStavkeProdavnice(payload)
      await ucitajSve()
      setPoruka('Katalog prodavnice je sačuvan.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuvaKatalog(false)
    }
  }

  async function konzumiraj(kupovina: KupovinaAdminPrikaz) {
    setRadiKupovinu(true)
    setGreska(null)
    setPoruka(null)
    try {
      await oznaciKupovinuKonzumiranom(kupovina.id)
      await ucitajSve()
      setPoruka(`Kupovina „${kupovina.title}” za ${kupovina.childName} je označena kao ostvarena.`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadiKupovinu(false)
    }
  }

  async function otkazi(kupovina: KupovinaAdminPrikaz) {
    if (!window.confirm(
      `Otkaži kupovinu „${kupovina.title}” za ${kupovina.childName}? `
      + `${kupovina.cost}⭐ se vraća detetu u raspoloživi balans.`
    )) return
    setRadiKupovinu(true)
    setGreska(null)
    setPoruka(null)
    try {
      await otkaziKupovinu(kupovina.id)
      await ucitajSve()
      setPoruka(`Kupovina „${kupovina.title}” je otkazana; zvezdice su vraćene.`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setRadiKupovinu(false)
    }
  }

  function promeniTab(tab: TabPodesavanja) {
    setAktivanTab(tab)
    setForma(null)
    setGreska(null)
    setPoruka(null)
  }

  if (ucitava) return <Loader />

  return (
    <div className="sadrzaj sadrzaj--usko">
      <h1>Podešavanja</h1>
      {poruka && <p className="poruka poruka--uspeh razmak-gore">{poruka}</p>}
      {greska && <p className="poruka poruka--greska razmak-gore" role="alert">{greska}</p>}

      <div className="podesavanja-tabovi" role="tablist" aria-label="Sekcije podešavanja">
        {TABOVI.map((tab) => (
          <button
            key={tab.id}
            id={`podesavanja-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={aktivanTab === tab.id}
            aria-controls={`podesavanja-panel-${tab.id}`}
            className={`podesavanja-tab ${aktivanTab === tab.id ? 'podesavanja-tab--aktivan' : ''}`}
            onClick={() => promeniTab(tab.id)}
          >
            <span aria-hidden="true">{tab.ikona}</span>
            {tab.naziv}
          </button>
        ))}
      </div>

      {aktivanTab === 'profili' && (
      <section
        id="podesavanja-panel-profili" className="kartica podesavanja-panel"
        role="tabpanel" aria-labelledby="podesavanja-tab-profili"
      >
        <div className="red red--razmak">
          <div>
            <h2>Profili dece</h2>
            <p className="blago malo">Svako dete ima svoj stalni link sa kvizovima i rezultatima.</p>
          </div>
          <button type="button" className="dugme dugme--akcenat dugme--malo" onClick={noviProfil}>
            + Novi profil
          </button>
        </div>

        <div className="mreza-kartica razmak-gore">
          {profili.map((profil) => {
            const pregled = preglediProfila[profil.id]
            const istorija = pregled?.history ?? []

            return (
              <article key={profil.id} className="kartica profil-admin-kartica">
                <div className="red">
                  <span aria-hidden="true" style={{ fontSize: '2.2rem' }}>{profil.avatar}</span>
                  <div>
                    <h3>{profil.name}</h3>
                    <p className="malo blago">
                      {profil.birth_date
                        ? `Rođen/a ${new Date(`${profil.birth_date}T12:00:00`).toLocaleDateString('sr-Latn-RS')}`
                        : 'Datum rođenja nije unet'}
                    </p>
                    <p className="malo blago">
                      {profil.email ?? 'Email adresa nije uneta'}
                    </p>
                  </div>
                </div>
                <div className="red razmak-gore">
                  <span className="bedz">⭐ {pregled?.totalStars ?? 0} zvezdica</span>
                  <span className="bedz bedz--neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    {pregled?.currentTitle && (
                      <TitleAvatar
                        name={pregled.currentTitle.name}
                        avatar={pregled.currentTitle.avatar}
                        size={22}
                      />
                    )}
                    Titula: {pregled?.currentTitle?.name ?? '—'}
                  </span>
                </div>
                <div className="red razmak-gore">
                  <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => urediProfil(profil)}>
                    Uredi
                  </button>
                  <button type="button" className="dugme dugme--senka dugme--malo" onClick={() => kopirajProfilniLink(profil)}>
                    Kopiraj link
                  </button>
                </div>
                <details className="profil-admin-istorija">
                  <summary>
                    <span>Završeni kvizovi</span>
                    <span className="bedz">{istorija.length}</span>
                  </summary>
                  <div className="profil-admin-istorija-lista">
                    {pregled && !pregled.ok ? (
                      <p className="malo poruka poruka--greska">
                        Rezultati trenutno nisu dostupni.
                      </p>
                    ) : istorija.length === 0 ? (
                      <p className="malo blago">Još nema završenih kvizova.</p>
                    ) : istorija.map((rezultat) => (
                      <div className="profil-admin-rezultat" key={rezultat.attemptId}>
                        <div>
                          <strong>{rezultat.title}</strong>
                          <p className="malo blago">{formatDatum(rezultat.submittedAt)}</p>
                        </div>
                        {rezultat.pendingReview ? (
                          <span className="bedz bedz--upozorenje">Čeka pregled</span>
                        ) : (
                          <div className="profil-admin-rezultat-broj">
                            <span aria-label={`${rezultat.starsAwarded ?? 0} zvezdica`}>
                              {'⭐'.repeat(rezultat.starsAwarded ?? 0) || '☆'}
                            </span>
                            <strong>{formatProcenat(rezultat.scorePct)}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            )
          })}
        </div>

        {forma && (
          <div className="modal-pozadina" role="presentation" onClick={() => setForma(null)}>
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="profil-forma-naslov" onClick={(e) => e.stopPropagation()}>
              <h2 id="profil-forma-naslov">{forma.id ? 'Uredi profil' : 'Novi profil'}</h2>
              <div className="polje razmak-gore">
                <label htmlFor="pd-ime">Ime</label>
                <input
                  id="pd-ime" type="text" maxLength={60} autoFocus
                  value={forma.name} onChange={(e) => setForma({ ...forma, name: e.target.value })}
                />
              </div>
              <div className="polje">
                <label htmlFor="pd-datum">Datum rođenja (opciono)</label>
                <input
                  id="pd-datum" type="date" max={new Date().toISOString().slice(0, 10)}
                  value={forma.birth_date} onChange={(e) => setForma({ ...forma, birth_date: e.target.value })}
                />
              </div>
              <div className="polje">
                <label htmlFor="pd-email">Email deteta (opciono)</label>
                <input
                  id="pd-email" type="email" inputMode="email" autoCapitalize="none"
                  autoCorrect="off" maxLength={254} placeholder="ime@example.com"
                  value={forma.email}
                  onChange={(e) => setForma({ ...forma, email: e.target.value })}
                />
                <p className="malo blago">
                  Adresa je vidljiva samo administratoru i koristi se za nove kvizove.
                </p>
              </div>
              <label className="stiklir">
                <input
                  type="checkbox"
                  checked={forma.notify_new_quiz_email}
                  disabled={!forma.email.trim()}
                  onChange={(e) => setForma({
                    ...forma,
                    notify_new_quiz_email: e.target.checked,
                  })}
                />
                Podrazumevano pošalji mejl kada se dodeli novi kviz
              </label>
              <fieldset className="polje" style={{ border: 0 }}>
                <legend style={{ fontWeight: 700 }}>Avatar</legend>
                <div className="red" style={{ marginTop: '0.4rem' }}>
                  {AVATARI_DECE.map((avatar) => (
                    <label key={avatar} style={{ cursor: 'pointer' }}>
                      <input
                        className="sr-only" type="radio" name="avatar" value={avatar}
                        checked={forma.avatar === avatar}
                        onChange={() => setForma({ ...forma, avatar })}
                      />
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14,
                          fontSize: '1.8rem', border: forma.avatar === avatar ? '3px solid var(--boja-primarna)' : '2px solid var(--boja-ivica)',
                          background: 'var(--boja-polje)',
                        }}
                      >
                        {avatar}
                      </span>
                      <span className="sr-only">Avatar {avatar}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="red red--kraj razmak-gore">
                <button type="button" className="dugme dugme--senka" onClick={() => setForma(null)}>Otkaži</button>
                <button type="button" className="dugme dugme--akcenat" disabled={cuvaProfil} onClick={sacuvajProfil}>
                  {cuvaProfil ? 'Čuvam…' : 'Sačuvaj profil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {aktivanTab === 'titule' && (
      <section
        id="podesavanja-panel-titule" className="kartica podesavanja-panel"
        role="tabpanel" aria-labelledby="podesavanja-tab-titule"
      >
        <h2>Titule i podtitule</h2>
        <p className="blago razmak-dole">
          Ista lista važi za svu decu. Prva titula mora kretati od 0 zvezdica. Svaka titula ima tri ranga čije poene (zvezdice) podešavaš ispod.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {titleGroups.map((grupa, indeks) => {
            const isFirstGroup = indeks === 0
            return (
              <div
                className={`titula-grupa ${grupa.isExpanded ? 'titula-grupa--otvorena' : ''}`}
                key={grupa.id}
              >
                <div
                  className="titula-grupa-zaglavlje"
                  onClick={() => toggleExpand(indeks)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span className={`titula-grupa-strelica ${grupa.isExpanded ? 'titula-grupa-strelica--otvorena' : ''}`}>
                      ▶
                    </span>
                    <div className="polje" style={{ marginBottom: 0, flex: 1 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="Npr. Istraživač"
                        maxLength={40}
                        value={grupa.baseName}
                        onChange={(e) => izmeniBazu(indeks, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="dugme dugme--malo dugme--senka"
                      style={{ margin: 0 }}
                      onClick={() => toggleExpand(indeks)}
                    >
                      {grupa.isExpanded ? 'Sakrij' : 'Podtitule'}
                    </button>
                    <button
                      type="button"
                      className="dugme dugme--opasno dugme--malo"
                      style={{ margin: 0 }}
                      disabled={titleGroups.length === 1}
                      onClick={() => obrisiGrupu(indeks)}
                    >
                      Obriši
                    </button>
                  </div>
                </div>

                {grupa.isExpanded && (
                  <div className="titula-grupa-sadrzaj">
                    {/* Avatar sekcija */}
                    <div className="titula-avatar-podesavanje" style={{ padding: '1rem', borderBottom: '1px solid var(--boja-ivica)', background: 'var(--boja-polje)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <p className="malo blago" style={{ fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.6rem' }}>Avatar i izgled titule</p>
                      
                      {/* Previews */}
                      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <TitleAvatar name={`${grupa.baseName || 'Nova titula'} Awakened`} avatar={grupa.avatar} size={64} />
                          <p className="malo blago" style={{ marginTop: '0.2rem' }}>Awakened</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <TitleAvatar name={`${grupa.baseName || 'Nova titula'} Empowered`} avatar={grupa.avatar} size={64} />
                          <p className="malo blago" style={{ marginTop: '0.2rem' }}>Empowered</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <TitleAvatar name={`${grupa.baseName || 'Nova titula'} Unbound`} avatar={grupa.avatar} size={64} />
                          <p className="malo blago" style={{ marginTop: '0.2rem' }}>Unbound</p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          id={`avatar-upload-${indeks}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = (event) => {
                              const img = new Image()
                              img.onload = () => {
                                const canvas = document.createElement('canvas')
                                const ctx = canvas.getContext('2d')
                                const maxDim = 256
                                let width = img.width
                                let height = img.height
                                if (width > maxDim || height > maxDim) {
                                  if (width > height) {
                                    height = Math.round((height * maxDim) / width)
                                    width = maxDim
                                  } else {
                                    width = Math.round((width * maxDim) / height)
                                    height = maxDim
                                  }
                                }
                                canvas.width = width
                                canvas.height = height
                                ctx?.drawImage(img, 0, 0, width, height)
                                const base64 = canvas.toDataURL('image/png')
                                izmeniAvatar(indeks, base64)
                              }
                              img.src = event.target?.result as string
                            }
                            reader.readAsDataURL(file)
                          }}
                        />
                        <button
                          type="button"
                          className="dugme dugme--malo dugme--senka"
                          onClick={() => document.getElementById(`avatar-upload-${indeks}`)?.click()}
                        >
                          📁 Izaberi sliku...
                        </button>

                        <div className="polje" style={{ marginBottom: 0, minWidth: '150px', flex: '1' }}>
                          <input
                            type="text"
                            placeholder="Ili unesi emoji / URL slike"
                            value={grupa.avatar || ''}
                            onChange={(e) => izmeniAvatar(indeks, e.target.value || null)}
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.9rem' }}
                          />
                        </div>

                        {grupa.avatar && (
                          <button
                            type="button"
                            className="dugme dugme--malo"
                            onClick={() => izmeniAvatar(indeks, null)}
                            style={{ background: 'var(--boja-ivica)', color: 'var(--boja-tekst)' }}
                          >
                            Resetuj na fabričku sliku
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="titula-podtitula-red">
                      <span className="titula-podtitula-ime">
                        <OznakaRangaTitule rang="Awakened" /> {grupa.baseName || 'Nova titula'} Awakened
                      </span>
                      <div className="titula-podtitula-unos">
                        {isFirstGroup ? (
                          <span className="titula-podtitula-opseg">(Zaključano na 0)</span>
                        ) : (
                          <span className="titula-podtitula-opseg">
                            (Opseg: &gt; {indeks > 0 ? titleGroups[indeks - 1].unboundStars : 0})
                          </span>
                        )}
                        <input
                          type="number"
                          min={0}
                          value={grupa.awakenedStars}
                          disabled={isFirstGroup}
                          onChange={(e) => izmeniZvezdice(indeks, 'awakened', Number(e.target.value))}
                          style={{ width: '70px', padding: '0.25rem 0.4rem', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    <div className="titula-podtitula-red">
                      <span className="titula-podtitula-ime">
                        <OznakaRangaTitule rang="Empowered" /> {grupa.baseName || 'Nova titula'} Empowered
                      </span>
                      <div className="titula-podtitula-unos">
                        <span className="titula-podtitula-opseg">
                          (Opseg: {grupa.awakenedStars + 1} - {grupa.unboundStars - 1})
                        </span>
                        <input
                          type="number"
                          min={grupa.awakenedStars + 1}
                          value={grupa.empoweredStars}
                          onChange={(e) => izmeniZvezdice(indeks, 'empowered', Number(e.target.value))}
                          style={{ width: '70px', padding: '0.25rem 0.4rem', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                    </div>

                    <div className="titula-podtitula-red">
                      <span className="titula-podtitula-ime">
                        <OznakaRangaTitule rang="Unbound" /> {grupa.baseName || 'Nova titula'} Unbound
                      </span>
                      <div className="titula-podtitula-unos">
                        <span className="titula-podtitula-opseg">
                          (Opseg: &gt; {grupa.empoweredStars})
                        </span>
                        <input
                          type="number"
                          min={grupa.empoweredStars + 1}
                          value={grupa.unboundStars}
                          onChange={(e) => izmeniZvezdice(indeks, 'unbound', Number(e.target.value))}
                          style={{ width: '70px', padding: '0.25rem 0.4rem', borderRadius: '4px', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="red razmak-gore">
          <button type="button" className="dugme dugme--senka" onClick={dodajGrupu}>+ Dodaj titulu</button>
          <button type="button" className="dugme" disabled={cuvaTitule} onClick={sacuvajTitule}>
            {cuvaTitule ? 'Čuvam…' : 'Sačuvaj titule'}
          </button>
        </div>
      </section>
      )}

      {aktivanTab === 'prodavnica' && (
      <section
        id="podesavanja-panel-prodavnica" className="kartica podesavanja-panel"
        role="tabpanel" aria-labelledby="podesavanja-tab-prodavnica"
      >
        <div className="red red--razmak">
          <div>
            <h2>Katalog nagrada</h2>
            <p className="blago malo">
              Dete kupuje nagrade za osvojene zvezdice. Jednokratne se kupuju jednom;
              ponavljajuće može da kupi ponovo tek kad označiš da je prethodna ostvarena.
            </p>
          </div>
          <button type="button" className="dugme dugme--akcenat dugme--malo" onClick={dodajStavku}>
            + Nova stavka
          </button>
        </div>

        <div className="prodavnica-katalog razmak-gore" style={{ display: 'grid', gap: '0.6rem' }}>
          {stavkeProdavnice.length === 0 ? (
            <p className="blago">Još nema stavki. Dodaj prvu nagradu gore.</p>
          ) : stavkeProdavnice.map((stavka) => (
            <div
              key={stavka.tempId}
              className={`prodavnica-stavka-red ${stavka.is_active ? '' : 'prodavnica-stavka-red--neaktivna'}`}
            >
              <input
                type="text"
                className="prodavnica-stavka-emoji-unos"
                maxLength={8}
                value={stavka.emoji}
                aria-label="Emoji"
                onChange={(e) => izmeniStavku(stavka.tempId, { emoji: e.target.value })}
              />
              <div style={{ display: 'grid', gap: '0.35rem' }}>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="Naslov (npr. Sladoled)"
                  value={stavka.title}
                  aria-label="Naslov"
                  onChange={(e) => izmeniStavku(stavka.tempId, { title: e.target.value })}
                />
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="Kratak opis (opciono)"
                  value={stavka.description}
                  aria-label="Opis"
                  onChange={(e) => izmeniStavku(stavka.tempId, { description: e.target.value })}
                />
              </div>
              <input
                type="number"
                min={1}
                className="prodavnica-stavka-cena-unos"
                aria-label="Cena u zvezdicama"
                value={stavka.cost}
                onChange={(e) => izmeniStavku(stavka.tempId, { cost: Number(e.target.value) })}
              />
              <div className="prodavnica-stavka-ponavlja">
                <label className="stiklir">
                  <input
                    type="checkbox"
                    checked={stavka.repeatable}
                    onChange={(e) => izmeniStavku(stavka.tempId, { repeatable: e.target.checked })}
                  />
                  Ponavljajuća
                </label>
                <label className="stiklir">
                  <input
                    type="checkbox"
                    checked={stavka.is_active}
                    onChange={(e) => izmeniStavku(stavka.tempId, { is_active: e.target.checked })}
                  />
                  Aktivna
                </label>
              </div>
              <button
                type="button"
                className="dugme dugme--opasno dugme--malo"
                onClick={() => obrisiStavku(stavka.tempId)}
              >
                Obriši
              </button>
            </div>
          ))}
        </div>

        <div className="red razmak-gore">
          <button type="button" className="dugme" disabled={cuvaKatalog} onClick={sacuvajKatalog}>
            {cuvaKatalog ? 'Čuvam…' : 'Sačuvaj katalog'}
          </button>
        </div>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--boja-ivica)', paddingTop: '1.2rem' }}>
          <h2>Kupovine dece</h2>
          <p className="blago malo">
            Označi nagradu kao ostvarenu kada je isporučiš detetu. Otkazivanje vraća potrošene
            zvezdice u detetov raspoloživi balans.
          </p>

          <div className="prodavnica-filteri razmak-gore" role="group" aria-label="Filter po statusu">
            {([
              ['sve', 'Sve'],
              ['requested', 'Čeka isporuku'],
              ['consumed', 'Ostvarene'],
              ['cancelled', 'Otkazane'],
            ] as const).map(([id, naziv]) => {
              const broj = id === 'sve'
                ? kupovine.length
                : kupovine.filter((k) => k.status === id).length
              return (
                <button
                  key={id}
                  type="button"
                  className={`dugme dugme--malo ${filterKupovina === id ? 'dugme--akcenat' : 'dugme--senka'}`}
                  onClick={() => setFilterKupovina(id)}
                >
                  {naziv} ({broj})
                </button>
              )
            })}
          </div>

          <div className="prodavnica-kupovine razmak-gore">
            {kupovine.filter((k) => filterKupovina === 'sve' || k.status === filterKupovina).length === 0 ? (
              <p className="blago">Nema kupovina u ovoj kategoriji.</p>
            ) : kupovine
              .filter((k) => filterKupovina === 'sve' || k.status === filterKupovina)
              .map((kupovina) => (
                <div key={kupovina.id} className="prodavnica-kupovina">
                  <div className="prodavnica-kupovina-detepregled">
                    <span aria-hidden="true" style={{ fontSize: '1.6rem' }}>{kupovina.childAvatar}</span>
                    <div>
                      <strong>{kupovina.childName}</strong>
                      <p className="malo blago">
                        {formatDatum(kupovina.requestedAt)}
                        {kupovina.consumedAt && ` · ostvareno ${formatDatum(kupovina.consumedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <span className="prodavnica-kupovina-emoji" aria-hidden="true">{kupovina.emoji}</span>
                    <div>
                      <strong>{kupovina.title}</strong>
                      <p className="malo blago">
                        {kupovina.cost}⭐
                        {kupovina.isRepeatable && ' · ponavljajuća'}
                      </p>
                    </div>
                  </div>
                  <div className="prodavnica-kupovina-akcije">
                    {kupovina.status === 'requested' && (
                      <span className="bedz bedz--upozorenje">Čeka isporuku</span>
                    )}
                    {kupovina.status === 'consumed' && (
                      <span className="bedz bedz--uspeh">Ostvareno</span>
                    )}
                    {kupovina.status === 'cancelled' && (
                      <span className="bedz bedz--neutral">Otkazano</span>
                    )}
                    {kupovina.status === 'requested' && (
                      <button
                        type="button"
                        className="dugme dugme--akcenat dugme--malo"
                        disabled={radiKupovinu}
                        onClick={() => konzumiraj(kupovina)}
                      >
                        Označi ostvarenom
                      </button>
                    )}
                    {(kupovina.status === 'requested' || kupovina.status === 'consumed') && (
                      <button
                        type="button"
                        className="dugme dugme--senka dugme--malo"
                        disabled={radiKupovinu}
                        onClick={() => otkazi(kupovina)}
                      >
                        Otkaži
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>
      )}

      {aktivanTab === 'obavestenja' && (
      <section
        id="podesavanja-panel-obavestenja" className="kartica podesavanja-panel"
        role="tabpanel" aria-labelledby="podesavanja-tab-obavestenja"
      >
        <h2>Mejl obaveštenja</h2>
        <p className="blago razmak-dole">
          Kada dete završi kviz, na tvoju email adresu stiže obaveštenje sa rezultatom.
        </p>
        <label className="stiklir">
          <input type="checkbox" checked={ukljucena} onChange={(e) => promeniEmail(e.target.checked)} />
          Pošalji mi mejl kada dete završi kviz
        </label>
        <div className="podesavanja-push razmak-gore">
          <h2>Obaveštenja na uređaju</h2>
          <p className="blago razmak-dole">
            Uključi sistemsko obaveštenje kada dete završi kviz. Podešavanje važi samo
            za ovaj pregledač ili instaliranu aplikaciju.
          </p>
          <PushKontrole />
        </div>
      </section>
      )}
    </div>
  )
}
