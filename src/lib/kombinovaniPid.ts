import { generisiPidZaKombinovani } from '../generator/moduliPid/kombinovano.ts'
import { napraviRng, promesaj } from '../generator/random.ts'
import type { GeneratorConfig, GenerisanoPitanje, RezultatGenerisanja } from '../generator/types.ts'
import type { MatchingOpcije, Pitanje, TipPitanja } from '../types/db.ts'

export type PitanjeKombinovaneBanke = Pick<Pitanje,
  'id' | 'topic_id' | 'type' | 'difficulty' | 'text' | 'options' | 'correct' |
  'explanation' | 'hint' | 'points' | 'manual_review'> & { gen_signature?: string | null }

interface Tema { id: string; slug: string; name: string }
interface Kvota { topicSlug: string; questionCount: number }
export interface PidKvota extends Kvota { bankCount: number; generatorCount: number }

export function podeliPidKvote(plan: readonly Kvota[], seed: number): PidKvota[] {
  const grupisano = new Map<string, number>()
  for (const stavka of plan) {
    if (!Number.isInteger(stavka.questionCount) || stavka.questionCount < 0) {
      throw new Error('Broj pitanja u oblasti mora biti nenegativan ceo broj.')
    }
    grupisano.set(stavka.topicSlug, (grupisano.get(stavka.topicSlug) ?? 0) + stavka.questionCount)
  }
  let visakBanci = napraviRng(seed)() < 0.5
  return [...grupisano].filter(([, broj]) => broj > 0).map(([topicSlug, questionCount]) => {
    const bankCount = Math.floor(questionCount / 2) + (questionCount % 2 && visakBanci ? 1 : 0)
    if (questionCount % 2) visakBanci = !visakBanci
    return { topicSlug, questionCount, bankCount, generatorCount: questionCount - bankCount }
  })
}

export type KombinovaniSnapshot = Pick<PitanjeKombinovaneBanke,
  'topic_id' | 'type' | 'text' | 'options' | 'correct' | 'explanation' | 'hint' | 'points' | 'manual_review'> & {
  source_question_id: string | null
  topic_name: string
  position: number
}

const normalizuj = (tekst: string) => tekst.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()

// Redosled ponuđenih odgovora i njihovi ID-jevi ne čine novo pitanje.
export function kljucSadrzaja(p: Pick<Pitanje, 'type' | 'text' | 'options'>): string {
  const delovi = [p.type, normalizuj(p.text)]
  if (p.type === 'matching') {
    const opcije = p.options as MatchingOpcije
    delovi.push(JSON.stringify([
      opcije.left.map((o) => normalizuj(o.text)).sort(),
      opcije.right.map((o) => normalizuj(o.text)).sort(),
    ]))
  }
  return JSON.stringify(delovi)
}

export function sastaviKombinovaniPid(
  cfg: {
    plan: readonly Kvota[]
    oblasti: readonly Tema[]
    banka: readonly PitanjeKombinovaneBanke[]
    seed: number
    type: TipPitanja | 'auto'
    prethodniKljucevi?: readonly string[]
  },
  generator: (cfg: GeneratorConfig) => RezultatGenerisanja = generisiPidZaKombinovani,
): { snapshot: KombinovaniSnapshot[]; kljucevi: string[] } {
  const istorija = new Set(cfg.prethodniKljucevi ?? [])
  const ucestalost = new Map<string, number>()
  for (const key of cfg.prethodniKljucevi ?? []) ucestalost.set(key, (ucestalost.get(key) ?? 0) + 1)
  const kljucevi = new Set<string>()
  const sadrzaji = new Set<string>()
  const odabrana: Array<{ snapshot: Omit<KombinovaniSnapshot, 'position'>; key: string }> = []
  const teme = new Map(cfg.oblasti.map((t) => [t.slug, t]))

  for (const [indeks, kvota] of podeliPidKvote(cfg.plan, cfg.seed).entries()) {
    const tema = teme.get(kvota.topicSlug)
    if (!tema || !tema.slug.startsWith('pid-')) throw new Error('Oblast prirode i društva nije pronađena: ' + kvota.topicSlug)
    const pocetak = odabrana.length
    let izBanke = 0
    let izGeneratora = 0
    let poziv = 0
    const rng = napraviRng(cfg.seed + indeks + 1)
    const kandidati = cfg.banka
      .filter((p) => p.topic_id === tema.id && p.difficulty === 5 && (cfg.type === 'auto' || p.type === cfg.type))
      .slice().sort((a, b) => a.id.localeCompare(b.id))
      .map((p) => ({ p, red: rng(), upotreba: ucestalost.get(p.id) ?? 0 }))
      .sort((a, b) => a.upotreba - b.upotreba || a.red - b.red || a.p.id.localeCompare(b.p.id))
      .map(({ p }) => p)
    const nedostaje = () => kvota.questionCount - (odabrana.length - pocetak)
    const odbijeniPotpisi = new Set<string>()
    // Istorijski potpis sačuvanog generatorskog pitanja važi i kada je ono stiglo iz banke.
    const istorijaGeneratora = new Set(istorija)
    for (const p of kandidati) if (istorija.has(p.id) && p.gen_signature) istorijaGeneratora.add(p.gen_signature)

    function dodajBanku(broj: number, samoNova: boolean) {
      let dodato = 0
      for (const p of kandidati) {
        if (dodato >= broj || nedostaje() === 0) break
        if (samoNova && (istorija.has(p.id) || (p.gen_signature && istorija.has(p.gen_signature)))) continue
        const sadrzaj = kljucSadrzaja(p)
        if (kljucevi.has(p.id) || sadrzaji.has(sadrzaj) || (p.gen_signature && kljucevi.has(p.gen_signature))) continue
        kljucevi.add(p.id)
        if (p.gen_signature) kljucevi.add(p.gen_signature)
        sadrzaji.add(sadrzaj)
        odabrana.push({ key: p.id, snapshot: {
          source_question_id: p.id, topic_id: tema!.id, topic_name: tema!.name,
          type: p.type, text: p.text, options: p.options, correct: p.correct,
          explanation: p.explanation, hint: p.hint, points: p.points, manual_review: p.manual_review,
        } })
        dodato++
        izBanke++
      }
    }

    function dodajGenerator(broj: number, samoNova: boolean) {
      let dodato = 0
      while (dodato < broj && nedostaje() > 0) {
        const zabrane = new Set([...kljucevi, ...odbijeniPotpisi, ...(samoNova ? istorijaGeneratora : [])])
        const rezultat = generator({
          topicSlug: tema!.slug, count: Math.min(broj - dodato, nedostaje()),
          type: cfg.type, difficulty: 5, wordProblems: false, allowRepeats: false,
          seed: cfg.seed + indeks * 1000 + ++poziv, excludedSignatures: zabrane,
        })
        let novihPotpisa = 0
        for (const p of rezultat.questions) {
          if (dodato >= broj || nedostaje() === 0) break
          if (zabrane.has(p.signature)) continue
          novihPotpisa++
          const sadrzaj = kljucSadrzaja(p)
          if (p.topicSlug !== tema!.slug || p.difficulty !== 5 || (cfg.type !== 'auto' && p.type !== cfg.type)
            || kljucevi.has(p.signature) || sadrzaji.has(sadrzaj)) {
            odbijeniPotpisi.add(p.signature)
            continue
          }
          kljucevi.add(p.signature)
          sadrzaji.add(sadrzaj)
          odabrana.push({ key: p.signature, snapshot: snapshotGeneratora(p, tema!) })
          dodato++
          izGeneratora++
        }
        if (novihPotpisa === 0) break
      }
    }

    dodajBanku(kvota.bankCount, true)
    dodajGenerator(kvota.generatorCount, true)
    dodajBanku(nedostaje(), true)
    dodajGenerator(nedostaje(), true)
    // Tek kada nema dovoljno novih pitanja iz oba izvora, dozvoljavamo istorijska ponavljanja.
    dodajBanku(Math.max(0, kvota.bankCount - izBanke), false)
    dodajGenerator(Math.max(0, kvota.generatorCount - izGeneratora), false)
    dodajBanku(nedostaje(), false)
    dodajGenerator(nedostaje(), false)
    if (nedostaje() > 0) {
      throw new Error('Za oblast „' + tema.name + '“ nedostaje ' + nedostaje()
        + ' pitanja: banka i generator zajedno daju ' + (odabrana.length - pocetak)
        + ' od potrebnih ' + kvota.questionCount + ' sa izabranim tipom.')
    }
  }

  const promesana = promesaj(napraviRng(cfg.seed + 2000), odabrana)
  return {
    snapshot: promesana.map(({ snapshot }, position) => ({ ...snapshot, position })),
    kljucevi: promesana.map(({ key }) => key),
  }
}

function snapshotGeneratora(p: GenerisanoPitanje, tema: Tema): Omit<KombinovaniSnapshot, 'position'> {
  return {
    source_question_id: null, topic_id: tema.id, topic_name: tema.name,
    type: p.type, text: p.text, options: p.options, correct: p.correct,
    explanation: p.explanation || null, hint: p.hint, points: p.points, manual_review: false,
  }
}
