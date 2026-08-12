import { useId, type CSSProperties } from 'react'

export type RangTitule = 'Awakened' | 'Empowered' | 'Unbound'

type FabrickaTitula =
  | 'ShadowNoob'
  | 'StarScout'
  | 'SolarKnight'
  | 'CosmicPaladin'
  | 'VortexChampion'
  | 'GalacticTitan'
  | 'SupernovaDragon'
  | 'CelestialPhoenix'

interface TitleAvatarProps {
  name: string
  avatar?: string | null
  size?: number
  className?: string
  style?: CSSProperties
}

interface PaletaBedza {
  pozadina: string
  pozadinaTamnija: string
  metal: string
  akcenat: string
  svetlo: string
  mastilo: string
}

interface OznakeGradijenata {
  pozadina: string
  metal: string
  sjaj: string
}

const KODOVI_TITULA: Record<string, FabrickaTitula> = {
  shadownoob: 'ShadowNoob',
  starscout: 'StarScout',
  solarknight: 'SolarKnight',
  cosmicpaladin: 'CosmicPaladin',
  vortexchampion: 'VortexChampion',
  galactictitan: 'GalacticTitan',
  supernovadragon: 'SupernovaDragon',
  celestialphoenix: 'CelestialPhoenix',
}

const PALETE: Record<FabrickaTitula | 'generic', PaletaBedza> = {
  ShadowNoob: {
    pozadina: '#312e81', pozadinaTamnija: '#17133f', metal: '#818cf8',
    akcenat: '#a5b4fc', svetlo: '#e0e7ff', mastilo: '#0b1029',
  },
  StarScout: {
    pozadina: '#12345b', pozadinaTamnija: '#071a36', metal: '#f5b942',
    akcenat: '#7dd3fc', svetlo: '#fff3bd', mastilo: '#07192d',
  },
  SolarKnight: {
    pozadina: '#263665', pozadinaTamnija: '#111a3b', metal: '#f0a93b',
    akcenat: '#ffd875', svetlo: '#fff4cf', mastilo: '#121c3d',
  },
  CosmicPaladin: {
    pozadina: '#4c1d74', pozadinaTamnija: '#21113d', metal: '#cf8bff',
    akcenat: '#58d8ff', svetlo: '#f4dbff', mastilo: '#180d2f',
  },
  VortexChampion: {
    pozadina: '#07595d', pozadinaTamnija: '#063438', metal: '#4ee2c1',
    akcenat: '#f6d365', svetlo: '#d6fff3', mastilo: '#04292b',
  },
  GalacticTitan: {
    pozadina: '#42475d', pozadinaTamnija: '#202438', metal: '#d6d9e7',
    akcenat: '#f58cc8', svetlo: '#f6f3ff', mastilo: '#1f2130',
  },
  SupernovaDragon: {
    pozadina: '#7d1f39', pozadinaTamnija: '#380d20', metal: '#ff7662',
    akcenat: '#ffc250', svetlo: '#ffe0d3', mastilo: '#340c1b',
  },
  CelestialPhoenix: {
    pozadina: '#80275e', pozadinaTamnija: '#3d1339', metal: '#ff8ec4',
    akcenat: '#ffd15b', svetlo: '#ffe2f3', mastilo: '#3b102e',
  },
  generic: {
    pozadina: '#475569', pozadinaTamnija: '#1e293b', metal: '#cbd5e1',
    akcenat: '#94a3b8', svetlo: '#f8fafc', mastilo: '#162033',
  },
}

export function parseTitleName(fullName: string): { baseName: string; rank: RangTitule } {
  const trimmed = fullName.trim()
  const suffixRegex = /\s*(Awakened|Empowered|Unbound)$/i
  const match = trimmed.match(suffixRegex)

  if (match) {
    const baseName = trimmed.replace(suffixRegex, '').trim()
    const rank = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() as RangTitule
    return { baseName, rank }
  }

  return { baseName: trimmed, rank: 'Awakened' }
}

function prepoznajFabrickuTitulu(baseName: string): FabrickaTitula | null {
  const normalized = baseName.toLowerCase().replace(/[\s_-]+/g, '')
  return KODOVI_TITULA[normalized] ?? null
}

function KrugZvezda({ x, y, size = 2, fill }: { x: number, y: number, size?: number, fill: string }) {
  return (
    <path
      d={'M ' + x + ' ' + (y - size * 2) + ' L ' + (x + size * 0.65) + ' ' + (y - size * 0.65) + ' L ' + (x + size * 2) + ' ' + y + ' L ' + (x + size * 0.65) + ' ' + (y + size * 0.65) + ' L ' + x + ' ' + (y + size * 2) + ' L ' + (x - size * 0.65) + ' ' + (y + size * 0.65) + ' L ' + (x - size * 2) + ' ' + y + ' L ' + (x - size * 0.65) + ' ' + (y - size * 0.65) + ' Z'}
      fill={fill}
    />
  )
}

function SimbolTitule({ titula, paleta }: { titula: FabrickaTitula | null, paleta: PaletaBedza }) {
  switch (titula) {
    case 'ShadowNoob':
      return (
        <>
          <path d="M25 75C25 45 34 25 50 20C66 25 75 45 75 75Z" fill={paleta.metal} />
          <path d="M31 74C32 48 39 34 50 30C61 34 68 48 69 74Z" fill={paleta.mastilo} />
          <path d="M36 48C41 44 45 44 50 47C55 44 59 44 64 48L61 58H39Z" fill={paleta.pozadinaTamnija} />
          <path d="M38 51L46 49L43 55Z M62 51L54 49L57 55Z" fill={paleta.svetlo} />
          <path d="M50 20V34" stroke={paleta.akcenat} strokeWidth="3" strokeLinecap="round" />
        </>
      )
    case 'StarScout':
      return (
        <>
          <circle cx="50" cy="51" r="25" fill="none" stroke={paleta.metal} strokeWidth="3" />
          <circle cx="50" cy="51" r="17" fill={paleta.mastilo} stroke={paleta.akcenat} strokeWidth="1.5" />
          <path d="M50 29L56 48L50 73L44 48Z" fill={paleta.metal} />
          <path d="M28 51L48 45L72 51L48 57Z" fill={paleta.akcenat} opacity=".9" />
          <circle cx="50" cy="51" r="4" fill={paleta.svetlo} />
          <KrugZvezda x={73} y={29} fill={paleta.svetlo} size={1.5} />
          <KrugZvezda x={27} y={72} fill={paleta.akcenat} size={1.2} />
        </>
      )
    case 'SolarKnight':
      return (
        <>
          <path d="M50 19V27 M29 28L35 34 M71 28L65 34 M22 50H30 M78 50H70" stroke={paleta.akcenat} strokeWidth="3" strokeLinecap="round" />
          <path d="M33 49C33 32 40 26 50 26C60 26 67 32 67 49V65C63 72 57 76 50 78C43 76 37 72 33 65Z" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="1.5" />
          <path d="M37 49C42 45 58 45 63 49V56C58 53 42 53 37 56Z" fill={paleta.mastilo} />
          <path d="M43 64H57L54 70H46Z" fill={paleta.akcenat} />
          <circle cx="50" cy="34" r="3" fill={paleta.svetlo} />
        </>
      )
    case 'CosmicPaladin':
      return (
        <>
          <path d="M50 23C61 27 69 29 70 29V53C70 68 60 77 50 81C40 77 30 68 30 53V29C31 29 39 27 50 23Z" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="2" />
          <path d="M50 30C57 33 62 34 64 34V52C64 62 58 69 50 73C42 69 36 62 36 52V34C38 34 43 33 50 30Z" fill={paleta.mastilo} />
          <path d="M38 57C45 54 54 47 62 37C58 49 52 57 41 63Z" fill={paleta.akcenat} />
          <KrugZvezda x={61} y={37} fill={paleta.svetlo} size={1.6} />
          <path d="M45 42H55 M50 37V47" stroke={paleta.metal} strokeWidth="2" strokeLinecap="round" />
        </>
      )
    case 'VortexChampion':
      return (
        <>
          <path d="M23 49C29 27 62 20 75 39C83 51 75 71 55 76" fill="none" stroke={paleta.akcenat} strokeWidth="4" strokeLinecap="round" />
          <path d="M27 63C36 80 66 76 73 55" fill="none" stroke={paleta.metal} strokeWidth="3" strokeLinecap="round" />
          <path d="M38 35H62V50C62 59 57 64 50 64C43 64 38 59 38 50Z" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="1.5" />
          <path d="M38 41H31C30 49 33 53 39 53M62 41H69C70 49 67 53 61 53" fill="none" stroke={paleta.svetlo} strokeWidth="2" />
          <path d="M47 64H53V71H47Z M40 72H60V76H40Z" fill={paleta.akcenat} />
          <KrugZvezda x={50} y={45} fill={paleta.svetlo} size={1.6} />
        </>
      )
    case 'GalacticTitan':
      return (
        <>
          <ellipse cx="50" cy="42" rx="30" ry="9" fill="none" stroke={paleta.akcenat} strokeWidth="3" transform="rotate(-17 50 42)" />
          <circle cx="50" cy="42" r="17" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="1.5" />
          <path d="M33 76V61C33 55 39 52 45 52H55C61 52 67 55 67 61V76Z" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="1.5" />
          <path d="M40 58V72 M46 55V74 M54 55V74 M60 58V72" stroke={paleta.mastilo} strokeWidth="2" strokeLinecap="round" />
          <path d="M44 42C47 39 53 39 56 42" stroke={paleta.mastilo} strokeWidth="2" strokeLinecap="round" />
          <KrugZvezda x={67} y={27} fill={paleta.svetlo} size={1.4} />
        </>
      )
    case 'SupernovaDragon':
      return (
        <>
          <path d="M50 20L54 31L66 25L62 37L75 40L65 48L73 59L60 58L57 72L50 62L42 72L43 58L29 59L37 48L25 40L38 37L34 25L46 31Z" fill={paleta.akcenat} opacity=".55" />
          <path d="M31 58C31 39 43 29 57 31C69 33 75 42 71 52C69 58 63 61 56 61H47C42 67 35 65 31 58Z" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="1.5" />
          <path d="M42 35L45 25L51 34M55 34L61 24L63 37" fill="none" stroke={paleta.akcenat} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M61 44L66 46L61 49Z" fill={paleta.mastilo} />
          <circle cx="64" cy="45" r="1.6" fill={paleta.svetlo} />
          <path d="M49 59L53 53L57 59M56 59L60 53L64 58" fill={paleta.svetlo} />
        </>
      )
    case 'CelestialPhoenix':
      return (
        <>
          <path d="M50 50C30 23 19 31 22 44C28 53 38 58 48 63C37 48 35 42 39 36C44 41 47 46 50 50Z" fill={paleta.metal} />
          <path d="M50 50C70 23 81 31 78 44C72 53 62 58 52 63C63 48 65 42 61 36C56 41 53 46 50 50Z" fill={paleta.akcenat} />
          <path d="M46 47C46 38 50 29 50 29C50 29 54 38 54 47C54 59 52 72 50 80C48 72 46 59 46 47Z" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="1.2" />
          <circle cx="50" cy="28" r="6" fill={paleta.akcenat} stroke={paleta.svetlo} strokeWidth="1.2" />
          <path d="M50 24V21M47 26L44 24M53 26L56 24" stroke={paleta.svetlo} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M50 30L47 33H53Z" fill={paleta.mastilo} />
        </>
      )
    default:
      return (
        <>
          <path d="M50 24C61 28 68 29 69 30V53C69 68 59 76 50 80C41 76 31 68 31 53V30C32 29 39 28 50 24Z" fill={paleta.metal} stroke={paleta.svetlo} strokeWidth="2" />
          <KrugZvezda x={50} y={51} fill={paleta.svetlo} size={4} />
        </>
      )
  }
}

function BedzTitule({
  titula, rang, label, ids,
}: {
  titula: FabrickaTitula | null
  rang: RangTitule
  label: string
  ids: OznakeGradijenata
}) {
  const paleta = PALETE[titula ?? 'generic']
  const rangKlas = 'titula-avatar-img--' + rang.toLowerCase()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={'titula-avatar-bedz ' + rangKlas}
      role="img"
      aria-label={label}
      data-title-badge={titula ?? 'generic'}
      data-title-rank={rang.toLowerCase()}
    >
      <defs>
        <linearGradient id={ids.pozadina} x1="12%" y1="8%" x2="88%" y2="94%">
          <stop offset="0%" stopColor={paleta.pozadina} />
          <stop offset="100%" stopColor={paleta.pozadinaTamnija} />
        </linearGradient>
        <linearGradient id={ids.metal} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor={paleta.svetlo} />
          <stop offset="45%" stopColor={paleta.metal} />
          <stop offset="100%" stopColor={paleta.akcenat} />
        </linearGradient>
        <radialGradient id={ids.sjaj} cx="50%" cy="12%" r="75%">
          <stop offset="0%" stopColor={paleta.svetlo} stopOpacity=".34" />
          <stop offset="100%" stopColor={paleta.svetlo} stopOpacity="0" />
        </radialGradient>
      </defs>

      {rang === 'Unbound' && (
        <g className="titula-avatar-bedz-oreol" fill="none" stroke={paleta.akcenat} strokeLinecap="round">
          <circle cx="50" cy="50" r="47" strokeWidth="1.5" opacity=".85" />
          <path d="M50 3V9 M50 91V97 M3 50H9 M91 50H97 M16 16L20 20 M80 80L84 84 M16 84L20 80 M80 20L84 16" strokeWidth="2.5" />
          <path d="M39 14L44 9L50 14L56 9L61 14" strokeWidth="2.3" strokeLinejoin="round" />
        </g>
      )}
      <circle cx="50" cy="50" r="44" fill={'url(#' + ids.pozadina + ')'} stroke={paleta.metal} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="41" fill={'url(#' + ids.sjaj + ')'} />
      {rang !== 'Awakened' && (
        <circle cx="50" cy="50" r="39" fill="none" stroke={paleta.akcenat} strokeWidth="1.6" strokeDasharray={rang === 'Empowered' ? '4 4' : '2 3'} opacity=".9" />
      )}
      <g style={{ color: paleta.metal }}>
        <SimbolTitule titula={titula} paleta={{ ...paleta, metal: 'url(#' + ids.metal + ')' }} />
      </g>
      {rang === 'Empowered' && (
        <g fill={paleta.svetlo}>
          <KrugZvezda x={20} y={35} size={1.4} fill={paleta.svetlo} />
          <KrugZvezda x={79} y={65} size={1.4} fill={paleta.svetlo} />
        </g>
      )}
      {rang === 'Unbound' && (
        <g fill={paleta.svetlo}>
          <KrugZvezda x={20} y={34} size={1.8} fill={paleta.svetlo} />
          <KrugZvezda x={80} y={34} size={1.8} fill={paleta.svetlo} />
          <KrugZvezda x={50} y={88} size={1.6} fill={paleta.svetlo} />
        </g>
      )}
    </svg>
  )
}

export function OznakaRangaTitule({ rang, size = 18 }: { rang: RangTitule, size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={'oznaka-ranga-titule oznaka-ranga-titule--' + rang.toLowerCase()}
      aria-hidden="true"
      focusable="false"
      data-rank-mark={rang.toLowerCase()}
    >
      <circle cx="12" cy="12" r="9.5" fill="currentColor" opacity=".16" />
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {rang === 'Awakened' && <path d="M12 6L15.5 12L12 18L8.5 12Z" fill="currentColor" />}
      {rang === 'Empowered' && <path d="M13.5 4L7.5 13H11L10.5 20L16.5 10.5H13Z" fill="currentColor" />}
      {rang === 'Unbound' && <path d="M6 16V9L9 12L12 7L15 12L18 9V16H6ZM7.5 18H16.5V20H7.5Z" fill="currentColor" />}
    </svg>
  )
}

export function TitleAvatar({ name, avatar, size = 48, className = '', style }: TitleAvatarProps) {
  const { baseName, rank } = parseTitleName(name)
  const titula = prepoznajFabrickuTitulu(baseName)
  const idOsnova = 'titula-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const rangKlas = 'titula-avatar-img--' + rank.toLowerCase()
  const isEmoji = Boolean(avatar && avatar.length <= 4 && /\p{Emoji}/u.test(avatar))

  return (
    <div
      className={'titula-avatar-omot ' + rangKlas + ' ' + className}
      style={{
        width: size,
        height: size,
        fontSize: isEmoji ? String(size * 0.55) + 'px' : undefined,
        ...style,
      }}
      data-title-rank={rank.toLowerCase()}
    >
      {avatar ? (
        isEmoji ? (
          <div
            className="titula-avatar-emoji-krug"
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, var(--boja-primarna-svetla), var(--boja-kartica))',
              border: '2px solid var(--boja-ivica)',
            }}
            aria-label={name}
            role="img"
          >
            {avatar}
          </div>
        ) : (
          <img src={avatar} alt={name} className="titula-avatar-img" />
        )
      ) : (
        <BedzTitule
          titula={titula}
          rang={rank}
          label={name}
          ids={{
            pozadina: idOsnova + '-pozadina',
            metal: idOsnova + '-metal',
            sjaj: idOsnova + '-sjaj',
          }}
        />
      )}
    </div>
  )
}
