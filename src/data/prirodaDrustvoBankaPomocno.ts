import type { Pitanje } from '../types/db.ts'

export type PidBankaPitanje = Pick<Pitanje, 'type' | 'difficulty' | 'text' | 'options' | 'correct' | 'explanation' | 'hint' | 'points' | 'source' | 'gen_signature' | 'manual_review'> & {
  topicSlug: string
  porodica: string
}

type Izbor = readonly [id: string, tekst: string, tacan: string, netacni: readonly [string, string, string], objasnjenje: string, pomoc: string]
type Tvrdnja = readonly [id: string, tekst: string, tacno: boolean, objasnjenje: string, pomoc: string]
type Par = readonly [levo: string, desno: string]
type Povezivanje = readonly [id: string, tekst: string, parovi: readonly [Par, Par, Par, Par], pomoc: string]

export function oblastBanke(slug: string, izbori: readonly Izbor[], tvrdnje: readonly Tvrdnja[], povezivanja: readonly Povezivanje[]): PidBankaPitanje[] {
  const osnova = (id: string) => ({
    topicSlug: slug, porodica: id.split('-')[0], gen_signature: slug + ':banka:' + id,
    difficulty: 5 as const, points: 5, source: 'manual' as const, manual_review: false,
  })
  return [
    ...izbori.map(([id, text, tacan, netacni, explanation, hint], indeks): PidBankaPitanje => {
      const tekstovi = [...netacni]
      const mesto = indeks % 4
      tekstovi.splice(mesto, 0, tacan)
      return { ...osnova(id), type: 'single', text, explanation, hint,
        options: tekstovi.map((tekst, i) => ({ id: 'o' + i, text: tekst })), correct: { optionId: 'o' + mesto } }
    }),
    ...tvrdnje.map(([id, text, value, explanation, hint]): PidBankaPitanje => ({
      ...osnova(id), type: 'truefalse', text, options: null, correct: { value }, explanation, hint,
    })),
    ...povezivanja.map(([id, text, parovi, hint]): PidBankaPitanje => ({
      ...osnova(id), type: 'matching', text, hint,
      options: {
        left: parovi.map(([levo], i) => ({ id: 'l' + i, text: levo })),
        right: parovi.map(([, desno], i) => ({ id: 'r' + i, text: desno })).reverse(),
      },
      correct: { pairs: Object.fromEntries(parovi.map((_, i) => ['l' + i, 'r' + i])) },
      explanation: 'Tačni parovi: ' + parovi.map(([levo, desno]) => levo + ' — ' + desno).join('; ') + '.',
    })),
  ]
}
