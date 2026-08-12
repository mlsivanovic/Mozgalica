// Pomoćne funkcije za filter perioda i čitljive trendove u statistici dece.
// Datumi se namerno računaju u beogradskoj zoni da izbor perioda odgovara
// datumima koje SQL RPC koristi pri uključivanju završnih pokušaja.

export type BrziPeriodStatistike = '7d' | '30d' | 'school-year' | 'all' | 'custom'

export interface OpsegDatumaStatistike {
  from: string | null
  to: string | null
}

interface DeloviDatuma {
  year: number
  month: number
  day: number
}

function izdvojiDeloveUBeogradu(datum: Date): DeloviDatuma {
  const delovi = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(datum)
  const vrednost = (tip: Intl.DateTimeFormatPartTypes) => Number(delovi.find((deo) => deo.type === tip)?.value)
  return { year: vrednost('year'), month: vrednost('month'), day: vrednost('day') }
}

function formatirajDelove({ year, month, day }: DeloviDatuma): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function pomeriKalendar(datum: DeloviDatuma, brojDana: number): DeloviDatuma {
  const pomeren = new Date(Date.UTC(datum.year, datum.month - 1, datum.day + brojDana))
  return {
    year: pomeren.getUTCFullYear(),
    month: pomeren.getUTCMonth() + 1,
    day: pomeren.getUTCDate(),
  }
}

function datumJeIspravan(vrednost: string): boolean {
  const podudaranje = /^(\d{4})-(\d{2})-(\d{2})$/.exec(vrednost)
  if (!podudaranje) return false
  const [, godina, mesec, dan] = podudaranje
  const datum = new Date(Date.UTC(Number(godina), Number(mesec) - 1, Number(dan)))
  return datum.getUTCFullYear() === Number(godina)
    && datum.getUTCMonth() + 1 === Number(mesec)
    && datum.getUTCDate() === Number(dan)
}

export function danasUBeogradu(sada: Date = new Date()): string {
  return formatirajDelove(izdvojiDeloveUBeogradu(sada))
}

export function odrediBrziPeriod(
  period: Exclude<BrziPeriodStatistike, 'custom'>,
  sada: Date = new Date(),
): OpsegDatumaStatistike {
  const danas = izdvojiDeloveUBeogradu(sada)

  if (period === 'all') return { from: null, to: null }
  if (period === '7d') return { from: formatirajDelove(pomeriKalendar(danas, -6)), to: formatirajDelove(danas) }
  if (period === '30d') return { from: formatirajDelove(pomeriKalendar(danas, -29)), to: formatirajDelove(danas) }

  const pocetnaGodina = danas.month >= 9 ? danas.year : danas.year - 1
  return { from: `${pocetnaGodina}-09-01`, to: formatirajDelove(danas) }
}

export function validirajPrilagodjeniPeriod(from: string, to: string): string | null {
  if (!from || !to) return 'Izaberi početni i završni datum.'
  if (!datumJeIspravan(from) || !datumJeIspravan(to)) return 'Unesi ispravne datume.'
  if (from > to) return 'Početni datum ne može biti posle završnog datuma.'
  return null
}

// Rezultati su poređani od najnovijeg ka najstarijem. Za poređenje su potrebna
// dva jednako velika uzorka od po tri konačno ocenjena kviza.
export function izracunajTrendPoslednjaTri(rezultati: Array<number | null | undefined>): number | null {
  const vazeci = rezultati.filter((rezultat): rezultat is number => Number.isFinite(rezultat))
  if (vazeci.length < 6) return null

  const prosek = (vrednosti: number[]) => vrednosti.reduce((zbir, vrednost) => zbir + vrednost, 0) / vrednosti.length
  return Math.round((prosek(vazeci.slice(0, 3)) - prosek(vazeci.slice(3, 6))) * 10) / 10
}

export function imaPodatkeZaGrafik(brojTacaka: number): boolean {
  return brojTacaka > 0
}
