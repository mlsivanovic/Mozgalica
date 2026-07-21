// Generator: poređenje brojeva i izraza (<, =, >)
import type { Opcija, Tezina } from '../../types/db'
import { ceoBroj, izaberi, type Rng } from '../random'
import type { GeneratorConfig, GenerisanoPitanje, TopicGenerator } from '../types'
import { poeniZaTezinu } from './zajednicko'

interface Strana {
  prikaz: string
  vrednost: number
}

function napraviStranu(rng: Rng, tezina: Tezina, izraz: boolean): Strana {
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

// Nivo 4/5: veći operandi, opciono namerno približeni ciljnoj vrednosti (dvaKoraka za nivo 5)
function napraviStranuTesku(rng: Rng, dvaKoraka: boolean, ciljVrednost?: number): Strana {
  const priblizi = ciljVrednost !== undefined && rng() < 0.6
  if (!dvaKoraka) {
    if (rng() < 0.5) {
      const a = ceoBroj(rng, 6, 30)
      let b = ceoBroj(rng, 6, 30)
      if (priblizi && ciljVrednost !== undefined) {
        b = Math.max(6, Math.min(30, Math.round(ciljVrednost / a) + ceoBroj(rng, -1, 1)))
      }
      return { prikaz: `${a} · ${b}`, vrednost: a * b }
    }
    const a = ceoBroj(rng, 300, 700)
    let b = ceoBroj(rng, 100, 400)
    if (priblizi && ciljVrednost !== undefined) {
      b = Math.max(100, Math.min(400, ciljVrednost - a + ceoBroj(rng, -15, 15)))
    }
    return { prikaz: `${a} + ${b}`, vrednost: a + b }
  }
  const a = ceoBroj(rng, 3, 9)
  const b = ceoBroj(rng, 11, 30)
  let minus = rng() < 0.5
  let c: number
  if (priblizi && ciljVrednost !== undefined) {
    const razlika = ciljVrednost - a * b
    minus = razlika < 0
    c = Math.min(99, Math.max(5, Math.abs(razlika) + ceoBroj(rng, -8, 8)))
  } else {
    c = minus ? ceoBroj(rng, 5, Math.max(5, Math.min(99, a * b))) : ceoBroj(rng, 5, 99)
  }
  const vrednost = minus ? a * b - c : a * b + c
  return { prikaz: `${a} · ${b} ${minus ? '−' : '+'} ${c}`, vrednost }
}

export const poredjenje: TopicGenerator = {
  slug: 'poredjenje-brojeva',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    // Težina 1: broj vs broj; 2: broj vs izraz; 3: izraz vs izraz;
    // 4: veći operandi, strane namerno bliske; 5: dvokoračni izrazi, strane namerno bliske
    let levo: Strana
    let desno: Strana
    if (cfg.difficulty >= 4) {
      levo = napraviStranuTesku(rng, cfg.difficulty === 5)
      desno = napraviStranuTesku(rng, cfg.difficulty === 5, levo.vrednost)
    } else {
      levo = napraviStranu(rng, cfg.difficulty, cfg.difficulty === 3)
      desno = napraviStranu(rng, cfg.difficulty, cfg.difficulty >= 2)
      // Povremeno namerno napravi jednakost (~15%) da „=" ne bude mrtva opcija
      if (cfg.difficulty === 1 && rng() < 0.15) {
        desno = { prikaz: String(levo.vrednost), vrednost: levo.vrednost }
      }
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
