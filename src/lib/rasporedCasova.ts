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
  'Digitalni svet', 'ČOS', 'Veronauka', 'Informatika i računarstvo',
  'Istorija', 'Geografija', 'Biologija', 'Fizika', 'Hemija',
  'Tehnika i tehnologija', 'Nemački jezik', 'Francuski jezik',
  'Građansko vaspitanje',
] as const

export const DANI_KRATKO = ['pon', 'uto', 'sre', 'čet', 'pet', 'sub'] as const
export const DANI = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'] as const

const PALETA_PREDMETA = [
  '#5b6ee1', '#ff8a3d', '#2eb872', '#e5484d', '#7c5cbf',
  '#1a9bb5', '#d4a017', '#d95f8a', '#3d8b6e', '#c45c26',
]

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
  if (override && /^#([0-9a-fA-F]{6})$/.test(override)) return override
  let h = 0
  const kljuc = naziv.trim().toLowerCase()
  for (let i = 0; i < kljuc.length; i++) h = (h * 31 + kljuc.charCodeAt(i)) >>> 0
  return PALETA_PREDMETA[h % PALETA_PREDMETA.length]
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
