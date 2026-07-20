// Izvoz rezultata u CSV — BOM + tačka-zapeta da Excel ispravno otvori š/đ/č/ž
export function napraviCsv(zaglavlja: string[], redovi: (string | number | null)[][]): string {
  const pobegni = (v: string | number | null): string => {
    const s = v == null ? '' : String(v)
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replaceAll('"', '""')}"`
    }
    return s
  }
  const linije = [zaglavlja.map(pobegni).join(';'), ...redovi.map((r) => r.map(pobegni).join(';'))]
  return '﻿' + linije.join('\r\n')
}

export function preuzmiCsv(imeFajla: string, sadrzaj: string): void {
  const blob = new Blob([sadrzaj], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = imeFajla
  a.click()
  URL.revokeObjectURL(url)
}
