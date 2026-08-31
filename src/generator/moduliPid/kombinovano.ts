import { napraviRng, promesaj } from '../random.ts'
import type { GeneratorConfig, RezultatGenerisanja } from '../types.ts'
import { BEOGRAD_3 } from './beograd.ts'
import { PID_PODACI_3 } from './treci.ts'
import { PID_PODACI_4 } from './cetvrti.ts'
import { sviPidKandidati } from './zajednicko.ts'

export const PID_PODACI = [...PID_PODACI_3, BEOGRAD_3, ...PID_PODACI_4]

export function generisiPidZaKombinovani(cfg: GeneratorConfig): RezultatGenerisanja {
  const oblast = PID_PODACI.find((o) => o.slug === cfg.topicSlug)
  if (!oblast) throw new Error('Nepoznata oblast prirode i društva: ' + cfg.topicSlug)
  const rng = napraviRng(cfg.seed ?? 0)
  const zabrane = new Set(cfg.excludedSignatures)
  const kandidati = sviPidKandidati(oblast, cfg, rng).filter((p) => !zabrane.has(p.signature))
  const grupe = ['single', 'truefalse', 'matching'].map((tip) => promesaj(rng, kandidati.filter((p) => p.type === tip)))
  const questions = []
  while (questions.length < cfg.count && grupe.some((g) => g.length > 0)) {
    const izbor = rng()
    const indeks = izbor < 0.6 ? 0 : izbor < 0.85 ? 1 : 2
    const grupa = grupe[indeks].length ? grupe[indeks] : grupe.find((g) => g.length > 0)!
    questions.push(grupa.pop()!)
  }
  return { questions, warning: questions.length < cfg.count ? 'Iscrpljen fond izabranog tipa u oblasti.' : null }
}
