// Generator: poređenje brojeva i izraza (<, =, >)
import type { Opcija } from '../../types/db'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { poeniZaTezinu } from './zajednicko'

interface Strana {
  prikaz: string
  vrednost: number
}

function napraviStranu(rng: Rng, tezina: 1 | 2 | 3, izraz: boolean): Strana {
  if (!izraz || tezina === 1) {
    const n = ceoBroj(rng, 10, 999)
    return { prikaz: String(n), vrednost: n }
  }
  if (rng() < 0.5) {
    const a = ceoBroj(rng, 100, 800)
    const b = ceoBroj(rng, 10, 199)
    return { prikaz: `${a} + ${b}`, vrednost: a + b }
  }
  const a = ceoBroj(rng, 2, 9)
  const b = ceoBroj(rng, 2, 9)
  return { prikaz: `${a} · ${b}`, vrednost: a * b }
}

export const poredjenje: TopicGenerator = {
  slug: 'poredjenje-brojeva',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    // Težina 1: broj vs broj; 2: broj vs izraz; 3: izraz vs izraz
    const levo = napraviStranu(rng, cfg.difficulty, cfg.difficulty === 3)
    let desno = napraviStranu(rng, cfg.difficulty, cfg.difficulty >= 2)

    // Povremeno namerno napravi jednakost (~15%) da „=" ne bude mrtva opcija
    if (cfg.difficulty === 1 && rng() < 0.15) {
      desno = { prikaz: String(levo.vrednost), vrednost: levo.vrednost }
    }

    const signature = `poredjenje:${levo.prikaz}?${desno.prikaz}`
    if (taken.has(signature)) return null

    const znak = levo.vrednost < desno.vrednost ? '<' : levo.vrednost > desno.vrednost ? '>' : '='
    const poeni = poeniZaTezinu(cfg.difficulty)
    const osnova = {
      hint: cfg.difficulty >= 2 ? 'Prvo izračunaj vrednost svake strane, pa uporedi brojeve.' : 'Uporedi prvo stotine, pa desetice, pa jedinice.',
      points: poeni,
      topicSlug: cfg.topicSlug,
      difficulty: cfg.difficulty,
      signature,
    }

    const zeljeni = cfg.type === 'auto' ? (rng() < 0.7 ? 'single' : 'truefalse') : cfg.type

    if (zeljeni === 'truefalse') {
      // Tvrdnja sa nasumičnim znakom — nekad tačna, nekad ne
      const ponudjeni = izaberi(rng, ['<', '>', '='] as const)
      const tacno =
        (ponudjeni === '<' && znak === '<') ||
        (ponudjeni === '>' && znak === '>') ||
        (ponudjeni === '=' && znak === '=')
      return {
        ...osnova,
        type: 'truefalse',
        text: `Da li je tačno: ${levo.prikaz} ${ponudjeni} ${desno.prikaz}?`,
        options: null,
        correct: { value: tacno },
        explanation: `Važi ${levo.prikaz} ${znak} ${desno.prikaz}${levo.prikaz !== String(levo.vrednost) || desno.prikaz !== String(desno.vrednost) ? ` (${levo.vrednost} ${znak} ${desno.vrednost})` : ''}.`,
      }
    }

    const options: Opcija[] = [
      { id: 'o1', text: '<' },
      { id: 'o2', text: '=' },
      { id: 'o3', text: '>' },
    ]
    const correctId = znak === '<' ? 'o1' : znak === '=' ? 'o2' : 'o3'
    return {
      ...osnova,
      type: 'single',
      text: `Koji znak treba da stoji: ${levo.prikaz} __ ${desno.prikaz}?`,
      options,
      correct: { optionId: correctId },
      explanation: `Važi ${levo.prikaz} ${znak} ${desno.prikaz}${levo.prikaz !== String(levo.vrednost) || desno.prikaz !== String(desno.vrednost) ? ` (${levo.vrednost} ${znak} ${desno.vrednost})` : ''}.`,
    }
  },
}
