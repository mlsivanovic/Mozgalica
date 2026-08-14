// Zajedničko pakovanje jednoznačnih pitanja iz srpskog jezika.
import type { Opcija } from '../../types/db.ts'
import { izaberi, promesaj, type Rng } from '../random.ts'
import type { GeneratorConfig, GenerisanoPitanje } from '../types.ts'
import { poeniZaTezinu } from './zajednicko.ts'

export interface SrpskiIzborUlaz {
  pitanje: string
  tacan: string
  netacni: string[]
  tvrdnja: (ponudjeniOdgovor: string) => string
  explanation: string
  hint: string | null
  signature: string
}

export function upakujSrpskiIzbor(
  cfg: GeneratorConfig,
  rng: Rng,
  ulaz: SrpskiIzborUlaz,
): GenerisanoPitanje {
  const netacni = [...new Set(ulaz.netacni)].filter((odgovor) => odgovor !== ulaz.tacan)
  const osnova = {
    explanation: ulaz.explanation,
    hint: ulaz.hint,
    points: poeniZaTezinu(cfg.difficulty),
    topicSlug: cfg.topicSlug,
    difficulty: cfg.difficulty,
    signature: ulaz.signature,
  }

  const tip = cfg.type === 'truefalse'
    ? 'truefalse'
    : cfg.type === 'auto' && rng() < 0.25
      ? 'truefalse'
      : 'single'

  if (tip === 'truefalse') {
    // Bez netačnih odgovora nema šta da se lažno tvrdi
    const tvrdnjaJeTacna = netacni.length === 0 || rng() < 0.5
    const ponudjeni = tvrdnjaJeTacna ? ulaz.tacan : izaberi(rng, netacni)
    return {
      ...osnova,
      type: 'truefalse',
      text: ulaz.tvrdnja(ponudjeni),
      options: null,
      correct: { value: tvrdnjaJeTacna },
    }
  }

  // Distraktori se promešaju pre odabira — bez toga bi svako pitanje nudilo
  // ista tri odgovora s početka liste (npr. uvek ista imena iz prve priče).
  const vrednosti = promesaj(rng, [ulaz.tacan, ...promesaj(rng, netacni).slice(0, 3)])
  const options: Opcija[] = vrednosti.map((tekst, indeks) => ({ id: `o${indeks + 1}`, text: tekst }))
  return {
    ...osnova,
    type: 'single',
    text: ulaz.pitanje,
    options,
    correct: { optionId: options[vrednosti.indexOf(ulaz.tacan)].id },
  }
}
