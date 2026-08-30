import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { danasUBeogradu, odrediBrziPeriod, validirajPrilagodjeniPeriod } from './statistikaDeteta'
export function procitajPeriod(params: URLSearchParams, sada = new Date()) {
  const period = params.get('period') ?? '30d'
  if (period === 'today') return { period, from: danasUBeogradu(sada), to: danasUBeogradu(sada), greska: null }
  if (period === 'custom') {
    const from = params.get('od') ?? ''; const to = params.get('do') ?? ''
    return { period, from, to, greska: validirajPrilagodjeniPeriod(from,to) }
  }
  const izabran = ['7d','30d','all'].includes(period) ? period as '7d'|'30d'|'all' : '30d'
  return { period: izabran, ...odrediBrziPeriod(izabran, sada), greska: null }
}
export function usePeriodNapretka() {
  const [params,setParams] = useSearchParams()
  const [,setDan] = useState(danasUBeogradu)
  useEffect(() => {
    const osvezi = () => setDan(danasUBeogradu())
    const interval = window.setInterval(osvezi, 60_000)
    window.addEventListener('focus', osvezi)
    return () => { clearInterval(interval); window.removeEventListener('focus', osvezi) }
  }, [])
  return { ...procitajPeriod(params), promeni: (period: string, od?: string, kraj?: string) => setParams(p => {
    p.set('period',period)
    if(period === 'custom') { p.set('od',od ?? ''); p.set('do',kraj ?? '') } else { p.delete('od'); p.delete('do') }
    return p
  }) }
}
