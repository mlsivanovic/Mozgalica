import { describe, expect, it } from 'vitest'
import { generisi } from '../index.ts'
import { napraviRng } from '../random.ts'
import type { GeneratorConfig } from '../types.ts'
import { generisiPidZaKombinovani, PID_PODACI } from './kombinovano.ts'
import { sviPidKandidati } from './zajednicko.ts'
import { sastaviKombinovaniPid } from '../../lib/kombinovaniPid.ts'

describe('konačni fond generatora za kombinovanu prirodu i društvo', () => {
  it.each(PID_PODACI.map((o) => [o.slug, o] as const))('pregleda sve činjenice, tvrdnje i kombinacije parova: %s', (slug, oblast) => {
    const cfg: GeneratorConfig = { topicSlug: slug, difficulty: 5, count: 100, type: 'auto', wordProblems: false, allowRepeats: false, seed: 50 }
    const svi = sviPidKandidati(oblast, cfg, napraviRng(50))
    const n = oblast.parovi.length
    expect(svi).toHaveLength(oblast.cinjenice.length * 3 + n * (n - 1) * (n - 2) * (n - 3) / 24)
    expect(new Set(svi.map((p) => p.signature)).size).toBe(svi.length)
    const potpisi = new Map(svi.map((p) => [p.signature, p]))
    for (const type of ['single', 'truefalse', 'matching'] as const) {
      for (const p of generisi({ ...cfg, type }).questions) {
        expect(potpisi.get(p.signature)?.text).toBe(p.text)
        expect(potpisi.get(p.signature)?.topicSlug).toBe(p.topicSlug)
      }
      const togTipa = svi.filter((p) => p.type === type)
      const poslednji = togTipa.at(-1)!
      const zabrane = togTipa.slice(0, -1).map((p) => p.signature)
      for (const seed of [0, 1, 42, 1234]) {
        const rez = generisiPidZaKombinovani({ ...cfg, seed, type, excludedSignatures: zabrane })
        expect(rez.questions.map((p) => p.signature)).toEqual([poslednji.signature])
        expect(generisiPidZaKombinovani({ ...cfg, seed, type, excludedSignatures: togTipa.map((p) => p.signature) }).questions).toEqual([])
      }
    }
  })

  it('uzima poslednje nekorišćeno povezivanje pre ponavljanja iz istorije', () => {
    const oblast = PID_PODACI[0]
    const cfg: GeneratorConfig = { topicSlug: oblast.slug, difficulty: 5, count: 2, type: 'matching', wordProblems: false, allowRepeats: false, seed: 123 }
    const svi = sviPidKandidati(oblast, cfg, napraviRng(123))
    const rez = sastaviKombinovaniPid({
      plan: [{ topicSlug: oblast.slug, questionCount: 2 }], oblasti: [{ id: oblast.slug, slug: oblast.slug, name: 'Priroda' }],
      banka: [], type: 'matching', seed: 123, prethodniKljucevi: svi.slice(0, -1).map((p) => p.signature),
    })
    expect(rez.kljucevi).toContain(svi.at(-1)!.signature)
    expect(new Set(rez.kljucevi).size).toBe(2)
  })
})
