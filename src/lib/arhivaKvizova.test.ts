import { describe, expect, it } from 'vitest'
import type { StatusArhiveKviza } from './api'
import type { Kviz } from '../types/db'
import { podeliKvizove } from './arhivaKvizova'

const KVIZ: Kviz = {
  id: 'kviz-1',
  owner_id: 'vlasnik',
  title: 'Matematika — Andrej',
  description: null,
  time_limit_seconds: null,
  default_max_attempts: 1,
  shuffle_questions: true,
  shuffle_answers: true,
  show_result: true,
  show_correct: true,
  pass_threshold_pct: 90,
  require_name: true,
  fixed_child_name: null,
  require_label: false,
  label_name: 'Odeljenje',
  grade: null,
  created_at: '2026-07-20T10:00:00Z',
  updated_at: '2026-07-20T10:00:00Z',
  deleted_at: null,
}

function status(izmene: Partial<StatusArhiveKviza> = {}): StatusArhiveKviza {
  return {
    quiz_id: KVIZ.id,
    in_progress_count: 0,
    submitted_count: 1,
    last_submitted_at: '2026-07-22T12:00:00Z',
    open_link_count: 0,
    ...izmene,
  }
}

describe('automatska arhiva kvizova', () => {
  const sada = new Date('2026-07-23T14:00:00+02:00')

  it('arhivira potpuno završen kviz stariji od danas', () => {
    const rezultat = podeliKvizove([KVIZ], [status()], sada)
    expect(rezultat.aktivni).toHaveLength(0)
    expect(rezultat.arhivirani[0]?.kviz.id).toBe(KVIZ.id)
  })

  it('ostavlja današnji završeni kviz među aktivnim', () => {
    const rezultat = podeliKvizove(
      [KVIZ],
      [status({ last_submitted_at: '2026-07-23T08:00:00+02:00' })],
      sada,
    )
    expect(rezultat.aktivni).toHaveLength(1)
    expect(rezultat.arhivirani).toHaveLength(0)
  })

  it('ne arhivira kviz dok postoji pokušaj u toku ili otvorena dodela', () => {
    expect(podeliKvizove([KVIZ], [status({ in_progress_count: 1 })], sada).aktivni).toHaveLength(1)
    expect(podeliKvizove([KVIZ], [status({ open_link_count: 1 })], sada).aktivni).toHaveLength(1)
  })

  it('ne arhivira kviz bez završenog rezultata', () => {
    const rezultat = podeliKvizove(
      [KVIZ],
      [status({ submitted_count: 0, last_submitted_at: null })],
      sada,
    )
    expect(rezultat.aktivni).toHaveLength(1)
  })
})

it('pomera završen kviz u arhivu na beogradsku ponoć nezavisno od lokalne zone', () => {
  const rezultat = podeliKvizove([KVIZ], [status({last_submitted_at:'2026-08-30T21:59:00Z'})], new Date('2026-08-30T22:01:00Z'))
  expect(rezultat.arhivirani).toHaveLength(1)
})
