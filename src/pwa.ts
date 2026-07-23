interface DogadjajInstalacije extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let ponudaZaInstalaciju: DogadjajInstalacije | null = null
const slusaociInstalacije = new Set<(dostupna: boolean) => void>()

window.addEventListener('beforeinstallprompt', (dogadjaj) => {
  if (!window.location.hash.startsWith('#/dete/')) return
  dogadjaj.preventDefault()
  ponudaZaInstalaciju = dogadjaj as DogadjajInstalacije
  obavestiSlusaoceInstalacije()
})

window.addEventListener('appinstalled', () => {
  ponudaZaInstalaciju = null
  obavestiSlusaoceInstalacije()
})

function obavestiSlusaoceInstalacije(): void {
  slusaociInstalacije.forEach((slusalac) => slusalac(ponudaZaInstalaciju != null))
}

export function postaviDecjiManifest(): void {
  const manifest = document.querySelector<HTMLLinkElement>('#mozgalica-manifest')
  if (manifest) manifest.href = `${import.meta.env.BASE_URL}manifest-dete.webmanifest`

  const appleNaslov = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
  if (appleNaslov) appleNaslov.content = 'Moja Mozgalica'
}

export function imaPonuduZaInstalaciju(): boolean {
  return ponudaZaInstalaciju != null
}

export function slusajPonuduZaInstalaciju(slusalac: (dostupna: boolean) => void): () => void {
  slusaociInstalacije.add(slusalac)
  slusalac(ponudaZaInstalaciju != null)
  return () => {
    slusaociInstalacije.delete(slusalac)
  }
}

export async function ponudiInstalaciju(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const ponuda = ponudaZaInstalaciju
  if (!ponuda) return 'unavailable'

  await ponuda.prompt()
  const izbor = await ponuda.userChoice
  ponudaZaInstalaciju = null
  obavestiSlusaoceInstalacije()
  return izbor.outcome
}

// Registracija service workera + obaveštenje o novoj verziji aplikacije.
// Van React stabla je jednostavniji vanilla DOM toast nego uvlačenje konteksta ovde.
export function pokreniProveruAzuriranja(): void {
  // U razvojnom režimu vite-plugin-pwa ne generiše virtual modul dok se ne builduje
  if (import.meta.env.DEV) return

  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const azurirajSada = registerSW({
        onNeedRefresh() {
          prikaziToast('Dostupna je nova verzija aplikacije.', 'Osveži', () => azurirajSada(true))
        },
        onOfflineReady() {
          prikaziToast('Mozgalica je spremna za rad i bez interneta.', 'U redu', sakrijToast)
        },
      })
    })
    .catch(() => {
      // Nema service workera (npr. GitHub Pages build bez PWA koraka) — tiho ignoriši
    })
}

function prikaziToast(tekst: string, dugme: string, onKlik: () => void): void {
  sakrijToast()
  const omot = document.createElement('div')
  omot.className = 'toast-omot'
  omot.id = 'mozgalica-toast'
  omot.innerHTML = `
    <div class="toast">
      <span>${tekst}</span>
      <button type="button" class="dugme dugme--akcenat dugme--malo">${dugme}</button>
    </div>
  `
  omot.querySelector('button')!.addEventListener('click', onKlik)
  document.body.appendChild(omot)
}

function sakrijToast(): void {
  document.getElementById('mozgalica-toast')?.remove()
}
