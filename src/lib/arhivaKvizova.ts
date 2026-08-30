import { danasUBeogradu } from './statistikaDeteta'
import type { StatusArhiveKviza } from './api'
import type { Kviz } from '../types/db'

export interface ArhiviraniKviz {
  kviz: Kviz
  zavrsen_at: string
}

export interface PodelaKvizova {
  aktivni: Kviz[]
  arhivirani: ArhiviraniKviz[]
}

export function podeliKvizove(
  kvizovi: Kviz[],
  statusi: StatusArhiveKviza[],
  sada: Date = new Date(),
): PodelaKvizova {
  const danas = danasUBeogradu(sada)
  const statusPoKvizu = new Map(statusi.map((status) => [status.quiz_id, status]))
  const aktivni: Kviz[] = []
  const arhivirani: ArhiviraniKviz[] = []

  for (const kviz of kvizovi) {
    const status = statusPoKvizu.get(kviz.id)
    const zavrsenAt = status?.last_submitted_at
    const zavrsenPreDanas = zavrsenAt != null && danasUBeogradu(new Date(zavrsenAt)) < danas
    const potpunoZavrsen = status != null
      && status.submitted_count > 0
      && status.in_progress_count === 0
      && status.open_link_count === 0

    if (potpunoZavrsen && zavrsenPreDanas) {
      arhivirani.push({ kviz, zavrsen_at: zavrsenAt })
    } else {
      aktivni.push(kviz)
    }
  }

  arhivirani.sort(
    (a, b) => new Date(b.zavrsen_at).getTime() - new Date(a.zavrsen_at).getTime(),
  )
  return { aktivni, arhivirani }
}
