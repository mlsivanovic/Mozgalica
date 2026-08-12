import React from 'react'

interface TitleAvatarProps {
  name: string
  avatar?: string | null
  size?: number
  className?: string
  style?: React.CSSProperties
}

// Funkcija za parsiranje imena titule (npr. "SolarKnight Empowered" -> { baseName: "SolarKnight", rank: "Empowered" })
export function parseTitleName(fullName: string): { baseName: string; rank: 'Awakened' | 'Empowered' | 'Unbound' } {
  const trimmed = fullName.trim()
  const suffixRegex = /\s*(Awakened|Empowered|Unbound)$/i
  const match = trimmed.match(suffixRegex)
  
  if (match) {
    const baseName = trimmed.replace(suffixRegex, '').trim()
    const rank = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase() as 'Awakened' | 'Empowered' | 'Unbound'
    return { baseName, rank }
  }
  
  return { baseName: trimmed, rank: 'Awakened' }
}

export function TitleAvatar({ name, avatar, size = 48, className = '', style }: TitleAvatarProps) {
  const { baseName, rank } = parseTitleName(name)

  // Klasa za stil ranga sjaja
  let glowClass = 'titula-avatar-img--awakened'
  if (rank === 'Empowered') {
    glowClass = 'titula-avatar-img--empowered'
  } else if (rank === 'Unbound') {
    glowClass = 'titula-avatar-img--unbound'
  }

  const renderFallbackSvg = () => {
    const norm = baseName.toLowerCase().replace(/\s+/g, '')
    
    if (norm === 'shadownoob') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="sn-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#1e1b4b" />
              <stop offset="100%" stop-color="#0f172a" />
            </linearGradient>
            <linearGradient id="sn-hood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6366f1" />
              <stop offset="100%" stop-color="#312e81" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#sn-bg)" stroke="#6366f1" stroke-width="3" />
          <path d="M 22 80 C 22 45, 30 20, 50 16 C 70 20, 78 45, 78 80 Z" fill="url(#sn-hood)" />
          <path d="M 32 75 C 32 50, 40 32, 50 30 C 60 32, 68 50, 68 75 Z" fill="#020617" />
          <ellipse cx="42" cy="50" rx="5" ry="3" fill="#bef264" transform="rotate(-10, 42, 50)" />
          <ellipse cx="58" cy="50" rx="5" ry="3" fill="#bef264" transform="rotate(10, 58, 50)" />
          <path d="M 50 20 Q 50 40 45 42" stroke="#4f46e5" stroke-width="2" fill="none" />
        </svg>
      )
    }

    if (norm === 'starscout') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="ss-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="ss-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#d97706" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#ss-bg)" stroke="#fbbf24" stroke-width="3" />
          <circle cx="28" cy="30" r="1" fill="#fff" opacity="0.8" />
          <circle cx="72" cy="28" r="1.5" fill="#fff" opacity="0.6" />
          <circle cx="35" cy="70" r="1.2" fill="#fff" opacity="0.5" />
          <circle cx="68" cy="65" r="1" fill="#fff" opacity="0.7" />
          <circle cx="50" cy="50" r="26" fill="none" stroke="url(#ss-gold)" stroke-width="3" />
          <path d="M 50 28 L 55 46 L 50 50 Z" fill="#ef4444" />
          <path d="M 50 72 L 55 54 L 50 50 Z" fill="#38bdf8" />
          <path d="M 50 28 L 45 46 L 50 50 Z" fill="#f87171" />
          <path d="M 50 72 L 45 54 L 50 50 Z" fill="#0ea5e9" />
          <circle cx="50" cy="50" r="3.5" fill="#fff" stroke="url(#ss-gold)" stroke-width="1" />
          <path d="M 75 22 L 77 26 L 82 27 L 78 30 L 79 35 L 75 32 L 71 35 L 72 30 L 68 27 L 73 26 Z" fill="#fff" />
        </svg>
      )
    }

    if (norm === 'solarknight') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="sk-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#451a03" />
              <stop offset="100%" stop-color="#180500" />
            </linearGradient>
            <linearGradient id="sk-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#ea580c" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#sk-bg)" stroke="#f97316" stroke-width="3" />
          <path d="M 50 12 L 50 22 M 50 78 L 50 88 M 12 50 L 22 50 M 78 50 L 88 50 M 23 23 L 30 30 M 77 77 L 70 70 M 23 77 L 30 70 M 77 23 L 70 30" stroke="#f97316" stroke-width="3" stroke-linecap="round" />
          <path d="M 32 50 Q 32 30, 50 26 Q 68 30, 68 50 C 68 68, 62 76, 50 78 C 38 76, 32 68, 32 50 Z" fill="url(#sk-gold)" stroke="#ffedd5" stroke-width="1.5" />
          <path d="M 38 48 Q 50 44, 62 48 L 62 54 Q 50 50, 38 54 Z" fill="#1c1917" stroke="#ea580c" stroke-width="1.5" />
          <path d="M 40 51 Q 50 48, 60 51" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" fill="none" />
          <path d="M 50 26 Q 42 12, 34 16 Q 44 22, 50 26" fill="#ef4444" />
          <path d="M 50 26 Q 58 12, 66 16 Q 56 22, 50 26" fill="#ef4444" />
        </svg>
      )
    }

    if (norm === 'cosmicpaladin') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="cp-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#2e1065" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="cp-silver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f1f5f9" />
              <stop offset="100%" stop-color="#64748b" />
            </linearGradient>
            <linearGradient id="cp-nebula" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#d946ef" />
              <stop offset="100%" stop-color="#3b82f6" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#cp-bg)" stroke="#a855f7" stroke-width="3" />
          <path d="M 30 35 Q 50 20 70 35 Q 60 65 30 35 Z" fill="url(#cp-nebula)" opacity="0.3" filter="blur(6px)" />
          <path d="M 50 22 C 65 22, 74 30, 72 58 C 70 74, 58 82, 50 84 C 42 82, 30 74, 28 58 C 26 30, 35 22, 50 22 Z" fill="url(#cp-silver)" stroke="#e2e8f0" stroke-width="2" />
          <path d="M 50 27 C 61 27, 69 34, 67 56 C 65 70, 56 77, 50 79 C 44 77, 35 70, 33 56 C 31 34, 39 27, 50 27 Z" fill="#1e1b4b" opacity="0.9" />
          <path d="M 50 35 L 50 71 M 38 48 L 62 48" stroke="#a855f7" stroke-width="3" stroke-linecap="round" />
          <path d="M 50 42 L 52 46 L 57 48 L 52 50 L 50 54 L 48 50 L 43 48 L 48 46 Z" fill="#fff" />
        </svg>
      )
    }

    if (norm === 'vortexchampion') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="vc-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#042f2e" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="vc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fde047" />
              <stop offset="100%" stop-color="#ca8a04" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#vc-bg)" stroke="#0d9488" stroke-width="3" />
          <path d="M 50 20 A 30 30 0 0 1 80 50 A 30 30 0 0 1 50 80 A 30 30 0 0 1 20 50 A 30 30 0 0 1 50 20 Z" fill="none" stroke="#115e59" stroke-width="4" stroke-dasharray="10 15" stroke-linecap="round" />
          <path d="M 50 28 A 22 22 0 0 1 72 50 A 22 22 0 0 1 50 72 A 22 22 0 0 1 28 50 A 22 22 0 0 1 50 28 Z" fill="none" stroke="#14b8a6" stroke-width="2.5" stroke-dasharray="8 8" />
          <path d="M 38 35 L 62 35 L 59 52 Q 58 58 50 58 Q 42 58 41 52 Z" fill="url(#vc-gold)" stroke="#fef08a" stroke-width="1.5" />
          <path d="M 38 39 C 30 39 30 48 39 48" fill="none" stroke="#fef08a" stroke-width="2" />
          <path d="M 62 39 C 70 39 70 48 61 48" fill="none" stroke="#fef08a" stroke-width="2" />
          <path d="M 47 58 L 53 58 L 52 66 L 48 66 Z" fill="#ca8a04" />
          <rect x="42" y="66" width="16" height="4" rx="1" fill="#475569" stroke="#fef08a" stroke-width="1" />
          <path d="M 50 41 L 52 44 L 55 44 L 53 46 L 54 49 L 50 47 L 46 49 L 47 46 L 45 44 L 48 44 Z" fill="#fff" />
        </svg>
      )
    }

    if (norm === 'galactictitan') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="gt-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#180018" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="gt-titan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#94a3b8" />
              <stop offset="100%" stop-color="#334155" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#gt-bg)" stroke="#ec4899" stroke-width="3" />
          <ellipse cx="50" cy="45" rx="36" ry="12" fill="none" stroke="#db2777" stroke-width="3" transform="rotate(-15, 50, 45)" opacity="0.6" />
          <circle cx="50" cy="42" r="16" fill="#a855f7" stroke="#e9d5ff" stroke-width="1.5" />
          <ellipse cx="50" cy="42" rx="26" ry="7" fill="none" stroke="#f472b6" stroke-width="2" transform="rotate(-15, 50, 42)" />
          <path d="M 38 78 L 38 60 Q 38 52, 45 52 L 55 52 Q 62 52, 62 60 L 62 78 Z" fill="url(#gt-titan)" stroke="#cbd5e1" stroke-width="2" />
          <path d="M 43 52 L 43 65 M 48 52 L 48 65 M 53 52 L 53 65 M 58 52 L 58 65" stroke="#1e293b" stroke-width="1.5" />
          <path d="M 34 68 Q 38 60, 44 60" stroke="#cbd5e1" stroke-width="2.5" fill="none" />
          <path d="M 45 74 L 48 70 L 46 64 M 55 76 L 53 71 L 56 66" stroke="#f472b6" stroke-width="1.5" fill="none" />
        </svg>
      )
    }

    if (norm === 'supernovadragon') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="sd-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#2c0000" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="sd-dragon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ef4444" />
              <stop offset="100%" stop-color="#7f1d1d" />
            </linearGradient>
            <linearGradient id="sd-fire" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#ea580c" />
              <stop offset="100%" stop-color="#facc15" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#sd-bg)" stroke="#ef4444" stroke-width="3" />
          <path d="M 35 35 Q 12 12, 38 26 Q 50 2, 62 26 Q 88 12, 65 35 Q 98 50, 65 65 Q 88 88, 62 74 Q 50 98, 38 74 Q 12 88, 35 65 Q 2 50, 35 35 Z" fill="url(#sd-fire)" opacity="0.35" filter="blur(3px)" />
          <path d="M 40 25 L 42 16 L 47 22 M 52 23 L 56 14 L 59 21" stroke="#ea580c" stroke-width="2.5" fill="none" />
          <path d="M 28 55 C 28 32, 45 28, 55 28 C 68 28, 76 38, 76 50 C 76 56, 70 58, 66 58 L 62 58 C 58 58, 55 64, 45 64 L 34 64 C 30 64, 28 60, 28 55 Z" fill="url(#sd-dragon)" stroke="#fecaca" stroke-width="1.5" />
          <polygon points="46,40 52,38 50,44" fill="#facc15" stroke="#ea580c" stroke-width="0.5" />
          <circle cx="68" cy="48" r="2" fill="#1c1917" />
          <polygon points="56,58 58,54 60,58" fill="#fff" />
          <polygon points="62,58 64,54 66,58" fill="#fff" />
          <circle cx="50" cy="50" r="4" fill="#facc15" filter="blur(1px)" />
        </svg>
      )
    }

    if (norm === 'celestialphoenix') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
          <defs>
            <linearGradient id="cp-bg-p" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#3b0764" />
              <stop offset="100%" stop-color="#020617" />
            </linearGradient>
            <linearGradient id="cp-phoenix" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#ec4899" />
              <stop offset="100%" stop-color="#f43f5e" />
            </linearGradient>
            <linearGradient id="cp-gold-p" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#d97706" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#cp-bg-p)" stroke="#f43f5e" stroke-width="3" />
          <path d="M 50 48 Q 24 20, 16 40 Q 32 55, 50 62 Q 68 55, 84 40 Q 76 20, 50 48 Z" fill="url(#cp-phoenix)" stroke="#fecdd3" stroke-width="1.5" />
          <path d="M 50 54 Q 30 35, 22 50 Q 34 60, 50 65 Q 66 60, 78 50 Q 70 35, 50 54 Z" fill="#db2777" opacity="0.8" />
          <path d="M 46 45 C 46 38, 50 32, 50 32 C 50 32, 54 38, 54 45 C 54 58, 52 78, 50 85 C 48 78, 46 58, 46 45 Z" fill="url(#cp-gold-p)" stroke="#fef08a" stroke-width="1" />
          <circle cx="50" cy="30" r="6" fill="url(#cp-gold-p)" stroke="#fef08a" stroke-width="1" />
          <polygon points="50,30 46,31 50,33" fill="#ea580c" />
          <path d="M 50 24 Q 46 16, 50 12 Q 54 16, 50 24" fill="#ec4899" />
        </svg>
      )
    }

    // Default Fallback
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
        <defs>
          <linearGradient id="fb-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
          <linearGradient id="fb-silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#cbd5e1" />
            <stop offset="100%" stop-color="#64748b" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#fb-bg)" stroke="#94a3b8" stroke-width="3" />
        <path d="M 50 25 C 62 25, 70 30, 68 54 C 66 68, 56 75, 50 78 C 44 75, 34 68, 32 54 C 30 30, 38 25, 50 25 Z" fill="url(#fb-silver)" stroke="#e2e8f0" stroke-width="2" />
        <path d="M 50 36 L 53 42 L 60 42 L 55 46 L 57 52 L 50 48 L 43 52 L 45 46 L 40 42 L 47 42 Z" fill="#fff" />
      </svg>
    )
  }

  // Ako je unet emoji, prikažemo ga kao kružni tekstualni avatar
  const isEmoji = avatar && avatar.length <= 4 && /\p{Emoji}/u.test(avatar)

  return (
    <div
      className={`titula-avatar-omot ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: isEmoji ? `${size * 0.55}px` : undefined,
        ...style,
      }}
    >
      {avatar ? (
        isEmoji ? (
          <div
            className={`titula-avatar-emoji-krug ${glowClass}`}
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, var(--boja-primarna-svetla), var(--boja-kartica))',
              border: '2px solid var(--boja-ivica)',
            }}
          >
            {avatar}
          </div>
        ) : (
          <img
            src={avatar}
            alt={name}
            className={`titula-avatar-img ${glowClass}`}
          />
        )
      ) : (
        <div className={`titula-avatar-fallback-wrapper ${glowClass}`} style={{ width: '100%', height: '100%' }}>
          {renderFallbackSvg()}
        </div>
      )}
    </div>
  )
}
