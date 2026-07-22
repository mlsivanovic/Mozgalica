// Formatiranje datuma, trajanja i procenata za prikaz
export function formatDatum(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('sr-Latn-RS', {
    day: 'numeric', month: 'numeric', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })
}

// Vrednost za <input type="date"> mora da koristi lokalni datum, ne UTC datum.
export function formatDatumZaInput(datum: Date = new Date()): string {
  const godina = datum.getFullYear()
  const mesec = String(datum.getMonth() + 1).padStart(2, '0')
  const dan = String(datum.getDate()).padStart(2, '0')
  return `${godina}-${mesec}-${dan}`
}

export function formatTrajanje(sekunde: number | null | undefined): string {
  if (sekunde == null) return '—'
  const min = Math.floor(sekunde / 60)
  const sek = sekunde % 60
  if (min === 0) return `${sek} s`
  return `${min} min ${sek} s`
}

export function formatProcenat(pct: number | null | undefined): string {
  if (pct == null) return '—'
  return `${Number(pct).toFixed(Number.isInteger(Number(pct)) ? 0 : 1)}%`
}

// Odbrojavanje mm:ss za tajmer
export function formatOdbrojavanje(sekunde: number): string {
  const s = Math.max(0, Math.floor(sekunde))
  const min = Math.floor(s / 60)
  const sek = s % 60
  return `${min}:${String(sek).padStart(2, '0')}`
}
