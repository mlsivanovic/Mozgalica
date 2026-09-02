// Školski raspored časova: satnica, smene i trenutni čas. Zona je uvek Beograd.

export const ZONA_RASPOREDA = 'Europe/Belgrade'
export type SmenaCasova = 'morning' | 'afternoon'
export type RezimRotacije = 'fixed' | 'alternating'

export interface SatnicaCasa {
  periodNo: number
  startsAt: string
  endsAt: string
}

export interface SlotRasporedaCasova {
  id?: string
  shift: SmenaCasova | null
  weekday: number
  periodNo: number
  subject: string
  teacher: string | null
  room: string | null
  color: string | null
  note: string | null
}

export interface CasUDanu {
  periodNo: number
  startsAt: string
  endsAt: string
  subject: string
  teacher: string | null
  room: string | null
  color: string | null
  note: string | null
  isCurrent: boolean
  isNext: boolean
}

export const PRETCAS_PREPODNE: SatnicaCasa = { periodNo: 0, startsAt: '07:10', endsAt: '07:55' }
export const PRETCAS_POPODNE: SatnicaCasa = { periodNo: 0, startsAt: '13:10', endsAt: '13:55' }

export const SATNICA_PREPODNE: SatnicaCasa[] = [
  { periodNo: 1, startsAt: '08:00', endsAt: '08:45' },
  { periodNo: 2, startsAt: '08:50', endsAt: '09:35' },
  { periodNo: 3, startsAt: '09:55', endsAt: '10:40' },
  { periodNo: 4, startsAt: '10:45', endsAt: '11:30' },
  { periodNo: 5, startsAt: '11:35', endsAt: '12:20' },
  { periodNo: 6, startsAt: '12:25', endsAt: '13:10' },
  { periodNo: 7, startsAt: '13:15', endsAt: '14:00' },
]

export const SATNICA_POPODNE: SatnicaCasa[] = [
  { periodNo: 1, startsAt: '14:00', endsAt: '14:45' },
  { periodNo: 2, startsAt: '14:50', endsAt: '15:35' },
  { periodNo: 3, startsAt: '15:55', endsAt: '16:40' },
  { periodNo: 4, startsAt: '16:45', endsAt: '17:30' },
  { periodNo: 5, startsAt: '17:35', endsAt: '18:20' },
  { periodNo: 6, startsAt: '18:25', endsAt: '19:10' },
  { periodNo: 7, startsAt: '19:15', endsAt: '20:00' },
]

export const PREDLOZI_PREDMETA = [
  'Srpski jezik', 'Matematika', 'Priroda i društvo', 'Svet oko nas',
  'Engleski jezik', 'Fizičko vaspitanje', 'Likovna kultura', 'Muzička kultura',
  'Digitalni svet', 'ČOS', 'Dopunska nastava', 'Dodatna nastava',
  'Veronauka', 'Informatika i računarstvo',
  'Istorija', 'Geografija', 'Biologija', 'Fizika', 'Hemija',
  'Tehnika i tehnologija', 'Nemački jezik', 'Francuski jezik',
  'Građansko vaspitanje',
] as const

export const DANI_KRATKO = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub'] as const
export const DANI = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'] as const

const BOJE_POZNATIH_PREDMETA: Record<string, string> = {
  'srpski jezik': '#3b5bdb',
  'srpski': '#3b5bdb',
  'matematika': '#f76707',
  'priroda i društvo': '#2f9e44',
  'priroda i drustvo': '#2f9e44',
  'svet oko nas': '#0ca678',
  'engleski jezik': '#e03131',
  'engleski': '#e03131',
  'fizičko vaspitanje': '#4d7c0f',
  'fizicko vaspitanje': '#4d7c0f',
  'fizičko': '#4d7c0f',
  'fizicko': '#4d7c0f',
  'likovna kultura': '#e64980',
  'muzička kultura': '#7048e8',
  'muzicka kultura': '#7048e8',
  'digitalni svet': '#0c8599',
  'čos': '#c2410c',
  'cos': '#c2410c',
  'čas odeljenskog starešine': '#c2410c',
  'dopunska nastava': '#5f3dc4',
  'dopunska': '#5f3dc4',
  'dodatna nastava': '#1864ab',
  'dodatna': '#1864ab',
  'veronauka': '#9c36b5',
  'informatika i računarstvo': '#1c7ed6',
  'informatika i racunarstvo': '#1c7ed6',
  'informatika': '#1c7ed6',
  'istorija': '#a61e4d',
  'geografija': '#087f5b',
  'biologija': '#37b24d',
  'fizika': '#364fc7',
  'hemija': '#ae3ec9',
  'tehnika i tehnologija': '#d9480f',
  'nemački jezik': '#b08900',
  'nemacki jezik': '#b08900',
  'nemački': '#b08900',
  'francuski jezik': '#c2255c',
  'francuski': '#c2255c',
  'građansko vaspitanje': '#495057',
  'gradjansko vaspitanje': '#495057',
}

export function kljucPredmeta(naziv: string): string {
  return naziv.trim().toLowerCase().normalize('NFC')
}

function hslUHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hashPredmeta(kljuc: string): number {
  let h = 2166136261
  for (let i = 0; i < kljuc.length; i++) {
    h ^= kljuc.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function normalizujSat(vrednost: string): string {
  const deo = vrednost.trim().slice(0, 8)
  const m = /^(\d{1,2}):(\d{2})/.exec(deo)
  if (!m) return '00:00'
  return `${String(Math.min(23, Number(m[1]))).padStart(2, '0')}:${m[2]}`
}

export function belgradeDatum(d: Date = new Date()): string {
  const delovi = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_RASPOREDA, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  )
  return `${delovi.year}-${delovi.month}-${delovi.day}`
}

export function belgradeVreme(d: Date = new Date()): string {
  const delovi = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONA_RASPOREDA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d).map((p) => [p.type, p.value]),
  )
  return `${delovi.hour}:${delovi.minute}`
}

export function dodajDane(datum: string, dana: number): string {
  const [g, m, d] = datum.split('-').map(Number)
  const x = new Date(Date.UTC(g, m - 1, d + dana))
  return x.toISOString().slice(0, 10)
}

export function danUNedelji(datum: string): number {
  const [g, m, d] = datum.split('-').map(Number)
  const dan = new Date(Date.UTC(g, m - 1, d)).getUTCDay()
  return dan === 0 ? 7 : dan
}

export function ponedeljakNedelje(datum: string): string {
  return dodajDane(datum, -(danUNedelji(datum) - 1))
}

export function jePonedeljak(datum: string): boolean {
  return danUNedelji(datum) === 1
}

export function nastavniDan(weekday: number, includeSaturday: boolean): boolean {
  return weekday <= 5 || (includeSaturday && weekday === 6)
}

export function aktivnaSmena(ulaz: {
  rotationMode: RezimRotacije
  defaultShift: SmenaCasova
  anchorMonday: string
  weekMonday: string
  override?: SmenaCasova | null
}): SmenaCasova {
  if (ulaz.override) return ulaz.override
  if (ulaz.rotationMode === 'fixed') return ulaz.defaultShift
  const a = Date.parse(`${ulaz.anchorMonday}T00:00:00Z`)
  const b = Date.parse(`${ulaz.weekMonday}T00:00:00Z`)
  const n = Math.round((b - a) / (7 * 24 * 3600 * 1000))
  if (Math.abs(n) % 2 === 0) return ulaz.defaultShift
  return ulaz.defaultShift === 'morning' ? 'afternoon' : 'morning'
}

export function imaPretcas(periodi: SatnicaCasa[]): boolean {
  return periodi.some((p) => p.periodNo === 0)
}

export function postaviPretcas(periodi: SatnicaCasa[], smena: SmenaCasova, ukljuci: boolean): SatnicaCasa[] {
  const bez = periodi.filter((p) => p.periodNo !== 0)
  if (!ukljuci) return bez
  const pretcas = smena === 'morning' ? PRETCAS_PREPODNE : PRETCAS_POPODNE
  return [pretcas, ...bez]
}

export function satnicaPreseta(smena: SmenaCasova, brojCasova: number, pretcas: boolean): SatnicaCasa[] {
  const izvor = smena === 'morning' ? SATNICA_PREPODNE : SATNICA_POPODNE
  const broj = Math.min(7, Math.max(4, brojCasova))
  return postaviPretcas(izvor.slice(0, broj), smena, pretcas)
}

export function nazivCasa(periodNo: number): string {
  return periodNo === 0 ? 'Pretčas' : `${periodNo}. čas`
}

export function nazivSmene(smena: SmenaCasova | null | undefined): string {
  if (smena === 'afternoon') return 'Popodnevna smena'
  if (smena === 'morning') return 'Prepodnevna smena'
  return 'Nema nastave'
}

export function bojaPredmeta(naziv: string, override?: string | null): string {
  if (override && /^#([0-9a-fA-F]{6})$/.test(override)) return override.toLowerCase()
  const kljuc = kljucPredmeta(naziv)
  if (!kljuc) return '#5b6ee1'
  return BOJE_POZNATIH_PREDMETA[kljuc] ?? hslUHex((hashPredmeta(kljuc) * 137.508) % 360, 62, 42)
}

export function mapaBojaPredmeta(nazivi: Iterable<string>): Map<string, string> {
  const redosled = [...new Set([...nazivi].map(kljucPredmeta).filter(Boolean))]
  const zauzete = new Set<string>()
  const mapa = new Map<string, string>()
  for (const kljuc of redosled) {
    const poznata = BOJE_POZNATIH_PREDMETA[kljuc]
    if (!poznata) continue
    mapa.set(kljuc, poznata)
    zauzete.add(poznata)
  }
  for (const kljuc of redosled) {
    if (mapa.has(kljuc)) continue
    const osnova = hashPredmeta(kljuc)
    let boja = bojaPredmeta(kljuc)
    for (let i = 0; i < 36 && zauzete.has(boja); i++) {
      boja = hslUHex((osnova * 137.508 + (i + 1) * 29) % 360, 62 - (i % 3) * 4, 40 + (i % 4) * 3)
    }
    mapa.set(kljuc, boja)
    zauzete.add(boja)
  }
  return mapa
}

export function bojaIzMape(mapa: Map<string, string>, naziv: string, override?: string | null): string {
  if (override && /^#([0-9a-fA-F]{6})$/.test(override)) return override
  return mapa.get(kljucPredmeta(naziv)) ?? bojaPredmeta(naziv)
}

export function slotoviZaDan(
  slotovi: SlotRasporedaCasova[],
  weekday: number,
  smena: SmenaCasova,
  sharedSlots: boolean,
): SlotRasporedaCasova[] {
  return slotovi.filter((s) => s.weekday === weekday && (sharedSlots ? s.shift == null : s.shift === smena))
}

export function casoviDana(
  periodi: SatnicaCasa[],
  slotovi: SlotRasporedaCasova[],
  weekday: number,
  smena: SmenaCasova,
  sharedSlots: boolean,
  vreme: string | null,
): CasUDanu[] {
  const mapa = new Map(slotoviZaDan(slotovi, weekday, smena, sharedSlots).map((s) => [s.periodNo, s]))
  const lista = [...periodi]
    .sort((a, b) => a.periodNo - b.periodNo)
    .flatMap((p) => {
      const slot = mapa.get(p.periodNo)
      if (!slot) return []
      return [{
        periodNo: p.periodNo,
        startsAt: normalizujSat(p.startsAt),
        endsAt: normalizujSat(p.endsAt),
        subject: slot.subject,
        teacher: slot.teacher,
        room: slot.room,
        color: bojaPredmeta(slot.subject, slot.color),
        note: slot.note,
        isCurrent: false,
        isNext: false,
      }]
    })
  return oznaciCasove(lista, vreme)
}

export function oznaciCasove(casovi: CasUDanu[], vreme: string | null): CasUDanu[] {
  const sorted = [...casovi].sort((a, b) => a.periodNo - b.periodNo)
  if (!vreme) return sorted.map((c) => ({ ...c, isCurrent: false, isNext: false }))
  const t = normalizujSat(vreme)
  const currentIdx = sorted.findIndex((c) => c.startsAt <= t && t < c.endsAt)
  const nextIdx = currentIdx >= 0
    ? (currentIdx + 1 < sorted.length ? currentIdx + 1 : -1)
    : sorted.findIndex((c) => c.startsAt > t)
  return sorted.map((c, i) => ({ ...c, isCurrent: i === currentIdx, isNext: i === nextIdx }))
}

export function predmetiZaKnjige(casovi: CasUDanu[]): string[] {
  const vidjeni = new Set<string>()
  const lista: string[] = []
  for (const cas of casovi) {
    const ime = cas.subject.trim()
    const kljuc = ime.toLowerCase()
    if (!ime || vidjeni.has(kljuc)) continue
    vidjeni.add(kljuc)
    lista.push(ime)
  }
  return lista
}

export function sledeciCas(casovi: CasUDanu[]): CasUDanu | null {
  return casovi.find((c) => c.isCurrent || c.isNext) ?? null
}

export function periodiNedelje(dani: { lessons: { periodNo: number }[] }[]): number[] {
  const brojevi = new Set<number>()
  for (const dan of dani) {
    for (const cas of dan.lessons) brojevi.add(cas.periodNo)
  }
  return [...brojevi].sort((a, b) => a - b)
}

function vremePerioda(dani: { lessons: CasUDanu[] }[], periodNo: number): string {
  for (const dan of dani) {
    const cas = dan.lessons.find((c) => c.periodNo === periodNo)
    if (cas) return `${cas.startsAt}–${cas.endsAt}`
  }
  return ''
}

function tekstCasaZaIzvoz(cas: CasUDanu): string {
  const extra = [cas.teacher, cas.room ? `uč. ${cas.room}` : null].filter(Boolean).join(', ')
  return extra ? `${cas.subject} (${extra})` : cas.subject
}

export function csvRasporedaCasova(week: { weekday: number; lessons: CasUDanu[] }[]): {
  zaglavlja: string[]
  redovi: (string | null)[][]
} {
  const dani = [...week].sort((a, b) => a.weekday - b.weekday)
  return {
    zaglavlja: ['Čas', 'Vreme', ...dani.map((d) => DANI[d.weekday - 1] ?? '')],
    redovi: periodiNedelje(dani).map((periodNo) => [
      nazivCasa(periodNo),
      vremePerioda(dani, periodNo) || null,
      ...dani.map((dan) => {
        const cas = dan.lessons.find((c) => c.periodNo === periodNo)
        return cas ? tekstCasaZaIzvoz(cas) : null
      }),
    ]),
  }
}
