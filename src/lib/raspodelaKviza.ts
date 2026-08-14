// Plan ravnomerne raspodele standardnog kviza po oblastima i izvorima.
import type { Oblast, Predmet, Razred } from '../types/db'

export type IzvorStandardnogKviza = 'bank' | 'generator' | 'combined'
export type IzvorPitanjaOblasti = 'bank' | 'generator'

export interface PlanOblastiKviza {
  topicSlug: string
  questionCount: number
  source: IzvorPitanjaOblasti
}

export function izaberiOblastiZaKviz(
  oblasti: readonly Oblast[],
  predmet: Predmet,
  razred: Razred,
  izabraniSlugovi: readonly string[],
): Oblast[] {
  const izabrani = new Set(izabraniSlugovi)
  return oblasti.filter((oblast) =>
    oblast.subject === predmet
    && oblast.grade === razred
    && izabrani.has(oblast.slug),
  )
}

export function napraviPlanOblastiKviza(
  izabraniSlugovi: readonly string[],
  ukupanBroj: number,
  podrzaniGeneratori: ReadonlySet<string>,
  izvor: Extract<IzvorStandardnogKviza, 'generator' | 'combined'>,
): PlanOblastiKviza[] {
  const jedinstveni = [...new Set(izabraniSlugovi)]
  const oblasti = izvor === 'generator'
    ? jedinstveni.filter((slug) => podrzaniGeneratori.has(slug))
    : jedinstveni

  return oblasti.map<PlanOblastiKviza>((topicSlug, indeks) => ({
    topicSlug,
    questionCount: Math.floor(ukupanBroj / oblasti.length) + (indeks < ukupanBroj % oblasti.length ? 1 : 0),
    source: podrzaniGeneratori.has(topicSlug) ? 'generator' : 'bank',
  })).filter((stavka) => stavka.questionCount > 0)
}
