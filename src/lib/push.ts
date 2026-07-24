import type { PushPretplata, StatusPushObavestenja } from '../types/db'
import {
  proveriAdminPush, proveriDetePush, registrujAdminPush, registrujDetePush,
  ukloniAdminPush, ukloniDetePush,
} from './api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export function pushPodrzan(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export async function statusPushObavestenja(profilToken?: string): Promise<StatusPushObavestenja> {
  if (!pushPodrzan()) {
    return {
      podrzano: false, dozvola: 'unsupported', aktivno: false,
      razlog: 'Ovaj pregledač ne podržava Web Push obaveštenja.',
    }
  }
  if (!VAPID_PUBLIC_KEY) {
    return {
      podrzano: false, dozvola: Notification.permission, aktivno: false,
      razlog: 'VAPID javni ključ nije podešen.',
    }
  }

  const registracija = await navigator.serviceWorker.getRegistration()
  if (!registracija) {
    return {
      podrzano: true,
      dozvola: Notification.permission,
      aktivno: false,
      razlog: 'Service worker još nije aktivan. Obaveštenja su dostupna u instaliranoj produkcionoj aplikaciji.',
    }
  }
  const pretplata = await registracija.pushManager.getSubscription()
  const serverskiAktivno = pretplata
    ? profilToken
      ? await proveriDetePush(profilToken, pretplata.endpoint)
      : await proveriAdminPush(pretplata.endpoint)
    : false
  return {
    podrzano: true,
    dozvola: Notification.permission,
    aktivno: Notification.permission === 'granted' && serverskiAktivno,
  }
}

export async function ukljuciPushZaAdmina(): Promise<void> {
  const pretplata = await obezbediPretplatu()
  await registrujAdminPush(pretplata)
}

export async function ukljuciPushZaDete(profilToken: string): Promise<void> {
  const pretplata = await obezbediPretplatu()
  await registrujDetePush(profilToken, pretplata)
}

export async function iskljuciPushZaAdmina(): Promise<void> {
  const pretplata = await trenutnaPretplata()
  if (pretplata) await ukloniAdminPush(pretplata.endpoint)
}

export async function iskljuciPushZaDete(profilToken: string): Promise<void> {
  const pretplata = await trenutnaPretplata()
  if (pretplata) await ukloniDetePush(profilToken, pretplata.endpoint)
}

export function slusajPushPoruke(slusalac: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => undefined
  const obradi = (dogadjaj: MessageEvent) => {
    if (dogadjaj.data?.type === 'MOZGALICA_NOVO_OBAVESTENJE') slusalac()
  }
  navigator.serviceWorker.addEventListener('message', obradi)
  return () => navigator.serviceWorker.removeEventListener('message', obradi)
}

export async function postaviBedzAplikacije(broj: number): Promise<void> {
  const navigatorSaBedzom = navigator as Navigator & {
    setAppBadge?: (broj?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }
  if (broj > 0) await navigatorSaBedzom.setAppBadge?.(broj)
  else await navigatorSaBedzom.clearAppBadge?.()
}

async function obezbediPretplatu(): Promise<PushPretplata> {
  if (!pushPodrzan()) throw new Error('Ovaj pregledač ne podržava Web Push obaveštenja.')
  if (!VAPID_PUBLIC_KEY) throw new Error('VAPID javni ključ nije podešen.')

  const dozvola = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (dozvola !== 'granted') {
    throw new Error('Dozvola za obaveštenja nije data. Možeš je promeniti u podešavanjima pregledača.')
  }

  const registracija = await navigator.serviceWorker.getRegistration()
  if (!registracija) {
    throw new Error('Obaveštenja su dostupna kada je produkciona PWA instalirana i aktivna.')
  }
  const postojeca = await registracija.pushManager.getSubscription()
  const pretplata = postojeca ?? await registracija.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlUUint8Array(VAPID_PUBLIC_KEY),
  })
  return pretplata.toJSON() as PushPretplata
}

async function trenutnaPretplata(): Promise<PushSubscription | null> {
  if (!pushPodrzan()) return null
  const registracija = await navigator.serviceWorker.getRegistration()
  if (!registracija) return null
  return registracija.pushManager.getSubscription()
}

export function base64UrlUUint8Array(vrednost: string): Uint8Array<ArrayBuffer> {
  const dopuna = '='.repeat((4 - vrednost.length % 4) % 4)
  const base64 = (vrednost + dopuna).replace(/-/g, '+').replace(/_/g, '/')
  const binarno = atob(base64)
  const rezultat = new Uint8Array(binarno.length)
  for (let i = 0; i < binarno.length; i += 1) rezultat[i] = binarno.charCodeAt(i)
  return rezultat
}
