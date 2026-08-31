export function Maskota({ stanje = 'pozdrav', velicina = 88 }: {
  stanje?: 'pozdrav' | 'savet' | 'prazno' | 'uspeh'
  velicina?: number
}) {
  const izraz = stanje === 'prazno' ? 'M34 49q8 6 16 0' : 'M34 49q8 9 16 0'
  return (
    <svg className={`maskota maskota--${stanje}`} width={velicina} height={velicina} viewBox="0 0 84 84" aria-hidden="true">
      <defs>
        <linearGradient id={`maskota-sjaj-${stanje}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <circle cx="42" cy="38" r="28" fill={`url(#maskota-sjaj-${stanje})`} />
      <path d="M31 61h22v5a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8Z" fill="#4f46e5" />
      <circle cx="33" cy="40" r="2.7" fill="#25225a" />
      <circle cx="51" cy="40" r="2.7" fill="#25225a" />
      <path d={izraz} fill="none" stroke="#25225a" strokeWidth="3" strokeLinecap="round" />
      {stanje === 'uspeh' && <path d="m62 17 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#f59e0b" />}
      {stanje === 'savet' && <path d="M15 20h9M19.5 15.5v9" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />}
      {stanje === 'pozdrav' && <path d="M67 43q10 4 6 14" fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" />}
    </svg>
  )
}
