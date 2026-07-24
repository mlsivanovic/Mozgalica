/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>
}

interface PushPoruka {
  title?: string
  body?: string
  url?: string
  tag?: string
  unreadCount?: number
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('message', (dogadjaj) => {
  if (dogadjaj.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

self.addEventListener('push', (dogadjaj) => {
  let poruka: PushPoruka = {}
  try {
    poruka = dogadjaj.data?.json() as PushPoruka
  } catch {
    poruka = { title: 'Mozgalica', body: dogadjaj.data?.text() ?? 'Stiglo je novo obaveštenje.' }
  }

  const ikona = new URL('icon-192.png', self.registration.scope).href
  const opcije: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: poruka.body ?? 'Stiglo je novo obaveštenje.',
    icon: ikona,
    badge: ikona,
    tag: poruka.tag ?? 'mozgalica-obavestenje',
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200],
    data: { url: poruka.url ?? self.registration.scope },
  }

  dogadjaj.waitUntil(Promise.all([
    self.registration.showNotification(poruka.title ?? 'Mozgalica', opcije),
    postaviBedz(poruka.unreadCount),
    obavestiOtvoreneKlijente(),
  ]).then(() => undefined))
})

self.addEventListener('notificationclick', (dogadjaj) => {
  dogadjaj.notification.close()
  const cilj = String(dogadjaj.notification.data?.url ?? self.registration.scope)

  dogadjaj.waitUntil((async () => {
    const klijenti = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const postojeci = klijenti.find((klijent) => new URL(klijent.url).origin === new URL(cilj).origin)
    if (postojeci && 'focus' in postojeci) {
      await postojeci.navigate(cilj)
      return postojeci.focus()
    }
    return self.clients.openWindow(cilj)
  })())
})

async function obavestiOtvoreneKlijente(): Promise<void> {
  const klijenti = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  klijenti.forEach((klijent) => klijent.postMessage({ type: 'MOZGALICA_NOVO_OBAVESTENJE' }))
}

async function postaviBedz(broj?: number): Promise<void> {
  const navigatorSaBedzom = self.navigator as WorkerNavigator & {
    setAppBadge?: (broj?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  if (broj && broj > 0) await navigatorSaBedzom.setAppBadge?.(broj)
  else await navigatorSaBedzom.clearAppBadge?.()
}
