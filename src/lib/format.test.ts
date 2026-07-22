import { describe, expect, it } from 'vitest'
import { formatDatumZaInput } from './format'

describe('formatDatumZaInput', () => {
  it('formatira lokalni datum za početne filtere', () => {
    expect(formatDatumZaInput(new Date(2026, 6, 2, 1, 30))).toBe('2026-07-02')
  })
})
