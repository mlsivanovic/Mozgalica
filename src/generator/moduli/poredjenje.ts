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

// Nivo 4/5: veći operandi (jednokoračni · ili +, ili dvokoračni a·b±c za nivo 5)
function napraviStranuTesku(rng: Rng, dvaKoraka: boolean): Strana {
  if (!dvaKoraka) {
    if (rng() < 0.5) {
      const a = ceoBroj(rng, 6, 30)
      const b = ceoBroj(rng, 6, 30)
      return { prikaz: `${a} · ${b}`, vrednost: a * b }
    }
    const a = ceoBroj(rng, 300, 700)
    const b = ceoBroj(rng, 100, 400)
    return { prikaz: `${a} + ${b}`, vrednost: a + b }
  }
  const a = ceoBroj(rng, 3, 9)
  const b = ceoBroj(rng, 11, 30)
  const minus = rng() < 0.5
  const c = minus ? ceoBroj(rng, 5, Math.max(5, Math.min(99, a * b))) : ceoBroj(rng, 5, 99)
  const vrednost = minus ? a * b - c : a * b + c
  return { prikaz: `${a} · ${b} ${minus ? '−' : '+'} ${c}`, vrednost }
}

// Konstruiše stranu čija je vrednost TAČNO jednaka cilju — koristi se za desnu
// stranu, tako da razlika između leve i desne strane bude mala (najviše 3;
// dete mora da izračuna obe strane, ne sme da "pogodi" po izgledu brojeva).
function napraviStranuNaVrednosti(rng: Rng, izraz: boolean, cilj: number, maxSabirak: number): Strana {
  if (!izraz) return { prikaz: String(cilj), vrednost: cilj }
  const gornja = Math.max(1, Math.min(maxSabirak, cilj - 1))
  const b = ceoBroj(rng, 1, gornja)
  if (rng() < 0.5) {
    return { prikaz: `${cilj - b} + ${b}`, vrednost: cilj }
  }
  return { prikaz: `${cilj + b} − ${b}`, vrednost: cilj }
}

export const poredjenje: TopicGenerator = {
  slug: 'poredjenje-brojeva',
  supportedTypes: ['single', 'truefalse'],
  supportsWordProblems: false,

  generateOne(cfg: GeneratorConfig, rng: Rng, taken: Set<string>): GenerisanoPitanje | null {
    // Težina 1: broj vs broj; 2: broj vs izraz; 3: izraz vs izraz; 4/5: veći/dvokoračni izrazi.
    // Desna strana se UVEK konstruiše da joj vrednost bude najviše 3 različita od leve —
    // brojevi moraju delovati vrlo slično, dete mora da izračuna obe strane da bi uporedilo.
    const levo: Strana = cfg.difficulty >= 4
      ? napraviStranuTesku(rng, cfg.difficulty === 5)
      : napraviStranu(rng, cfg.difficulty, cfg.difficulty === 3)

    const delta = ceoBroj(rng, Math.max(-3, 1 - levo.vrednost), 3)
    const ciljDesno = levo.vrednost + delta
    const izrazDesno = cfg.difficulty >= 2
    const desno = napraviStranuNaVrednosti(rng, izrazDesno, ciljDesno, cfg.difficulty >= 4 ? 60 : 40)

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
