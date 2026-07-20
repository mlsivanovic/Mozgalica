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
