import type { InboxObavestenja } from '../types/db'

export function oznaciInboxProcitanim(
  inbox: InboxObavestenja,
  ids?: string[],
  vreme = new Date().toISOString(),
): InboxObavestenja {
  const izabrani = ids ? new Set(ids) : null
  let upravoProcitano = 0

  const obavestenja = inbox.obavestenja.map((obavestenje) => {
    if (izabrani && !izabrani.has(obavestenje.id)) return obavestenje
    if (!obavestenje.read_at) upravoProcitano += 1
    return { ...obavestenje, read_at: obavestenje.read_at ?? vreme }
  })

  return {
    obavestenja,
    neprocitano: ids ? Math.max(0, inbox.neprocitano - upravoProcitano) : 0,
  }
}
