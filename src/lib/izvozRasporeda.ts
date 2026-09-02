// Izvoz nedeljnog rasporeda časova u CSV ili sliku (PNG/JPG).

import { napraviCsv, preuzmiCsv } from './csv'
import {
  bojaIzMape, csvRasporedaCasova, DANI, DANI_KRATKO, mapaBojaPredmeta, nazivCasa,
  nazivSmene, periodiNedelje,
} from './rasporedCasova'
import type { PregledRasporedaCasova } from '../types/kviz'

function imeFajla(deo: string): string {
  const cist = deo.trim().toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return cist || 'raspored'
}

function datumKratko(iso: string | undefined): string {
  if (!iso) return ''
  const [g, m, d] = iso.split('-')
  if (!g || !m || !d) return iso
  return `${Number(d)}.${Number(m)}.${g}.`
}

function preuzmiBlob(ime: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = ime
  a.click()
  URL.revokeObjectURL(url)
}

export function rasporedImaCasova(raspored: PregledRasporedaCasova): boolean {
  return (raspored.week ?? []).some((dan) => dan.lessons.length > 0)
}

export function preuzmiRasporedCsv(raspored: PregledRasporedaCasova): void {
  const { zaglavlja, redovi } = csvRasporedaCasova(raspored.week ?? [])
  const ime = imeFajla(raspored.childName ?? 'casova')
  preuzmiCsv(`raspored-${ime}.csv`, napraviCsv(zaglavlja, redovi))
}

function prelomiTekst(ctx: CanvasRenderingContext2D, tekst: string, maxSirina: number, maxLinija: number): string[] {
  const reci = tekst.split(/\s+/).filter(Boolean)
  const linije: string[] = []
  let trenutna = ''
  for (const rec of reci) {
    const sledeca = trenutna ? `${trenutna} ${rec}` : rec
    if (ctx.measureText(sledeca).width <= maxSirina) {
      trenutna = sledeca
      continue
    }
    if (trenutna) linije.push(trenutna)
    if (ctx.measureText(rec).width <= maxSirina) {
      trenutna = rec
    } else {
      let komad = ''
      for (const znak of rec) {
        if (ctx.measureText(komad + znak).width <= maxSirina) komad += znak
        else {
          if (komad) linije.push(komad)
          komad = znak
        }
      }
      trenutna = komad
    }
  }
  if (trenutna) linije.push(trenutna)
  if (linije.length <= maxLinija) return linije
  const vidljive = linije.slice(0, maxLinija)
  const poslednja = vidljive[maxLinija - 1] ?? ''
  vidljive[maxLinija - 1] = poslednja.replace(/…?$/, '…')
  return vidljive
}

function zaobljeniPravougaonik(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.rect(x, y, w, h)
}

function platnoUBlob(canvas: HTMLCanvasElement, mime: 'image/png' | 'image/jpeg'): Promise<Blob> {
  const kvalitet = mime === 'image/jpeg' ? 0.92 : undefined
  return new Promise((resolve, reject) => {
    const fallback = () => {
      try {
        const data = canvas.toDataURL(mime, kvalitet)
        const bin = atob(data.split(',')[1] ?? '')
        const niz = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) niz[i] = bin.charCodeAt(i)
        resolve(new Blob([niz], { type: mime }))
      } catch (e) {
        reject(e)
      }
    }
    if (typeof canvas.toBlob !== 'function') {
      fallback()
      return
    }
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else fallback()
    }, mime, kvalitet)
  })
}

export function nacrtajRasporedNaPlatno(raspored: PregledRasporedaCasova): HTMLCanvasElement {
  const week = raspored.week ?? []
  const periodi = periodiNedelje(week)
  const boje = mapaBojaPredmeta(week.flatMap((d) => d.lessons.map((c) => c.subject)))
  const skala = 2
  const margina = 28
  const zaglavljeVisina = 86
  const satKolona = 92
  const visinaReda = 78
  const razmak = 6
  const sirinaDana = 132
  const sirina = margina * 2 + satKolona + week.length * (sirinaDana + razmak)
  const visina = margina * 2 + zaglavljeVisina + periodi.length * (visinaReda + razmak) + 8
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sirina * skala)
  canvas.height = Math.round(visina * skala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Nije moguće napraviti sliku rasporeda.')
  ctx.scale(skala, skala)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, sirina, visina)
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#191b2a'
  ctx.font = '800 22px system-ui, Segoe UI, sans-serif'
  ctx.fillText('Raspored časova', margina, margina)
  ctx.font = '600 13px system-ui, Segoe UI, sans-serif'
  ctx.fillStyle = '#5f6475'
  const detalji = [
    raspored.childName,
    raspored.thisWeekShift ? nazivSmene(raspored.thisWeekShift) : null,
    raspored.weekMonday ? `od ${datumKratko(raspored.weekMonday)}` : null,
  ].filter(Boolean).join(' · ')
  ctx.fillText(detalji, margina, margina + 30)

  const mrezaY = margina + zaglavljeVisina
  ctx.font = '800 12px system-ui, Segoe UI, sans-serif'
  ctx.fillStyle = '#5f6475'
  ctx.textAlign = 'center'
  week.forEach((dan, i) => {
    const x = margina + satKolona + i * (sirinaDana + razmak) + sirinaDana / 2
    ctx.fillText(DANI_KRATKO[dan.weekday - 1] ?? DANI[dan.weekday - 1] ?? '', x, mrezaY - 22)
  })
  ctx.textAlign = 'left'

  periodi.forEach((periodNo, r) => {
    const y = mrezaY + r * (visinaReda + razmak)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#5f6475'
    ctx.font = '800 12px system-ui, Segoe UI, sans-serif'
    ctx.fillText(nazivCasa(periodNo), margina, y + 18)
    const vreme = week.flatMap((d) => d.lessons).find((c) => c.periodNo === periodNo)
    if (vreme) {
      ctx.font = '600 11px system-ui, Segoe UI, sans-serif'
      ctx.fillText(`${vreme.startsAt}–${vreme.endsAt}`, margina, y + 38)
    }
    week.forEach((dan, i) => {
      const x = margina + satKolona + i * (sirinaDana + razmak)
      const cas = dan.lessons.find((c) => c.periodNo === periodNo)
      const radius = 10
      if (!cas) {
        ctx.strokeStyle = '#dde0ea'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        zaobljeniPravougaonik(ctx, x, y, sirinaDana, visinaReda, radius)
        ctx.stroke()
        ctx.setLineDash([])
        return
      }
      const boja = bojaIzMape(boje, cas.subject, cas.color)
      ctx.fillStyle = boja
      ctx.beginPath()
      zaobljeniPravougaonik(ctx, x, y, sirinaDana, visinaReda, radius)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 13px system-ui, Segoe UI, sans-serif'
      ctx.textAlign = 'center'
      const linije = prelomiTekst(ctx, cas.subject, sirinaDana - 16, cas.room || cas.teacher ? 2 : 3)
      const visinaTeksta = linije.length * 16 + (cas.room || cas.teacher ? 14 : 0)
      let ty = y + Math.max(10, (visinaReda - visinaTeksta) / 2)
      for (const linija of linije) {
        ctx.fillText(linija, x + sirinaDana / 2, ty)
        ty += 16
      }
      if (cas.room || cas.teacher) {
        ctx.font = '600 11px system-ui, Segoe UI, sans-serif'
        ctx.globalAlpha = 0.92
        const extra = [cas.teacher, cas.room ? `uč. ${cas.room}` : null].filter(Boolean).join(' · ')
        ctx.fillText(prelomiTekst(ctx, extra, sirinaDana - 16, 1)[0] ?? '', x + sirinaDana / 2, ty + 2)
        ctx.globalAlpha = 1
      }
      ctx.textAlign = 'left'
    })
  })
  return canvas
}

export async function preuzmiRasporedSliku(
  raspored: PregledRasporedaCasova,
  format: 'png' | 'jpeg',
): Promise<void> {
  const canvas = nacrtajRasporedNaPlatno(raspored)
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const blob = await platnoUBlob(canvas, mime)
  const ime = imeFajla(raspored.childName ?? 'casova')
  preuzmiBlob(`raspored-${ime}.${format === 'jpeg' ? 'jpg' : 'png'}`, blob)
}
