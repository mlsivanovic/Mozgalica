export const MAKSIMALNO_POKUSAJA = 5

const RAZMACI_MINUTA = [1, 5, 30, 120] as const

export function sledeciPokusaj(attempt: number, sada = new Date()): string | null {
  if (attempt >= MAKSIMALNO_POKUSAJA) return null
  const minuta = RAZMACI_MINUTA[Math.max(0, attempt - 1)]
  if (minuta == null) return null
  return new Date(sada.getTime() + minuta * 60_000).toISOString()
}

export function prolaznaHttpGreska(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

export interface IshodHttpIsporuke {
  uspesno: boolean
  status: number
  detalj: string
  ponoviti: boolean
  deaktiviratiPretplatu: boolean
}

export async function proceniHttpIsporuku(
  odgovor: Pick<Response, 'ok' | 'status' | 'text'>,
  kanal: 'email' | 'push',
): Promise<IshodHttpIsporuke> {
  if (odgovor.ok) {
    return {
      uspesno: true,
      status: odgovor.status,
      detalj: '',
      ponoviti: false,
      deaktiviratiPretplatu: false,
    }
  }

  const detalj = (await odgovor.text()).slice(0, 1000)
  const deaktiviratiPretplatu = kanal === 'push'
    && (odgovor.status === 404 || odgovor.status === 410)
  return {
    uspesno: false,
    status: odgovor.status,
    detalj,
    ponoviti: !deaktiviratiPretplatu && prolaznaHttpGreska(odgovor.status),
    deaktiviratiPretplatu,
  }
}

export function escapeHtml(vrednost: string): string {
  return vrednost.replace(
    /[&<>"']/g,
    (znak) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[znak]!,
  )
}

export function apsolutnaHashRuta(baza: string, ruta: string): string {
  const cistaBaza = baza.replace(/#.*$/, '').replace(/\/?$/, '/')
  const cistaRuta = ruta.startsWith('/') ? ruta : `/${ruta}`
  return `${cistaBaza}#${cistaRuta}`
}
