// Plan ravnomerne raspodele standardnog kviza po oblastima i izvorima.
export type IzvorStandardnogKviza = 'bank' | 'generator' | 'combined'
export type IzvorPitanjaOblasti = 'bank' | 'generator'

export interface PlanOblastiKviza {
  topicSlug: string
  questionCount: number
  source: IzvorPitanjaOblasti
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
