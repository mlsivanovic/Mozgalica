import { napraviRng, promesaj } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje, RezultatGenerisanja } from '../types.ts'
import { BEOGRAD_3 } from './beograd.ts'
import { PID_PODACI_3 } from './treci.ts'
import { PID_PODACI_4 } from './cetvrti.ts'
import { sviPidKandidati } from './zajednicko.ts'

export const PID_PODACI = [...PID_PODACI_3, BEOGRAD_3, ...PID_PODACI_4]

function kljucCinjenice(p: GenerisanoPitanje): string | null {
  if (p.type !== 'single' && p.type !== 'truefalse') return null
  const delovi = p.signature.split(':')
  return `${delovi[0]}:${delovi[2]}:${delovi[3]}`
}

export function generisiPidZaKombinovani(cfg: GeneratorConfig): RezultatGenerisanja {
  const oblast = PID_PODACI.find((o) => o.slug === cfg.topicSlug)
  if (!oblast) throw new Error('Nepoznata oblast prirode i društva: ' + cfg.topicSlug)
  const rng = napraviRng(cfg.seed ?? 0)
  const zabrane = new Set(cfg.excludedSignatures)
  const kandidati = sviPidKandidati(oblast, cfg, rng).filter((p) => !zabrane.has(p.signature))
  const grupe = ['single', 'truefalse', 'matching'].map((tip) => promesaj(rng, kandidati.filter((p) => p.type === tip)))
  const questions: GenerisanoPitanje[] = []
  const korisceneCinjenice = new Set<string>()
  while (questions.length < cfg.count && grupe.some((g) => g.length > 0)) {
    const izbor = rng()
    const indeks = izbor < 0.6 ? 0 : izbor < 0.85 ? 1 : 2
    const grupa = grupe[indeks].length ? grupe[indeks] : grupe.find((g) => g.length > 0)!
    // U okviru istog kviza izbegavamo ponavljanje iste činjenice u drugom obliku dok ima novih.
    let odabraniIndeks = -1
    for (let i = grupa.length - 1; i >= 0; i--) {
      const kljuc = kljucCinjenice(grupa[i])
      if (kljuc === null || !korisceneCinjenice.has(kljuc)) {
        odabraniIndeks = i
        break
      }
    }
    const izabrano = odabraniIndeks >= 0 ? grupa.splice(odabraniIndeks, 1)[0] : grupa.pop()!
    const kljuc = kljucCinjenice(izabrano)
    if (kljuc !== null) korisceneCinjenice.add(kljuc)
    questions.push(izabrano)
  }
  return { questions, warning: questions.length < cfg.count ? 'Iscrpljen fond izabranog tipa u oblasti.' : null }
}
