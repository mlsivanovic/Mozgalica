// Uvoz pitanja za srpski jezik iz CSV-a: mali ručno pisan parser (bez dodatne
// zavisnosti; isti ';' delimiter kao izvoz u src/lib/csv.ts) + mapiranje redova
// u NovoPitanje. Podržava samo dva tipa: otvoren tekst (ručno ocenjivanje) i
// tačno/netačno (automatska ocena) — u skladu sa proizvodnom odlukom modula.
import type { NovoPitanje } from './api'
import type { Oblast, Tezina } from '../types/db'

// ---------- parsiranje ----------

// Parsira CSV tekst (delimiter ';') u niz redova od nizova ćelija. Podržava
// navodnike oko polja (sadržaj sa ';', novim redom ili navodnikom — "" je
// eskejp za navodnik unutar polja), CRLF/LF, i skida BOM ako postoji.
export function parsirajCsv(tekst: string): string[][] {
  const bezBom = tekst.charCodeAt(0) === 0xfeff ? tekst.slice(1) : tekst
  const redovi: string[][] = []
  let red: string[] = []
  let polje = ''
  let uNavodnicima = false
  let i = 0
  const n = bezBom.length

  function zatvoriPolje() { red.push(polje); polje = '' }
  function zatvoriRed() { zatvoriPolje(); redovi.push(red); red = [] }

  while (i < n) {
    const c = bezBom[i]
    if (uNavodnicima) {
      if (c === '"') {
        if (bezBom[i + 1] === '"') { polje += '"'; i += 2; continue }
        uNavodnicima = false; i++; continue
      }
      polje += c; i++; continue
    }
    if (c === '"') { uNavodnicima = true; i++; continue }
    if (c === ';') { zatvoriPolje(); i++; continue }
    if (c === '\r') { i++; continue } // CRLF — \n koji sledi zatvara red
    if (c === '\n') { zatvoriRed(); i++; continue }
    polje += c; i++
  }
  // Poslednje polje/red, ako fajl ne završava novim redom
  if (polje !== '' || red.length > 0) zatvoriRed()

  // Izbaci potpuno prazne redove (npr. prazan red na kraju fajla)
  return redovi.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

// Lower+trim+foldovanje srpskih dijakritika — isti princip kao fn_normalize_text
// na serveru, za poređenje zaglavlja/vrednosti bez obzira na veliko/malo slovo i č/ć/š/ž/đ.
function normalizuj(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
}

// ---------- šema kolona + šablon za preuzimanje ----------

export const ZAGLAVLJA_UVOZA = ['tema', 'tip', 'pitanje', 'odgovor', 'poeni', 'tezina', 'objasnjenje', 'hint']

export const PRIMERI_UVOZA: (string | number)[][] = [
  ['Gramatika', 'tacno-netacno', 'Imenice menjaju rod, broj i padež.', 'tacno', 1, 2, 'Imenice se menjaju po rodu, broju i padežu.', ''],
  ['Rečnik', 'tekst', 'Napiši jedan sinonim za reč „radostan".', 'srećan|veseo', 2, 3, 'Sinonimi su reči sličnog značenja.', 'Razmisli kako se još može reći da je neko srećan.'],
]

// ---------- mapiranje u pitanja ----------

export interface GreskaUvoza {
  red: number
  poruka: string
}

// Jedan red iz pregleda (za tabelu u modalu) — i validni i redovi sa greškom.
export interface PregledReda {
  red: number
  pitanje: string
  ok: boolean
  poruka?: string
}

export interface RezultatMapiranja {
  validni: NovoPitanje[]
  greske: GreskaUvoza[]
  pregled: PregledReda[]
}

const TIP_UVOZA: Record<string, 'text' | 'truefalse'> = {
  tekst: 'text',
  'tacno-netacno': 'truefalse',
}

// redovi[0] mora biti zaglavlje (ZAGLAVLJA_UVOZA, redosled kolona je slobodan).
// oblastiSrpski su teme sa subject === 'srpski' — 'tema' se poredi i po slug-u i po nazivu.
export function mapirajRedove(redovi: string[][], oblastiSrpski: Oblast[]): RezultatMapiranja {
  const validni: NovoPitanje[] = []
  const greske: GreskaUvoza[] = []
  const pregled: PregledReda[] = []
  if (redovi.length === 0) {
    return { validni, greske: [{ red: 0, poruka: 'Fajl je prazan.' }], pregled }
  }

  const zaglavlje = redovi[0].map(normalizuj)
  const indeks = (naziv: string) => zaglavlje.indexOf(naziv)
  const iTema = indeks('tema')
  const iTip = indeks('tip')
  const iPitanje = indeks('pitanje')
  const iOdgovor = indeks('odgovor')
  const iPoeni = indeks('poeni')
  const iTezina = indeks('tezina')
  const iObjasnjenje = indeks('objasnjenje')
  const iHint = indeks('hint')

  if (iTema === -1 || iTip === -1 || iPitanje === -1 || iOdgovor === -1) {
    return {
      validni,
      pregled,
      greske: [{
        red: 1,
        poruka: 'Zaglavlje mora sadržati bar kolone: tema, tip, pitanje, odgovor (poeni, tezina, objasnjenje, hint su opcioni).',
      }],
    }
  }

  const mapaTema = new Map<string, Oblast>()
  for (const o of oblastiSrpski) {
    mapaTema.set(normalizuj(o.slug), o)
    mapaTema.set(normalizuj(o.name), o)
  }

  for (let r = 1; r < redovi.length; r++) {
    const red = redovi[r]
    const brojReda = r + 1 // 1-bazirano, +1 zbog zaglavlja — za poruke greške
    if (red.every((c) => c.trim() === '')) continue

    const temaSirovo = (red[iTema] ?? '').trim()
    const tipSirovo = (red[iTip] ?? '').trim()
    const pitanjeSirovo = (red[iPitanje] ?? '').trim()
    const odgovorSirovo = (red[iOdgovor] ?? '').trim()
    const nazivZaPregled = pitanjeSirovo || temaSirovo || '(prazan red)'

    function odbaci(poruka: string): void {
      greske.push({ red: brojReda, poruka })
      pregled.push({ red: brojReda, pitanje: nazivZaPregled, ok: false, poruka })
    }

    const oblast = mapaTema.get(normalizuj(temaSirovo))
    if (!oblast) {
      odbaci(`Nepoznata tema „${temaSirovo}" (mora biti postojeća tema srpskog jezika).`)
      continue
    }

    const tip = TIP_UVOZA[normalizuj(tipSirovo)]
    if (!tip) {
      odbaci(`Nepoznat tip „${tipSirovo}" — očekivano „tekst" ili „tacno-netacno".`)
      continue
    }

    if (pitanjeSirovo.length < 3 || pitanjeSirovo.length > 2000) {
      odbaci('Tekst pitanja mora imati 3–2000 karaktera.')
      continue
    }

    let poeni = 1
    if (iPoeni !== -1 && (red[iPoeni] ?? '').trim() !== '') {
      const p = Number((red[iPoeni] ?? '').trim())
      if (!Number.isInteger(p) || p < 1 || p > 100) {
        odbaci(`Poeni moraju biti ceo broj 1–100 (dobijeno „${red[iPoeni]}").`)
        continue
      }
      poeni = p
    }

    let tezina: Tezina = 3
    if (iTezina !== -1 && (red[iTezina] ?? '').trim() !== '') {
      const t = Number((red[iTezina] ?? '').trim())
      if (!Number.isInteger(t) || t < 1 || t > 5) {
        odbaci(`Težina mora biti ceo broj 1–5 (dobijeno „${red[iTezina]}").`)
        continue
      }
      tezina = t as Tezina
    }

    let correct: NovoPitanje['correct']
    if (tip === 'truefalse') {
      const norm = normalizuj(odgovorSirovo)
      if (norm !== 'tacno' && norm !== 'netacno') {
        odbaci(`Odgovor za tačno/netačno mora biti „tacno" ili „netacno" (dobijeno „${odgovorSirovo}").`)
        continue
      }
      correct = { value: norm === 'tacno' }
    } else {
      const varijante = odgovorSirovo.split('|').map((v) => v.trim()).filter(Boolean)
      correct = { accept: varijante }
    }

    const objasnjenje = iObjasnjenje !== -1 ? (red[iObjasnjenje] ?? '').trim() : ''
    const hint = iHint !== -1 ? (red[iHint] ?? '').trim() : ''

    validni.push({
      topic_id: oblast.id,
      type: tip,
      difficulty: tezina,
      text: pitanjeSirovo,
      options: null,
      correct,
      explanation: objasnjenje || null,
      hint: hint || null,
      points: poeni,
      source: 'manual',
      gen_signature: null,
      // Tekst se uvek ručno ocenjuje; tačno/netačno uvek automatski.
      manual_review: tip === 'text',
    })
    pregled.push({ red: brojReda, pitanje: nazivZaPregled, ok: true })
  }

  return { validni, greske, pregled }
}
