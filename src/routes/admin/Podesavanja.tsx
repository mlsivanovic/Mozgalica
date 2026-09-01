// Administratorska podešavanja: profili dece, šah, titule, prodavnica i obaveštenja.
import { useEffect, useState } from 'react'
import { PushKontrole } from '../../components/PushKontrole'
import { Loader } from '../../components/Zajednicke'
import { IkonaNagrade } from '../../components/IkonaNagrade'
import { OznakaRangaTitule, TitleAvatar } from '../../components/TitleAvatar'
import {
  listajKupovineProdavnice, listajNivoeTitula, listajProfileDeteta, listajStavkeProdavnice,
  obrisiProfilDeteta, oznaciKupovinuKonzumiranom, otkaziKupovinu, postaviEmailObavestenja,
  sacuvajNivoeTitula, sacuvajProfilDeteta, sacuvajSahNagrade, sacuvajStavkeProdavnice,
  ucitajJavniProfil, ucitajPodesavanja, ucitajSahNagrade, type KupovinaAdminPrikaz,
} from '../../lib/api'
import { useRoditelj } from '../../lib/roditelj'
import { useAuth } from '../../lib/auth'
import { emailJeIspravan, normalizujEmail } from '../../lib/email'
import { formatDatum, formatProcenat } from '../../lib/format'
import { validirajSahNagrade } from '../../sah/nagrade'
import {
  AVATARI_DECE, type AvatarDeteta, type NivoTitule, type ProfilDeteta,
  type SahNagradaPodesavanje, type StavkaProdavnice,
} from '../../types/db'
import type { JavniProfilPayload } from '../../types/kviz'
import { izborTeme, postaviIzborTeme, type IzborTeme } from '../../lib/tema'
import { Ikona } from '../../components/Ikona'
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

type TabPodesavanja = 'profili' | 'sah' | 'titule' | 'prodavnica' | 'obavestenja'

// Lokalna (ne-sačuvana) stavka kataloga — privremeni id se koristi samo za React key.
interface StavkaForma {
  tempId: string
  title: string
  description: string
  emoji: string
  icon_url: string
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
    icon_url: s.icon_url ?? '',
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
    icon_url: '',
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
    if (s.icon_url.trim()) {
      try {
        const url = new URL(s.icon_url.trim())
        if (url.protocol !== 'https:') throw new Error('Nije HTTPS')
      } catch {
        return `Ikonica stavke „${s.title}” mora imati ispravnu HTTPS adresu slike.`
      }
    }
  }
  return null
}

type Sekcija = 'profili' | 'pravila' | 'isporuka' | 'istorija' | 'katalog' | 'obavestenja'
export function Podesavanja({ sekcija = 'obavestenja' }: { sekcija?: Sekcija }) {
  const { session, odjavi } = useAuth()
  const { deteId, osveziProfile, izaberiDete } = useRoditelj()
  const [pravilo, setPravilo] = useState<TabPodesavanja>('titule')
  const aktivanTab = sekcija === 'pravila' ? pravilo : ['isporuka', 'istorija', 'katalog'].includes(sekcija) ? 'prodavnica' : sekcija
  const [ucitava, setUcitava] = useState(true)
  const [ukljucena, setUkljucena] = useState(true)
  const [izgled, setIzgled] = useState<IzborTeme>(izborTeme)
  const [profili, setProfili] = useState<ProfilDeteta[]>([])
  const [preglediProfila, setPreglediProfila] = useState<Record<string, JavniProfilPayload>>({})
  const [titleGroups, setTitleGroups] = useState<TitleGroup[]>([])
  const [forma, setForma] = useState<ProfilForma | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [poruka, setPoruka] = useState<string | null>(null)
  const [cuvaProfil, setCuvaProfil] = useState(false)
  const [briseProfil, setBriseProfil] = useState<string | null>(null)
  const [cuvaTitule, setCuvaTitule] = useState(false)
  const [sahNagrade, setSahNagrade] = useState<SahNagradaPodesavanje[]>([])
  const [cuvaSahNagrade, setCuvaSahNagrade] = useState(false)

  // Prodavnica — katalog i kupovine
  const [stavkeProdavnice, setStavkeProdavnice] = useState<StavkaForma[]>([])
  const [kupovine, setKupovine] = useState<KupovinaAdminPrikaz[]>([])
  const [filterKupovina, setFilterKupovina] = useState<'sve' | 'requested' | 'consumed' | 'cancelled'>('sve')
  const [cuvaKatalog, setCuvaKatalog] = useState(false)
  const [radiKupovinu, setRadiKupovinu] = useState(false)

  const [ucitano, setUcitano] = useState(false)
  async function ucitajSve() {
    setGreska(null)
    setUcitava(true)
    try {
      if (sekcija === 'profili') {
        const ucitaniProfili = await listajProfileDeteta()
        setProfili(ucitaniProfili)
        const pregledi = await Promise.all(ucitaniProfili.map(async profil => [profil.id, await ucitajJavniProfil(profil.public_token)] as const))
        setPreglediProfila(Object.fromEntries(pregledi))
      } else if (sekcija === 'pravila') {
        const [nivoi, nagrade] = await Promise.all([listajNivoeTitula(), ucitajSahNagrade()])
        setTitleGroups(groupTitleLevels(nivoi)); setSahNagrade(nagrade)
      } else if (sekcija === 'katalog') {
        setStavkeProdavnice((await listajStavkeProdavnice()).map(stavkaUFormu))
      } else if (sekcija === 'isporuka' || sekcija === 'istorija') {
        setKupovine(await listajKupovineProdavnice())
      } else {
        setUkljucena((await ucitajPodesavanja())?.email_notifications ?? true)
      }
      setUcitano(true)
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
      await osveziProfile()
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

  async function obrisiProfil(profil: ProfilDeteta) {
    if (!confirm(
      `Obrisati profil „${profil.name}”? Ukloniće se dečji link, rezultati kvizova, šahovske partije, rasporedi i nagrade tog deteta. Sadržaj kvizova ostaje u arhivi.`,
    )) return
    setBriseProfil(profil.id)
    setGreska(null)
    setPoruka(null)
    try {
      await obrisiProfilDeteta(profil.id)
      if (forma?.id === profil.id) setForma(null)
      if (deteId === profil.id) izaberiDete('')
      await ucitajSve()
      await osveziProfile()
      setPoruka(`Profil „${profil.name}” je obrisan.`)
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setBriseProfil(null)
    }
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

  function izmeniSahNagradu(
    elo: SahNagradaPodesavanje['approximate_elo'],
    polje: 'win_stars' | 'draw_stars',
    vrednost: number,
  ) {
    setSahNagrade((prethodne) => prethodne.map((nagrada) => (
      nagrada.approximate_elo === elo ? { ...nagrada, [polje]: vrednost } : nagrada
    )))
    setPoruka(null)
    setGreska(null)
  }

  async function sacuvajNagradeZaSah() {
    const zaCuvanje = sahNagrade.map((nagrada) => ({
      approximate_elo: nagrada.approximate_elo,
      win_stars: nagrada.win_stars,
      draw_stars: nagrada.draw_stars,
    }))
    const greskaValidacije = validirajSahNagrade(zaCuvanje)
    if (greskaValidacije) {
      setGreska(greskaValidacije)
      return
    }

    setCuvaSahNagrade(true)
    setGreska(null)
    setPoruka(null)
    try {
      await sacuvajSahNagrade(zaCuvanje)
      await ucitajSve()
      setPoruka('Šahovske nagrade su sačuvane.')
    } catch (e) {
      setGreska(String((e as Error).message ?? e))
    } finally {
      setCuvaSahNagrade(false)
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
        icon_url: s.icon_url.trim() || null,
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
    setPravilo(tab)
    setForma(null)
    setGreska(null)
    setPoruka(null)
  }

  const prikazaneKupovine = kupovine.filter(k => (!deteId || k.childProfileId === deteId)
    && (sekcija === 'isporuka' ? k.status === 'requested' : k.status !== 'requested'))
  if (ucitava) return <Loader />
  if (!ucitano && greska) return <div role="alert" className="poruka poruka--greska">{greska} <button className="dugme" onClick={() => void ucitajSve()}>Pokušaj ponovo</button></div>

  return (
    <div className="sadrzaj">
      {sekcija === 'profili' ? <h1>Upravljaj decom</h1> : sekcija === 'pravila' ? <h1>Titule i pravila za zvezdice</h1> : sekcija === 'obavestenja' ? <h1>Podešavanja aplikacije</h1> : null}
      {poruka && <p className="poruka poruka--uspeh razmak-gore">{poruka}</p>}
      {greska && <p className="poruka poruka--greska razmak-gore" role="alert">{greska}</p>}

      {sekcija === 'pravila' && <div className="red razmak-gore razmak-dole" role="group" aria-label="Pravila nagrađivanja">
        <button className="dugme dugme--senka" aria-pressed={pravilo === 'titule'} onClick={() => promeniTab('titule')}>Titule</button>
        <button className="dugme dugme--senka" aria-pressed={pravilo === 'sah'} onClick={() => promeniTab('sah')}>Zvezdice za šah</button>
      </div>}

      {aktivanTab === 'profili' && (
      <section
        id="podesavanja-panel-profili" className="kartica podesavanja-panel"
        aria-label="profili"
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

        {profili.length === 0 && (
          <p className="blago razmak-gore">Još nema profila. Dodaj dete da dobije svoj link, kvizove i nagrade.</p>
        )}

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
                  <span className="bedz" title="Doživotne zvezdice — hrane titulu">
                    ⭐ {pregled?.totalStars ?? 0} zvezdica
                  </span>
                  <span className="bedz bedz--neutral" title="Raspoloživo za trošenje u prodavnici">
                    🛒 {pregled?.spendableStars ?? 0} raspoloživo
                  </span>
                  {(pregled?.activeQuizzes?.length ?? 0) > 0 && (
                    <span className="bedz bedz--upozorenje" title="Dodeljeni kvizovi koji čekaju rešavanje">
                      📝 {pregled?.activeQuizzes?.length} aktivno
                    </span>
                  )}
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
                  <button
                    type="button"
                    className="dugme dugme--opasno dugme--malo"
                    disabled={briseProfil === profil.id}
                    onClick={() => { void obrisiProfil(profil) }}
                  >
                    {briseProfil === profil.id ? 'Brišem…' : 'Obriši'}
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
              <div className="red red--razmak razmak-gore">
                {forma.id ? (
                  <button
                    type="button"
                    className="dugme dugme--opasno"
                    disabled={cuvaProfil || briseProfil === forma.id}
                    onClick={() => {
                      const profil = profili.find((p) => p.id === forma.id)
                      if (profil) void obrisiProfil(profil)
                    }}
                  >
                    {briseProfil === forma.id ? 'Brišem…' : 'Obriši profil'}
                  </button>
                ) : <span />}
                <div className="red">
                  <button type="button" className="dugme dugme--senka" onClick={() => setForma(null)}>Otkaži</button>
                  <button type="button" className="dugme dugme--akcenat" disabled={cuvaProfil} onClick={sacuvajProfil}>
                    {cuvaProfil ? 'Čuvam…' : 'Sačuvaj profil'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {aktivanTab === 'sah' && (
      <section
        id="podesavanja-panel-sah" className="kartica podesavanja-panel"
        aria-label="sah"
      >
        <h2>Nagrade za šah</h2>
        <p className="blago">
          Odredi koliko zvezdica dete dobija kada pobedi ili odigra remi protiv svakog ELO nivoa.
          Izmene važe za partije završene nakon čuvanja; raniji rezultati ostaju nepromenjeni.
        </p>
        <p className="poruka sah-nagrade-napomena razmak-gore">
          Pobeda može doneti 0–10 ⭐, remi 0–5 ⭐, a poraz uvek donosi 0 zvezdica.
        </p>

        <div className="sah-nagrade razmak-gore" role="table" aria-label="Šahovske nagrade po ELO nivou">
          <div className="sah-nagrade-red sah-nagrade-zaglavlje" role="row">
            <span role="columnheader">Težina</span>
            <span role="columnheader">Pobeda</span>
            <span role="columnheader">Remi</span>
          </div>
          {sahNagrade.map((nagrada) => (
            <div className="sah-nagrade-red" role="row" key={nagrada.approximate_elo}>
              <div className="sah-nagrade-elo" role="cell">
                <span className="malo blago">Nivo računara</span>
                <strong>ELO {nagrada.approximate_elo}</strong>
              </div>
              <label className="sah-nagrada-polje" role="cell">
                <span>Pobeda</span>
                <span className="sah-nagrada-unos">
                  <input
                    type="number" min={0} max={10} step={1} inputMode="numeric"
                    aria-label={`Zvezdice za pobedu na ELO ${nagrada.approximate_elo}`}
                    value={nagrada.win_stars}
                    onChange={(e) => izmeniSahNagradu(nagrada.approximate_elo, 'win_stars', Number(e.target.value))}
                  />
                  <span aria-hidden="true">⭐</span>
                </span>
              </label>
              <label className="sah-nagrada-polje" role="cell">
                <span>Remi</span>
                <span className="sah-nagrada-unos">
                  <input
                    type="number" min={0} max={5} step={1} inputMode="numeric"
                    aria-label={`Zvezdice za remi na ELO ${nagrada.approximate_elo}`}
                    value={nagrada.draw_stars}
                    onChange={(e) => izmeniSahNagradu(nagrada.approximate_elo, 'draw_stars', Number(e.target.value))}
                  />
                  <span aria-hidden="true">⭐</span>
                </span>
              </label>
            </div>
          ))}
        </div>

        <button
          type="button" className="dugme razmak-gore"
          disabled={cuvaSahNagrade || sahNagrade.length === 0}
          onClick={() => void sacuvajNagradeZaSah()}
        >
          {cuvaSahNagrade ? 'Čuvam…' : 'Sačuvaj šahovske nagrade'}
        </button>
      </section>
      )}

      {aktivanTab === 'titule' && (
      <section
        id="podesavanja-panel-titule" className="kartica podesavanja-panel"
        aria-label="titule"
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
        aria-label="prodavnica"
      >
        {sekcija === 'katalog' && <>
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
            <details key={stavka.tempId} className="roditelj-katalog-stavka" open={stavka.tempId.startsWith('nova-') || undefined}>
              <summary><span>{stavka.emoji} <strong>{stavka.title || 'Nova nagrada'}</strong></span><span>{stavka.cost} ⭐ · {stavka.is_active ? 'Aktivna' : 'Neaktivna'} · Uredi</span></summary>
              <div className="prodavnica-stavka-red">
              <div className="prodavnica-stavka-ikona">
                <IkonaNagrade
                  iconUrl={stavka.icon_url}
                  emoji={stavka.emoji}
                  className="prodavnica-stavka-emoji-pregled"
                />
                <label className="prodavnica-stavka-emoji-polje">
                  <span>Emoji rezerva</span>
                  <input
                    type="text"
                    className="prodavnica-stavka-emoji-unos"
                    maxLength={8}
                    value={stavka.emoji}
                    aria-label="Emoji rezerva"
                    onChange={(e) => izmeniStavku(stavka.tempId, { emoji: e.target.value })}
                  />
                </label>
              </div>
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
                <input
                  type="url"
                  maxLength={2048}
                  inputMode="url"
                  placeholder="https://…/ikonica.png (opciono)"
                  value={stavka.icon_url}
                  aria-label="HTTPS adresa ikonice"
                  onChange={(e) => izmeniStavku(stavka.tempId, { icon_url: e.target.value })}
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
            </details>
          ))}
        </div>

        <div className="red razmak-gore">
          <button type="button" className="dugme" disabled={cuvaKatalog} onClick={sacuvajKatalog}>
            {cuvaKatalog ? 'Čuvam…' : 'Sačuvaj katalog'}
          </button>
        </div>

        </>}
        {sekcija !== 'katalog' && (
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--boja-ivica)', paddingTop: '1.2rem' }}>
          <h2>{sekcija === 'isporuka' ? 'Za isporuku' : 'Istorija nagrada'}</h2>
          <p className="blago malo">
            Označi nagradu kao ostvarenu kada je isporučiš detetu. Otkazivanje vraća potrošene
            zvezdice u detetov raspoloživi balans.
          </p>

          <div hidden={sekcija === 'isporuka'} className="prodavnica-filteri razmak-gore" role="group" aria-label="Filter po statusu">
            {([
              ['sve', 'Sve'],

              ['consumed', 'Ostvarene'],
              ['cancelled', 'Otkazane'],
            ] as const).map(([id, naziv]) => {
              const broj = id === 'sve'
                ? prikazaneKupovine.length
                : prikazaneKupovine.filter((k) => k.status === id).length
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
            {prikazaneKupovine.filter((k) => filterKupovina === 'sve' || k.status === filterKupovina).length === 0 ? (
              <p className="blago">Nema kupovina u ovoj kategoriji.</p>
            ) : prikazaneKupovine
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
                    <IkonaNagrade
                      iconUrl={kupovina.iconUrl}
                      emoji={kupovina.emoji}
                      className="prodavnica-kupovina-emoji"
                    />
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
        )}
      </section>
      )}

      {aktivanTab === 'obavestenja' && (
      <section
        id="podesavanja-panel-obavestenja" className="kartica podesavanja-panel"
        aria-label="obavestenja"
      >
        <h2>Izgled</h2>
        <p className="blago razmak-dole">Izaberi temu ili prepusti aplikaciji da prati podešavanje telefona.</p>
        <div className="podesavanja-tema" role="radiogroup" aria-label="Tema aplikacije">
          {([['sistem','izgled','Sistem'],['svetla','svetla','Svetla'],['tamna','tamna','Tamna']] as const).map(([vrednost,ikona,naziv]) => <button
            key={vrednost} type="button" role="radio" aria-checked={izgled === vrednost}
            className={izgled === vrednost ? 'aktivna' : ''}
            onClick={() => { setIzgled(vrednost); postaviIzborTeme(vrednost) }}
          ><Ikona ime={ikona} />{naziv}</button>)}
        </div>
        <div className="roditelj-sekcija">
        <h2>Mejl obaveštenja</h2>
        <p className="blago razmak-dole">
          Kada dete završi kviz, na tvoju email adresu stiže obaveštenje sa rezultatom.
        </p>
        <label className="stiklir">
          <input type="checkbox" checked={ukljucena} onChange={(e) => promeniEmail(e.target.checked)} />
          Pošalji mi mejl kada dete završi kviz
        </label>
        </div>
        <div className="podesavanja-push razmak-gore">
          <h2>Obaveštenja na uređaju</h2>
          <p className="blago razmak-dole">
            Uključi sistemsko obaveštenje kada dete završi kviz. Podešavanje važi samo
            za ovaj pregledač ili instaliranu aplikaciju.
          </p>
          <PushKontrole />
        </div>
        <div className="roditelj-sekcija"><h2>Nalog</h2><button className="dugme dugme--senka" onClick={() => void odjavi()}>Odjavi se</button></div>
      </section>
      )}
    </div>
  )
}
